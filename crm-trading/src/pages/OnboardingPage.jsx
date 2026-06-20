import { useOnboarding } from '../hooks/useOnboarding'
import { Loader2, RefreshCw, ChevronRight, CheckCircle, AlertTriangle } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'

const ESTADO_CONFIG = {
  pendiente:  { label: 'Pendiente',   color: '#506080', bg: 'rgba(80,96,128,0.12)',   border: 'rgba(80,96,128,0.25)'   },
  en_proceso: { label: 'En proceso',  color: '#7ab3ff', bg: 'rgba(78,143,255,0.12)',  border: 'rgba(78,143,255,0.25)'  },
  detenido:   { label: 'Detenido',    color: '#f5b93a', bg: 'rgba(245,166,35,0.12)',  border: 'rgba(245,166,35,0.25)'  },
  critico:    { label: 'Crítico',     color: '#f07070', bg: 'rgba(240,92,92,0.12)',   border: 'rgba(240,92,92,0.25)'   },
  listo:      { label: 'Listo ✓',    color: '#2dd4a0', bg: 'rgba(45,212,160,0.12)',  border: 'rgba(45,212,160,0.25)'  },
}

const FILTROS = [
  { key: 'todos',      label: 'Todos' },
  { key: 'pendiente',  label: 'Pendiente' },
  { key: 'en_proceso', label: 'En proceso' },
  { key: 'detenido',   label: 'Detenido' },
  { key: 'critico',    label: 'Crítico' },
  { key: 'listo',      label: 'Listos' },
]

function EstadoBadge({ estado }) {
  const c = ESTADO_CONFIG[estado] || ESTADO_CONFIG.pendiente
  return (
    <span style={{ background:c.bg, color:c.color, border:`1px solid ${c.border}`,
      padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:600 }}>
      {c.label}
    </span>
  )
}

function AvanceBar({ pct }) {
  const color = pct === 100 ? '#2dd4a0' : pct >= 50 ? '#7ab3ff' : pct > 0 ? '#f5b93a' : '#3d5070'
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ flex:1, height:5, background:'rgba(255,255,255,0.06)', borderRadius:3, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:3, transition:'width 0.4s' }} />
      </div>
      <span style={{ fontSize:11, color, fontWeight:600, minWidth:28 }}>{pct}%</span>
    </div>
  )
}

export default function OnboardingPage() {
  const o = useOnboarding()

  return (
    <div style={{ display:'flex', height:'100%' }}>

      {/* ── Columna principal ── */}
      <div style={{ flex:1, overflowY:'auto', padding:24, minWidth:0 }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20 }}>
          <div>
            <h1 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, color:'#e2e8f4', fontSize:20 }}>Onboarding</h1>
            <p style={{ fontSize:13, color:'#506080', marginTop:3 }}>
              Próximas promociones · Solo alumnos con fecha de inicio futura
            </p>
          </div>
          <button className="crm-btn crm-btn-sm" onClick={o.cargar}><RefreshCw size={13} /> Actualizar</button>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:8, marginBottom:20 }}>
          {[
            { label:'Total',       value: o.stats.total,      color:'#7ab3ff' },
            { label:'Pendiente',   value: o.stats.pendiente,  color:'#506080' },
            { label:'En proceso',  value: o.stats.en_proceso, color:'#7ab3ff' },
            { label:'Detenido',    value: o.stats.detenido,   color:'#f5b93a' },
            { label:'Crítico',     value: o.stats.critico,    color:'#f07070' },
            { label:'Listos',      value: o.stats.listo,      color:'#2dd4a0' },
          ].map(({ label, value, color }) => (
            <div key={label} className="crm-card" style={{ padding:'10px 12px', textAlign:'center' }}>
              <div style={{ fontSize:9, fontWeight:700, color:'#506080', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>{label}</div>
              <div style={{ fontSize:20, fontWeight:700, color, fontFamily:'Syne,sans-serif' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Embudo visual */}
        <div className="crm-card" style={{ padding:18, marginBottom:20 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#7a8aaa', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>
            Embudo de onboarding — alumnos que completaron cada paso
          </div>
          {o.embudo.map((paso, i) => (
            <div key={paso.key} style={{ marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontSize:12, color:'#9aaccb' }}>{paso.icon} {paso.label}</span>
                <span style={{ fontSize:12, fontWeight:600, color:'#e2e8f4' }}>
                  {paso.count} <span style={{ color:'#506080', fontWeight:400 }}>({paso.pct}%)</span>
                  {i > 0 && o.embudo[i-1].count > 0 && paso.count < o.embudo[i-1].count && (
                    <span style={{ color:'#f07070', fontSize:10, marginLeft:6 }}>
                      ▼ -{o.embudo[i-1].count - paso.count}
                    </span>
                  )}
                </span>
              </div>
              <div style={{ height:8, background:'rgba(255,255,255,0.06)', borderRadius:4, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${paso.pct}%`,
                  background: paso.pct < 50 && i > 0 ? '#f07070' : '#4e8fff',
                  borderRadius:4, transition:'width 0.5s' }} />
              </div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
          {FILTROS.map(f => {
            const count = f.key === 'todos' ? o.alumnos.length : o.alumnos.filter(al => o.calcEstado(al.id) === f.key).length
            return (
              <button key={f.key} onClick={() => o.setFiltro(f.key)}
                style={{ padding:'5px 12px', borderRadius:20, fontSize:12, fontWeight:500, cursor:'pointer',
                  background: o.filtro === f.key ? 'rgba(78,143,255,0.15)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${o.filtro === f.key ? 'rgba(78,143,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
                  color: o.filtro === f.key ? '#7ab3ff' : '#9aaccb' }}>
                {f.label} {count > 0 && <span style={{ opacity:0.6 }}>({count})</span>}
              </button>
            )
          })}
        </div>

        {/* Lista de alumnos */}
        {o.loading ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:50, gap:10, color:'#506080' }}>
            <Loader2 size={16} className="animate-spin" /><span style={{ fontSize:13 }}>Cargando...</span>
          </div>
        ) : o.alumnosFiltrados.length === 0 ? (
          <div style={{ textAlign:'center', padding:50, color:'#3d5070' }}>
            <div style={{ fontSize:28, marginBottom:8 }}>🎓</div>
            <p style={{ fontSize:13 }}>
              {o.alumnos.length === 0
                ? 'No hay alumnos con fecha de inicio futura. Importa la próxima promoción.'
                : 'Sin alumnos en este estado.'}
            </p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {o.alumnosFiltrados.map(al => {
              const estado  = o.calcEstado(al.id)
              const avance  = o.calcAvance(al.id)
              const diasInicio = al.fecha_inicio ? differenceInDays(new Date(al.fecha_inicio + 'T00:00:00'), new Date()) : null
              const seleccionado = o.alumnoSel?.id === al.id

              return (
                <div key={al.id} className="crm-card"
                  style={{ padding:14, cursor:'pointer', border: seleccionado ? '1px solid rgba(78,143,255,0.4)' : undefined,
                    background: seleccionado ? 'rgba(78,143,255,0.05)' : undefined }}
                  onClick={() => o.setAlumnoSel(seleccionado ? null : al)}>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                        <span style={{ fontSize:14, fontWeight:600, color:'#e2e8f4' }}>{al.nombre}</span>
                        <EstadoBadge estado={estado} />
                      </div>
                      <div style={{ fontSize:11, color:'#506080', marginBottom:6 }}>
                        {al.programa} · {al.asesora}
                        {diasInicio !== null && (
                          <span style={{ marginLeft:8, color: diasInicio <= 7 ? '#f07070' : '#f5b93a' }}>
                            · Inicia en {diasInicio}d
                          </span>
                        )}
                      </div>
                      <AvanceBar pct={avance} />
                    </div>
                    <ChevronRight size={16} style={{ color:'#3d5070', transform: seleccionado ? 'rotate(90deg)' : 'none', transition:'transform 0.2s', flexShrink:0 }} />
                  </div>

                  {/* Panel de pasos expandido */}
                  {seleccionado && (
                    <div style={{ marginTop:14, paddingTop:14, borderTop:'1px solid rgba(255,255,255,0.07)' }}>
                      {o.PASOS_INFO.map(p => {
                        const ps = (o.pasos[al.id] || []).find(pp => pp.paso === p.key)
                        const completado = ps?.estado === 'Completado'
                        return (
                          <div key={p.key} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0',
                            borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                            <button onClick={e => { e.stopPropagation(); o.togglePaso(al.id, p.key, al.asesora) }}
                              disabled={o.saving}
                              style={{ width:22, height:22, borderRadius:'50%', border:`2px solid ${completado ? '#2dd4a0' : 'rgba(255,255,255,0.2)'}`,
                                background: completado ? 'rgba(45,212,160,0.15)' : 'transparent', cursor:'pointer',
                                display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                              {completado && <CheckCircle size={12} style={{ color:'#2dd4a0' }} />}
                            </button>
                            <div style={{ flex:1 }}>
                              <div style={{ fontSize:12, color: completado ? '#2dd4a0' : '#e2e8f4', fontWeight: completado ? 400 : 500,
                                textDecoration: completado ? 'line-through' : 'none' }}>
                                {p.icon} {p.label}
                              </div>
                              <div style={{ fontSize:10, color:'#3d5070' }}>
                                {p.responsable}
                                {completado && ps.fecha_completado && (
                                  <span style={{ color:'#2dd4a0', marginLeft:6 }}>
                                    · {format(new Date(ps.fecha_completado), 'dd MMM HH:mm', { locale:es })}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}

                      {/* Alerta si está detenido o crítico */}
                      {(estado === 'detenido' || estado === 'critico') && (
                        <div style={{ marginTop:10, padding:'8px 10px', borderRadius:8,
                          background: estado === 'critico' ? 'rgba(240,92,92,0.08)' : 'rgba(245,166,35,0.08)',
                          border: `1px solid ${estado === 'critico' ? 'rgba(240,92,92,0.2)' : 'rgba(245,166,35,0.2)'}`,
                          fontSize:11, color: estado === 'critico' ? '#f07070' : '#f5b93a',
                          display:'flex', alignItems:'center', gap:6 }}>
                          <AlertTriangle size={12} />
                          {estado === 'critico' ? 'Sin avance hace más de 48 horas — requiere atención urgente' : 'Sin avance hace más de 24 horas'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
