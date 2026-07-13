// Envía UN correo de prueba (Correo 1 de la secuencia) a la dirección que
// indique el supervisor desde el panel — no toca la base de datos ni cuenta
// como envío real de campaña. Sirve para validar que GMAIL_USER /
// GMAIL_APP_PASSWORD / PUBLIC_APP_URL están bien configurados antes de
// activar la campaña de verdad. Mismo patrón de acceso que api/zoom-meeting.js
// (sin verificación de rol propia — la página que lo llama ya está protegida
// para supervisor en el frontend).
import nodemailer from 'nodemailer'
import { randomUUID } from 'node:crypto'
import { construirCorreo, conPixelDeApertura } from './_lib/reactivateEmails.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' })

  const { destinatario } = req.body || {}
  if (!destinatario) return res.status(400).json({ error: 'Falta el destinatario' })

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return res.status(500).json({ error: 'GMAIL_USER / GMAIL_APP_PASSWORD no están configurados en el servidor' })
  }
  if (!process.env.PUBLIC_APP_URL) {
    return res.status(500).json({ error: 'PUBLIC_APP_URL no está configurado en el servidor' })
  }

  try {
    const token = randomUUID() // token de prueba, no queda registrado en reactivate_envios
    const baseUrl = process.env.PUBLIC_APP_URL
    const { asunto, html } = construirCorreo(1, {
      nombre: 'Alumno de Prueba',
      waUrl: `${baseUrl}/api/reactivate-track?t=${token}&e=click`,
      testimonioUrls: {},
    })
    const htmlConPixel = conPixelDeApertura(html, `${baseUrl}/api/reactivate-track?t=${token}&e=open`)

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    })

    await transporter.sendMail({
      from: `"BURS Advisory" <${process.env.GMAIL_USER}>`,
      to: destinatario,
      subject: `[PRUEBA] ${asunto}`,
      html: htmlConPixel,
    })

    return res.status(200).json({ ok: true, mensaje: `Correo de prueba enviado a ${destinatario}` })
  } catch (err) {
    console.error('reactivate-test-send:', err)
    return res.status(500).json({ error: err.message || 'Error al enviar el correo de prueba' })
  }
}
