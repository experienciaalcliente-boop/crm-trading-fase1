import React from 'react'

export function RiesgoBadge({ nivel, score }) {
  if (!nivel) return null
  const styles = {
    Alto:  { bg: 'rgba(220,38,38,0.12)',  color: '#f87171', border: 'rgba(220,38,38,0.3)'  },
    Medio: { bg: 'rgba(217,119,6,0.12)',  color: '#fbbf24', border: 'rgba(217,119,6,0.3)'  },
    Bajo:  { bg: 'rgba(22,163,74,0.12)',  color: '#4ade80', border: 'rgba(22,163,74,0.3)'  },
  }
  const s = styles[nivel] || styles['Bajo']
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
    }}>
      {nivel === 'Alto' ? '🔴' : nivel === 'Medio' ? '🟡' : '🟢'} {nivel}
      {score !== undefined && <span style={{ opacity: 0.7 }}>({score})</span>}
    </span>
  )
}

export function UltimoContactoBadge({ fecha }) {
  if (!fecha) return <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sin contacto</span>

  const hoy = new Date()
  const ult  = new Date(fecha + 'T00:00:00')
  const dias = Math.floor((hoy - ult) / (1000 * 60 * 60 * 24))

  let color = '#4ade80', bg = 'rgba(22,163,74,0.12)', border = 'rgba(22,163,74,0.3)', label = `Hace ${dias}d`
  if (dias === 0)       { label = 'Hoy';    color = '#4ade80'; bg = 'rgba(22,163,74,0.12)';   border = 'rgba(22,163,74,0.3)' }
  else if (dias === 1)  { label = 'Ayer';   color = '#fbbf24'; bg = 'rgba(217,119,6,0.12)';   border = 'rgba(217,119,6,0.3)' }
  else if (dias <= 7)   { label = `${dias}d`; color = '#fbbf24'; bg = 'rgba(217,119,6,0.1)'; border = 'rgba(217,119,6,0.2)' }
  else if (dias <= 14)  { label = `${dias}d`; color = '#fb923c'; bg = 'rgba(234,88,12,0.12)';  border = 'rgba(234,88,12,0.3)' }
  else if (dias <= 21)  { label = `${dias}d`; color = '#f87171'; bg = 'rgba(220,38,38,0.12)';  border = 'rgba(220,38,38,0.3)' }
  else                   { label = `+${dias}d 🚨`; color = '#f87171'; bg = 'rgba(220,38,38,0.15)'; border = 'rgba(220,38,38,0.4)' }

  return (
    <span style={{ background: bg, color, border: `1px solid ${border}`, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
      {label}
    </span>
  )
}

export function CicloVidaBadge({ estadoOperativo }) {
  if (!estadoOperativo) return null
  const styles = {
    'Pre-Onboarding': { bg: 'rgba(124,58,237,0.12)', color: '#a78bfa', border: 'rgba(124,58,237,0.3)' },
    'Onboarding':     { bg: 'rgba(37,99,235,0.12)',  color: '#60a5fa', border: 'rgba(37,99,235,0.3)' },
    'Validación':     { bg: 'rgba(217,119,6,0.12)',  color: '#fbbf24', border: 'rgba(217,119,6,0.3)' },
    'Activo':         { bg: 'rgba(22,163,74,0.12)',  color: '#4ade80', border: 'rgba(22,163,74,0.3)' },
    'Retirado':       { bg: 'rgba(100,116,139,0.12)',color: '#94a3b8', border: 'rgba(100,116,139,0.3)'},
    'Egresado':       { bg: 'rgba(13,148,136,0.12)', color: '#2dd4bf', border: 'rgba(13,148,136,0.3)' },
  }
  const s = styles[estadoOperativo] || styles['Activo']
  return (
    <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
      {estadoOperativo}
    </span>
  )
}
