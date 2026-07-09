import { Loader2, RefreshCw } from 'lucide-react'
import { useEfectividadDiaria } from '../../hooks/useEfectividadDiaria'

function KPICard({ label, value, sub }) {
  return (
    <div className="crm-card" style={{ padding:16 }}>
      <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:26, fontWeight:700, color:'var(--text-primary)', fontFamily:'Syne,sans-serif', lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>{sub}</div>}
    </div>
  )
}

function ComentariosCard({ comentarios }) {
  return (
    <div className="crm-card" style={{ padding:18, marginTop:16 }}>
      <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>Comentarios de la encuesta (mes actual)</div>
      {comentarios.length === 0 ? (
        <div style={{ fontSize:13, color:'var(--text-muted)', padding:'10px 0' }}>Sin comentarios este mes</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10, maxHeight:280, overflowY:'auto' }}>
          {comentarios.map((c, i) => (
            <div key={i} style={{ padding:'10px 12px', background:'rgba(255,255,255,0.03)', borderRadius:8, borderLeft:'3px solid #f5b93a' }}>
              <div style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.4 }}>"{c.comentario}"</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:6 }}>
                {c.asesora} · {c.programa || 'Sin programa'} · {c.fecha ? new Date(c.fecha).toLocaleDateString('es-PE') : ''}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function EfectividadDiariaAsesoras() {
  const { filas, totales, comentarios, loading, cargar } = useEfectividadDiaria()

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', gap:10, color:'var(--text-muted)' }}>
      <Loader2 size={18} className="animate-spin" /><span style={{ fontSize:13 }}>Cargando...</span>
    </div>
  )

  return (
    <div style={{ padding:24, maxWidth:1100, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, color:'var(--text-primary)', fontSize:20 }}>Efectividad diaria por asesora</h1>
          <p style={{ fontSize:13, color:'var(--text-muted)', textTransform:'capitalize', marginTop:3 }}>
            {new Date().toLocaleDateString('es-PE', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
          </p>
        </div>
        <button className="crm-btn crm-btn-sm" onClick={cargar}><RefreshCw size={13} /> Actualizar</button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:20 }}>
        <KPICard label="Llamadas hoy" value={totales.llamadasHoy} sub="Todas las asesoras" />
        <KPICard label="Respondieron hoy"
          value={totales.respondieronHoy}
          sub={totales.llamadasHoy > 0 ? `${Math.round(totales.respondieronHoy / totales.llamadasHoy * 100)}% contactabilidad` : 'Sin registros aún'} />
        <KPICard label="Agendando hoy" value={totales.agendadasHoy} sub="Llamadas programadas hoy" />
      </div>

      <div className="crm-card" style={{ overflowX:'auto' }}>
        <table className="crm-table">
          <thead>
            <tr>
              <th>Asesora</th>
              <th>Llamadas hoy</th>
              <th>Respondieron</th>
              <th>Contactabilidad hoy</th>
              <th>Agendando hoy</th>
              <th>Sin responder (acum.)</th>
              <th>Respuestas encuesta</th>
              <th>NPS</th>
              <th>SAT</th>
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign:'center', color:'var(--text-muted)', padding:'20px 0' }}>Sin asesoras registradas</td></tr>
            ) : filas.map(f => (
              <tr key={f.id}>
                <td style={{ fontWeight:600, color:'var(--text-primary)' }}>{f.nombre}</td>
                <td style={{ textAlign:'center' }}>{f.llamadasHoy}</td>
                <td style={{ textAlign:'center' }}>{f.respondieronHoy}</td>
                <td>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ flex:1, height:6, background:'rgba(255,255,255,0.06)', borderRadius:3 }}>
                      <div style={{ height:'100%', width:`${f.contactabilidadHoy}%`, background: f.contactabilidadHoy >= 70 ? '#2dd4a0' : f.contactabilidadHoy >= 40 ? '#f5b93a' : '#f07070', borderRadius:3 }} />
                    </div>
                    <span style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)', minWidth:32 }}>{f.contactabilidadHoy}%</span>
                  </div>
                </td>
                <td style={{ textAlign:'center' }}>{f.agendadasHoy}</td>
                <td style={{ textAlign:'center' }}>
                  {f.sinResponderAcumulado > 0
                    ? <span style={{ color:'#fb923c', fontWeight:700 }}>{f.sinResponderAcumulado}</span>
                    : <span style={{ color:'var(--text-muted)' }}>—</span>}
                </td>
                <td style={{ textAlign:'center', color:'var(--text-muted)' }}>{f.totalEncuestas}</td>
                <td style={{ textAlign:'center', color: f.nps != null ? 'var(--text-primary)' : 'var(--text-muted)' }}>{f.nps != null ? `${f.nps}%` : '—'}</td>
                <td style={{ textAlign:'center', color: f.csat != null ? '#2dd4a0' : 'var(--text-muted)' }}>{f.csat != null ? `${f.csat}%` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:10 }}>
        NPS y SAT del mes actual, cruzados por el programa que responde cada alumno en la encuesta.
      </div>

      <ComentariosCard comentarios={comentarios} />
    </div>
  )
}
