// Vercel Cron (diario) — motor del Plan Reactivate Burs. Por cada exalumno
// activo en la campaña, decide si hoy le toca el siguiente correo de la
// secuencia (Día 1, 2, 4, 6, 8, 11, 14) y lo envía desde el Gmail configurado.
// Si `reactivate_config.campana_activa` está en false, no hace nada — así el
// supervisor controla el arranque desde el panel sin tocar código.
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'
import { randomUUID } from 'node:crypto'
import { construirCorreo, conPixelDeApertura, totalCorreos } from './_lib/reactivateEmails.js'

// Días transcurridos desde fecha_inicio_campana (día 1 = 0 transcurridos) en
// los que corresponde enviar el correo N según la sección 5 del plan.
const DIAS_PARA_CORREO = [0, 1, 3, 5, 7, 10, 13]
const DIAS_GRACIA_SIN_RESPUESTA = 3 // días de margen tras el Correo 6 antes de cerrar el ciclo

function supabaseAdmin() {
  return createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

function transporterGmail() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  })
}

function diasEntre(fechaISO, hoy) {
  const inicio = new Date(fechaISO + 'T00:00:00')
  return Math.floor((hoy - inicio) / (1000 * 60 * 60 * 24))
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms))

export default async function handler(req, res) {
  const auth = req.headers.authorization
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'No autorizado' })
  }

  const supabase = supabaseAdmin()
  const baseUrl = process.env.PUBLIC_APP_URL
  if (!baseUrl) {
    return res.status(500).json({ error: 'Falta configurar PUBLIC_APP_URL en las variables de entorno' })
  }

  try {
    const { data: config } = await supabase.from('reactivate_config').select('*').eq('id', 'default').maybeSingle()
    if (!config?.campana_activa) {
      return res.status(200).json({ ok: true, saltado: 'Campaña Reactivate Burs en pausa (campana_activa=false)' })
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

    const transporter = transporterGmail()
    const resultados = { enviados: 0, omitidos: 0, errores: 0, detalle: [] }

    for (const alumno of candidatos) {
      try {
        const esPrimerEnvio = !alumno.fecha_inicio_campana
        const fechaInicio = esPrimerEnvio ? hoyStr : alumno.fecha_inicio_campana
        const diasTranscurridos = esPrimerEnvio ? 0 : diasEntre(fechaInicio, hoy)
        const siguienteCorreo = (alumno.ultimo_correo_enviado ?? -1) + 1

        if (siguienteCorreo > 6) { resultados.omitidos++; continue }
        if (diasTranscurridos < DIAS_PARA_CORREO[siguienteCorreo]) { resultados.omitidos++; continue }

        const token = randomUUID()
        const waUrl = `${baseUrl}/api/reactivate-track?t=${token}&e=click`
        const pixelUrl = `${baseUrl}/api/reactivate-track?t=${token}&e=open`

        const { asunto, html } = construirCorreo(siguienteCorreo, {
          nombre: alumno.nombre,
          waUrl,
          testimonioUrls: { 1: config.testimonio_url_1, 2: config.testimonio_url_2 },
        })
        const htmlConPixel = conPixelDeApertura(html, pixelUrl)

        await transporter.sendMail({
          from: `"BURS Advisory" <${process.env.GMAIL_USER}>`,
          to: alumno.email,
          subject: asunto,
          html: htmlConPixel,
        })

        await supabase.from('reactivate_envios').insert({
          alumno_id: alumno.id,
          correo_numero: siguienteCorreo,
          token,
        })

        await supabase.from('reactivate_alumnos').update({
          estado_campana: `Correo ${siguienteCorreo} enviado`,
          ultimo_correo_enviado: siguienteCorreo,
          fecha_inicio_campana: fechaInicio,
          fecha_ultimo_envio: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('id', alumno.id)

        resultados.enviados++
        resultados.detalle.push({ alumno: alumno.nombre, correo: siguienteCorreo })
        await dormir(300) // espaciar envíos, cuidar límites de Gmail y deliverability
      } catch (errAlumno) {
        console.error('reactivate-cron, alumno', alumno.id, errAlumno)
        resultados.errores++
      }
    }

    return res.status(200).json({ ok: true, ...resultados })
  } catch (err) {
    console.error('reactivate-cron:', err)
    return res.status(500).json({ error: err.message || 'Error interno' })
  }
}
