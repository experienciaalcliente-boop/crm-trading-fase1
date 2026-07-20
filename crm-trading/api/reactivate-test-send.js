// Envía UN correo de prueba a la dirección indicada — no toca la base de
// datos ni cuenta como envío real. Atiende ambas campañas (body.campana)
// con el mismo archivo, ver nota en api/reactivate-activar.js sobre el
// límite de funciones del plan Hobby.
import nodemailer from 'nodemailer'
import { randomUUID } from 'node:crypto'
import { construirCorreo as construirCorreoReactivate, conPixelDeApertura } from './_lib/reactivateEmails.js'
import { construirCorreo as construirCorreoExalumnos, variantePara } from './_lib/expCampanaEmails.js'
import { waLinkPara } from './_lib/expCampanaAsesoras.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' })

  const { destinatario, campana, correoNumero, asesoraId } = req.body || {}
  if (!destinatario) return res.status(400).json({ error: 'Falta el destinatario' })

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return res.status(500).json({ error: 'GMAIL_USER / GMAIL_APP_PASSWORD no están configurados en el servidor' })
  }
  if (!process.env.PUBLIC_APP_URL) {
    return res.status(500).json({ error: 'PUBLIC_APP_URL no está configurado en el servidor' })
  }

  try {
    const esExalumnos = campana === 'exalumnos'
    const token = randomUUID() // token de prueba, no queda registrado en ninguna tabla
    const baseUrl = process.env.PUBLIC_APP_URL
    const pixelUrl = `${baseUrl}/api/reactivate-track?t=${token}&e=open`

    const numero = Number.isInteger(correoNumero) ? correoNumero : 0
    // Un correo de prueba nunca queda registrado en campana_exalumnos_envios
    // (a propósito, para no ensuciar datos de campaña) — así que el
    // endpoint de tracking no podría saber a qué asesora pertenece y caería
    // al link genérico de respaldo. Para poder VERIFICAR el enrutamiento
    // real, el botón de un correo de prueba de Exalumnos usa directo el
    // wa.link de la asesora elegida (sin pasar por el redirect de tracking).
    const waUrl = esExalumnos
      ? waLinkPara(asesoraId, variantePara(numero))
      : `${baseUrl}/api/reactivate-track?t=${token}&e=click`

    const { asunto, html } = esExalumnos
      ? construirCorreoExalumnos(numero, { nombre: 'Alumno de Prueba', waUrl })
      : construirCorreoReactivate(1, { nombre: 'Alumno de Prueba', waUrl, testimonioUrls: {} })
    const htmlConPixel = conPixelDeApertura(html, pixelUrl)

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
