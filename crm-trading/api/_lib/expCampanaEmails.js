// Plantillas HTML de los correos del Plan Exalumnos — copy tomado
// literalmente de plan_email_marketing_julio_burs.md (v2), sección 4.
// 8 correos principales (C1-C8) + 2 reenvíos a no-abiertos (de C1 y C3),
// mismo layout de tabla con CSS inline que Reactivate Burs para máxima
// compatibilidad con clientes de correo.
//
// Simplificaciones acordadas frente al documento original: un solo asunto
// fijo por correo (sin A/B con medición de ganador) y sin los broadcasts de
// WhatsApp del día 4 y día 13 (esos los hace cada asesora a mano — ver el
// segmento "Calientes sin compra" en la página).

const TEAL_DARK = '#1c4047'
const TEAL_ACCENT = '#65a7a6'
const CREAM = '#eaf7f5'
const WHATSAPP_GREEN = '#25D366'

export function primerNombre(nombreCompleto) {
  const primera = String(nombreCompleto || '').trim().split(/\s+/)[0] || ''
  return primera.charAt(0).toUpperCase() + primera.slice(1).toLowerCase()
}

// Ícono real (logo de WhatsApp), alojado como archivo estático propio del
// sitio (public/whatsapp-icon.png) y referenciado por URL https normal —
// NO como data: URI, que Outlook de escritorio bloquea por completo, ni
// como SVG, que Gmail no renderiza. Mismo patrón que ya funciona en
// testimonioEmbed() con las miniaturas de YouTube.
function whatsappButton(url, texto, iconUrl) {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px auto;">
    <tr>
      <td align="center" bgcolor="${WHATSAPP_GREEN}" style="border-radius:30px;">
        <a href="${url}" target="_blank" style="display:inline-block; padding:14px 28px; font-family:Arial,Helvetica,sans-serif; font-size:15px; font-weight:bold; color:#ffffff; text-decoration:none; border-radius:30px; letter-spacing:0.2px;"><img src="${iconUrl}" width="18" height="18" alt="" style="vertical-align:middle; margin-right:8px; border:0;" />${texto}</a>
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

function p(texto) {
  return `<p style="margin:0 0 14px;">${texto}</p>`
}

// nombre: label corto para la UI. dia: offset en días desde la activación
// (día 0 = C1), tal como se acordó al correr todo el calendario original
// +3 días para que arranque hoy en vez del 17/07. reenvioDe: si es un
// reenvío a no-abiertos, el número de correo original que reemplaza (no
// se envía si esa persona ya abrió el original).
const CORREOS = [
  // C1 — Reconexión (día 0)
  {
    nombre: 'C1 — Reconexión',
    dia: 0,
    variante: 'aula',
    asunto: '¿Recuerdas lo que lograste?',
    preheader: 'Terminaste la formación. Eso no lo hace cualquiera.',
    textoBoton: 'Quiero acceder a la nueva plataforma',
    cuerpo: (nombre) => [
      p(`Hola, ${nombre}.`),
      p(`Terminaste la formación de Burs Advisory. No mucha gente llega al final. Tú sí.`),
      p(`Desde entonces, de nuestro lado cambiaron muchas cosas — y hay algo que aún no hemos contado públicamente: el aula virtual de Burs Advisory ya no es la misma.`),
      p(`Te contaremos todo. Si quieres adelantarte:`),
    ].join(''),
    cierre: () => p(`Equipo Burs Advisory<br/><span style="font-size:13px; color:#5a6b6e;">P.D. Hay algo que vale la pena que veas antes de que termine el ciclo.</span>`),
  },
  // Reenvío C1 — solo a quien no abrió C1 (día 1)
  {
    nombre: 'Reenvío C1',
    dia: 1,
    variante: 'aula',
    reenvioDe: 0,
    asunto: '¿No llegó nuestro correo de ayer?',
    preheader: 'Solo 30 segundos.',
    textoBoton: 'Quiero acceder a la nueva plataforma',
    cuerpo: (nombre) => [
      p(`Hola, ${nombre}.`),
      p(`Terminaste la formación de Burs Advisory. No mucha gente llega al final. Tú sí.`),
      p(`Desde entonces, de nuestro lado cambiaron muchas cosas — y hay algo que aún no hemos contado públicamente: el aula virtual de Burs Advisory ya no es la misma.`),
      p(`Te contaremos todo. Si quieres adelantarte:`),
    ].join(''),
    cierre: () => p(`Equipo Burs Advisory`),
  },
  // C2 — El aula nueva (día 3)
  {
    nombre: 'C2 — El aula nueva',
    dia: 3,
    variante: 'aula',
    asunto: 'Esto no existía cuando estudiaste aquí',
    preheader: '146 videos. 95 sesiones en vivo grabadas. Todo nuevo.',
    textoBoton: 'Quiero acceder a la nueva plataforma',
    cuerpo: (nombre) => [
      p(`Hola, ${nombre}.`),
      p(`Cuando estudiaste con nosotros, el aula era Teachable.`),
      p(`Hoy es Sabionet, una plataforma completamente nueva:`),
      p(`✅ 146 videos actualizados al mercado actual<br/>✅ 95 clases en vivo archivadas, disponibles 24/7<br/>✅ Módulos estructurados<br/>✅ PDFs y herramientas de análisis descargables`),
      p(`Tú ya tienes la base. Solo necesitas actualizarla — y como exalumno, tienes un acceso especial que tu asesor te explica en un mensaje.`),
    ].join(''),
    cierre: () => p(`Equipo Burs Advisory`),
  },
  // C3 — El mercado cambió (día 5)
  {
    nombre: 'C3 — El mercado cambió',
    dia: 5,
    variante: 'aula',
    asunto: '¿Y si el problema nunca fuiste tú?',
    preheader: 'Lo que veías difuso hoy se ve con más claridad.',
    textoBoton: 'Quiero acceder a la nueva plataforma',
    cuerpo: (nombre) => [
      p(`Hola, ${nombre}.`),
      p(`Una pregunta directa: si terminaste la formación y aún no tienes la consistencia que esperabas, ¿el problema es lo que aprendiste o que el mercado ya no es el mismo?`),
      p(`Los patrones evolucionan. La nueva aula no repite lo que viste: lo actualiza al mercado de hoy y lo organiza para que practicar sea viable.`),
      p(`Tienes el conocimiento. Nosotros tenemos la actualización.`),
    ].join(''),
    cierre: () => p(`Equipo Burs Advisory<br/><span style="font-size:13px; color:#5a6b6e;">P.D. Muy pronto te contamos algo que incluye al CEO de Burs.</span>`),
  },
  // Reenvío C3 — solo a quien no abrió C3 (día 6)
  {
    nombre: 'Reenvío C3',
    dia: 6,
    variante: 'aula',
    reenvioDe: 3,
    asunto: 'Léelo antes de que avance el ciclo',
    preheader: 'Lo que veías difuso hoy se ve con más claridad.',
    textoBoton: 'Quiero acceder a la nueva plataforma',
    cuerpo: (nombre) => [
      p(`Hola, ${nombre}.`),
      p(`Una pregunta directa: si terminaste la formación y aún no tienes la consistencia que esperabas, ¿el problema es lo que aprendiste o que el mercado ya no es el mismo?`),
      p(`Los patrones evolucionan. La nueva aula no repite lo que viste: lo actualiza al mercado de hoy y lo organiza para que practicar sea viable.`),
      p(`Tienes el conocimiento. Nosotros tenemos la actualización.`),
    ].join(''),
    cierre: () => p(`Equipo Burs Advisory`),
  },
  // C4 — Impulso BURS: mentoría con el CEO (día 7)
  {
    nombre: 'C4 — Impulso BURS',
    dia: 7,
    variante: 'impulso',
    asunto: 'Operar junto a Jeampier Savedra',
    preheader: 'Corrección en vivo, análisis compartidos y su grupo privado.',
    textoBoton: 'Quiero suscribirme',
    cuerpo: (nombre) => [
      p(`Hola, ${nombre}.`),
      p(`Esto es lo que anunciamos: Impulso BURS.`),
      p(`• 3 sesiones en vivo con Jeampier Savedra, CEO de Burs Advisory, de manera mensual<br/>• Mentoría grupal: corrige tus operaciones y análisis en vivo<br/>• Si el mercado es apto, el mentor opera en vivo<br/>• Acceso al telegram privado de Impulso BURS, manejado exclusivamente por él`),
      p(`No es una clase más. Es tener al mentor revisando tu proceso.`),
      p(`Los grupos son reducidos para que la corrección sea real.`),
    ].join(''),
    cierre: () => p(`Equipo Burs Advisory`),
  },
  // C5 — Objeción (día 10)
  {
    nombre: 'C5 — Objeción',
    dia: 10,
    variante: 'aula',
    asunto: 'Sé que todavía lo estás pensando',
    preheader: 'No es el contenido. Entonces, ¿qué es?',
    textoBoton: 'Activar suscripción',
    cuerpo: (nombre) => [
      p(`Hola, ${nombre}.`),
      p(`Has abierto estos correos. Algo llamó tu atención. Pero aún no diste el paso.`),
      p(`Lo entendemos: "lo analizo, lo pienso, veo si es el momento". Eso mismo es lo que te ha mantenido sin practicar estos meses.`),
      p(`El costo de no decidir no es cero: es el tiempo que pasa mientras otros exalumnos ya están practicando con información actualizada.`),
      p(`Resuélvelo en un mensaje. Tu asesor te explica las opciones y eliges la tuya.`),
    ].join(''),
    cierre: () => p(`Equipo Burs Advisory<br/><span style="font-size:13px; color:#5a6b6e;">P.D. El ciclo cierra pronto.</span>`),
  },
  // C6 — El grupo privado del mentor (día 12)
  {
    nombre: 'C6 — Grupo privado',
    dia: 12,
    variante: 'impulso',
    asunto: 'Dentro del grupo privado de Jeampier',
    preheader: 'Análisis, contexto y corrección — directo del CEO.',
    textoBoton: 'Quiero suscribirme',
    cuerpo: (nombre) => [
      p(`Hola, ${nombre}.`),
      p(`Lo más difícil del trading no es la técnica. Es sostener la disciplina operando solo.`),
      p(`En el grupo privado de Impulso BURS —manejado exclusivamente por Jeampier Savedra— los alumnos comparten análisis, reciben contexto del mercado y llegan a las sesiones en vivo con sus operaciones listas para corrección.`),
      p(`Tú ya hablas el idioma técnico de Burs. Este es el siguiente nivel.`),
      p(`El ciclo cierra muy pronto.`),
    ].join(''),
    cierre: () => p(`Equipo Burs Advisory`),
  },
  // C7 — Mañana cierra (día 13)
  {
    nombre: 'C7 — Mañana cierra',
    dia: 13,
    variante: 'aula',
    asunto: 'Mañana cierra el ciclo',
    preheader: 'Aula renovada e Impulso BURS. Hasta mañana.',
    textoBoton: 'Activar mi suscripción',
    cuerpo: (nombre) => [
      p(`Hola, ${nombre}.`),
      p(`Mañana cierra el ciclo de activación para exalumnos: el aula renovada en Sabionet y los lugares de Impulso BURS con las sesiones del CEO.`),
      p(`No es una táctica: es la fecha real de cierre.`),
      p(`Si llevas dos semanas pensándolo, esta es la señal. Un mensaje y tu asesor te lo deja resuelto hoy mismo.`),
    ].join(''),
    cierre: () => p(`Equipo Burs Advisory`),
  },
  // C8 — Hoy termina (día 14)
  {
    nombre: 'C8 — Hoy termina',
    dia: 14,
    variante: 'aula',
    asunto: 'Hoy termina el ciclo',
    preheader: 'Si no es ahora, el próximo ciclo te encontrará en el mismo lugar.',
    textoBoton: 'Quiero aprovechar la oportunidad',
    cuerpo: (nombre) => [
      p(`Hola, ${nombre}.`),
      p(`Este es el último correo del ciclo.`),
      p(`Si decidiste que no es el momento, lo respetamos.`),
      p(`Pero una pregunta antes de cerrar: cuando llegue el próximo ciclo, ¿vas a estar en el mismo lugar que hoy?`),
      p(`Terminaste la formación de Burs. No dejas las cosas a medias. Hoy es el último día para activar con estas condiciones.`),
    ].join(''),
    cierre: () => p(`Equipo Burs Advisory<br/><span style="font-size:13px; color:#5a6b6e;">P.D. Acceso inmediato, sin burocracia. Ya sabes dónde está el botón.</span>`),
  },
]

// Correo de cierre de campaña — no forma parte del calendario C1-C8 (no
// tiene "dia" ni se dispara por el cron), es un envío único y manual para
// cerrar el ciclo de reactivación. Se manda a todo lead que no se haya
// reactivado ni marcado "No interesado", sin importar en qué correo de la
// secuencia se haya quedado. Usa la variante "aula" (habla del programa/
// aula, no de Impulso BURS).
const CORREO_CIERRE = {
  variante: 'aula',
  asunto: 'Última comunicación: tu formación, por lo que ya quedó pendiente',
  preheader: 'Tu formación vale $3,000. A ti solo te falta el saldo que dejaste pendiente.',
  textoBoton: 'Quiero resolver mi saldo pendiente',
  cuerpo: (nombre) => [
    p(`Hola, ${nombre}.`),
    p(`Este es el último correo que te enviamos sobre esto. No porque dejes de importarnos, sino porque el ciclo de reactivación para exalumnos cierra, y después de hoy no vamos a insistir más.`),
    p(`Queremos ser directos contigo, sin vueltas.`),
    p(`Tu formación en Burs Advisory tiene un valor de <strong>$3,000</strong>. Pero tú no vas a pagar $3,000: vas a pagar únicamente el <strong>saldo que dejaste pendiente</strong> cuando saliste del programa. Ni un dólar más.`),
    p(`Es la última oportunidad para cerrar esa cuenta en estas condiciones. Queremos ser claros en un punto: por haber quedado un incumplimiento anterior, este saldo ya no se puede fraccionar en cuotas programadas. Pero sí puedes ir aportando de forma parcial, a tu ritmo, hasta completarlo — sin presión de fechas, solo constancia.`),
    p(`Y en cuanto termines de cubrir ese saldo, esto es lo que desbloqueas:`),
    p(`✅ Acceso a todo el material pregrabado del programa, de inicio a fin<br/>✅ Las grabaciones completas de todas las sesiones en vivo que se dictaron en el programa en el que te inscribiste<br/>✅ Una sesión grupal en vivo para resolver tus dudas sobre el contenido que vayas revisando<br/>✅ Tu lugar en la comunidad de exalumnos: ahí se comparten las entradas de los mentores, se publican dinámicas con beneficios adicionales, y tú también puedes compartir las tuyas`),
    p(`Todo eso, solo por el saldo que ya quedó pendiente. No hay una oferta más simple que esta.`),
  ].join(''),
  cierre: () => p(`Equipo Burs Advisory<br/><span style="font-size:13px; color:#5a6b6e;">P.D. Esta es la última comunicación de este ciclo. Escríbele a tu asesor hoy y déjalo resuelto.</span>`),
}

export function construirCorreoCierre({ nombre, waUrl, baseUrl }) {
  const primerNom = primerNombre(nombre)
  let html = CORREO_CIERRE.cuerpo(primerNom)
  html += CORREO_CIERRE.cierre()
  html += whatsappButton(waUrl, CORREO_CIERRE.textoBoton, `${baseUrl}/whatsapp-icon.png`)
  return {
    asunto: CORREO_CIERRE.asunto,
    html: baseShell({ preheader: CORREO_CIERRE.preheader, bodyHtml: html }),
  }
}

export function variantePararCierre() {
  return CORREO_CIERRE.variante
}

export function totalCorreos() {
  return CORREOS.length // 10 (8 principales + 2 reenvíos a no-abiertos)
}

export function diaPara(correoNumero) {
  return CORREOS[correoNumero]?.dia
}

export function reenvioDePara(correoNumero) {
  return CORREOS[correoNumero]?.reenvioDe
}

export function variantePara(correoNumero) {
  return CORREOS[correoNumero]?.variante
}

export function conPixelDeApertura(html, pixelUrl) {
  const pixel = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:block; border:0;" />`
  return html.replace('</body>', `${pixel}</body>`)
}

export function construirCorreo(numero, { nombre, waUrl, baseUrl }) {
  const def = CORREOS[numero]
  if (!def) throw new Error(`Correo ${numero} no existe (rango válido 0-${CORREOS.length - 1})`)
  const primerNom = primerNombre(nombre)

  let html = def.cuerpo(primerNom)
  html += def.cierre()
  html += whatsappButton(waUrl, def.textoBoton, `${baseUrl}/whatsapp-icon.png`)

  return {
    asunto: def.asunto,
    html: baseShell({ preheader: def.preheader, bodyHtml: html }),
  }
}
