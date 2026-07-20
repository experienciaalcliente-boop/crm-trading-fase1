// Endpoint público (sin auth de sesión) del Plan Exalumnos — mismo patrón
// que api/reactivate-track.js, pero el destino del clic depende de la
// asesora asignada al lead (no hay un wa_link único para toda la campaña).
import { createClient } from '@supabase/supabase-js'
import { waLinkPara } from './_lib/expCampanaAsesoras.js'
import { variantePara } from './_lib/expCampanaEmails.js'

const PIXEL_1X1 = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBTAA7',
  'base64'
)

function servirPixel(res) {
  res.setHeader('Content-Type', 'image/gif')
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  return res.status(200).send(PIXEL_1X1)
}

export default async function handler(req, res) {
  const { t: token, e: evento } = req.query
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const FALLBACK_WA = 'https://wa.link/mpxc5f'
  const irAWhatsappPorSiFalla = async () => {
    res.writeHead(302, { Location: FALLBACK_WA })
    return res.end()
  }

  try {
    if (!token || (evento !== 'open' && evento !== 'click')) {
      return evento === 'click' ? irAWhatsappPorSiFalla() : servirPixel(res)
    }

    const { data: envio } = await supabase
      .from('campana_exalumnos_envios')
      .select('id, alumno_id, correo_numero, abierto, abierto_count, click, click_count')
      .eq('token', token)
      .maybeSingle()

    if (!envio) {
      return evento === 'click' ? irAWhatsappPorSiFalla() : servirPixel(res)
    }

    if (evento === 'open') {
      await supabase.from('campana_exalumnos_envios').update({
        abierto: true,
        abierto_at: envio.abierto ? undefined : new Date().toISOString(),
        abierto_count: (envio.abierto_count || 0) + 1,
      }).eq('id', envio.id)
      return servirPixel(res)
    }

    // evento === 'click'
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
  } catch (err) {
    console.error('expcampana-track:', err)
    return evento === 'click' ? irAWhatsappPorSiFalla() : servirPixel(res)
  }
}
