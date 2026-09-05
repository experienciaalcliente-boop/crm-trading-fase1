// Logo oficial de Burs Advisory (reemplaza el placeholder dibujado a mano
// que había antes). El ícono va sobre una chapa blanca redondeada porque el
// PNG está pensado para fondo claro — así se lee igual en el sidebar oscuro
// que en el claro.
export default function BrandMark({ size = 32, radius, withWordmark = false }) {
  const r = radius ?? Math.round(size * 0.22)

  if (withWordmark) {
    return (
      <img src="/logo-full.png" alt="Burs Advisory" style={{ height: size, width: 'auto', flexShrink: 0 }} />
    )
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: r, background: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      padding: size * 0.12, boxSizing: 'border-box', overflow: 'hidden',
    }}>
      <img src="/logo-icon.png" alt="Burs Advisory" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    </div>
  )
}
