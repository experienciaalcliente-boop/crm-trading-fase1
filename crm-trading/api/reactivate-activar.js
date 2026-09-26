// Activa una campaña y envía su primer correo DE INMEDIATO a quien aún no
// inició su secuencia — así el supervisor ve resultado apenas activa el
// interruptor, en vez de esperar a la próxima corrida del cron (9am hora
// Perú). El resto de la secuencia de cada quien sigue el cronograma normal
// vía api/reactivate-cron.js.
//
// Atiende DOS campañas con el mismo archivo (Plan Reactivate Burs y Plan
// Exalumnos, según body.campana) para no sumar una función serverless más
// — el plan Hobby de Vercel limita a 12 y ya estaba en el tope.
import { createClient } from '@supabase/supabase-js'
import { enviarCorreoAlumno, transporterBrevo, remitenteBrevo, procesarEnLotes } from './_lib/reactivateSend.js'
import { enviarCorreoLead } from './_lib/expCampanaSend.js'
import { filtrarCupoDiario, CUPO_DIARIO_POR_ASESORA, fetchTodosPaginado } from './_lib/expCampanaCronCore.js'
import { ejecutarAccionCoordinacion } from './_lib/coordinacionEjecutar.js'
import { actualizarInformeMensual } from './_lib/coordinacionInforme.js'
import { ejecutarCicloDiarioCoordinacion } from './_lib/coordinacionCronCore.js'
import { listarWebhooks, crearWebhook } from './_lib/brevoClient.js'

const CONCURRENCIA_ENVIO = 8

async function activarReactivateBurs(supabase, baseUrl) {
  const { data: config } = await supabase.from('reactivate_config').select('*').eq('id', 'default').maybeSingle()
  await supabase.from('reactivate_config').update({ campana_activa: true, updated_at: new Date().toISOString() }).eq('id', 'default')

  const { data: candidatos, error } = await supabase
    .from('reactivate_alumnos')
    .select('id, nombre, email')
    .eq('excluido', false)
    .eq('estado_campana', 'Pendiente')
    .is('fecha_inicio_campana', null)
  if (error) throw error

  const transporter = transporterBrevo()
  const hoyStr = new Date().toISOString().slice(0, 10)
  const testimonioUrls = { 1: config?.testimonio_url_1, 2: config?.testimonio_url_2 }

  const { enviados, errores } = await procesarEnLotes(candidatos, CONCURRENCIA_ENVIO, (alumno) =>
    enviarCorreoAlumno({ supabase, transporter, baseUrl, remitente: remitenteBrevo(), alumno, correoNumero: 0, fechaInicio: hoyStr, testimonioUrls })
  )
  transporter.close()
  return { ok: true, activada: true, total: candidatos.length, enviados, errores }
}

async function activarExalumnos(supabase, baseUrl) {
  await supabase.from('campana_exalumnos_config').update({ campana_activa: true, updated_at: new Date().toISOString() }).eq('id', 'default')

  const hoyStr = new Date().toISOString().slice(0, 10)
  // "Pendiente" (nunca arrancó) — activar solo dispara arranques nuevos,
  // no re-procesa a quien ya está en curso (eso lo hace el cron diario).
  const candidatos = await fetchTodosPaginado((desde, hasta) =>
    supabase
      .from('campana_exalumnos_alumnos')
      .select('id, nombre, email, asesora_id, fecha_inicio_campana')
      .eq('excluido', false)
      .eq('estado_campana', 'Pendiente')
      .is('fecha_inicio_campana', null)
      .range(desde, hasta)
  )

  // Mismo cupo diario parejo por asesora que usa el cron — activar no manda
  // los 3202 correos de golpe (superaría el límite de envío de Gmail), solo
  // arranca hoy hasta CUPO_DIARIO_POR_ASESORA leads de cada una. El resto
  // arranca automáticamente en los días siguientes vía el cron compartido.
  const { candidatosHoy, pendientesRestantes } = filtrarCupoDiario(candidatos, hoyStr)

  const transporter = transporterBrevo()

  const { enviados, errores } = await procesarEnLotes(candidatosHoy, CONCURRENCIA_ENVIO, (lead) =>
    enviarCorreoLead({ supabase, transporter, baseUrl, remitente: remitenteBrevo(), lead, correoNumero: 0, fechaInicio: hoyStr })
  )
  transporter.close()
  return {
    ok: true, activada: true, total: candidatosHoy.length, enviados, errores, pendientesRestantes,
    mensaje: `Cupo diario: ${CUPO_DIARIO_POR_ASESORA} por asesora. Quedan ${pendientesRestantes} leads por arrancar en los próximos días.`,
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' })

  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  // Panel de Coordinación: ejecuta una acción ya aprobada por el supervisor
  // (crear la siguiente tanda en Brevo, iniciar un segmento, detenerlo).
  // Va acá y no en su propio archivo porque el plan Hobby de Vercel ya
  // estaba en el límite de 12 funciones serverless.
  if (req.body?.campana === 'coordinacion') {
    if (!req.body?.accionId) return res.status(400).json({ error: 'Falta accionId' })
    try {
      const resultado = await ejecutarAccionCoordinacion({ supabase, accionId: req.body.accionId })
      return res.status(200).json(resultado)
    } catch (err) {
      console.error('reactivate-activar (coordinacion):', err)
      return res.status(500).json({ error: err.message || 'Error interno' })
    }
  }

  // Disparo manual del ciclo diario de Email Marketing (sync de tandas
  // "programada" -> "enviada" contra Brevo + evaluación de métricas 48h+).
  // Es lo mismo que corre el cron a las 9am Perú — se expone acá para no
  // tener que esperar a la próxima corrida cuando una tanda se envió a
  // mano en Brevo y el supervisor quiere ver el estado reflejado ya.
  if (req.body?.campana === 'coordinacion-ciclo-test') {
    try {
      const resultado = await ejecutarCicloDiarioCoordinacion({ supabase })
      return res.status(200).json(resultado)
    } catch (err) {
      console.error('reactivate-activar (ciclo coordinacion test):', err)
      return res.status(500).json({ error: err.message || 'Error interno' })
    }
  }

  // Registra (una sola vez) el webhook de Brevo que alimenta el tracking
  // real por persona en recuperacion_2026_envios. Idempotente: si ya existe
  // uno apuntando a nuestra URL, no crea un segundo.
  if (req.body?.campana === 'coordinacion-crear-webhook-brevo') {
    try {
      const baseUrl = process.env.PUBLIC_APP_URL
      if (!baseUrl) return res.status(500).json({ error: 'Falta PUBLIC_APP_URL' })
      const url = `${baseUrl}/api/reactivate-track`
      const existentes = await listarWebhooks()
      const yaExiste = existentes.find(w => w.url === url)
      if (yaExiste) return res.status(200).json({ ok: true, yaExistia: true, id: yaExiste.id })
      const creado = await crearWebhook({ url, events: ['opened', 'click', 'hardBounce', 'softBounce', 'spam'] })
      return res.status(200).json({ ok: true, creado: true, id: creado.id })
    } catch (err) {
      console.error('reactivate-activar (crear webhook brevo):', err)
      return res.status(500).json({ error: err.message || 'Error interno' })
    }
  }

  // Prueba manual del agente Organizador (Gemini + Google Docs) — salta el
  // candado de "último viernes del mes" y no cuenta como el informe real,
  // para poder verificar las credenciales sin esperar a fin de mes.
  if (req.body?.campana === 'coordinacion-informe-test') {
    try {
      const resultado = await actualizarInformeMensual({ supabase, forzar: true })
      return res.status(200).json(resultado)
    } catch (err) {
      console.error('reactivate-activar (informe test):', err)
      return res.status(500).json({ error: err.message || 'Error interno' })
    }
  }

  // Recupera el informe de un mes que el cron perdió por un fallo — se
  // escribe con el encabezado real y marca el mes como hecho, a diferencia
  // de 'coordinacion-informe-test' que solo verifica credenciales.
  if (req.body?.campana === 'coordinacion-informe-mes') {
    try {
      const resultado = await actualizarInformeMensual({ supabase, comoMesReal: true })
      return res.status(200).json(resultado)
    } catch (err) {
      console.error('reactivate-activar (informe mes):', err)
      return res.status(500).json({ error: err.message || 'Error interno' })
    }
  }

  const baseUrl = process.env.PUBLIC_APP_URL
  if (!baseUrl) return res.status(500).json({ error: 'Falta configurar PUBLIC_APP_URL en las variables de entorno' })
  if (!process.env.BREVO_API_KEY) {
    return res.status(500).json({ error: 'BREVO_API_KEY no está configurada en el servidor' })
  }

  const campana = req.body?.campana === 'exalumnos' ? 'exalumnos' : 'reactivate'

  try {
    const resultado = campana === 'exalumnos'
      ? await activarExalumnos(supabase, baseUrl)
      : await activarReactivateBurs(supabase, baseUrl)
    return res.status(200).json(resultado)
  } catch (err) {
    console.error('reactivate-activar:', err)
    return res.status(500).json({ error: err.message || 'Error interno' })
  }
}
