// Contenido del correo de refuerzo al cierre de una cohorte de Impulso —
// felicitación + opción de continuar. Complementa los 5 toques de WhatsApp
// de la asesora (mismo mensaje, canal distinto). Se dispara desde el botón
// "Enviar correo de cierre" en /coordinacion → pestaña Impulso BURS.
export const SUBJECT_CIERRE_IMPULSO = '¡Felicidades, {{contact.NOMBRE}}! Y esto sigue disponible para ti'
export const PREVIEW_CIERRE_IMPULSO = 'Tu acceso a Impulso con JP puede continuar — sesiones en vivo, videos y Telegram.'

export const HTML_CIERRE_IMPULSO = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; padding:0; background-color:#f4f4f5; font-family:Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5; padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden; max-width:600px; width:100%;">
          <tr>
            <td style="background-color:#111827; padding:24px 32px;">
              <span style="color:#ffffff; font-size:16px; font-weight:bold; letter-spacing:0.5px;">BURS ADVISORY</span><br>
              <span style="color:#9ca3af; font-size:12px;">Experiencia del Cliente</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px 0; font-size:22px; color:#111827;">¡Felicidades, {{contact.NOMBRE}}! 🎉</h1>
              <p style="margin:0 0 16px 0; font-size:15px; line-height:1.6; color:#374151;">
                Terminaste el programa de formación — y con eso, algo que ya conoces bien: las sesiones en vivo de los jueves, los videos con JP y el canal de Telegram de Impulso.
              </p>
              <p style="margin:0 0 20px 0; font-size:15px; line-height:1.6; color:#374151;">
                Ese acceso venía incluido durante tu formación. Ahora que terminaste, puedes seguir con JP por suscripción — mismo contenido, mismo seguimiento.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px; border-collapse:collapse;">
                <tr style="background-color:#f9fafb;">
                  <td style="padding:10px 14px; font-size:13px; color:#111827; border-bottom:1px solid #e5e7eb;">Impulso 3 meses</td>
                  <td style="padding:10px 14px; font-size:13px; color:#111827; text-align:right; border-bottom:1px solid #e5e7eb;">$450 &middot; $150/mes</td>
                </tr>
                <tr>
                  <td style="padding:10px 14px; font-size:13px; color:#111827; border-bottom:1px solid #e5e7eb;">Impulso 6 meses</td>
                  <td style="padding:10px 14px; font-size:13px; color:#111827; text-align:right; border-bottom:1px solid #e5e7eb;">$797 &middot; $133/mes</td>
                </tr>
                <tr style="background-color:#f9fafb;">
                  <td style="padding:10px 14px; font-size:13px; color:#111827;">Impulso 12 meses</td>
                  <td style="padding:10px 14px; font-size:13px; color:#111827; text-align:right;">$997 &middot; solo $83/mes</td>
                </tr>
              </table>
              <p style="margin:0 0 20px 0; font-size:15px; line-height:1.6; color:#374151;">
                Tu asesora se va a poner en contacto contigo estos días para ayudarte a activarlo si quieres continuar. Si prefieres adelantarte, solo responde este correo.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0;">
                <tr>
                  <td style="background-color:#111827; border-radius:6px;">
                    <a href="mailto:experienciaalcliente@bursadvisory.com?subject=Quiero%20continuar%20en%20Impulso" style="display:inline-block; padding:14px 28px; color:#ffffff; text-decoration:none; font-size:15px; font-weight:bold;">Quiero continuar en Impulso</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px; background-color:#f9fafb; border-top:1px solid #e5e7eb;">
              <p style="margin:0; font-size:12px; color:#9ca3af; line-height:1.5;">
                Burs Advisory · Experiencia del Cliente<br>
                Si tienes dudas, responde este correo o escríbenos a experienciaalcliente@bursadvisory.com
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
