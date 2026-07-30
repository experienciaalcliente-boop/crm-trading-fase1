// Envío de un correo de la secuencia del Plan Exalumnos a un lead puntual —
// compartido entre el cron diario y la activación inmediata del Correo 0.
// A diferencia de Plan Reactivate Burs (un wa_link único), acá el link de
// WhatsApp depende de la asesora asignada a este alumno_id específico.
import { randomUUID } from 'node:crypto'
import { construirCorreo, construirCorreoCierre, construirCorreoAclaracion, conPixelDeApertura, variantePara, CORREO_NUMERO_CIERRE, CORREO_NUMERO_ACLARACION } from './expCampanaEmails.js'
import { waLinkPara } from './expCampanaAsesoras.js'
export { transporterGmailPool, procesarEnLotes, dormir } from './reactivateSend.js'

export async function enviarCorreoLead({ supabase, transporter, baseUrl, gmailUser, lead, correoNumero, fechaInicio }) {
  const token = randomUUID()
  // El tracking de ambas campañas vive en un solo endpoint (api/reactivate-track.js)
  // — ver esa nota sobre el límite de funciones serverless del plan Hobby.
  const waUrl = `${baseUrl}/api/reactivate-track?t=${token}&e=click`
  const pixelUrl = `${baseUrl}/api/reactivate-track?t=${token}&e=open`

  const variante = variantePara(correoNumero)
  const waLinkDestino = waLinkPara(lead.asesora_id, variante)

  const { asunto, html } = construirCorreo(correoNumero, { nombre: lead.nombre, waUrl, baseUrl })
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

// Correo de cierre — envío único y manual (no forma parte de la secuencia
// C1-C8), ver api/_lib/expCampanaCronCore.js#ejecutarEnvioCierre.
export async function enviarCorreoCierreLead({ supabase, transporter, baseUrl, gmailUser, lead }) {
  const token = randomUUID()
  const waUrl = `${baseUrl}/api/reactivate-track?t=${token}&e=click`
  const pixelUrl = `${baseUrl}/api/reactivate-track?t=${token}&e=open`

  const waLinkDestino = waLinkPara(lead.asesora_id, 'aula')
  if (!waLinkDestino) throw new Error(`Sin wa_link configurado para asesora ${lead.asesora_id}`)

  const { asunto, html } = construirCorreoCierre({ nombre: lead.nombre, waUrl, baseUrl })
  const htmlConPixel = conPixelDeApertura(html, pixelUrl)

  await transporter.sendMail({
    from: `"BURS Advisory" <${gmailUser}>`,
    to: lead.email,
    subject: asunto,
    html: htmlConPixel,
  })

  await supabase.from('campana_exalumnos_envios').insert({
    alumno_id: lead.id,
    correo_numero: CORREO_NUMERO_CIERRE,
    token,
  })

  await supabase.from('campana_exalumnos_alumnos').update({
    estado_campana: 'Cierre enviado',
    fecha_ultimo_envio: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', lead.id)
}

// Fe de erratas — corrige el correo de cierre enviado por error a quien no
// tiene saldo pendiente real. No toca estado_campana (sigue siendo
// "Cierre enviado", es históricamente correcto); solo deja registro del
// envío para no reenviarla dos veces.
export async function enviarCorreoAclaracionLead({ supabase, transporter, gmailUser, lead }) {
  const { asunto, html } = construirCorreoAclaracion({ nombre: lead.nombre })

  await transporter.sendMail({
    from: `"BURS Advisory" <${gmailUser}>`,
    to: lead.email,
    subject: asunto,
    html,
  })

  await supabase.from('campana_exalumnos_envios').insert({
    alumno_id: lead.id,
    correo_numero: CORREO_NUMERO_ACLARACION,
    token: randomUUID(),
  })
}

