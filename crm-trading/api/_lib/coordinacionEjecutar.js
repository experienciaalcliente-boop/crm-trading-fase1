// Ejecuta una acción de panel_acciones_pendientes ya aprobada por el
// supervisor. Se invoca desde api/reactivate-activar.js (campana:
// 'coordinacion') para no sumar una función serverless nueva — el plan
// Hobby de Vercel ya está en el límite de 12.
import { crearOEncontrarLista, agregarContactoALista, obtenerCampana, crearCampana } from './brevoClient.js'

const SENDER = { name: 'Experiencia del Cliente · Burs Advisory', email: 'noreply@comunidad.bursadvisory.com' }
const REPLY_TO = 'experienciaalcliente@bursadvisory.com'

function proximaFechaEnvioISO(diasDesdeHoy = 3) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + diasDesdeHoy)
  const y = d.getUTCFullYear(), m = String(d.getUTCMonth() + 1).padStart(2, '0'), day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}T10:00:00.000-05:00` // 10:00 hora Perú
}

async function crearYProgramarTanda({ supabase, segmento, tanda, config }) {
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
  for (const c of candidatos) {
    await agregarContactoALista({ email: c.email, nombre: c.nombre, listId })
  }

  const referencia = await obtenerCampana(config.brevo_campana_referencia_id)
  const scheduledAtISO = proximaFechaEnvioISO()
  const nuevaCampana = await crearCampana({
    name: `SEG_${segmento}_${tanda} — Correo 0 (${candidatos.length} contactos)`,
    subject: referencia.subject,
    previewText: referencia.previewText,
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

export async function ejecutarAccionCoordinacion({ supabase, accionId }) {
  const { data: accion, error } = await supabase.from('panel_acciones_pendientes').select('*').eq('id', accionId).maybeSingle()
  if (error) throw error
  if (!accion) throw new Error('Acción no encontrada')
  if (accion.estado !== 'pendiente') throw new Error(`La acción ya está en estado "${accion.estado}", no se puede ejecutar de nuevo`)

  const { data: config } = await supabase.from('recuperacion_2026_config').select('*').eq('segmento', accion.payload.segmento).maybeSingle()

  let resultado
  if (accion.tipo === 'email_marketing.siguiente_tanda') {
    resultado = await crearYProgramarTanda({ supabase, segmento: accion.payload.segmento, tanda: accion.payload.tanda_siguiente, config })
  } else if (accion.tipo === 'email_marketing.iniciar_segmento') {
    resultado = await crearYProgramarTanda({ supabase, segmento: accion.payload.segmento, tanda: 'Dia 1', config })
    if (resultado.ok) await supabase.from('recuperacion_2026_config').update({ campana_activa: true, updated_at: new Date().toISOString() }).eq('segmento', accion.payload.segmento)
  } else if (accion.tipo === 'email_marketing.detener_segmento') {
    await supabase.from('recuperacion_2026_config').update({ campana_activa: false, updated_at: new Date().toISOString() }).eq('segmento', accion.payload.segmento)
    resultado = { ok: true, mensaje: `Segmento ${accion.payload.segmento} detenido.` }
  } else {
    throw new Error(`Tipo de acción no reconocido: ${accion.tipo}`)
  }

  await supabase.from('panel_acciones_pendientes').update({
    estado: 'ejecutada', revisado_at: new Date().toISOString(), resultado,
  }).eq('id', accionId)

  await supabase.from('panel_log').insert({
    que: `${accion.resumen} → APROBADO y ejecutado.`,
    donde: 'Fase 3 — Email Marketing', agente: 'email_marketing',
  })

  return resultado
}
