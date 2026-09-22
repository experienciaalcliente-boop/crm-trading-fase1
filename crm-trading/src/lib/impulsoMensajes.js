// Mensajes sugeridos para los 5 toques de Impulso BURS al egreso.
// Dos variantes por toque, elegidas de forma determinística por alumno
// (mismo alumno siempre ve la misma variante) para que 55 mensajes no
// salgan como texto idéntico copiado — eso es justo el patrón que
// WhatsApp detecta como spam, con o sin historial previo con el número.
const VARIANTES = [
  [
    (n) => `Hola ${n} 👋 ¡Felicidades por terminar el programa! Tu acceso a Impulso (sesiones de los jueves, videos y el canal de Telegram con JP) no tiene que terminar acá — se puede continuar por suscripción. Te cuento cómo en estos días.`,
    (n) => `${n}, ¡lo lograste! 🎉 Antes de que se cierre tu acceso a Impulso quería contarte que puedes seguir con JP por suscripción — mismas sesiones, mismos videos, mismo canal de Telegram. Te explico los detalles pronto.`,
  ],
  [
    (n) => `${n}, en unos días se cierra tu acceso al canal de Telegram donde JP va avisando las zonas de precio según el escenario y el activo. Si quieres seguir con ese seguimiento, es buen momento para conversarlo.`,
    (n) => `${n}, quería recordarte lo del canal de Telegram con JP — ahí va comentando las zonas de precio en tiempo real. Si te sirvió, podemos ver cómo seguir con eso.`,
  ],
  [
    (n) => `${n}, te dejo los planes de Impulso para que decidas con calma: 3M ($450 = $150/mes), 6M ($797 = $133/mes) y 12M ($997 = solo $83/mes). El de 12 meses sale a menos de un tercio por mes que el de 3. ¿Cuál te acomoda más?`,
    (n) => `${n}, para que lo tengas claro: Impulso 3 meses sale $450, 6 meses $797, 12 meses $997 — el de 12 es el más conveniente por mes ($83). Cualquier duda me dices.`,
  ],
  [
    (n) => `${n}, ¿alguna duda sobre continuar en Impulso? Sigues teniendo las 3 sesiones en vivo al mes con JP y el acompañamiento en Telegram — es justo lo que ya veníamos usando estos meses.`,
    (n) => `${n}, ¿cómo vas pensando lo de Impulso? Sigue siendo lo mismo que ya conoces: sesiones en vivo, videos y el canal con JP. Aquí estoy para cualquier consulta.`,
  ],
  [
    (n) => `${n}, último aviso de mi parte 🙂 Si quieres seguir en Impulso con JP, aquí estoy para ayudarte a activarlo. Cualquier cosa me escribes.`,
    (n) => `${n}, cierro por acá el tema de Impulso — si en algún momento quieres retomarlo, me escribes sin problema y lo vemos.`,
  ],
]

// Hash simple y estable (no cripto) solo para elegir variante de forma
// consistente por alumno — no necesita ser más sofisticado que esto.
function hashSimple(str) {
  let h = 0
  for (let i = 0; i < String(str).length; i++) h = (h * 31 + String(str).charCodeAt(i)) | 0
  return Math.abs(h)
}

export function varianteIndice(alumnoId, touchNumero) {
  return hashSimple(`${alumnoId}-${touchNumero}`) % 2
}

export function mensajeToqueImpulso(alumnoId, touchNumero, nombreCompleto) {
  const grupo = VARIANTES[touchNumero - 1]
  if (!grupo) return ''
  const primerNombre = (nombreCompleto || '').trim().split(' ')[0] || 'hola'
  const idx = varianteIndice(alumnoId, touchNumero)
  return grupo[idx](primerNombre)
}

// Las 2 variantes de cada toque, con un nombre de ejemplo — para que el
// supervisor pueda ver el cuerpo real de los mensajes sin tener que
// generarlos por alumno.
export function variantesDeEjemplo(touchNumero, nombreEjemplo = 'Ana') {
  const grupo = VARIANTES[touchNumero - 1]
  if (!grupo) return []
  return grupo.map(fn => fn(nombreEjemplo))
}

export const TOTAL_TOQUES = VARIANTES.length

export function waLink(telefono, mensaje) {
  if (!telefono) return null
  const digitos = String(telefono).replace(/\D/g, '')
  if (!digitos) return null
  return `https://wa.me/${digitos}?text=${encodeURIComponent(mensaje)}`
}
