import { Loader2, RefreshCw } from 'lucide-react'
import { useEfectividadDiaria } from '../../hooks/useEfectividadDiaria'
import EncuestaResumen from '../shared/EncuestaResumen'
import ComentariosPorDia from '../shared/ComentariosPorDia'

function KPICard({ label, value, sub }) {
  return (
    <div className="crm-card" style={{ padding:16 }}>
      <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:26, fontWeight:700, color:'var(--text-primary)', fontFamily:'Syne,sans-serif', lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>{sub}</div>}
    </div>
  )
}

export default function EfectividadDiariaAsesoras() {
  const { filas, totales, encuestaPorAsesora, encuestaGeneral, fecha, setFecha, comentariosDelDia, loading, cargar } = useEfectividadDiaria()

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

      {/* ── Efectividad diaria (hoy) ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:20 }}>
        <KPICard label="Llamadas hoy" value={totales.llamadasHoy} sub="Todas las asesoras" />
        <KPICard label="Respondieron hoy"
          value={totales.respondieronHoy}
          sub={totales.llamadasHoy > 0 ? `${Math.round(totales.respondieronHoy / totales.llamadasHoy * 100)}% contactabilidad` : 'Sin registros aún'} />
        <KPICard label="Agendando hoy" value={totales.agendadasHoy} sub="Llamadas programadas hoy" />
      </div>

      <div className="crm-card" style={{ overflowX:'auto', marginBottom:32 }}>
        <table className="crm-table">
          <thead>
            <tr>
              <th>Asesora</th>
              <th>Llamadas hoy</th>
              <th>Respondieron</th>
              <th>Contactabilidad hoy</th>
              <th>Agendando hoy</th>
              <th>Sin responder (acum.)</th>
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign:'center', color:'var(--text-muted)', padding:'20px 0' }}>Sin asesoras registradas</td></tr>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Encuesta de Satisfacción — Asesoría Académica (general) ── */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, paddingBottom:10, borderBottom:'1px solid var(--border-default)' }}>
        <h2 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, color:'var(--text-primary)', fontSize:16 }}>Encuesta de Satisfacción — Asesoría Académica</h2>
      </div>

      <div className="crm-card" style={{ overflowX:'auto', marginBottom:16 }}>
        <table className="crm-table">
          <thead>
            <tr><th>Asesora</th><th>Respuestas</th><th>NPS</th><th>SAT</th></tr>
          </thead>
          <tbody>
            {encuestaPorAsesora.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign:'center', color:'var(--text-muted)', padding:'20px 0' }}>Sin asesoras registradas</td></tr>
            ) : encuestaPorAsesora.map(a => (
              <tr key={a.asesoraId}>
                <td style={{ fontWeight:600, color:'var(--text-primary)' }}>{a.nombre}</td>
                <td style={{ textAlign:'center' }}>{a.total}</td>
                <td style={{ textAlign:'center', color: a.nps != null ? 'var(--text-primary)' : 'var(--text-muted)' }}>{a.nps != null ? `${a.nps}%` : '—'}</td>
                <td style={{ textAlign:'center', color: a.csat != null ? '#2dd4a0' : 'var(--text-muted)' }}>{a.csat != null ? `${a.csat}%` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ fontSize:11, color:'var(--text-muted)', padding:'10px 18px' }}>
          Desglosado por el programa que responde cada alumno, cruzado con la asesora asignada a ese programa.
        </div>
      </div>

      <div style={{ marginBottom:16 }}>
        <EncuestaResumen
          titulo="Resultados generales"
          resumen={encuestaGeneral}
          labelR3="Atención al pedir ayuda"
          labelR4="Ayuda a avanzar en el programa"
        />
      </div>

      <ComentariosPorDia fecha={fecha} setFecha={setFecha} comentarios={comentariosDelDia} titulo="Comentarios de alumnos" />
    </div>
  )
}
