// Ejecuta una acción de panel_acciones_pendientes ya aprobada por el
// supervisor. Se invoca desde api/reactivate-activar.js (campana:
// 'coordinacion') para no sumar una función serverless nueva — el plan
// Hobby de Vercel ya está en el límite de 12.
import { crearOEncontrarLista, agregarContactoALista, obtenerCampana, crearCampana } from './brevoClient.js'

const SENDER = { name: 'Experiencia del Cliente · Burs Advisory', email: 'noreply@comunidad.bursadvisory.com' }
const REPLY_TO = 'experienciaalcliente@bursadvisory.com'

// Agregar contactos a Brevo uno por uno (secuencial) tardaba demasiado con
// segmentos grandes (279 contactos superó el maxDuration de 60s de la
// función). Con 8 en paralelo baja bastante sin golpear límites de tasa
// de la API de Brevo.
async function agregarContactosEnParalelo(candidatos, listId, concurrencia = 8) {
  let cursor = 0
  async function trabajador() {
    while (cursor < candidatos.length) {
      const c = candidatos[cursor++]
      await agregarContactoALista({ email: c.email, nombre: c.nombre, listId })
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrencia, candidatos.length) }, trabajador))
}

function proximaFechaEnvioISO(diasDesdeHoy = 3) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + diasDesdeHoy)
  const y = d.getUTCFullYear(), m = String(d.getUTCMonth() + 1).padStart(2, '0'), day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}T10:00:00.000-05:00` // 10:00 hora Perú
}

async function crearYProgramarTanda({ supabase, segmento, tanda, config, asuntoOverride, previewOverride }) {
  const { data: candidatos, error } = await supabase
    .from('recuperacion_2026_alumnos')
    .select('id, email, nombre')
    .eq('segmento', segmento).eq('tanda', tanda).eq('estado_campana', 'Pendiente').eq('excluido', false)
  if (error) throw error
  if (!candidatos || candidatos.length === 0) {
    return { ok: false, mensaje: `No hay contactos pendientes en ${segmento}/${tanda} (¿ya se procesó?)` }
  }
  if (!config.brevo_campana_referencia_id) {
    throw new Error(`recuperacion_2026_config.brevo_campana_referencia_id no está definido para el segmento ${segmento}`)
  }

  const nombreLista = `SEG_${segmento}_${tanda.replace(' ', '').toUpperCase()}`
  const listId = await crearOEncontrarLista(nombreLista)
  await agregarContactosEnParalelo(candidatos, listId)

  const referencia = await obtenerCampana(config.brevo_campana_referencia_id)
  const scheduledAtISO = proximaFechaEnvioISO()
  // asuntoOverride/previewOverride: permite probar un asunto distinto en una
  // tanda puntual (ej. A/Día 3 tras apertura baja) sin tocar la campaña de
  // referencia en Brevo, que sigue siendo la fuente del htmlContent.
  const nuevaCampana = await crearCampana({
    name: `SEG_${segmento}_${tanda} — Correo 0 (${candidatos.length} contactos)`,
    subject: asuntoOverride || referencia.subject,
    previewText: previewOverride || referencia.previewText,
    sender: SENDER,
    replyTo: REPLY_TO,
    htmlContent: referencia.htmlContent,
    listId,
    scheduledAtISO,
  })

  await supabase.from('recuperacion_2026_tandas').insert({
    segmento, tanda, brevo_list_id: listId, brevo_campaign_id: nuevaCampana.id,
    estado: 'programada', fecha_programada: scheduledAtISO.slice(0, 10),
  })

  return { ok: true, listId, campaignId: nuevaCampana.id, contactos: candidatos.length, scheduledAtISO }
}

// Crea la PRIMERA campaña de un segmento nuevo (sin brevo_campana_referencia_id
// todavía) directamente desde subject/previewText/htmlContent del payload, en
// vez de clonar una referencia que aún no existe — mismo patrón que se usó a
// mano para el Día 1 de A (esa campaña terminó siendo su propia referencia).
// Deja la campaña creada como referencia del segmento para las tandas que
// sigan (crearYProgramarTanda ya la clona normalmente desde ahí en adelante).
async function crearCampanaSemilla({ supabase, segmento, subject, previewText, htmlContent }) {
  const { data: candidatos, error } = await supabase
    .from('recuperacion_2026_alumnos')
    .select('id, email, nombre')
    .eq('segmento', segmento).eq('tanda', 'Dia 1').eq('estado_campana', 'Pendiente').eq('excluido', false)
  if (error) throw error
  if (!candidatos || candidatos.length === 0) {
    return { ok: false, mensaje: `No hay contactos pendientes en ${segmento}/Dia 1 (¿ya se procesó?)` }
  }

  const nombreLista = `SEG_${segmento}_DIA1`
  const listId = await crearOEncontrarLista(nombreLista)
  await agregarContactosEnParalelo(candidatos, listId)

  const scheduledAtISO = proximaFechaEnvioISO()
  const nuevaCampana = await crearCampana({
    name: `SEG_${segmento}_Dia 1 — Correo 0 (${candidatos.length} contactos)`,
    subject, previewText, sender: SENDER, replyTo: REPLY_TO, htmlContent, listId, scheduledAtISO,
  })

  await supabase.from('recuperacion_2026_tandas').insert({
    segmento, tanda: 'Dia 1', brevo_list_id: listId, brevo_campaign_id: nuevaCampana.id,
    estado: 'programada', fecha_programada: scheduledAtISO.slice(0, 10),
  })
  await supabase.from('recuperacion_2026_config')
    .update({ brevo_campana_referencia_id: nuevaCampana.id, campana_activa: true, updated_at: new Date().toISOString() })
    .eq('segmento', segmento)

  return { ok: true, listId, campaignId: nuevaCampana.id, contactos: candidatos.length, scheduledAtISO }
}

// Correo de refuerzo al cierre de una cohorte de Impulso: felicita el
// egreso y presenta la opción de continuar por suscripción. Complementa
// (no reemplaza) los 5 toques de WhatsApp que maneja cada asesora — ataca
// el mismo mensaje por dos canales distintos. Se manda una sola vez por
// cohorte, a quienes tengan correo real cargado (import de alumnos).
async function enviarCorreoCierreImpulso({ supabase, cohorte, subject, previewText, htmlContent }) {
  const { data: yaEnviado } = await supabase
    .from('panel_log').select('id')
    .eq('agente', 'impulso')
    .ilike('que', `Correo de cierre de Impulso enviado para "${cohorte}"%`)
    .limit(1)
  if (yaEnviado && yaEnviado.length > 0) {
    return { ok: false, mensaje: `Ya se envió el correo de cierre para "${cohorte}" — no se repite.` }
  }

  const { data: candidatos, error } = await supabase
    .from('alumnos').select('id, nombre, email')
    .eq('programa', cohorte).eq('estado_operativo', 'Activo').neq('estado', 'Retirado').not('email', 'is', null)
  if (error) throw error
  if (!candidatos || candidatos.length === 0) {
    return { ok: false, mensaje: `No hay alumnos con correo real en "${cohorte}".` }
  }

  const listId = await crearOEncontrarLista(`IMPULSO_CIERRE_${cohorte}`)
  await agregarContactosEnParalelo(candidatos, listId)

  const scheduledAtISO = proximaFechaEnvioISO(1) // mañana 10am Perú — cerca del egreso, no 3 días como las tandas de recuperación
  const nuevaCampana = await crearCampana({
    name: `IMPULSO_CIERRE_${cohorte} (${candidatos.length} contactos)`,
    subject, previewText, sender: SENDER, replyTo: REPLY_TO, htmlContent, listId, scheduledAtISO,
  })

  await supabase.from('panel_log').insert({
    que: `Correo de cierre de Impulso enviado para "${cohorte}" — ${candidatos.length} contactos, felicitación + opción de continuar.`,
    donde: 'Fase 4 — Impulso BURS', agente: 'impulso',
  })

  return { ok: true, listId, campaignId: nuevaCampana.id, contactos: candidatos.length, scheduledAtISO }
}

export async function ejecutarAccionCoordinacion({ supabase, accionId }) {
  const { data: accion, error } = await supabase.from('panel_acciones_pendientes').select('*').eq('id', accionId).maybeSingle()
  if (error) throw error
  if (!accion) throw new Error('Acción no encontrada')
  if (accion.estado !== 'pendiente') throw new Error(`La acción ya está en estado "${accion.estado}", no se puede ejecutar de nuevo`)

  const config = accion.payload.segmento
    ? (await supabase.from('recuperacion_2026_config').select('*').eq('segmento', accion.payload.segmento).maybeSingle()).data
    : null

  let resultado
  if (accion.tipo === 'email_marketing.siguiente_tanda') {
    resultado = await crearYProgramarTanda({
      supabase, segmento: accion.payload.segmento, tanda: accion.payload.tanda_siguiente, config,
      asuntoOverride: accion.payload.asunto_override, previewOverride: accion.payload.preview_override,
    })
  } else if (accion.tipo === 'email_marketing.iniciar_segmento') {
    resultado = await crearYProgramarTanda({ supabase, segmento: accion.payload.segmento, tanda: 'Dia 1', config })
    if (resultado.ok) await supabase.from('recuperacion_2026_config').update({ campana_activa: true, updated_at: new Date().toISOString() }).eq('segmento', accion.payload.segmento)
  } else if (accion.tipo === 'email_marketing.crear_campana_semilla') {
    resultado = await crearCampanaSemilla({
      supabase, segmento: accion.payload.segmento,
      subject: accion.payload.subject, previewText: accion.payload.preview_text, htmlContent: accion.payload.html_content,
    })
  } else if (accion.tipo === 'email_marketing.detener_segmento') {
    await supabase.from('recuperacion_2026_config').update({ campana_activa: false, updated_at: new Date().toISOString() }).eq('segmento', accion.payload.segmento)
    resultado = { ok: true, mensaje: `Segmento ${accion.payload.segmento} detenido.` }
  } else if (accion.tipo === 'impulso.correo_cierre') {
    resultado = await enviarCorreoCierreImpulso({
      supabase, cohorte: accion.payload.cohorte,
      subject: accion.payload.subject, previewText: accion.payload.preview_text, htmlContent: accion.payload.html_content,
    })
  } else {
    throw new Error(`Tipo de acción no reconocido: ${accion.tipo}`)
  }

  const esImpulso = accion.tipo.startsWith('impulso.')
  await supabase.from('panel_acciones_pendientes').update({
    estado: 'ejecutada', revisado_at: new Date().toISOString(), resultado,
  }).eq('id', accionId)

  await supabase.from('panel_log').insert({
    que: `${accion.resumen} → APROBADO y ejecutado.`,
    donde: esImpulso ? 'Fase 4 — Impulso BURS' : 'Fase 3 — Email Marketing',
    agente: esImpulso ? 'impulso' : 'email_marketing',
  })

  return resultado
}
