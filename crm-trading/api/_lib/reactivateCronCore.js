// Lógica compartida del ciclo diario del Plan Reactivate Burs — usada por
// el cron programado (api/reactivate-cron.js, protegido con CRON_SECRET) y
// por el botón "Forzar envío pendiente ahora" del panel del supervisor
// (api/reactivate-forzar-envio.js), para poder ponerse al día sin esperar
// a la próxima corrida automática si una tanda se cortó a medias.
import { totalCorreos } from './reactivateEmails.js'
import { enviarCorreoAlumno, enviarCorreoCierreAlumno, transporterGmailPool, procesarEnLotes } from './reactivateSend.js'

// Días transcurridos desde fecha_inicio_campana (día 1 = 0 transcurridos) en
// los que corresponde enviar el correo N según la sección 5 del plan.
const DIAS_PARA_CORREO = [0, 1, 3, 5, 7, 10, 13]
const DIAS_GRACIA_SIN_RESPUESTA = 3 // días de margen tras el Correo 6 antes de cerrar el ciclo
const CONCURRENCIA_ENVIO = 20 // correos en paralelo — todos comparten pool de conexión SMTP

function diasEntre(fechaISO, hoy) {
  const inicio = new Date(fechaISO + 'T00:00:00')
  return Math.floor((hoy - inicio) / (1000 * 60 * 60 * 24))
}

export async function ejecutarCicloDiario({ supabase, baseUrl }) {
  const { data: config } = await supabase.from('reactivate_config').select('*').eq('id', 'default').maybeSingle()
  if (!config?.campana_activa) {
    return { ok: true, saltado: 'Campaña Reactivate Burs en pausa (campana_activa=false)' }
  }

  const hoy = new Date()
  const hoyStr = hoy.toISOString().slice(0, 10)

  // 1) Cierre de ciclo: quienes ya recibieron el Correo 6 hace más de N días
  //    sin interactuar, pasan a "Sin respuesta" (fin del ciclo, sección 5 y 9).
  await supabase
    .from('reactivate_alumnos')
    .update({ estado_campana: 'Sin respuesta', updated_at: new Date().toISOString() })
    .eq('excluido', false)
    .eq('estado_campana', 'Correo 6 enviado')
    .lte('fecha_ultimo_envio', new Date(hoy.getTime() - DIAS_GRACIA_SIN_RESPUESTA * 86400000).toISOString())

  // 2) Candidatos: siguen en la secuencia automática (no interesados,
  //    contactados, negociación, reactivados, no interesados ni sin
  //    respuesta — esos ya salieron del flujo de correos).
  const ESTADOS_EN_SECUENCIA = ['Pendiente', ...Array.from({ length: totalCorreos() }, (_, i) => `Correo ${i} enviado`)]
  const { data: candidatos, error: errCand } = await supabase
    .from('reactivate_alumnos')
    .select('id, nombre, email, estado_campana, fecha_inicio_campana, ultimo_correo_enviado')
    .eq('excluido', false)
    .in('estado_campana', ESTADOS_EN_SECUENCIA)

  if (errCand) throw errCand

  // Filtra primero quién realmente tiene un correo pendiente hoy — el
  // envío en sí se hace después, en lotes concurrentes.
  let omitidos = 0
  const porEnviar = []
  for (const alumno of candidatos) {
    const esPrimerEnvio = !alumno.fecha_inicio_campana
    const fechaInicio = esPrimerEnvio ? hoyStr : alumno.fecha_inicio_campana
    const diasTranscurridos = esPrimerEnvio ? 0 : diasEntre(fechaInicio, hoy)
    const siguienteCorreo = (alumno.ultimo_correo_enviado ?? -1) + 1

    if (siguienteCorreo > 6) { omitidos++; continue }
    if (diasTranscurridos < DIAS_PARA_CORREO[siguienteCorreo]) { omitidos++; continue }
    porEnviar.push({ alumno, correoNumero: siguienteCorreo, fechaInicio })
  }

  const transporter = transporterGmailPool()
  const testimonioUrls = { 1: config.testimonio_url_1, 2: config.testimonio_url_2 }
  const { enviados, errores } = await procesarEnLotes(porEnviar, CONCURRENCIA_ENVIO, ({ alumno, correoNumero, fechaInicio }) =>
    enviarCorreoAlumno({ supabase, transporter, baseUrl, gmailUser: process.env.GMAIL_USER, alumno, correoNumero, fechaInicio, testimonioUrls })
  )
  transporter.close()

  return { ok: true, enviados, errores, omitidos, totalCandidatos: candidatos.length }
}

// Correo de cierre del Plan Reactivate Burs — envío único y manual (lo
// dispara el supervisor desde el panel, no el cron), a los 399 alumnos
// retirados con saldo pendiente real. Reanudable: a quien ya quedó en
// "Cierre enviado" no se le reenvía.
const ESTADOS_YA_RESUELTOS_CIERRE = ['Reactivado', 'No interesado', 'Cierre enviado']

export async function ejecutarEnvioCierre({ supabase, baseUrl }) {
  const { data: candidatos, error } = await supabase
    .from('reactivate_alumnos')
    .select('id, nombre, email, estado_campana')
    .eq('excluido', false)
    .order('id')
  if (error) throw error

  const pendientes = candidatos.filter(a => !ESTADOS_YA_RESUELTOS_CIERRE.includes(a.estado_campana))

  const transporter = transporterGmailPool()
  const { enviados, errores } = await procesarEnLotes(pendientes, CONCURRENCIA_ENVIO, (alumno) =>
    enviarCorreoCierreAlumno({ supabase, transporter, baseUrl, gmailUser: process.env.GMAIL_USER, alumno })
  )
  transporter.close()

  return { ok: true, enviados, errores, pendientesRestantes: Math.max(0, pendientes.length - enviados) }
}
