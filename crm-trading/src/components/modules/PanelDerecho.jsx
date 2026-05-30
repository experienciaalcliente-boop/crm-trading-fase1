import { TrendingUp, PhoneMissed, Phone } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function PanelDerecho({ asesoras, registrosHoy, stats, asesoraPanel, setAsesoraPanel }) {
  const sinRespuesta = stats.sinRespuesta || []
  const hoy = new Date().toISOString().split('T')[0]

  return (
    <aside style={{ width:280, flexShrink:0, borderLeft:'1px solid rgba(255,255,255,0.07)', background:'#0f1520', display:'flex', flexDirection:'column', overflowY:'auto' }}>
      <div style={{ padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)', background:'rgba(255,255,255,0.02)' }}>
        <div style={{ fontSize:12, fontWeight:700, color:'#e2e8f4' }}>Panel de seguimiento</div>
        <div style={{ fontSize:10, color:'#3d5070', marginTop:2 }}>Llamadas de hoy + pendientes acumulados</div>
      </div>

      {/* Tabs asesoras */}
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

      {/* Stats del día */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, padding:12, borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
        {[
          { label:'Llamadas hoy',  value:stats.total,            color:{ bg:'rgba(78,143,255,0.1)',  border:'rgba(78,143,255,0.2)',  text:'#7ab3ff' } },
          { label:'Respondieron',  value:stats.respondieron,     color:{ bg:'rgba(34,201,142,0.1)',  border:'rgba(34,201,142,0.2)',  text:'#2dd4a0' } },
          { label:'Sin resp. hoy', value:registrosHoy.filter(r => r.respondio === 'No' && (asesoraPanel ? r.asesora?.nombre === asesoraPanel : true)).length,
            color:{ bg:'rgba(245,166,35,0.1)', border:'rgba(245,166,35,0.2)', text:'#f5b93a' } },
          { label:'Efectividad',   value:`${stats.efectividad}%`,color:{ bg:'rgba(240,92,92,0.1)',   border:'rgba(240,92,92,0.2)',   text:'#f07070' } },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background:color.bg, border:`1px solid ${color.border}`, borderRadius:10, padding:'10px 12px' }}>
            <div style={{ fontSize:10, fontWeight:700, color:color.text, opacity:0.75, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>{label}</div>
            <div style={{ fontSize:20, fontWeight:700, color:color.text, lineHeight:1, fontFamily:'Syne,sans-serif' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Lista acumulada sin responder */}
      <div style={{ padding:'10px 14px 8px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', gap:6 }}>
        <PhoneMissed size={10} style={{ color:'#3d5070' }} />
        <span style={{ fontSize:10, fontWeight:700, color:'#506080', textTransform:'uppercase', letterSpacing:'0.08em' }}>
          Pendientes de contactar
        </span>
        {sinRespuesta.length > 0 && (
          <span style={{ marginLeft:'auto', background:'rgba(240,92,92,0.15)', color:'#f07070', border:'1px solid rgba(240,92,92,0.25)', fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:20 }}>
            {sinRespuesta.length}
          </span>
        )}
      </div>
      <div style={{ marginLeft:14, marginRight:14, marginBottom:6, marginTop:4, fontSize:10, color:'#3d5070', lineHeight:1.4 }}>
        Alumnos cuyo último registro fue sin respuesta. Desaparecen cuando registras que sí contestaron.
      </div>

      <div style={{ flex:1, overflowY:'auto' }}>
        {!sinRespuesta.length ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'32px 16px', color:'#3d5070', gap:6 }}>
            <div style={{ fontSize:22, color:'#22c98e' }}>✓</div>
            <p style={{ fontSize:12 }}>¡Sin pendientes acumulados!</p>
          </div>
        ) : sinRespuesta.map(r => {
          const esHoy = r.fecha === hoy
          const diasAtras = Math.floor((new Date(hoy) - new Date(r.fecha)) / (1000*60*60*24))
          return (
            <div key={r.id}
              onClick={() => onSeleccionarAlumno && onSeleccionarAlumno(r)}
              style={{ padding:'11px 14px', borderBottom:'1px solid rgba(255,255,255,0.05)', transition:'all 0.15s', cursor: onSeleccionarAlumno ? 'pointer' : 'default' }}
              onMouseEnter={e => { e.currentTarget.style.background='rgba(78,143,255,0.08)'; e.currentTarget.style.borderLeft='2px solid #4e8fff' }}
              onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.borderLeft='none' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:2 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'#e2e8f4', flex:1, marginRight:6 }}>{r.alumno?.nombre || '—'}</div>
                <span style={{
                  fontSize:10, fontWeight:600, padding:'1px 7px', borderRadius:20,
                  background: esHoy ? 'rgba(245,166,35,0.15)' : diasAtras <= 1 ? 'rgba(240,92,92,0.15)' : 'rgba(255,255,255,0.06)',
                  color: esHoy ? '#f5b93a' : diasAtras <= 1 ? '#f07070' : '#506080',
                  border: `1px solid ${esHoy ? 'rgba(245,166,35,0.3)' : diasAtras <= 1 ? 'rgba(240,92,92,0.3)' : 'rgba(255,255,255,0.08)'}`,
                }}>
                  {esHoy ? 'Hoy' : diasAtras === 1 ? 'Ayer' : `Hace ${diasAtras}d`}
                </span>
              </div>
              <div style={{ fontSize:11, color:'#506080' }}>
                {r.alumno?.programa || ''}{r.alumno?.semana_actual ? ` · Sem. ${r.alumno.semana_actual}` : ''}
              </div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:3 }}>
                <div style={{ fontSize:10, color:'#3d5070' }}>{r.asesora?.nombre || ''}</div>
                {onSeleccionarAlumno && (
                  <span style={{ fontSize:9, color:'#4e8fff', background:'rgba(78,143,255,0.12)', border:'1px solid rgba(78,143,255,0.25)', padding:'1px 7px', borderRadius:10, fontWeight:700 }}>
                    ✎ Registrar
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ padding:'10px 14px', borderTop:'1px solid rgba(255,255,255,0.07)', display:'flex', justifyContent:'space-between' }}>
        <span style={{ fontSize:11, color:'#3d5070' }}>Registros hoy</span>
        <span style={{ fontSize:11, color:'#9aaccb', fontWeight:600 }}>{registrosHoy.length}</span>
      </div>
    </aside>
  )
}
