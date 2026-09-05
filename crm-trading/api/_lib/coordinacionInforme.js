// Agente Organizador — informe mensual automático. Corre dentro del mismo
// cron diario (ver reactivate-cron.js) pero solo actúa el último viernes
// de cada mes y una sola vez por mes (dedup vía panel_supuestos), tal
// como define la cadencia ya fijada en el Mapa Operativo.
import { generarResumen } from './geminiClient.js'
import { agregarAlFinalDelDocumento } from './googleDocsClient.js'
import { fetchTodosPaginado } from './expCampanaCronCore.js'

// ID del "Informe de avance a gerencia" (no es secreto, es solo un
// identificador de documento — el acceso real lo protege el compartir
// el Doc con la cuenta de servicio, no este ID).
const INFORME_DOC_ID = '1mCJF3w_PzOwLUmamo4CV3sQj-SEzQ32bD47odIFgEV4'

function esUltimoViernesDelMes(hoy) {
  if (hoy.getDay() !== 5) return false // 5 = viernes
  const enUnaSemana = new Date(hoy)
  enUnaSemana.setDate(hoy.getDate() + 7)
  return enUnaSemana.getMonth() !== hoy.getMonth()
}

async function obtenerSupuesto(supabase, clave, def = 0) {
  const { data } = await supabase.from('panel_supuestos').select('valor').eq('clave', clave).maybeSingle()
  return data ? parseFloat(data.valor) : def
}

export async function actualizarInformeMensual({ supabase, forzar = false }) {
  if (!process.env.GEMINI_API_KEY || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
    return { ok: true, saltado: 'GEMINI_API_KEY / credenciales de Google no configuradas todavía' }
  }

  const hoy = new Date()
  if (!forzar && !esUltimoViernesDelMes(hoy)) return { ok: true, saltado: 'No es el último viernes del mes' }

  const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
  if (!forzar) {
    const { data: yaCorrio } = await supabase.from('panel_supuestos').select('valor').eq('clave', 'informe_mensual_ultimo_mes').maybeSingle()
    if (yaCorrio?.valor === mesActual) return { ok: true, saltado: `Ya se generó el informe de ${mesActual}` }
  }

  // 1) Números reales — calculados acá, nunca por Gemini.
  const { data: segmentos } = await supabase.from('recuperacion_2026_alumnos').select('segmento, estado_campana, excluido')
  const activos = (segmentos || []).filter(s => !s.excluido)
  const reactivados = activos.filter(s => ['Interesado', 'Contactado', 'Negociación', 'Reactivado'].includes(s.estado_campana)).length
  const enSecuencia = activos.filter(s => (s.estado_campana || '').startsWith('Correo')).length

  // PostgREST tope 1000 filas por página — campana_exalumnos_alumnos tiene
  // ~3200, así que hay que paginar (mismo patrón ya usado en
  // expCampanaCronCore.js) o el conteo queda truncado en 1000.
  const levelUp = await fetchTodosPaginado((desde, hasta) =>
    supabase.from('campana_exalumnos_alumnos').select('estado_campana, excluido').order('id').range(desde, hasta)
  )
  const levelUpActivos = levelUp.filter(l => !l.excluido)
  const levelUpInteresados = levelUpActivos.filter(l => ['Interesado', 'Contactado', 'Negociación'].includes(l.estado_campana)).length

  const { data: ventasImpulso } = await supabase.from('ventas_complementos').select('valor_producto').ilike('complemento', 'Impulso%')
  const impulsoUSD = (ventasImpulso || []).reduce((s, v) => s + (parseFloat(v.valor_producto) || 0), 0)

  const { data: tareas } = await supabase.from('panel_tareas').select('estado')
  const tareasHechas = (tareas || []).filter(t => t.estado === 'Hecho').length

  const datos = {
    fecha: hoy.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' }),
    retencion_actual_pct: Math.round((await obtenerSupuesto(supabase, 'retencion_actual', 0)) * 100),
    meta_retencion_pct: Math.round((await obtenerSupuesto(supabase, 'meta_retencion', 0.85)) * 100),
    segmentos_contactables: activos.length,
    segmentos_en_secuencia: enSecuencia,
    segmentos_en_conversacion_o_reactivados: reactivados,
    levelup_total: levelUpActivos.length,
    levelup_interesados: levelUpInteresados,
    impulso_ventas_usd: Math.round(impulsoUSD),
    tareas_hechas: tareasHechas,
    tareas_total: (tareas || []).length,
  }

  // 2) Prosa — Gemini solo redacta, con los números ya fijos en el prompt.
  const prompt = `Redacta un párrafo breve (120-160 palabras), en español formal de Perú, tono institucional (mismo registro que un informe de avance a gerencia, sin lenguaje de marketing ni exclamaciones), resumiendo el avance del área de Experiencia del Cliente de Burs Advisory al ${datos.fecha}.

Usa EXACTAMENTE estos datos, sin inventar ni redondear de forma distinta a como se dan:
- Retención actual: ${datos.retencion_actual_pct}% (meta ${datos.meta_retencion_pct}%)
- Cartera de recuperación: ${datos.segmentos_contactables} contactos activos en la campaña de segmentos A-D, ${datos.segmentos_en_secuencia} ya en la secuencia de correos, ${datos.segmentos_en_conversacion_o_reactivados} en conversación o reactivados
- Level Up (Plan Exalumnos): ${datos.levelup_total} contactos, ${datos.levelup_interesados} interesados o en conversación
- Impulso BURS: USD ${datos.impulso_ventas_usd} vendidos hasta la fecha
- Plan 90 días: ${datos.tareas_hechas} de ${datos.tareas_total} tareas completadas

No agregues ninguna cifra que no esté en esta lista. No repitas la fecha en el texto (ya va en el encabezado). Empieza directo con el resumen.`

  const parrafo = await generarResumen(prompt)

  // 3) Se agrega al final del Doc — nunca se edita ni se borra nada existente.
  const encabezado = forzar
    ? `— Prueba manual del agente Organizador · ${datos.fecha} (no cuenta como el informe del mes) —`
    : `— Actualización automática · Agente Organizador · ${datos.fecha} —`
  await agregarAlFinalDelDocumento(INFORME_DOC_ID, `${encabezado}\n${parrafo}`)

  if (!forzar) {
    await supabase.from('panel_supuestos').upsert({
      clave: 'informe_mensual_ultimo_mes', valor: mesActual, nota: 'Dedup del agente Organizador — no editar a mano', updated_at: new Date().toISOString(),
    })
  }
  await supabase.from('panel_log').insert({
    que: `Informe mensual generado y agregado al final del Doc de gerencia (${datos.tareas_hechas}/${datos.tareas_total} tareas, retención ${datos.retencion_actual_pct}%).`,
    donde: 'Fase 5 — Organizador', agente: 'organizador',
  })

  return { ok: true, generado: true, datos }
}
