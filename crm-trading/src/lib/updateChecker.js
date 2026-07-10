// Detecta cuando hay una versión nueva desplegada mientras la pestaña sigue
// abierta. Al ser una SPA, el navegador solo vuelve a pedir el HTML/JS si
// alguien recarga la página — si una asesora deja el CRM abierto todo el
// día, se queda para siempre con el bundle que tenía cargado al abrir la
// pestaña, sin importar cuántos cambios se desplieguen. Por eso no basta
// con los headers de cache del servidor: hay que revisar activamente desde
// el propio cliente y avisar cuando cambie el bundle referenciado en el
// index.html real.
function extraerBundleSrc(html) {
  const match = html.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/)
  return match ? match[1] : null
}

const INTERVALO_MS = 5 * 60 * 1000 // cada 5 minutos

export function iniciarDeteccionDeActualizaciones(onNuevaVersion) {
  const bundleActual = document.querySelector('script[type="module"]')?.getAttribute('src') || null
  if (!bundleActual) return () => {}

  let notificado = false

  const verificar = async () => {
    if (notificado) return
    try {
      const res = await fetch('/', { cache: 'no-store' })
      const html = await res.text()
      const bundleNuevo = extraerBundleSrc(html)
      if (bundleNuevo && bundleNuevo !== bundleActual) {
        notificado = true
        onNuevaVersion()
      }
    } catch (err) {
      console.error('No se pudo verificar si hay una nueva versión:', err)
    }
  }

  const intervalo = setInterval(verificar, INTERVALO_MS)
  const onVisible = () => { if (document.visibilityState === 'visible') verificar() }
  document.addEventListener('visibilitychange', onVisible)
  window.addEventListener('focus', verificar)

  return () => {
    clearInterval(intervalo)
    document.removeEventListener('visibilitychange', onVisible)
    window.removeEventListener('focus', verificar)
  }
}
