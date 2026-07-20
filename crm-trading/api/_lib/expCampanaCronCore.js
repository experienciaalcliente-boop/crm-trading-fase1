// Lógica compartida del ciclo diario del Plan Exalumnos — calendario tomado
// de plan_email_marketing_julio_burs.md (v2): 8 correos principales + 2
// reenvíos a quien no abrió C1/C3, corridos +3 días respecto al calendario
// original del documento (que arrancaba el 17/07) para poder activarse hoy
// sin perder ningún correo de la secuencia. El cierre real de ciclo
// (antes 31/07) queda en día 14 desde la activación.
import { totalCorreos, diaPara, reenvioDePara } from './expCampanaEmails.js'
import { enviarCorreoLead, transporterGmailPool, procesarEnLotes } from './expCampanaSend.js'

const DIAS_GRACIA_SIN_RESPUESTA = 3 // margen tras el último correo (C8) antes de cerrar el ciclo
const CONCURRENCIA_ENVIO = 20
const ULTIMO_CORREO = totalCorreos() - 1 // índice de C8

// Cupo diario de arranques NUEVOS (Correo 0) por asesora — no todos los
// 3202 leads arrancan el mismo día: 3202 correos de golpe superaría el
// límite de envío diario de Gmail (500-2000/día según el tipo de cuenta).
// El mismo cupo para las 4 asesoras (no un total global repartido al azar)
// asegura que ninguna tenga ventaja de tiempo sobre las demás — si hoy
// arrancan 100 de una, arrancan 100 de cada una. A este ritmo, ~800
// leads/asesora tardan ~8 días en arrancar todos (los correos 1-9 de
// quienes ya arrancaron siguen su propio calendario sin verse afectados).
export const CUPO_DIARIO_POR_ASESORA = 100

function diasEntre(fechaISO, hoy) {
  const inicio = new Date(fechaISO + 'T00:00:00')
  return Math.floor((hoy - inicio) / (1000 * 60 * 60 * 24))
}

// PostgREST solo devuelve 1000 filas por consulta por defecto — con 3202
// leads en la campaña hay que paginar con .range(), si no el cron (y
// "activar") solo verían al primer millar. Mismo patrón que
// fetchTodasLasPaginas en src/lib/api.js.
export async function fetchTodosPaginado(construirQuery) {
  const TAMANO_PAGINA = 1000
  let desde = 0
  let todos = []
  while (true) {
    const { data, error } = await construirQuery(desde, desde + TAMANO_PAGINA - 1)
    if (error) throw error
    todos = todos.concat(data || [])
    if (!data || data.length < TAMANO_PAGINA) break
    desde += TAMANO_PAGINA
  }
  return todos
}

// Recibe candidatos ya filtrados (excluido=false, en secuencia) y devuelve
// solo los que corresponde procesar HOY: todos los que ya arrancaron su
// secuencia (fecha_inicio_campana no nulo) + hasta CUPO_DIARIO_POR_ASESORA
// de los "Pendiente" (nunca arrancaron) de CADA asesora, en orden estable.
export function filtrarCupoDiario(candidatos) {
  const pendientesPorAsesora = {}
  const enCurso = []
  candidatos.forEach(lead => {
    if (lead.fecha_inicio_campana) { enCurso.push(lead); return }
    ;(pendientesPorAsesora[lead.asesora_id] ||= []).push(lead)
  })

  const pendientesDeHoy = []
  let pendientesRestantes = 0
  Object.values(pendientesPorAsesora).forEach(arr => {
    arr.sort((a, b) => a.id.localeCompare(b.id))
    pendientesDeHoy.push(...arr.slice(0, CUPO_DIARIO_POR_ASESORA))
    pendientesRestantes += Math.max(0, arr.length - CUPO_DIARIO_POR_ASESORA)
  })

  return { candidatosHoy: [...enCurso, ...pendientesDeHoy], pendientesRestantes }
}

export async function ejecutarCicloDiarioExalumnos({ supabase, baseUrl }) {
  const { data: config } = await supabase.from('campana_exalumnos_config').select('*').eq('id', 'default').maybeSingle()
  if (!config?.campana_activa) {
    return { ok: true, saltado: 'Campaña Plan Exalumnos en pausa (campana_activa=false)' }
  }

  const hoy = new Date()
  const hoyStr = hoy.toISOString().slice(0, 10)

  // 1) Cierre de ciclo: quienes ya recibieron el último correo (C8) hace más
  //    de N días sin interactuar, pasan a "Sin respuesta".
  await supabase
    .from('campana_exalumnos_alumnos')
    .update({ estado_campana: 'Sin respuesta', updated_at: new Date().toISOString() })
    .eq('excluido', false)
    .eq('estado_campana', `Correo ${ULTIMO_CORREO} enviado`)
    .lte('fecha_ultimo_envio', new Date(hoy.getTime() - DIAS_GRACIA_SIN_RESPUESTA * 86400000).toISOString())

  // 2) Candidatos: siguen en la secuencia automática.
  const ESTADOS_EN_SECUENCIA = ['Pendiente', ...Array.from({ length: totalCorreos() }, (_, i) => `Correo ${i} enviado`)]
  const candidatos = await fetchTodosPaginado((desde, hasta) =>
    supabase
      .from('campana_exalumnos_alumnos')
      .select('id, nombre, email, asesora_id, estado_campana, fecha_inicio_campana, ultimo_correo_enviado')
      .eq('excluido', false)
      .in('estado_campana', ESTADOS_EN_SECUENCIA)
      .range(desde, hasta)
  )

  const { candidatosHoy, pendientesRestantes } = filtrarCupoDiario(candidatos)

  // Los reenvíos (correo 1 y 4) no se mandan si el lead ya abrió el correo
  // original (0 y 3) — se necesita su historial de envíos para saberlo.
  const idsQuePodrianNecesitarReenvio = candidatosHoy
    .filter(l => reenvioDePara((l.ultimo_correo_enviado ?? -1) + 1) != null)
    .map(l => l.id)
  const aperturaOriginal = {} // alumno_id -> Set(correo_numero abiertos)
  if (idsQuePodrianNecesitarReenvio.length) {
    const { data: envios } = await supabase
      .from('campana_exalumnos_envios')
      .select('alumno_id, correo_numero, abierto')
      .in('alumno_id', idsQuePodrianNecesitarReenvio)
      .eq('abierto', true)
    ;(envios || []).forEach(e => {
      if (!aperturaOriginal[e.alumno_id]) aperturaOriginal[e.alumno_id] = new Set()
      aperturaOriginal[e.alumno_id].add(e.correo_numero)
    })
  }

  let omitidos = 0
  let saltadosPorApertura = 0
  const porEnviar = []
  for (const lead of candidatosHoy) {
    const esPrimerEnvio = !lead.fecha_inicio_campana
    const fechaInicio = esPrimerEnvio ? hoyStr : lead.fecha_inicio_campana
    const diasTranscurridos = esPrimerEnvio ? 0 : diasEntre(fechaInicio, hoy)
    const siguienteCorreo = (lead.ultimo_correo_enviado ?? -1) + 1

    if (siguienteCorreo >= totalCorreos()) { omitidos++; continue }
    if (diasTranscurridos < diaPara(siguienteCorreo)) { omitidos++; continue }

    const original = reenvioDePara(siguienteCorreo)
    if (original != null && aperturaOriginal[lead.id]?.has(original)) {
      // Ya abrió el correo original — no se reenvía, pero sí se avanza el
      // puntero para no bloquear los correos siguientes del calendario.
      await supabase.from('campana_exalumnos_alumnos').update({
        ultimo_correo_enviado: siguienteCorreo,
        updated_at: new Date().toISOString(),
      }).eq('id', lead.id)
      saltadosPorApertura++
      continue
    }

    porEnviar.push({ lead, correoNumero: siguienteCorreo, fechaInicio })
  }

  const transporter = transporterGmailPool()
  const { enviados, errores } = await procesarEnLotes(porEnviar, CONCURRENCIA_ENVIO, ({ lead, correoNumero, fechaInicio }) =>
    enviarCorreoLead({ supabase, transporter, baseUrl, gmailUser: process.env.GMAIL_USER, lead, correoNumero, fechaInicio })
  )
  transporter.close()

  return { ok: true, enviados, errores, omitidos, saltadosPorApertura, pendientesRestantes, totalCandidatos: candidatos.length }
}
