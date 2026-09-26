// Envío de un correo de la secuencia Reactivate Burs a un alumno puntual —
// compartido entre el cron diario (api/reactivate-cron.js) y la activación
// inmediata del Correo 0 (api/reactivate-activar.js), para no duplicar la
// lógica de armar el correo + registrar el envío + actualizar el estado.
import { randomUUID } from 'node:crypto'
import { enviarCorreoTransaccional } from './brevoClient.js'
import { construirCorreo, construirCorreoCierre, conPixelDeApertura, CORREO_NUMERO_CIERRE } from './reactivateEmails.js'

export async function enviarCorreoAlumno({ supabase, transporter, baseUrl, remitente, alumno, correoNumero, testimonioUrls, fechaInicio }) {
  const token = randomUUID()
  const waUrl = `${baseUrl}/api/reactivate-track?t=${token}&e=click`
  const pixelUrl = `${baseUrl}/api/reactivate-track?t=${token}&e=open`

  const { asunto, html } = construirCorreo(correoNumero, { nombre: alumno.nombre, waUrl, testimonioUrls, baseUrl })
  const htmlConPixel = conPixelDeApertura(html, pixelUrl)

  await transporter.sendMail({
    from: `"BURS Advisory" <${remitente}>`,
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

// Correo de cierre — envío único y manual, a los 399 alumnos de Reactivate
// Burs, todos con saldo pendiente real. No forma parte de la secuencia
// Correo 0-6.
export async function enviarCorreoCierreAlumno({ supabase, transporter, baseUrl, remitente, alumno }) {
  const token = randomUUID()
  const waUrl = `${baseUrl}/api/reactivate-track?t=${token}&e=click`
  const pixelUrl = `${baseUrl}/api/reactivate-track?t=${token}&e=open`

  const { asunto, html } = construirCorreoCierre({ nombre: alumno.nombre, waUrl, baseUrl })
  const htmlConPixel = conPixelDeApertura(html, pixelUrl)

  await transporter.sendMail({
    from: `"BURS Advisory" <${remitente}>`,
    to: alumno.email,
    subject: asunto,
    html: htmlConPixel,
  })

  await supabase.from('reactivate_envios').insert({
    alumno_id: alumno.id,
    correo_numero: CORREO_NUMERO_CIERRE,
    token,
  })

  await supabase.from('reactivate_alumnos').update({
    estado_campana: 'Cierre enviado',
    fecha_ultimo_envio: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', alumno.id)
}

export const dormir = (ms) => new Promise((r) => setTimeout(r, ms))

// Adaptador de envío sobre la API transaccional de Brevo. Expone la misma
// forma que tenía el transporter de nodemailer (`sendMail` + `close`) a
// propósito: así el resto de la secuencia —plantillas, anclaje por alumno,
// tokens de tracking, estados en Supabase— quedó intacta al migrar desde el
// SMTP de Gmail, que se retiró el 2026-09-26 (la app password caducó y
// reponerla habría duplicado campañas sobre 386 alumnos que ya están en la
// recuperación 2026 de Brevo).
//
// `close()` es un no-op: sobre HTTP no hay conexión persistente que cerrar,
// pero se mantiene para no tener que tocar los call sites que ya lo llaman.
const REMITENTE_NOMBRE = 'BURS Advisory'

// Acepta tanto `"Nombre" <correo@dominio>` como un correo suelto, porque los
// call sites arman el `from` en el primer formato.
function parsearRemitente(from) {
  const conNombre = /^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/.exec(from || '')
  if (conNombre) return { name: (conNombre[1] || REMITENTE_NOMBRE).trim(), email: conNombre[2].trim() }
  return { name: REMITENTE_NOMBRE, email: (from || '').trim() }
}

export function transporterBrevo() {
  return {
    async sendMail({ from, to, subject, html }) {
      return enviarCorreoTransaccional({
        sender: parsearRemitente(from),
        to,
        subject,
        htmlContent: html,
      })
    },
    close() {},
  }
}

// Remitente verificado en Brevo. Es el mismo subdominio que ya usan las
// campañas de recuperación 2026 — mantener los envíos fuera del dominio
// principal protege la reputación del correo con el que se atiende a los
// alumnos activos.
export function remitenteBrevo() {
  return process.env.BREVO_SENDER_EMAIL || 'noreply@comunidad.bursadvisory.com'
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
