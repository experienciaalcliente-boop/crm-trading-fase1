import { useDashboard } from '../hooks/useDashboard'
import { useAuth } from '../context/AuthContext'
import { Loader2, RefreshCw, Phone, CreditCard, MonitorSmartphone, TrendingUp, Smile } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const COLORS = ['#65a7a6','#2dd4a0','#f5b93a','#f07070','#b89eff','#6f9c9a']

const fmt  = n => Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtN = n => Number(n).toLocaleString('es-PE')

const customTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'var(--bg-input)', border:'1px solid var(--border-default)', borderRadius:8, padding:'8px 12px', fontSize:12 }}>
      <div style={{ color:'var(--text-primary)', fontWeight:600, marginBottom:4 }}>{label}</div>
      {payload.map((p,i) => <div key={i} style={{ color:p.color }}>{p.name}: {p.value}</div>)}
    </div>
  )
}

const pctLabel = ({ percent }) => percent > 0 ? `${Math.round(percent * 100)}%` : ''

// Heatmap de avance: rampa secuencial de un solo hue (mint claro → teal
// oscuro, los mismos tonos de marca) — 0% = casi sin avance, 100% = todo
// el programa ya en Real/Fondeo.
function pctToColor(pct) {
  const t = Math.max(0, Math.min(100, pct)) / 100
  const from = [176, 237, 228] // #b0ede4
  const to   = [28, 64, 71]    // #1c4047
  const rgb = from.map((c, i) => Math.round(c + (to[i] - c) * t))
  return `rgb(${rgb.join(',')})`
}

const MESES_CORTOS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
function formatMesCorto(mesStr) {
  const [y, m] = mesStr.split('-').map(Number)
  return `${MESES_CORTOS[m-1]} ${String(y).slice(-2)}`
}

function SectionTitle({ icon: Icon, title, color='#65a7a6' }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, marginTop:28, paddingBottom:10, borderBottom:'1px solid var(--border-default)' }}>
      <div style={{ width:32, height:32, borderRadius:8, background:`${color}20`, border:`1px solid ${color}40`, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Icon size={15} style={{ color }} />
      </div>
      <h2 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, color:'var(--text-primary)', fontSize:16 }}>{title}</h2>
    </div>
  )
}

function KPICard({ label, value, sub, color='#e4f5f2', accent, badge }) {
  return (
    <div className="crm-card" style={{ padding:16, borderLeft: accent ? `3px solid ${accent}` : undefined }}>
      <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:26, fontWeight:700, color, fontFamily:'Syne,sans-serif', lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>{sub}</div>}
      {badge}
    </div>
  )
}

function ComentariosCard({ comentarios, titulo='Comentarios de alumnos', vacio='Sin comentarios este mes' }) {
  return (
    <div className="crm-card" style={{ padding:18 }}>
      <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>{titulo}</div>
      {comentarios.length === 0 ? (
        <div style={{ fontSize:13, color:'var(--text-muted)', padding:'10px 0' }}>{vacio}</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10, maxHeight:260, overflowY:'auto' }}>
          {comentarios.map((c, i) => (
            <div key={i} style={{ padding:'10px 12px', background:'rgba(255,255,255,0.03)', borderRadius:8, borderLeft:'3px solid #f5b93a' }}>
              <div style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.4 }}>"{c.comentario}"</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:6 }}>
                {c.programa || 'Sin programa'} · {c.fecha ? new Date(c.fecha).toLocaleDateString('es-PE') : ''}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PctBar({ label, pct, count, total, color='#65a7a6' }) {
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
        <span style={{ fontSize:12, color:'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)' }}>{pct}% <span style={{ color:'var(--text-muted)', fontWeight:400 }}>({count}/{total})</span></span>
      </div>
      <div style={{ height:6, background:'rgba(255,255,255,0.06)', borderRadius:3, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${Math.min(pct,100)}%`, background:color, borderRadius:3, transition:'width 0.5s' }} />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const d = useDashboard()
  const { user } = useAuth()
  const esAsesora = user?.rol === 'asesora'
  const esSupervisor = user?.rol === 'supervisor'
  const esOrientador = user?.rol === 'orientador'

  if (d.loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', gap:10, color:'var(--text-muted)' }}>
      <Loader2 size={18} className="animate-spin" /><span style={{ fontSize:13 }}>Cargando dashboard...</span>
    </div>
  )

  const hoyDisplay = format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es })
  const mesDisplay = new Date(d.mesFiltro + '-01T00:00:00').toLocaleDateString('es-PE', { month:'long', year:'numeric' })

  return (
    <div style={{ padding:24, maxWidth:1200, margin:'0 auto' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:8 }}>
        <div>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, color:'var(--text-primary)', fontSize:22 }}>Dashboard ejecutivo</h1>
          <p style={{ fontSize:13, color:'var(--text-muted)', textTransform:'capitalize', marginTop:3 }}>
            {hoyDisplay} · Mostrando: <span style={{ color:'var(--accent)' }}>{mesDisplay}</span>
          </p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:11, color:'var(--text-muted)' }}>Act: {format(d.lastUpdate, 'HH:mm:ss')}</span>
          <select value={d.mesFiltro} onChange={e => d.setMesFiltro(e.target.value)}
            style={{ padding:'6px 10px', background:'var(--bg-input)', border:'1.5px solid var(--border-input)', borderRadius:8, color:'var(--text-primary)', fontSize:13, cursor:'pointer' }}>
            {Array.from({ length: 12 }, (_, i) => {
              const dt = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1)
              const val = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`
              return <option key={val} value={val}>{dt.toLocaleDateString('es-PE', { month:'long', year:'numeric' })}</option>
            })}
          </select>
          <button className="crm-btn crm-btn-sm" onClick={d.cargar}><RefreshCw size={13} /> Actualizar</button>
        </div>
      </div>

      {/* KPIs principales */}
      {esOrientador ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:4 }}>
          <KPICard label="Sesiones del mes" value={d.totalSesiones}       sub="Agendadas este mes"     color="#b89eff" accent="#b89eff" />
          <KPICard label="Concretadas"      value={d.sesionesConcretadas} sub="Sesiones realizadas"    color="#2dd4a0" accent="#2dd4a0" />
          <KPICard label="Efectividad"      value={`${d.efectividadOrientador}%`} sub="No volvieron a agendar" color="var(--accent)" accent="var(--accent)" />
          <KPICard label="Alumnos atendidos" value={d.alumnosUnicos}      sub="Este mes"               color="var(--accent)" accent="var(--accent)" />
        </div>
      ) : esAsesora ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:4 }}>
          <KPICard label="Alumnos activos"    value={d.totalAlumnosActivos}  sub="En curso + seguimiento"    color="var(--accent)"  accent="var(--accent)" />
          <KPICard label="Contactabilidad"    value={`${d.contactabilidad}%`} sub={`${d.respondieron} respondieron`} color="#2dd4a0" accent="#2dd4a0" />
          <KPICard label="Riesgo Alto"        value={d.riesgoAlto}           sub="Requieren intervención"   color="#f07070"  accent="#f07070" />
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginBottom:4 }}>
          <KPICard label="Alumnos activos"    value={d.totalAlumnosActivos}  sub="En curso + seguimiento"    color="var(--accent)"  accent="var(--accent)" />
          <KPICard label="Contactabilidad"    value={`${d.contactabilidad}%`} sub={`${d.respondieron} respondieron`} color="#2dd4a0" accent="#2dd4a0" />
          <KPICard label="SAT general"        value={d.encuestaGeneralCombinada.csat != null ? `${d.encuestaGeneralCombinada.csat}%` : '—'} sub={d.encuestaGeneralCombinada.total > 0 ? `${d.encuestaGeneralCombinada.total} respuestas` : 'Sin datos aún'} color="var(--accent)" accent="var(--accent)" />
          <KPICard label="NPS general"        value={d.encuestaGeneralCombinada.nps != null ? d.encuestaGeneralCombinada.nps : '—'} sub={d.encuestaGeneralCombinada.total > 0 ? `${d.encuestaGeneralCombinada.total} respuestas` : 'Sin datos aún'} color="var(--accent)" accent="var(--accent)" />
          <KPICard label="Recaudación total"  value={`${d.pctRecaudado}%`} sub={`S/ ${fmt(d.montoPagadoPEN)}`} color="#f5b93a" accent="#f5b93a" />
        </div>
      )}

      {/* ══ NPS / SATISFACCIÓN (asesora y orientador) ══ */}
      {(esAsesora || esOrientador) && (() => {
        const enc = esAsesora ? d.encuestaAsesoriaPropia : d.encuestaOrientacionGeneral
        const comentarios = esAsesora ? d.comentariosAsesoriaPropia : d.comentariosOrientacion
        return (
        <>
          <SectionTitle icon={Smile} title="Encuesta de Satisfacción" color="#f5b93a" />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
            <div className="crm-card" style={{ padding:18, textAlign:'center' }}>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>NPS</div>
              {enc.total > 0 ? (
                <>
                  <div style={{ fontSize:32, fontWeight:700, color:'var(--text-primary)', fontFamily:'Syne,sans-serif' }}>{enc.nps}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:6 }}>{enc.total} respuestas este mes</div>
                </>
              ) : <div style={{ fontSize:13, color:'var(--text-muted)', padding:'20px 0' }}>Sin datos aún este mes</div>}
            </div>
            <div className="crm-card" style={{ padding:18, textAlign:'center' }}>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>SAT (satisfacción)</div>
              {enc.total > 0 ? (
                <>
                  <div style={{ fontSize:32, fontWeight:700, color:'#2dd4a0', fontFamily:'Syne,sans-serif' }}>{enc.csat}%</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:6 }}>{enc.total} respuestas este mes</div>
                </>
              ) : <div style={{ fontSize:13, color:'var(--text-muted)', padding:'20px 0' }}>Sin datos aún este mes</div>}
            </div>
          </div>
          <div style={{ marginBottom:16 }}>
            <ComentariosCard comentarios={comentarios} />
          </div>
        </>
        )
      })()}

      {/* Secciones de asesora/supervisor — no le competen al orientador */}
      {!esOrientador && (
      <>
      {/* ══ LLAMADAS ══ */}
      <SectionTitle icon={Phone} title="Seguimiento de Llamadas" color="#65a7a6" />

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1.7fr', gap:16, marginBottom:16 }}>
        <div className="crm-card" style={{ padding:18 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>Contactabilidad por programa</div>
          {d.contactabilidadPorPrograma.slice(0,8).map(p => (
            <PctBar key={p.programa} label={p.programa} pct={p.pct} count={p.respondieron} total={p.total} color="#65a7a6" />
          ))}
        </div>
        <div className="crm-card" style={{ padding:18, overflowX:'auto' }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>Desempeño por asesora</div>
          <table className="crm-table">
            <thead>
              <tr>
                <th>Asesora</th>
                <th>Alumnos</th>
                <th>Llamadas</th>
                <th>Contactabilidad</th>
                <th>Riesgo Alto</th>
                <th>Sin contacto 7d+</th>
              </tr>
            </thead>
            <tbody>
              {d.desempenoPorAsesora.map(a => (
                <tr key={a.asesora}>
                  <td style={{ fontWeight:600, color:'var(--text-primary)' }}>{a.asesora}</td>
                  <td style={{ textAlign:'center' }}>{a.totalAlumnos}</td>
                  <td style={{ textAlign:'center' }}>{a.llamadasMes}</td>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ flex:1, height:6, background:'rgba(255,255,255,0.06)', borderRadius:3 }}>
                        <div style={{ height:'100%', width:`${a.contactabilidad}%`, background: a.contactabilidad >= 70 ? '#2dd4a0' : a.contactabilidad >= 40 ? '#f5b93a' : '#f07070', borderRadius:3 }} />
                      </div>
                      <span style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)', minWidth:32 }}>{a.contactabilidad}%</span>
                    </div>
                  </td>
                  <td style={{ textAlign:'center' }}>
                    {a.riesgoAlto > 0 ? <span style={{ color:'#f87171', fontWeight:700 }}>{a.riesgoAlto}</span> : <span style={{ color:'var(--text-muted)' }}>—</span>}
                  </td>
                  <td style={{ textAlign:'center' }}>
                    {a.sinContacto7 > 0 ? <span style={{ color:'#fb923c', fontWeight:700 }}>{a.sinContacto7}</span> : <span style={{ color:'var(--text-muted)' }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tipos de cuenta */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16, marginBottom:16 }}>
        <div className="crm-card" style={{ padding:18 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>Tipos de cuenta</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={Object.entries(d.tiposCuenta).map(([k,v])=>({name:k,value:v}))} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value"
                label={pctLabel} labelLine={false}>
                {Object.keys(d.tiposCuenta).map((_,i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip content={customTooltip} />
              <Legend wrapperStyle={{ fontSize:11, color:'var(--text-secondary)' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="crm-card" style={{ padding:18 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>Tipos de cuenta por programa</div>
          <div style={{ overflowX:'auto', maxHeight:180, overflowY:'auto' }}>
            <table className="crm-table">
              <thead><tr><th>Programa</th><th>Demo</th><th>Real</th><th>Fondeo</th><th>N.Op.</th></tr></thead>
              <tbody>
                {d.cuentasPorPrograma.map(p => (
                  <tr key={p.programa}>
                    <td style={{ fontSize:11 }}>{p.programa}</td>
                    <td style={{ color:p.Demo>0?'var(--text-primary)':'var(--text-faint)', textAlign:'center' }}>{p.Demo||'—'}</td>
                    <td style={{ color:p.Real>0?'#2dd4a0':'var(--text-faint)', textAlign:'center' }}>{p.Real||'—'}</td>
                    <td style={{ color:p.Fondeo>0?'#f5b93a':'var(--text-faint)', textAlign:'center' }}>{p.Fondeo||'—'}</td>
                    <td style={{ color:p['No opera']>0?'#f07070':'var(--text-faint)', textAlign:'center' }}>{p['No opera']||'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="crm-card" style={{ padding:18 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>Capital real (USD)</div>
          <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:10 }}>Total: <span style={{ color:'var(--accent)', fontWeight:700 }}>{d.totalCuentasReales}</span></div>
          {d.rangosCapital.map(r => (
            <div key={r.label} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize:12, color: r.label==='Sin dato'?'var(--text-muted)':'var(--text-secondary)', fontStyle:r.label==='Sin dato'?'italic':'normal' }}>{r.label}</span>
              <div style={{ display:'flex', gap:8 }}>
                <span style={{ fontSize:12, color:r.count>0?'var(--text-primary)':'var(--text-faint)', fontWeight:600 }}>{r.count}</span>
                <span style={{ fontSize:11, color:'var(--text-muted)' }}>{d.totalCuentasReales>0?Math.round(r.count/d.totalCuentasReales*100):0}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ EVOLUCIÓN DE CUENTAS POR PROGRAMA ══ */}
      <SectionTitle icon={TrendingUp} title="Evolución de Cuentas por Programa" color="#65a7a6" />

      <div className="crm-card" style={{ padding:18, marginBottom:16 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>
          Avance por cohorte, mes a mes · Ene-26 en adelante
        </div>
        <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:14 }}>
          % de alumnos de cada programa que ya tenían cuenta Real o Fondeo hasta ese mes. Lo esperado: cada fila se va oscureciendo de izquierda a derecha.
        </div>
        {d.evolucionHeatmap.filas.length === 0 ? (
          <div style={{ color:'var(--text-muted)', fontSize:13, textAlign:'center', padding:'30px 0' }}>Sin alumnos registrados desde Ene-26</div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ borderCollapse:'separate', borderSpacing:4, width:'100%' }}>
              <thead>
                <tr>
                  <th style={{ textAlign:'left', fontSize:11, color:'var(--text-muted)', padding:'0 8px 6px', whiteSpace:'nowrap' }}>Programa</th>
                  {d.evolucionHeatmap.meses.map(m => (
                    <th key={m} style={{ fontSize:10, color:'var(--text-muted)', fontWeight:600, padding:'0 4px 6px', textAlign:'center', minWidth:56 }}>
                      {formatMesCorto(m)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.evolucionHeatmap.filas.map(fila => (
                  <tr key={fila.programa}>
                    <td style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)', padding:'2px 8px', whiteSpace:'nowrap' }}>{fila.programa}</td>
                    {d.evolucionHeatmap.meses.map(m => {
                      const celda = fila.celdas[m]
                      if (!celda) return <td key={m} style={{ padding:2 }}><div style={{ height:34, borderRadius:6, background:'rgba(255,255,255,0.02)' }} /></td>
                      const t = celda.pct / 100
                      return (
                        <td key={m} style={{ padding:2 }}
                          title={`${fila.programa} · ${formatMesCorto(m)}: ${celda.pct}% en Real/Fondeo (${celda.avanzados}/${celda.total} alumnos)`}>
                          <div style={{ height:34, borderRadius:6, background:pctToColor(celda.pct), display:'flex', alignItems:'center', justifyContent:'center', cursor:'default' }}>
                            <span style={{ fontSize:11, fontWeight:700, color: t > 0.5 ? '#eaf5f2' : '#1c2b2e' }}>{celda.pct}%</span>
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>
      )}

      {/* ══ ENCUESTAS POR ASESORA (solo supervisor) ══ */}
      {esSupervisor && (() => {
        const comentariosTodos = d.encuestaPorAsesora
          .flatMap(a => a.comentarios.map(c => ({ ...c, asesora: a.nombre })))
          .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))
        return (
        <>
          <SectionTitle icon={Smile} title="Encuestas — Asesoría Académica" color="#f5b93a" />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
            <div className="crm-card" style={{ padding:18, overflowX:'auto' }}>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>Respuestas por asesora (mes actual)</div>
              <table className="crm-table">
                <thead>
                  <tr><th>Asesora</th><th>Respuestas</th><th>NPS</th><th>SAT</th></tr>
                </thead>
                <tbody>
                  {d.encuestaPorAsesora.length === 0 ? (
                    <tr><td colSpan={4} style={{ textAlign:'center', color:'var(--text-muted)', padding:'20px 0' }}>Sin asesoras registradas</td></tr>
                  ) : d.encuestaPorAsesora.map(a => (
                    <tr key={a.asesoraId}>
                      <td style={{ fontWeight:600, color:'var(--text-primary)' }}>{a.nombre}</td>
                      <td style={{ textAlign:'center' }}>{a.total}</td>
                      <td style={{ textAlign:'center', color: a.nps != null ? 'var(--text-primary)' : 'var(--text-muted)' }}>{a.nps != null ? a.nps : '—'}</td>
                      <td style={{ textAlign:'center', color: a.csat != null ? '#2dd4a0' : 'var(--text-muted)' }}>{a.csat != null ? `${a.csat}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:10 }}>
                Se desglosa por el programa que responde cada alumno, cruzado con la asesora asignada a ese programa.
              </div>
            </div>
            <ComentariosCard
              comentarios={comentariosTodos.map(c => ({ ...c, programa: `${c.asesora} · ${c.programa || 'Sin programa'}` }))}
            />
          </div>
        </>
        )
      })()}

      {/* ══ RECAUDACIÓN (solo supervisor) ══ */}
      {esSupervisor && (
      <>
      <SectionTitle icon={CreditCard} title="Recaudación" color="#2dd4a0" />

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
        <KPICard label="Pagadas"      value={d.cuotasPagadas}   sub={`de ${d.totalCuotas} cuotas`} color="#2dd4a0" accent="#2dd4a0" />
        <KPICard label="Pago parcial" value={d.cuotasParciales} color="#f5b93a" accent="#f5b93a" />
        <KPICard label="No iniciadas" value={d.cuotasPendientes} color="var(--text-muted)" accent="var(--text-muted)" />
        <KPICard label="Prórrogas"    value={d.cuotasProrrogas} color="#b89eff" accent="#b89eff" />
        <KPICard label="Vencen en 7d" value={d.proximas7.length} sub={`S/ ${fmt(d.montoProximas7)}`} color="#fb923c" accent="#ea580c" />
        <KPICard label="Vencen en 15d" value={d.proximas15.length} sub={`S/ ${fmt(d.montoProximas15)}`} color="#f5b93a" accent="#d97706" />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        <div className="crm-card" style={{ padding:18 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>Resumen consolidado en Soles</div>
          <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:12 }}>USD convertido con TC por alumno (3.5 o 3.6)</div>
          {[
            { label:'Total a recaudar', value:`S/ ${fmt(d.montoTotalPEN)}`,    color:'var(--text-primary)' },
            { label:'Recaudado',        value:`S/ ${fmt(d.montoPagadoPEN)}`,   color:'#2dd4a0' },
            { label:'Saldo pendiente',  value:`S/ ${fmt(d.saldoPendientePEN)}`, color:'#f07070' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize:13, color:'var(--text-secondary)' }}>{label}</span>
              <span style={{ fontSize:14, fontWeight:700, color }}>{value}</span>
            </div>
          ))}
        </div>
        <div className="crm-card" style={{ padding:18 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>Resumen en Dólares</div>
          <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:12 }}>Para alumnos con cuota en USD</div>
          {[
            { label:'Total cuotas',    value:`$ ${fmt(d.montoTotalUSD)}`,    color:'var(--text-primary)' },
            { label:'Recaudado',       value:`$ ${fmt(d.montoPagadoUSD)}`,   color:'#2dd4a0' },
            { label:'Saldo pendiente', value:`$ ${fmt(d.saldoPendienteUSD)}`, color:'#f07070' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize:13, color:'var(--text-secondary)' }}>{label}</span>
              <span style={{ fontSize:14, fontWeight:700, color }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="crm-card" style={{ padding:18, marginBottom:16 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>Recaudación por programa</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={d.recaudacionPorPrograma} margin={{ top:0, right:10, left:0, bottom:0 }}>
            <XAxis dataKey="programa" tick={{ fill:'#6f9c9a', fontSize:11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill:'#6f9c9a', fontSize:11 }} axisLine={false} tickLine={false} />
            <Tooltip content={customTooltip} />
            <Bar dataKey="total"   name="Total"   fill="rgba(101,167,166,0.3)"  radius={[4,4,0,0]} />
            <Bar dataKey="pagadas" name="Pagadas" fill="#2dd4a0" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      </>
      )}

      {/* ══ ORIENTACIÓN TÉCNICA (supervisor y orientador) ══ */}
      {(esSupervisor || esOrientador) && (
      <>
      <SectionTitle icon={MonitorSmartphone} title="Orientación Técnica" color="#b89eff" />

      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginBottom:16 }}>
        <KPICard label="Total sesiones"   value={d.totalSesiones}       color="#b89eff" accent="#b89eff" />
        <KPICard label="Concretadas"      value={d.sesionesConcretadas} color="#2dd4a0" accent="#2dd4a0" />
        <KPICard label="Reprogramadas"    value={d.sesionesReprogram}   color="#f5b93a" accent="#f5b93a" />
        <KPICard label="No se conectaron" value={d.sesionesNoConecto}   color="#f07070" accent="#f07070" />
        <KPICard label="Efectividad"      value={`${d.efectividadOrientador}%`} sub="No volvieron a agendar" color="var(--accent)" accent="var(--accent)" />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16, marginBottom:16 }}>
        <div className="crm-card" style={{ padding:18 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>Motivos frecuentes</div>
          {d.motivosFrecuentes.length === 0 ? <div style={{ color:'var(--text-muted)', fontSize:13 }}>Sin datos</div>
            : d.motivosFrecuentes.map(([motivo, count], i) => (
            <div key={motivo} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize:12, color:'var(--text-secondary)', flex:1, marginRight:8 }}>{motivo}</span>
              <span style={{ fontSize:13, fontWeight:700, color:COLORS[i] }}>{count}</span>
            </div>
          ))}
        </div>
        <div className="crm-card" style={{ padding:18 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>Herramientas verificadas</div>
          {Object.entries(d.herramientas).map(([tool, count], i) => (
            <div key={tool} style={{ marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontSize:12, color:'var(--text-secondary)' }}>{tool}</span>
                <span style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)' }}>{count} <span style={{ color:'var(--text-muted)', fontWeight:400 }}>({d.sesionesConcretadas>0?Math.round(count/d.sesionesConcretadas*100):0}%)</span></span>
              </div>
              <div style={{ height:5, background:'rgba(255,255,255,0.06)', borderRadius:3, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${d.sesionesConcretadas>0?count/d.sesionesConcretadas*100:0}%`, background:COLORS[i], borderRadius:3 }} />
              </div>
            </div>
          ))}
          <div style={{ marginTop:12, paddingTop:10, borderTop:'1px solid var(--border-default)', fontSize:12, color:'var(--text-muted)' }}>
            Alumnos únicos atendidos: <span style={{ color:'#b89eff', fontWeight:700 }}>{d.alumnosUnicos}</span>
          </div>
        </div>
        <div className="crm-card" style={{ padding:18 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>Sesiones por programa</div>
          {d.sesionesPorPrograma.length === 0 ? <div style={{ color:'var(--text-muted)', fontSize:13 }}>Sin datos</div>
            : d.sesionesPorPrograma.map((p,i) => (
            <div key={p.programa} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize:12, color:'var(--text-secondary)' }}>{p.programa}</span>
              <span style={{ fontSize:13, fontWeight:700, color:COLORS[i%COLORS.length] }}>{p.total}</span>
            </div>
          ))}
        </div>
      </div>
      </>
      )}

    </div>
  )
}
