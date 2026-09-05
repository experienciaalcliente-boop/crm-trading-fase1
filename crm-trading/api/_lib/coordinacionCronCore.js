// Ciclo diario del agente de Email Marketing del Panel de Coordinación.
// Corre dentro del mismo cron que ya dispara Reactivate Burs y Plan
// Exalumnos (api/reactivate-cron.js) — el plan Hobby de Vercel limita a 2
// crons y ya estaban ambos slots ocupados, así que este ciclo se suma al
// cron existente en vez de pedir uno nuevo.
//
// El agente NUNCA envía nada por su cuenta: solo lee métricas de Brevo y
// escribe una propuesta en panel_acciones_pendientes. La ejecución real
// (crear la próxima tanda en Brevo) ocurre en coordinacionEjecutar.js,
// solo cuando el supervisor aprueba desde el panel.
import { obtenerCampana } from './brevoClient.js'

const ORDEN_TANDA = ['Dia 1', 'Dia 2', 'Dia 3']
const HORAS_MIN_ANTES_DE_EVALUAR = 48 // sección 6 del informe: se lee 2 días después del envío

function siguienteTanda(tanda) {
  const i = ORDEN_TANDA.indexOf(tanda)
  return i >= 0 && i < ORDEN_TANDA.length - 1 ? ORDEN_TANDA[i + 1] : null
}

async function existeAccionAbierta(supabase, tipo, segmento) {
  const { data } = await supabase
    .from('panel_acciones_pendientes')
    .select('id')
    .eq('agente', 'email_marketing')
    .eq('tipo', tipo)
    .eq('estado', 'pendiente')
    .contains('payload', { segmento })
    .limit(1)
  return (data || []).length > 0
}

export async function ejecutarCicloDiarioCoordinacion({ supabase }) {
  if (!process.env.BREVO_API_KEY) {
    return { ok: true, saltado: 'BREVO_API_KEY no configurada todavía' }
  }

  const resumen = { revisadas: 0, marcadasEnviadas: 0, propuestas: 0, errores: [] }

  // 1) Tandas "programada" cuya campaña de Brevo ya salió → pasan a "enviada"
  //    y se actualiza el estado de los alumnos de esa tanda.
  const { data: programadas } = await supabase.from('recuperacion_2026_tandas').select('*').eq('estado', 'programada')
  for (const tanda of programadas || []) {
    resumen.revisadas++
    try {
      const campana = await obtenerCampana(tanda.brevo_campaign_id)
      if (campana.status !== 'sent') continue
      await supabase.from('recuperacion_2026_tandas').update({ estado: 'enviada', enviada_at: new Date().toISOString() }).eq('id', tanda.id)
      await supabase.from('recuperacion_2026_alumnos')
        .update({ estado_campana: 'Correo 0 enviado', fecha_inicio_campana: new Date().toISOString().slice(0, 10), fecha_ultimo_envio: new Date().toISOString(), ultimo_correo_enviado: 0 })
        .eq('segmento', tanda.segmento).eq('tanda', tanda.tanda).eq('estado_campana', 'Pendiente')
      await supabase.from('panel_log').insert({
        que: `Campaña ${tanda.segmento}/${tanda.tanda} confirmada como enviada en Brevo.`,
        donde: 'Fase 3 — Email Marketing', agente: 'email_marketing',
      })
      resumen.marcadasEnviadas++
    } catch (err) {
      resumen.errores.push(`tanda ${tanda.id}: ${err.message}`)
    }
  }

  // 2) Tandas "enviada" sin evaluar, con al menos 48h desde el envío →
  //    aplicar las reglas de escalamiento del informe (sección 6) y
  //    proponer la siguiente acción.
  const { data: enviadas } = await supabase.from('recuperacion_2026_tandas').select('*').eq('estado', 'enviada').is('evaluada_at', null)
  for (const tanda of enviadas || []) {
    try {
      const horasDesdeEnvio = (Date.now() - new Date(tanda.enviada_at).getTime()) / 3600000
      if (horasDesdeEnvio < HORAS_MIN_ANTES_DE_EVALUAR) continue

      const campana = await obtenerCampana(tanda.brevo_campaign_id)
      const g = campana.statistics?.globalStats || {}
      const delivered = g.delivered || 0
      if (delivered === 0) continue // sin entregas aún, no hay nada que medir

      const tasaReboteDuro = (g.hardBounces || 0) / delivered
      const tasaQuejas = (g.complaints || 0) / delivered
      const tasaApertura = g.opensRate ?? ((g.uniqueViews || 0) / delivered)
      const metricas = { delivered, hardBounces: g.hardBounces || 0, complaints: g.complaints || 0, uniqueViews: g.uniqueViews || 0, tasaReboteDuro, tasaQuejas, tasaApertura }

      let decision, resumenTexto, tipoAccion, payloadExtra = {}
      if (tasaQuejas > 0.003) {
        decision = 'detener'
        resumenTexto = `Segmento ${tanda.segmento}/${tanda.tanda}: quejas de spam en ${(tasaQuejas * 100).toFixed(2)}% (umbral 0.3%). Se recomienda detener la campaña completa y revisar.`
        tipoAccion = 'email_marketing.detener_segmento'
      } else if (tasaReboteDuro > 0.03) {
        decision = 'detener'
        resumenTexto = `Segmento ${tanda.segmento}/${tanda.tanda}: rebote duro en ${(tasaReboteDuro * 100).toFixed(2)}% (umbral 3%). Se recomienda detener el escalamiento y revisar la calidad de la base.`
        tipoAccion = 'email_marketing.detener_segmento'
      } else if (tasaReboteDuro < 0.02 && tasaApertura >= 0.15) {
        const siguiente = siguienteTanda(tanda.tanda)
        if (siguiente) {
          decision = 'escalar'
          resumenTexto = `Segmento ${tanda.segmento}/${tanda.tanda}: rebote ${(tasaReboteDuro * 100).toFixed(2)}%, apertura ${(tasaApertura * 100).toFixed(1)}% — dentro de rango. Se recomienda escalar a ${siguiente}.`
          tipoAccion = 'email_marketing.siguiente_tanda'
          payloadExtra = { tanda_siguiente: siguiente }
        } else {
          decision = 'ultima_tanda_ok'
          resumenTexto = `Segmento ${tanda.segmento}: ${tanda.tanda} (última tanda) cerró dentro de rango. No queda tanda siguiente que escalar dentro de este segmento.`
        }
      } else {
        decision = 'revisar'
        resumenTexto = `Segmento ${tanda.segmento}/${tanda.tanda}: apertura ${(tasaApertura * 100).toFixed(1)}% (bajo el 15% esperado). Se recomienda revisar asunto y remitente antes de continuar.`
        tipoAccion = null
      }

      await supabase.from('recuperacion_2026_tandas').update({ evaluada_at: new Date().toISOString(), metricas, decision }).eq('id', tanda.id)
      await supabase.from('panel_log').insert({ que: resumenTexto, donde: 'Fase 3 — Email Marketing', agente: 'email_marketing' })

      if (tipoAccion && !(await existeAccionAbierta(supabase, tipoAccion, tanda.segmento))) {
        await supabase.from('panel_acciones_pendientes').insert({
          agente: 'email_marketing', tipo: tipoAccion, resumen: resumenTexto,
          payload: { segmento: tanda.segmento, tanda_actual: tanda.tanda, metricas, ...payloadExtra },
        })
        resumen.propuestas++
      }
    } catch (err) {
      resumen.errores.push(`tanda ${tanda.id}: ${err.message}`)
    }
  }

  return { ok: true, ...resumen }
}
