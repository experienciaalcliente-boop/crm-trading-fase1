import { Loader2, RefreshCw } from 'lucide-react'
import { useEfectividadDiariaOrientacion } from '../../hooks/useEfectividadDiariaOrientacion'

function KPICard({ label, value, sub, color }) {
  return (
    <div className="crm-card" style={{ padding:16 }}>
      <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:26, fontWeight:700, color: color || 'var(--text-primary)', fontFamily:'Syne,sans-serif', lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>{sub}</div>}
    </div>
  )
}

export default function EfectividadDiariaOrientacion() {
  const { stats, filasPorAsesora, indicadoresOrientador: io, loading, cargar } = useEfectividadDiariaOrientacion()

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', gap:10, color:'var(--text-muted)' }}>
      <Loader2 size={18} className="animate-spin" /><span style={{ fontSize:13 }}>Cargando...</span>
    </div>
  )

  return (
    <div style={{ padding:24, maxWidth:1100, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, color:'var(--text-primary)', fontSize:20 }}>Efectividad diaria — Orientación Técnica</h1>
          <p style={{ fontSize:13, color:'var(--text-muted)', textTransform:'capitalize', marginTop:3 }}>
            {new Date().toLocaleDateString('es-PE', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
          </p>
        </div>
        <button className="crm-btn crm-btn-sm" onClick={cargar}><RefreshCw size={13} /> Actualizar</button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginBottom:20 }}>
        <KPICard label="Sesiones hoy"      value={stats.total} sub="Agendadas para hoy" />
        <KPICard label="Concretadas"       value={stats.concretadas}   color="#2dd4a0" />
        <KPICard label="Reprogramadas"     value={stats.reprogramadas} color="#f5b93a" />
        <KPICard label="No conectaron"     value={stats.noConectaron}  color="#f07070" />
        <KPICard label="Agendando hoy"     value={stats.agendadasHoy} sub="Nuevas sesiones creadas hoy" />
      </div>

      <div className="crm-card" style={{ overflowX:'auto' }}>
        <table className="crm-table">
          <thead>
            <tr>
              <th>Asesora</th>
              <th>Sesiones de hoy que agendó</th>
              <th>Concretadas</th>
              <th>Agendando hoy</th>
              <th>NPS</th>
              <th>SAT</th>
            </tr>
          </thead>
          <tbody>
            {filasPorAsesora.map(f => (
              <tr key={f.nombre}>
                <td style={{ fontWeight:600, color:'var(--text-primary)' }}>{f.nombre}</td>
                <td style={{ textAlign:'center' }}>{f.sesionesHoy}</td>
                <td style={{ textAlign:'center' }}>{f.concretadas}</td>
                <td style={{ textAlign:'center' }}>{f.agendadasHoy}</td>
                <td style={{ textAlign:'center', color:'var(--text-muted)' }}>—</td>
                <td style={{ textAlign:'center', color:'var(--text-muted)' }}>—</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:10, marginBottom:24 }}>
        "Sesiones de hoy que agendó" y "Concretadas" cuentan sesiones programadas para el día de hoy. "Agendando hoy" cuenta sesiones nuevas que esa asesora creó hoy (para cualquier fecha). NPS y SAT: sin datos aún — próximamente.
      </div>

      {/* ── Indicadores del orientador (mes actual) ── */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, marginTop:28, paddingBottom:10, borderBottom:'1px solid var(--border-default)' }}>
        <h2 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, color:'var(--text-primary)', fontSize:16 }}>Indicadores del orientador (mes actual)</h2>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
        <KPICard label="Sesiones del mes"  value={io.totalSesionesMes} />
        <KPICard label="Concretadas"       value={io.concretadasMes} color="#2dd4a0" />
        <KPICard label="Efectividad"       value={`${io.efectividad}%`} sub="No volvieron a agendar" color="var(--accent)" />
        <KPICard label="Alumnos atendidos" value={io.alumnosUnicosMes} />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <div className="crm-card" style={{ padding:18 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>Motivos frecuentes</div>
          {io.motivosFrecuentes.length === 0 ? <div style={{ color:'var(--text-muted)', fontSize:13 }}>Sin datos</div>
            : io.motivosFrecuentes.map(([motivo, count]) => (
            <div key={motivo} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize:12, color:'var(--text-secondary)', flex:1, marginRight:8 }}>{motivo}</span>
              <span style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>{count}</span>
            </div>
          ))}
        </div>
        <div className="crm-card" style={{ padding:18 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>Herramientas verificadas</div>
          {Object.entries(io.herramientas).map(([tool, count]) => (
            <div key={tool} style={{ marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontSize:12, color:'var(--text-secondary)' }}>{tool}</span>
                <span style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)' }}>{count} <span style={{ color:'var(--text-muted)', fontWeight:400 }}>({io.concretadasMes > 0 ? Math.round(count / io.concretadasMes * 100) : 0}%)</span></span>
              </div>
              <div style={{ height:5, background:'rgba(255,255,255,0.06)', borderRadius:3, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${io.concretadasMes > 0 ? count / io.concretadasMes * 100 : 0}%`, background:'var(--accent)', borderRadius:3 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
