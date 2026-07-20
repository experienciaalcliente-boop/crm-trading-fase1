// Lógica compartida del ciclo diario del Plan Exalumnos — usada por el cron
// diario (reutiliza el mismo trigger de api/reactivate-cron.js, ver nota ahí
// sobre el límite de crons del plan de Vercel) y por el botón "Forzar envío
// pendiente" del panel (api/expcampana-forzar-envio.js).
import { totalCorreos } from './expCampanaEmails.js'
import { enviarCorreoLead, transporterGmailPool, procesarEnLotes } from './expCampanaSend.js'

// Correo 0 (Aula Virtual) el mismo día de inicio, Correo 1 (Impulso) 4 días
// después si aún no hubo respuesta.
const DIAS_PARA_CORREO = [0, 4]
const DIAS_GRACIA_SIN_RESPUESTA = 3 // margen tras el Correo 1 antes de cerrar el ciclo
const CONCURRENCIA_ENVIO = 20

function diasEntre(fechaISO, hoy) {
  const inicio = new Date(fechaISO + 'T00:00:00')
  return Math.floor((hoy - inicio) / (1000 * 60 * 60 * 24))
}

export async function ejecutarCicloDiarioExalumnos({ supabase, baseUrl }) {
  const { data: config } = await supabase.from('campana_exalumnos_config').select('*').eq('id', 'default').maybeSingle()
  if (!config?.campana_activa) {
    return { ok: true, saltado: 'Campaña Plan Exalumnos en pausa (campana_activa=false)' }
  }

  const hoy = new Date()
  const hoyStr = hoy.toISOString().slice(0, 10)

  // 1) Cierre de ciclo: quienes ya recibieron el Correo 1 hace más de N días
  //    sin interactuar, pasan a "Sin respuesta".
  await supabase
    .from('campana_exalumnos_alumnos')
    .update({ estado_campana: 'Sin respuesta', updated_at: new Date().toISOString() })
    .eq('excluido', false)
    .eq('estado_campana', 'Correo 1 enviado')
    .lte('fecha_ultimo_envio', new Date(hoy.getTime() - DIAS_GRACIA_SIN_RESPUESTA * 86400000).toISOString())

  // 2) Candidatos: siguen en la secuencia automática.
  const ESTADOS_EN_SECUENCIA = ['Pendiente', ...Array.from({ length: totalCorreos() }, (_, i) => `Correo ${i} enviado`)]
  const { data: candidatos, error: errCand } = await supabase
    .from('campana_exalumnos_alumnos')
    .select('id, nombre, email, asesora_id, estado_campana, fecha_inicio_campana, ultimo_correo_enviado')
    .eq('excluido', false)
    .in('estado_campana', ESTADOS_EN_SECUENCIA)

  if (errCand) throw errCand

  let omitidos = 0
  const porEnviar = []
  for (const lead of candidatos) {
    const esPrimerEnvio = !lead.fecha_inicio_campana
    const fechaInicio = esPrimerEnvio ? hoyStr : lead.fecha_inicio_campana
    const diasTranscurridos = esPrimerEnvio ? 0 : diasEntre(fechaInicio, hoy)
    const siguienteCorreo = (lead.ultimo_correo_enviado ?? -1) + 1

    if (siguienteCorreo >= totalCorreos()) { omitidos++; continue }
    if (diasTranscurridos < DIAS_PARA_CORREO[siguienteCorreo]) { omitidos++; continue }
    porEnviar.push({ lead, correoNumero: siguienteCorreo, fechaInicio })
  }

  const transporter = transporterGmailPool()
  const { enviados, errores } = await procesarEnLotes(porEnviar, CONCURRENCIA_ENVIO, ({ lead, correoNumero, fechaInicio }) =>
    enviarCorreoLead({ supabase, transporter, baseUrl, gmailUser: process.env.GMAIL_USER, lead, correoNumero, fechaInicio })
  )
  transporter.close()

  return { ok: true, enviados, errores, omitidos, totalCandidatos: candidatos.length }
}
