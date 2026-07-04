export default function BrandMark({ size = 32, radius, withWordmark = false }) {
  const r = radius ?? Math.round(size * 0.28)
  const id = 'bm-grad'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.35, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox="0 0 32 32" style={{ flexShrink: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#65a7a6" />
            <stop offset="1" stopColor="#1c4047" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="32" height="32" rx={r * (32 / size)} fill={`url(#${id})`} />
        <text x="16" y="21" textAnchor="middle" fontFamily="Syne, sans-serif" fontWeight="700" fontSize="14" letterSpacing="0.5" fill="#eaf7f5">BA</text>
        <path d="M13.5 25 L18.5 25 L16 20.5 Z" fill="#b0ede4" opacity="0.85" />
      </svg>
      {withWordmark && (
        <div style={{ lineHeight: 1.05 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: size * 0.34, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>BURS</div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 500, fontSize: size * 0.2, color: 'var(--text-muted)', letterSpacing: '0.14em' }}>ADVISORY</div>
        </div>
      )}
    </div>
  )
}
