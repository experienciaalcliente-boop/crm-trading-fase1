import { TrendingUp, PhoneMissed, Phone } from 'lucide-react'

export default function PanelDerecho({ asesoras, registrosHoy, stats, asesoraPanel, setAsesoraPanel }) {
  const sinRespuesta = stats.sinRespuesta || []

  return (
    <aside style={{ width: 280, flexShrink: 0, borderLeft: '1px solid #e4e9f2', background: '#fff', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

      {/* Título */}
      <div style={{ padding: '16px', borderBottom: '1px solid #e4e9f2', background: '#f8faff' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#1a2035' }}>Panel del día</div>
        <div style={{ fontSize: 10, color: '#a0acc4', marginTop: 2 }}>Actualización en tiempo real</div>
      </div>

      {/* Tabs */}
      <div style={{ padding: '12px', borderBottom: '1px solid #e4e9f2' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#a0acc4', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
          Filtrar por asesora
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {['Todas', ...asesoras.map(a => a.nombre)].map(nombre => {
            const isActive = nombre === 'Todas' ? asesoraPanel === null : asesoraPanel === nombre
            return (
              <button key={nombre}
                onClick={() => setAsesoraPanel(nombre === 'Todas' ? null : (nombre === asesoraPanel ? null : nombre))}
                style={{
                  padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                  background: isActive ? '#eef4ff' : '#f4f6fb',
                  border: `1px solid ${isActive ? '#bdd1ff' : '#e4e9f2'}`,
                  color: isActive ? '#2563eb' : '#6b7a99',
                }}>
                {nombre === 'Todas' ? nombre : nombre.split(' ')[0]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: 12, borderBottom: '1px solid #e4e9f2' }}>
        <StatMini icon={Phone}       label="Llamadas"      value={stats.total}            color="blue" />
        <StatMini icon={TrendingUp}  label="Respondieron"  value={stats.respondieron}     color="green" />
        <StatMini icon={PhoneMissed} label="Sin respuesta" value={sinRespuesta.length}    color="red" />
        <StatMini icon={TrendingUp}  label="Efectividad"   value={`${stats.efectividad}%`} color="amber" />
      </div>

      {/* Sin respuesta */}
      <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid #e4e9f2', display: 'flex', alignItems: 'center', gap: 6 }}>
        <PhoneMissed size={10} style={{ color: '#a0acc4' }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: '#8896b4', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Sin respuesta hoy
        </span>
        {sinRespuesta.length > 0 && (
          <span style={{ marginLeft: 'auto', background: '#fef0f0', color: '#d63030', border: '1px solid #f8c8c8', fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 20 }}>
            {sinRespuesta.length}
          </span>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!sinRespuesta.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', color: '#a0acc4', gap: 6 }}>
            <div style={{ fontSize: 24, color: '#22c98e' }}>✓</div>
            <p style={{ fontSize: 12 }}>¡Todos respondieron!</p>
          </div>
        ) : sinRespuesta.map(r => (
          <div key={r.id} style={{ padding: '11px 14px', borderBottom: '1px solid #eef1f8', cursor: 'default', transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#f4f7ff'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1a2035' }}>{r.alumno?.nombre || '—'}</div>
            <div style={{ fontSize: 11, color: '#8896b4', marginTop: 2 }}>
              {r.alumno?.programa || ''}{r.alumno?.semana_actual ? ` · Sem. ${r.alumno.semana_actual}` : ''}
            </div>
            <div style={{ fontSize: 10, color: '#b0bcd4', marginTop: 2 }}>{r.asesora?.nombre || ''}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: '10px 14px', borderTop: '1px solid #e4e9f2', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: '#a0acc4' }}>Total registros hoy</span>
        <span style={{ fontSize: 11, color: '#4a5578', fontWeight: 600 }}>{registrosHoy.length}</span>
      </div>
    </aside>
  )
}

function StatMini({ icon: Icon, label, value, color }) {
  const s = {
    blue:  { bg: '#eef4ff', border: '#bdd1ff', color: '#2563eb' },
    green: { bg: '#e8faf3', border: '#b8edd6', color: '#0f9e65' },
    red:   { bg: '#fef0f0', border: '#f8c8c8', color: '#d63030' },
    amber: { bg: '#fffbeb', border: '#fcd97a', color: '#b45309' },
  }[color]
  return (
    <div style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: s.color, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: s.color, lineHeight: 1, fontFamily: 'Syne, sans-serif' }}>{value}</div>
    </div>
  )
}
