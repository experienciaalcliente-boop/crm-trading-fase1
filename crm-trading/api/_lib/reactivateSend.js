// Envío de un correo de la secuencia Reactivate Burs a un alumno puntual —
// compartido entre el cron diario (api/reactivate-cron.js) y la activación
// inmediata del Correo 0 (api/reactivate-activar.js), para no duplicar la
// lógica de armar el correo + registrar el envío + actualizar el estado.
import { randomUUID } from 'node:crypto'
import nodemailer from 'nodemailer'
import { construirCorreo, conPixelDeApertura } from './reactivateEmails.js'

export async function enviarCorreoAlumno({ supabase, transporter, baseUrl, gmailUser, alumno, correoNumero, testimonioUrls, fechaInicio }) {
  const token = randomUUID()
  const waUrl = `${baseUrl}/api/reactivate-track?t=${token}&e=click`
  const pixelUrl = `${baseUrl}/api/reactivate-track?t=${token}&e=open`

  const { asunto, html } = construirCorreo(correoNumero, { nombre: alumno.nombre, waUrl, testimonioUrls, baseUrl })
  const htmlConPixel = conPixelDeApertura(html, pixelUrl)

  await transporter.sendMail({
    from: `"BURS Advisory" <${gmailUser}>`,
    to: alumno.email,
    subject: asunto,
    html: htmlConPixel,
  })

  await supabase.from('reactivate_envios').insert({
    alumno_id: alumno.id,
    correo_numero: correoNumero,
    token,
  })

  await supabase.from('reactivate_alumnos').update({
    estado_campana: `Correo ${correoNumero} enviado`,
    ultimo_correo_enviado: correoNumero,
    fecha_inicio_campana: fechaInicio,
    fecha_ultimo_envio: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', alumno.id)
}

export const dormir = (ms) => new Promise((r) => setTimeout(r, ms))

export function transporterGmailPool() {
  // pool:true reutiliza conexiones SMTP en vez de abrir una nueva por
  // correo — con cientos de alumnos el costo de conexión+TLS por envío
  // vuelve el proceso demasiado lento para el límite de tiempo de una
  // función serverless si se hiciera una a la vez.
  return nodemailer.createTransport({
    service: 'gmail',
    pool: true,
    maxConnections: 8,
    maxMessages: Infinity,
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  })
}

// Procesa `items` en lotes concurrentes (en vez de uno a uno con espera),
// para que enviar varios cientos de correos quepa dentro del tiempo máximo
// de una función serverless. Si la función se corta a mitad de camino, el
// estado ya guardado en cada alumno hace que una nueva corrida solo
// continúe con los pendientes — no se duplica ningún envío.
export async function procesarEnLotes(items, concurrencia, fn) {
  let enviados = 0
  let errores = 0
  for (let i = 0; i < items.length; i += concurrencia) {
    const lote = items.slice(i, i + concurrencia)
    const resultados = await Promise.allSettled(lote.map(fn))
    for (const r of resultados) {
      if (r.status === 'fulfilled') enviados++
      else { errores++; console.error('procesarEnLotes:', r.reason) }
    }
  }
  return { enviados, errores }
}
