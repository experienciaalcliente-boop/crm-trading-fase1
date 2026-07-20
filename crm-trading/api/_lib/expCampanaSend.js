// Envío de un correo de la secuencia del Plan Exalumnos a un lead puntual —
// compartido entre el cron diario y la activación inmediata del Correo 0.
// A diferencia de Plan Reactivate Burs (un wa_link único), acá el link de
// WhatsApp depende de la asesora asignada a este alumno_id específico.
import { randomUUID } from 'node:crypto'
import nodemailer from 'nodemailer'
import { construirCorreo, conPixelDeApertura, variantePara } from './expCampanaEmails.js'
import { waLinkPara } from './expCampanaAsesoras.js'

export async function enviarCorreoLead({ supabase, transporter, baseUrl, gmailUser, lead, correoNumero, fechaInicio }) {
  const token = randomUUID()
  const waUrl = `${baseUrl}/api/expcampana-track?t=${token}&e=click`
  const pixelUrl = `${baseUrl}/api/expcampana-track?t=${token}&e=open`

  const variante = variantePara(correoNumero)
  const waLinkDestino = waLinkPara(lead.asesora_id, variante)

  const { asunto, html } = construirCorreo(correoNumero, { nombre: lead.nombre, waUrl })
  const htmlConPixel = conPixelDeApertura(html, pixelUrl)

  await transporter.sendMail({
    from: `"BURS Advisory" <${gmailUser}>`,
    to: lead.email,
    subject: asunto,
    html: htmlConPixel,
  })

  await supabase.from('campana_exalumnos_envios').insert({
    alumno_id: lead.id,
    correo_numero: correoNumero,
    token,
  })

  await supabase.from('campana_exalumnos_alumnos').update({
    estado_campana: `Correo ${correoNumero} enviado`,
    ultimo_correo_enviado: correoNumero,
    fecha_inicio_campana: fechaInicio,
    fecha_ultimo_envio: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', lead.id)

  // El link real usado queda determinado en /api/expcampana-track al momento
  // del clic (busca de nuevo asesora_id+variante) — waLinkDestino solo se
  // calcula acá para validar que exista antes de enviar.
  if (!waLinkDestino) throw new Error(`Sin wa_link configurado para asesora ${lead.asesora_id} / variante ${variante}`)
}

export const dormir = (ms) => new Promise((r) => setTimeout(r, ms))

export function transporterGmailPool() {
  return nodemailer.createTransport({
    service: 'gmail',
    pool: true,
    maxConnections: 8,
    maxMessages: Infinity,
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  })
}

export async function procesarEnLotes(items, concurrencia, fn) {
  let enviados = 0
  let errores = 0
  for (let i = 0; i < items.length; i += concurrencia) {
    const lote = items.slice(i, i + concurrencia)
    const resultados = await Promise.allSettled(lote.map(fn))
    for (const r of resultados) {
      if (r.status === 'fulfilled') enviados++
      else { errores++; console.error('procesarEnLotes (exalumnos):', r.reason) }
    }
  }
  return { enviados, errores }
}
