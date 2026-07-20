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
import { enviarCorreoAlumno, transporterGmailPool, procesarEnLotes } from './_lib/reactivateSend.js'
import { enviarCorreoLead } from './_lib/expCampanaSend.js'
import { filtrarCupoDiario, CUPO_DIARIO_POR_ASESORA, fetchTodosPaginado } from './_lib/expCampanaCronCore.js'

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

  const transporter = transporterGmailPool()
  const hoyStr = new Date().toISOString().slice(0, 10)
  const testimonioUrls = { 1: config?.testimonio_url_1, 2: config?.testimonio_url_2 }

  const { enviados, errores } = await procesarEnLotes(candidatos, CONCURRENCIA_ENVIO, (alumno) =>
    enviarCorreoAlumno({ supabase, transporter, baseUrl, gmailUser: process.env.GMAIL_USER, alumno, correoNumero: 0, fechaInicio: hoyStr, testimonioUrls })
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

  const transporter = transporterGmailPool()

  const { enviados, errores } = await procesarEnLotes(candidatosHoy, CONCURRENCIA_ENVIO, (lead) =>
    enviarCorreoLead({ supabase, transporter, baseUrl, gmailUser: process.env.GMAIL_USER, lead, correoNumero: 0, fechaInicio: hoyStr })
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
  const baseUrl = process.env.PUBLIC_APP_URL
  if (!baseUrl) return res.status(500).json({ error: 'Falta configurar PUBLIC_APP_URL en las variables de entorno' })
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return res.status(500).json({ error: 'GMAIL_USER / GMAIL_APP_PASSWORD no están configurados en el servidor' })
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
