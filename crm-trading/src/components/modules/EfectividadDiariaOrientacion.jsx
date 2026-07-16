import { Loader2, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, addDays, subDays } from 'date-fns'
import { useEfectividadDiariaOrientacion } from '../../hooks/useEfectividadDiariaOrientacion'
import EncuestaResumen from '../shared/EncuestaResumen'
import ComentariosPorDia from '../shared/ComentariosPorDia'
import { hoyLima } from '../../lib/api'

const hoyStr = hoyLima

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
  const { stats, filasPorAsesora, indicadoresOrientador: io, loading, cargar, fecha, setFecha, comentariosDelDia, encuestaGeneral } = useEfectividadDiariaOrientacion()

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

      {/* ── Datos generales del orientador (navegable por día) ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, marginBottom:16, paddingBottom:10, borderBottom:'1px solid var(--border-default)' }}>
        <h2 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, color:'var(--text-primary)', fontSize:16 }}>Indicadores del orientador</h2>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button className="crm-btn crm-btn-sm" onClick={() => setFecha(format(subDays(new Date(fecha + 'T00:00:00'), 1), 'yyyy-MM-dd'))}>
            <ChevronLeft size={14} />
          </button>
          <input type="date" className="crm-input" style={{ width:150 }} max={hoyStr()}
            value={fecha} onChange={e => setFecha(e.target.value)} />
          <button className="crm-btn crm-btn-sm" onClick={() => setFecha(format(addDays(new Date(fecha + 'T00:00:00'), 1), 'yyyy-MM-dd'))} disabled={fecha === hoyStr()}>
            <ChevronRight size={14} />
          </button>
          {fecha !== hoyStr() && (
            <button className="crm-btn crm-btn-sm" onClick={() => setFecha(hoyStr())}>Hoy</button>
          )}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
        <KPICard label="Sesiones del día"  value={io.totalSesionesDia} />
        <KPICard label="Concretadas"       value={io.concretadasDia} color="#2dd4a0" />
        <KPICard label="Efectividad"       value={`${io.efectividad}%`} sub="No volvieron a agendar" color="var(--accent)" />
        <KPICard label="Alumnos atendidos" value={io.alumnosUnicosDia} />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:32 }}>
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
                <span style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)' }}>{count} <span style={{ color:'var(--text-muted)', fontWeight:400 }}>({io.concretadasDia > 0 ? Math.round(count / io.concretadasDia * 100) : 0}%)</span></span>
              </div>
              <div style={{ height:5, background:'rgba(255,255,255,0.06)', borderRadius:3, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${io.concretadasDia > 0 ? count / io.concretadasDia * 100 : 0}%`, background:'var(--accent)', borderRadius:3 }} />
              </div>
            </div>
          ))}
          <div style={{ marginTop:12, paddingTop:10, borderTop:'1px solid var(--border-default)', fontSize:12, color:'var(--text-muted)' }}>
            Alumnos únicos atendidos: <span style={{ color:'#b89eff', fontWeight:700 }}>{io.alumnosUnicosDia}</span>
          </div>
        </div>
      </div>

      {/* ── Gestión del día (hoy) ── */}
      <h2 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, color:'var(--text-primary)', fontSize:16, marginBottom:16, paddingBottom:10, borderBottom:'1px solid var(--border-default)' }}>Gestión del día</h2>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginBottom:20 }}>
        <KPICard label="Sesiones hoy"      value={stats.total} sub="Agendadas para hoy" />
        <KPICard label="Concretadas"       value={stats.concretadas}   color="#2dd4a0" />
        <KPICard label="Reprogramadas"     value={stats.reprogramadas} color="#f5b93a" />
        <KPICard label="No conectaron"     value={stats.noConectaron}  color="#f07070" />
        <KPICard label="Agendando hoy"     value={stats.agendadasHoy} sub="Nuevas sesiones creadas hoy" />
      </div>

      <div className="crm-card" style={{ overflowX:'auto', marginBottom:32 }}>
        <table className="crm-table">
          <thead>
            <tr>
              <th>Asesora</th>
              <th>Sesiones de hoy que agendó</th>
              <th>Concretadas</th>
              <th>Agendando hoy</th>
            </tr>
          </thead>
          <tbody>
            {filasPorAsesora.map(f => (
              <tr key={f.nombre}>
                <td style={{ fontWeight:600, color:'var(--text-primary)' }}>{f.nombre}</td>
                <td style={{ textAlign:'center' }}>{f.sesionesHoy}</td>
                <td style={{ textAlign:'center' }}>{f.concretadas}</td>
                <td style={{ textAlign:'center' }}>{f.agendadasHoy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginBottom:16 }}>
        <ComentariosPorDia fecha={fecha} setFecha={setFecha} comentarios={comentariosDelDia} titulo="Comentarios de la encuesta" />
      </div>

      {/* ── Encuesta de Satisfacción — Orientación Técnica (general) ── */}
      <EncuestaResumen
        titulo="Encuesta de Satisfacción — Orientación Técnica"
        resumen={encuestaGeneral}
        labelR3="Consulta resuelta"
        labelR4="Explicaciones claras"
      />
    </div>
  )
}
