// Endpoint público (sin auth de sesión) que sirve dos propósitos:
//   ?e=open  -> píxel de apertura embebido en el correo, registra que se abrió
//   ?e=click -> registra el clic en el botón de WhatsApp y redirige al asesor
// El token (uuid impredecible por envío) es la única "credencial".
//
// Atiende AMBAS campañas (Plan Reactivate Burs y Plan Exalumnos) con el
// mismo archivo — busca el token primero en reactivate_envios y, si no
// aparece, en campana_exalumnos_envios (los tokens son UUID aleatorios,
// la chance de colisión entre ambas tablas es nula). Así se evita sumar
// una función serverless más — el plan Hobby de Vercel limita a 12.
import { createClient } from '@supabase/supabase-js'
import { waLinkPara } from './_lib/expCampanaAsesoras.js'
import { variantePara } from './_lib/expCampanaEmails.js'

const PIXEL_1X1 = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBTAA7',
  'base64'
)
const FALLBACK_WA = 'https://wa.link/453x5y'

function servirPixel(res) {
  res.setHeader('Content-Type', 'image/gif')
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  return res.status(200).send(PIXEL_1X1)
}

async function trackReactivateBurs(supabase, token, evento, res) {
  const irAWhatsappPorSiFalla = async () => {
    const { data } = await supabase.from('reactivate_config').select('wa_link').eq('id', 'default').maybeSingle()
    res.writeHead(302, { Location: data?.wa_link || FALLBACK_WA })
    return res.end()
  }

  const { data: envio } = await supabase
    .from('reactivate_envios')
    .select('id, alumno_id, abierto, abierto_count, click, click_count')
    .eq('token', token)
    .maybeSingle()

  if (!envio) return null // no es de esta campaña — el caller prueba la otra

  if (evento === 'open') {
    await supabase.from('reactivate_envios').update({
      abierto: true,
      abierto_at: envio.abierto ? undefined : new Date().toISOString(),
      abierto_count: (envio.abierto_count || 0) + 1,
    }).eq('id', envio.id)
    return servirPixel(res)
  }

  await supabase.from('reactivate_envios').update({
    click: true,
    click_at: envio.click ? undefined : new Date().toISOString(),
    click_count: (envio.click_count || 0) + 1,
  }).eq('id', envio.id)

  const { data: alumno } = await supabase
    .from('reactivate_alumnos')
    .select('id, estado_campana, primer_click_at')
    .eq('id', envio.alumno_id)
    .maybeSingle()

  const ESTADOS_AVANZADOS = ['Contactado', 'Negociación', 'Reactivado', 'No interesado']
  if (alumno && !ESTADOS_AVANZADOS.includes(alumno.estado_campana)) {
    await supabase.from('reactivate_alumnos').update({
      estado_campana: 'Interesado',
      primer_click_at: alumno.primer_click_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', alumno.id)

    await supabase.from('reactivate_seguimiento').insert({
      alumno_id: alumno.id,
      estado_anterior: alumno.estado_campana,
      estado_nuevo: 'Interesado',
      nota: 'Clic automático en el botón de WhatsApp del correo.',
      registrado_por: 'Sistema (tracking automático)',
    })
  }

  const { data: config } = await supabase.from('reactivate_config').select('wa_link').eq('id', 'default').maybeSingle()
  res.writeHead(302, { Location: config?.wa_link || FALLBACK_WA })
  return res.end()
}

async function trackExalumnos(supabase, token, evento, res) {
  const { data: envio } = await supabase
    .from('campana_exalumnos_envios')
    .select('id, alumno_id, correo_numero, abierto, abierto_count, click, click_count')
    .eq('token', token)
    .maybeSingle()

  if (!envio) return null // no es de esta campaña tampoco

  if (evento === 'open') {
    await supabase.from('campana_exalumnos_envios').update({
      abierto: true,
      abierto_at: envio.abierto ? undefined : new Date().toISOString(),
      abierto_count: (envio.abierto_count || 0) + 1,
    }).eq('id', envio.id)
    return servirPixel(res)
  }

  await supabase.from('campana_exalumnos_envios').update({
    click: true,
    click_at: envio.click ? undefined : new Date().toISOString(),
    click_count: (envio.click_count || 0) + 1,
  }).eq('id', envio.id)

  const { data: lead } = await supabase
    .from('campana_exalumnos_alumnos')
    .select('id, asesora_id, estado_campana, primer_click_at')
    .eq('id', envio.alumno_id)
    .maybeSingle()

  const ESTADOS_AVANZADOS = ['Contactado', 'Negociación', 'Reactivado', 'No interesado']
  if (lead && !ESTADOS_AVANZADOS.includes(lead.estado_campana)) {
    await supabase.from('campana_exalumnos_alumnos').update({
      estado_campana: 'Interesado',
      primer_click_at: lead.primer_click_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', lead.id)

    await supabase.from('campana_exalumnos_seguimiento').insert({
      alumno_id: lead.id,
      estado_anterior: lead.estado_campana,
      estado_nuevo: 'Interesado',
      nota: 'Clic automático en el botón de WhatsApp del correo.',
      registrado_por: 'Sistema (tracking automático)',
    })
  }

  const variante = variantePara(envio.correo_numero)
  const destino = (lead && waLinkPara(lead.asesora_id, variante)) || FALLBACK_WA
  res.writeHead(302, { Location: destino })
  return res.end()
}

// Webhook de Brevo (segmentos de recuperación A-D). Brevo manda POST con
// {event, email, camp_id, ...} — no trae token propio, se correlaciona por
// email + camp_id contra recuperacion_2026_tandas/alumnos. Reusa este mismo
// archivo (por método, no por ruta) para no sumar una función serverless
// más al límite de 12 del plan Hobby.
async function procesarEventoBrevo(supabase, evt) {
  const { event, email, camp_id } = evt || {}
  if (!event || !email || camp_id === undefined) return

  const { data: tanda } = await supabase
    .from('recuperacion_2026_tandas').select('segmento')
    .eq('brevo_campaign_id', parseInt(camp_id)).maybeSingle()
  if (!tanda) return // no es una campaña de recuperación 2026 (o es de otro proyecto en la misma cuenta Brevo)

  const { data: alumno } = await supabase
    .from('recuperacion_2026_alumnos').select('id')
    .eq('email', email).eq('segmento', tanda.segmento).maybeSingle()
  if (!alumno) return

  const campos = {}
  if (event === 'opened') { campos.abierto = true; campos.abierto_at = new Date().toISOString() }
  else if (event === 'click') { campos.click = true; campos.click_at = new Date().toISOString() }
  else if (event === 'hardBounce') { campos.bounced = true; campos.bounced_hard = true }
  else if (event === 'softBounce') { campos.bounced = true }
  else if (event === 'spam') { campos.complaint = true }
  else return

  const { data: existente } = await supabase.from('recuperacion_2026_envios').select('id').eq('alumno_id', alumno.id).maybeSingle()
  if (existente) await supabase.from('recuperacion_2026_envios').update(campos).eq('id', existente.id)
  else await supabase.from('recuperacion_2026_envios').insert({ alumno_id: alumno.id, enviado_at: new Date().toISOString(), ...campos })
}

export default async function handler(req, res) {
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  if (req.method === 'POST') {
    const eventos = Array.isArray(req.body) ? req.body : [req.body]
    for (const evt of eventos) {
      try { await procesarEventoBrevo(supabase, evt) } catch (err) { console.error('reactivate-track (webhook Brevo):', err) }
    }
    return res.status(200).json({ ok: true })
  }

  const { t: token, e: evento } = req.query

  try {
    if (!token || (evento !== 'open' && evento !== 'click')) {
      if (evento === 'click') { res.writeHead(302, { Location: FALLBACK_WA }); return res.end() }
      return servirPixel(res)
    }

    const manejadoReactivate = await trackReactivateBurs(supabase, token, evento, res)
    if (manejadoReactivate !== null) return manejadoReactivate

    const manejadoExalumnos = await trackExalumnos(supabase, token, evento, res)
    if (manejadoExalumnos !== null) return manejadoExalumnos

    // Token no encontrado en ninguna de las dos campañas.
    if (evento === 'click') { res.writeHead(302, { Location: FALLBACK_WA }); return res.end() }
    return servirPixel(res)
  } catch (err) {
    console.error('reactivate-track:', err)
    if (evento === 'click') { res.writeHead(302, { Location: FALLBACK_WA }); return res.end() }
    return servirPixel(res)
  }
}
