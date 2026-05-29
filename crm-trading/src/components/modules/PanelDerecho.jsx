import { TrendingUp, PhoneMissed, Phone } from 'lucide-react'

export default function PanelDerecho({ asesoras, asesorasPanelOpts, registrosHoy, stats, asesoraPanel, setAsesoraPanel }) {
  const sinRespuesta = stats.sinRespuesta || []
  return (
    <aside style={{ width:280, flexShrink:0, borderLeft:'1px solid rgba(255,255,255,0.07)', background:'#0f1520', display:'flex', flexDirection:'column', overflowY:'auto' }}>
      <div style={{ padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)', background:'rgba(255,255,255,0.02)' }}>
        <div style={{ fontSize:12, fontWeight:700, color:'#e2e8f4' }}>Panel del día</div>
        <div style={{ fontSize:10, color:'#3d5070', marginTop:2 }}>Actualización en tiempo real</div>
      </div>
      {/* Tabs */}
      <div style={{ padding:12, borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ fontSize:10, fontWeight:700, color:'#3d5070', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>Filtrar por asesora</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
          {['Todas', ...asesoras.map(a => a.nombre)].map(nombre => {
            const isActive = nombre === 'Todas' ? asesoraPanel === null : asesoraPanel === nombre
            return (
              <button key={nombre}
                onClick={() => setAsesoraPanel(nombre === 'Todas' ? null : (nombre === asesoraPanel ? null : nombre))}
                style={{ padding:'4px 11px', borderRadius:20, fontSize:11, fontWeight:600, cursor:'pointer', transition:'all 0.15s',
                  background: isActive ? 'rgba(78,143,255,0.15)' : 'rgba(255,255,255,0.04)',
                  border:`1px solid ${isActive ? 'rgba(78,143,255,0.35)' : 'rgba(255,255,255,0.08)'}`,
                  color: isActive ? '#7ab3ff' : '#506080' }}>
                {nombre === 'Todas' ? nombre : nombre.split(' ')[0]}
              </button>
            )
          })}
        </div>
      </div>
      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, padding:12, borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
        {[
          { label:'Llamadas',      value:stats.total,            color:{ bg:'rgba(78,143,255,0.1)',  border:'rgba(78,143,255,0.2)',  text:'#7ab3ff' } },
          { label:'Respondieron',  value:stats.respondieron,     color:{ bg:'rgba(34,201,142,0.1)',  border:'rgba(34,201,142,0.2)',  text:'#2dd4a0' } },
          { label:'Sin respuesta', value:sinRespuesta.length,    color:{ bg:'rgba(240,92,92,0.1)',   border:'rgba(240,92,92,0.2)',   text:'#f07070' } },
          { label:'Efectividad',   value:`${stats.efectividad}%`,color:{ bg:'rgba(245,166,35,0.1)',  border:'rgba(245,166,35,0.2)',  text:'#f5b93a' } },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background:color.bg, border:`1px solid ${color.border}`, borderRadius:10, padding:'10px 12px' }}>
            <div style={{ fontSize:10, fontWeight:700, color:color.text, opacity:0.75, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>{label}</div>
            <div style={{ fontSize:20, fontWeight:700, color:color.text, lineHeight:1, fontFamily:'Syne,sans-serif' }}>{value}</div>
          </div>
        ))}
      </div>
      {/* Sin respuesta */}
      <div style={{ padding:'10px 14px 8px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', gap:6 }}>
        <PhoneMissed size={10} style={{ color:'#3d5070' }} />
        <span style={{ fontSize:10, fontWeight:700, color:'#506080', textTransform:'uppercase', letterSpacing:'0.08em' }}>Sin respuesta hoy</span>
        {sinRespuesta.length > 0 && (
          <span style={{ marginLeft:'auto', background:'rgba(240,92,92,0.15)', color:'#f07070', border:'1px solid rgba(240,92,92,0.25)', fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:20 }}>
            {sinRespuesta.length}
          </span>
        )}
      </div>
      <div style={{ flex:1, overflowY:'auto' }}>
        {!sinRespuesta.length ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'32px 16px', color:'#3d5070', gap:6 }}>
            <div style={{ fontSize:22, color:'#22c98e' }}>✓</div>
            <p style={{ fontSize:12 }}>¡Todos respondieron!</p>
          </div>
        ) : sinRespuesta.map(r => (
          <div key={r.id} style={{ padding:'11px 14px', borderBottom:'1px solid rgba(255,255,255,0.05)', transition:'background 0.15s', cursor:'default' }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(78,143,255,0.05)'}
            onMouseLeave={e => e.currentTarget.style.background='transparent'}>
            <div style={{ fontSize:13, fontWeight:600, color:'#e2e8f4' }}>{r.alumno?.nombre || '—'}</div>
            <div style={{ fontSize:11, color:'#506080', marginTop:2 }}>
              {r.alumno?.programa || ''}{r.alumno?.semana_actual ? ` · Sem. ${r.alumno.semana_actual}` : ''}
            </div>
            <div style={{ fontSize:10, color:'#3d5070', marginTop:2 }}>{r.asesora?.nombre || ''}</div>
          </div>
        ))}
      </div>
      <div style={{ padding:'10px 14px', borderTop:'1px solid rgba(255,255,255,0.07)', display:'flex', justifyContent:'space-between' }}>
        <span style={{ fontSize:11, color:'#3d5070' }}>Total registros hoy</span>
        <span style={{ fontSize:11, color:'#9aaccb', fontWeight:600 }}>{registrosHoy.length}</span>
      </div>
    </aside>
  )
}
