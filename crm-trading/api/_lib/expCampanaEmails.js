// Plantillas HTML de los 2 correos del Plan Exalumnos (Correo 0 = Aula
// Virtual, Correo 1 = Impulso). Mismo layout/tono que Plan Reactivate Burs
// (api/_lib/reactivateEmails.js) — tablas con CSS inline para máxima
// compatibilidad con clientes de correo — pero copy propio, redactado para
// esta campaña (no hay un docx fuente para esta, a diferencia de Reactivate).

const TEAL_DARK = '#1c4047'
const TEAL_ACCENT = '#65a7a6'
const CREAM = '#eaf7f5'
const WHATSAPP_GREEN = '#25D366'

const WHATSAPP_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="20" height="20"><circle cx="16" cy="16" r="16" fill="#ffffff"/><path fill="${WHATSAPP_GREEN}" d="M16 3C9 3 3.3 8.6 3.3 15.5c0 2.4.7 4.7 1.9 6.7L3 29l7-2.1c1.9 1 4 1.6 6 1.6 7 0 12.7-5.6 12.7-12.5S23 3 16 3z"/><path fill="#ffffff" d="M22.4 19c-.3-.2-1.8-.9-2.1-1s-.5-.2-.7.2-.8 1-.9 1.1-.3.2-.6 0c-.3-.1-1.2-.4-2.3-1.4-.9-.8-1.4-1.7-1.6-2s0-.4.1-.6c.1-.1.3-.3.4-.5s.2-.3.3-.5c.1-.2 0-.4 0-.5s-.7-1.6-.9-2.2c-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.1-.3-.2-.6-.3z"/></svg>`
const WHATSAPP_ICON_DATA_URI = `data:image/svg+xml;base64,${Buffer.from(WHATSAPP_ICON_SVG).toString('base64')}`

export function primerNombre(nombreCompleto) {
  const primera = String(nombreCompleto || '').trim().split(/\s+/)[0] || ''
  return primera.charAt(0).toUpperCase() + primera.slice(1).toLowerCase()
}

function whatsappButton(url, texto) {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px auto;">
    <tr>
      <td align="center" bgcolor="${WHATSAPP_GREEN}" style="border-radius:30px;">
        <a href="${url}" target="_blank"
           style="display:inline-block; padding:14px 28px; font-family:Arial,Helvetica,sans-serif; font-size:15px; font-weight:bold; color:#ffffff; text-decoration:none; border-radius:30px; letter-spacing:0.2px;">
          <img src="${WHATSAPP_ICON_DATA_URI}" width="20" height="20" alt="WhatsApp" style="vertical-align:middle; margin-right:8px;" />
          <span style="vertical-align:middle;">${texto}</span>
        </a>
      </td>
    </tr>
  </table>
  <div style="text-align:center; font-family:Arial,Helvetica,sans-serif; font-size:11px; color:#8896b4; margin-top:-16px; margin-bottom:8px;">
    Este botón te llevará directo a WhatsApp para hablar con tu asesor
  </div>`
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
              Equipo BURS Advisory
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// Correo 0 — Aula Virtual: invita a recuperar el acceso a la formación que
// quedó pausada (mismo espíritu que Reactivate Burs, pero dirigido a la
// base general de exalumnos, no solo a retirados recientes con saldo).
const CORREO_AULA = {
  asunto: 'Tu Aula Virtual de BURS todavía te está esperando',
  variante: 'aula',
  cuerpo: (nombre) => `
    <p>Hola, ${nombre}.</p>
    <p>En algún momento comenzaste tu formación con nosotros en BURS Advisory.</p>
    <p>Sabemos que la vida se atraviesa — el trabajo, el tiempo, mil prioridades — y muchas veces eso hace que una formación quede en pausa.</p>
    <p>Queremos contarte algo: <strong>tu Aula Virtual sigue disponible</strong>, con todo el contenido, las clases grabadas y el material que adquiriste en su momento.</p>
    <p>Si quieres retomarlo, con gusto te explicamos cómo reactivar tu acceso.</p>`,
  cierre: () => `<p>Será un gusto volver a acompañarte.</p><p>Equipo BURS</p>`,
  textoBoton: 'Quiero recuperar mi acceso',
}

// Correo 1 — Impulso: para quien no respondió al primer correo, se ofrece
// un camino distinto — acompañamiento directo con un mentor (producto
// "Impulso Burs"), en vez de solo retomar el contenido grabado.
const CORREO_IMPULSO = {
  asunto: 'Una forma más rápida de retomar tu camino en trading',
  variante: 'impulso',
  cuerpo: (nombre) => `
    <p>Hola, ${nombre}.</p>
    <p>Te escribimos hace unos días para contarte que tu Aula Virtual sigue disponible.</p>
    <p>Hoy queremos contarte de una alternativa distinta, para quienes prefieren un acompañamiento más cercano al retomar.</p>
    <p>Se llama <strong>Impulso Burs</strong>: mentorías personalizadas 1 a 1 con uno de nuestros mentores, pensadas para ayudarte a poner en práctica lo aprendido con seguimiento real, no solo contenido grabado.</p>
    <p>Si sientes que necesitas ese empujón para retomar con confianza, conversemos.</p>`,
  cierre: () => `<p>Estamos para ayudarte a dar el siguiente paso.</p><p>Equipo BURS</p>`,
  textoBoton: 'Quiero conocer Impulso Burs',
}

const CORREOS = [CORREO_AULA, CORREO_IMPULSO]

export function totalCorreos() {
  return CORREOS.length // 2 (Correo 0 = Aula Virtual, Correo 1 = Impulso)
}

export function variantePara(correoNumero) {
  return CORREOS[correoNumero]?.variante
}

export function conPixelDeApertura(html, pixelUrl) {
  const pixel = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:block; border:0;" />`
  return html.replace('</body>', `${pixel}</body>`)
}

// waUrl: URL de tracking de clic (apunta a nuestro endpoint, que registra
// el clic y redirige al WhatsApp de la asesora asignada a este alumno).
export function construirCorreo(numero, { nombre, waUrl }) {
  const def = CORREOS[numero]
  if (!def) throw new Error(`Correo ${numero} no existe (rango válido 0-1)`)
  const primerNom = primerNombre(nombre)

  let html = def.cuerpo(primerNom)
  html += def.cierre()
  html += whatsappButton(waUrl, def.textoBoton)

  return {
    asunto: def.asunto,
    html: baseShell({ preheader: def.asunto, bodyHtml: html }),
  }
}
