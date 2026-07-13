// Plantillas HTML de los 7 correos del Plan Reactivate Burs (Correo 0 a Correo 6).
// Texto tomado literalmente de PROGRAMA REACTIVATE BURS.docx, sección 7.
// Todo el layout es a base de tablas con CSS inline para máxima compatibilidad
// con clientes de correo (Gmail, Outlook, Apple Mail).

const TEAL_DARK = '#1c4047'
const TEAL_ACCENT = '#65a7a6'
const CREAM = '#eaf7f5'
const WHATSAPP_GREEN = '#25D366'

// Ícono de WhatsApp en SVG, embebido como data URI (no depende de imágenes externas).
const WHATSAPP_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="20" height="20"><circle cx="16" cy="16" r="16" fill="#ffffff"/><path fill="${WHATSAPP_GREEN}" d="M16 3C9 3 3.3 8.6 3.3 15.5c0 2.4.7 4.7 1.9 6.7L3 29l7-2.1c1.9 1 4 1.6 6 1.6 7 0 12.7-5.6 12.7-12.5S23 3 16 3z"/><path fill="#ffffff" d="M22.4 19c-.3-.2-1.8-.9-2.1-1s-.5-.2-.7.2-.8 1-.9 1.1-.3.2-.6 0c-.3-.1-1.2-.4-2.3-1.4-.9-.8-1.4-1.7-1.6-2s0-.4.1-.6c.1-.1.3-.3.4-.5s.2-.3.3-.5c.1-.2 0-.4 0-.5s-.7-1.6-.9-2.2c-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.1-.3-.2-.6-.3z"/></svg>`
const WHATSAPP_ICON_DATA_URI = `data:image/svg+xml;base64,${Buffer.from(WHATSAPP_ICON_SVG).toString('base64')}`

export function primerNombre(nombreCompleto) {
  const primera = String(nombreCompleto || '').trim().split(/\s+/)[0] || ''
  return primera.charAt(0).toUpperCase() + primera.slice(1).toLowerCase()
}

function whatsappButton(url) {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px auto;">
    <tr>
      <td align="center" bgcolor="${WHATSAPP_GREEN}" style="border-radius:30px;">
        <a href="${url}" target="_blank"
           style="display:inline-block; padding:14px 28px; font-family:Arial,Helvetica,sans-serif; font-size:15px; font-weight:bold; color:#ffffff; text-decoration:none; border-radius:30px; letter-spacing:0.2px;">
          <img src="${WHATSAPP_ICON_DATA_URI}" width="20" height="20" alt="WhatsApp" style="vertical-align:middle; margin-right:8px;" />
          <span style="vertical-align:middle;">Conocer mi propuesta de retorno</span>
        </a>
      </td>
    </tr>
  </table>
  <div style="text-align:center; font-family:Arial,Helvetica,sans-serif; font-size:11px; color:#8896b4; margin-top:-16px; margin-bottom:8px;">
    Este botón te llevará directo a WhatsApp para hablar con un asesor
  </div>`
}

function testimonioEmbed(youtubeUrl) {
  if (!youtubeUrl) return ''
  const match = youtubeUrl.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  const videoId = match ? match[1] : null
  if (!videoId) return ''
  const thumb = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:20px 0;">
    <tr>
      <td align="center">
        <a href="${youtubeUrl}" target="_blank" style="text-decoration:none; display:inline-block; position:relative;">
          <img src="${thumb}" width="480" alt="Testimonio de un alumno BURS" style="display:block; width:100%; max-width:480px; border-radius:12px; border:1px solid ${TEAL_ACCENT};" />
        </a>
        <div style="font-family:Arial,Helvetica,sans-serif; font-size:12px; color:${TEAL_ACCENT}; margin-top:8px;">
          ▶ Ver testimonio en video
        </div>
      </td>
    </tr>
  </table>`
}

function baseShell({ preheader, bodyHtml }) {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>BURS Advisory</title>
</head>
<body style="margin:0; padding:0; background:${CREAM}; font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">${preheader || ''}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM}; padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:16px; overflow:hidden; max-width:560px; width:100%;">
          <tr>
            <td style="background:${TEAL_DARK}; padding:22px 32px;">
              <span style="font-family:Georgia,'Times New Roman',serif; font-weight:bold; font-size:20px; letter-spacing:1px; color:#eaf7f5;">BURS</span>
              <span style="font-family:Arial,Helvetica,sans-serif; font-size:11px; letter-spacing:3px; color:${TEAL_ACCENT}; margin-left:8px;">ADVISORY</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 24px 32px; font-family:Arial,Helvetica,sans-serif; font-size:15px; line-height:1.6; color:#28353a;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px; background:${CREAM}; font-family:Arial,Helvetica,sans-serif; font-size:11px; color:#8896b4; text-align:center;">
              Reactivate Burs · Equipo BURS Advisory
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

const CORREOS = [
  // Correo 0 — Día 1
  {
    asunto: 'Estamos actualizando el estado de algunos exalumnos de BURS',
    cuerpo: (nombre) => `
      <p>Hola, ${nombre}.</p>
      <p>Durante los próximos días estaremos contactando a un grupo de exalumnos para informarles sobre una alternativa especial relacionada con la formación que adquirieron en BURS.</p>
      <p>Si este correo llegó a tu bandeja, es porque formas parte de ese grupo.</p>
      <p>Muy pronto recibirás más información.</p>
      <p>Nos alegrará poder saludarte nuevamente.</p>
      <p>Un abrazo,<br/>Equipo BURS</p>`,
    incluyeBoton: false,
    incluyeTestimonio: null,
  },
  // Correo 1 — Día 2
  {
    asunto: 'Hemos reservado una oportunidad para ti',
    cuerpo: (nombre) => `
      <p>Hola, ${nombre}.</p>
      <p>Sabemos que en algún momento tu formación quedó en pausa.</p>
      <p>Las razones pueden haber sido muchas: trabajo, tiempo, prioridades o situaciones personales.</p>
      <p>Lo importante es que hoy queremos decirte algo.</p>
      <p>Todavía existe una oportunidad para terminar aquello que un día decidiste comenzar.</p>
      <p>En BURS hemos creado <strong>Reactivate Burs</strong>, una modalidad especialmente diseñada para algunos exalumnos que desean retomar su formación.</p>
      <p>Queremos contarte de qué se trata y resolver todas tus dudas personalmente.</p>
      <p>Haz clic en el siguiente botón y uno de nuestros asesores te brindará toda la información.</p>`,
    cierre: () => `<p>Esperamos volver a verte formando parte de esta comunidad.</p><p>Equipo BURS</p>`,
    incluyeBoton: true,
    incluyeTestimonio: null,
  },
  // Correo 2 — Día 4
  {
    asunto: 'Los resultados comienzan cuando decides no rendirte',
    cuerpo: (nombre) => `
      <p>Hola, ${nombre}.</p>
      <p>Cada alumno que hoy obtiene resultados comenzó exactamente igual que todos.</p>
      <p>Con dudas. Con errores. Con miedo.</p>
      <p>Muchos incluso pensaron en abandonar.</p>
      <p>Sin embargo, hubo algo que marcó la diferencia. Decidieron seguir aprendiendo.</p>
      <p>Hoy queremos compartir contigo algunas historias reales de alumnos que confiaron en el proceso y que hoy disfrutan de los resultados de ese esfuerzo.</p>`,
    testimonioAntesCierre: true,
    cierre: () => `<p>Tal vez hoy también sea un buen momento para escribir el siguiente capítulo de tu historia.</p><p>Si deseas conocer la oportunidad que hemos preparado para ti, haz clic aquí.</p>`,
    cierreFinal: () => `<p>Será un gusto conversar contigo.</p><p>Equipo BURS</p>`,
    incluyeBoton: true,
    incluyeTestimonio: 1,
  },
  // Correo 3 — Día 6
  {
    asunto: 'Así podrás retomar tu formación',
    cuerpo: (nombre) => `
      <p>Hola, ${nombre}.</p>
      <p>Queremos mostrarte exactamente en qué consiste Reactivate Burs.</p>
      <p>Una vez regularizado el saldo pendiente de tu formación podrás acceder nuevamente a:</p>
      <p style="margin:4px 0;">✔ Todo el contenido grabado del programa que adquiriste.</p>
      <p style="margin:4px 0;">✔ Todas las clases grabadas.</p>
      <p style="margin:4px 0;">✔ Todos los seminarios grabados.</p>
      <p style="margin:4px 0;">✔ Material de estudio.</p>
      <p style="margin:4px 0;">✔ Recursos descargables.</p>
      <p style="margin:4px 0 16px;">✔ Acceso semanal al Club Boost, donde podrás resolver tus dudas directamente con un mentor.</p>
      <p>Esta modalidad ha sido diseñada para que puedas terminar la formación que originalmente adquiriste.</p>
      <p>Si deseas conocer el proceso completo, uno de nuestros asesores estará encantado de ayudarte.</p>`,
    cierre: () => `<p>Será un gusto volver a acompañarte.</p><p>Equipo BURS</p>`,
    incluyeBoton: true,
    incluyeTestimonio: null,
  },
  // Correo 4 — Día 8
  {
    asunto: 'Ellos también comenzaron con dudas',
    cuerpo: (nombre) => `
      <p>Hola, ${nombre}.</p>
      <p>Muchas veces creemos que ya es demasiado tarde. Que perdimos la oportunidad. Que comenzar nuevamente no vale la pena.</p>
      <p>La realidad es otra.</p>
      <p>Cada día vemos alumnos que continúan aprendiendo, creciendo y acercándose a sus objetivos.</p>
      <p>Queremos compartir contigo algunos de esos resultados.</p>`,
    testimonioAntesCierre: true,
    cierre: () => `<p>Cada historia comenzó con una sola decisión.</p><p>Si quieres conocer cómo volver a acceder a tu formación, estaremos encantados de ayudarte.</p>`,
    cierreFinal: () => `<p>Nos dará mucho gusto conversar contigo.</p><p>Equipo BURS</p>`,
    incluyeBoton: true,
    incluyeTestimonio: 2,
  },
  // Correo 5 — Día 11
  {
    asunto: 'Quizá estas preguntas también pasaron por tu mente',
    cuerpo: (nombre) => `
      <p>Hola, ${nombre}.</p>
      <p>Sabemos que probablemente tengas algunas dudas.</p>
      <p><strong>¿Ingresaré al programa actual?</strong><br/>No. Tendrás acceso a la formación que adquiriste originalmente, completamente grabada.</p>
      <p><strong>¿Tendré acompañamiento?</strong><br/>Sí. Podrás participar cada semana en nuestro Club Boost para resolver tus consultas.</p>
      <p><strong>¿Tendré acceso al material?</strong><br/>Sí. Recuperarás todo el contenido correspondiente a tu programa.</p>
      <p>Si deseas conocer todos los detalles, estaremos encantados de ayudarte personalmente.</p>`,
    cierre: () => `<p>Equipo BURS</p>`,
    incluyeBoton: true,
    incluyeTestimonio: null,
  },
  // Correo 6 — Día 14
  {
    asunto: 'Queríamos escribirte una última vez',
    cuerpo: (nombre) => `
      <p>Hola, ${nombre}.</p>
      <p>Durante los últimos días hemos querido contarte sobre una oportunidad especial que hemos preparado para algunos exalumnos de BURS.</p>
      <p>Sabemos que quizá no era el momento adecuado o simplemente no habías tenido tiempo para revisar nuestros correos.</p>
      <p>Antes de finalizar esta etapa de Reactivate Burs, queríamos darte una última oportunidad para conocer la propuesta.</p>
      <p>Si aún deseas terminar la formación que un día comenzaste, estaremos encantados de conversar contigo.</p>
      <p>Haz clic aquí.</p>`,
    cierre: () => `<p>Será un gusto ayudarte.</p><p>Esperamos volver a encontrarnos.</p><p>Equipo BURS</p>`,
    incluyeBoton: true,
    incluyeTestimonio: null,
  },
]

export function totalCorreos() {
  return CORREOS.length // 7 (Correo 0 a Correo 6)
}

export function conPixelDeApertura(html, pixelUrl) {
  const pixel = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:block; border:0;" />`
  return html.replace('</body>', `${pixel}</body>`)
}

// Construye el HTML/asunto de un correo específico (0-6) para un alumno dado.
// waUrl: URL de tracking de clic (ya apunta a nuestro endpoint, que redirige a WhatsApp).
// testimonioUrls: { 1: url, 2: url } tal como se guardan en reactivate_config.
export function construirCorreo(numero, { nombre, waUrl, testimonioUrls }) {
  const def = CORREOS[numero]
  if (!def) throw new Error(`Correo ${numero} no existe (rango válido 0-6)`)
  const primerNom = primerNombre(nombre)

  let html = def.cuerpo(primerNom)
  if (def.testimonioAntesCierre) {
    const url = def.incluyeTestimonio === 1 ? testimonioUrls?.[1] : testimonioUrls?.[2]
    html += testimonioEmbed(url)
  }
  if (def.cierre) html += def.cierre()
  if (def.incluyeBoton) html += whatsappButton(waUrl)
  if (def.cierreFinal) html += def.cierreFinal()

  return {
    asunto: def.asunto,
    html: baseShell({ preheader: def.asunto, bodyHtml: html }),
  }
}
