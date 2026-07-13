// Endpoint público (sin auth de sesión) que sirve dos propósitos:
//   ?e=open  -> píxel de apertura embebido en el correo, registra que se abrió
//   ?e=click -> registra el clic en el botón de WhatsApp y redirige al asesor
// El token (uuid impredecible por envío) es la única "credencial" — suficiente
// para este caso de uso de bajo riesgo (solo marca aperturas/clics, no expone datos).
import { createClient } from '@supabase/supabase-js'

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
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabase = createClient(supabaseUrl, serviceKey)

  // Fallback seguro: si algo falla, un píxel igual no debe romper el correo,
  // y un clic igual debe llevar al alumno a WhatsApp (mejor UX que un error).
  const irAWhatsappPorSiFalla = async () => {
    const { data } = await supabase.from('reactivate_config').select('wa_link').eq('id', 'default').maybeSingle()
    res.writeHead(302, { Location: data?.wa_link || 'https://wa.link/453x5y' })
    return res.end()
  }

  try {
    if (!token || (evento !== 'open' && evento !== 'click')) {
      return evento === 'click' ? irAWhatsappPorSiFalla() : servirPixel(res)
    }

    const { data: envio } = await supabase
      .from('reactivate_envios')
      .select('id, alumno_id, abierto, abierto_count, click, click_count')
      .eq('token', token)
      .maybeSingle()

    if (!envio) {
      return evento === 'click' ? irAWhatsappPorSiFalla() : servirPixel(res)
    }

    if (evento === 'open') {
      await supabase.from('reactivate_envios').update({
        abierto: true,
        abierto_at: envio.abierto ? undefined : new Date().toISOString(),
        abierto_count: (envio.abierto_count || 0) + 1,
      }).eq('id', envio.id)
      return servirPixel(res)
    }

    // evento === 'click'
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

    // No retrocedemos el estado si el alumno ya avanzó más allá de "Interesado"
    // (por ejemplo si vuelve a hacer clic en un correo viejo tras ya haber
    // sido contactado por el asesor).
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
    res.writeHead(302, { Location: config?.wa_link || 'https://wa.link/453x5y' })
    return res.end()
  } catch (err) {
    console.error('reactivate-track:', err)
    return evento === 'click' ? irAWhatsappPorSiFalla() : servirPixel(res)
  }
}
