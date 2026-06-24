import { useDashboard } from '../hooks/useDashboard'
import { Loader2, RefreshCw, Phone, CreditCard, MonitorSmartphone, TrendingUp, AlertTriangle, Users, Zap, Target } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { RiesgoBadge, UltimoContactoBadge } from '../components/shared/Badges'

const COLORS = ['#4e8fff','#2dd4a0','#f5b93a','#f07070','#b89eff','#506080']

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

function SectionTitle({ icon: Icon, title, color='#4e8fff' }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, marginTop:28, paddingBottom:10, borderBottom:'1px solid var(--border-default)' }}>
      <div style={{ width:32, height:32, borderRadius:8, background:`${color}20`, border:`1px solid ${color}40`, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Icon size={15} style={{ color }} />
      </div>
      <h2 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, color:'var(--text-primary)', fontSize:16 }}>{title}</h2>
    </div>
  )
}

function KPICard({ label, value, sub, color='#e2e8f4', accent, badge }) {
  return (
    <div className="crm-card" style={{ padding:16, borderLeft: accent ? `3px solid ${accent}` : undefined }}>
      <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:26, fontWeight:700, color, fontFamily:'Syne,sans-serif', lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>{sub}</div>}
      {badge}
    </div>
  )
}

function PctBar({ label, pct, count, total, color='#4e8fff' }) {
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
            {hoyDisplay} · Mostrando: <span style={{ color:'#7ab3ff' }}>{mesDisplay}</span>
          </p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:11, color:'var(--text-muted)' }}>Act: {format(d.lastUpdate, 'HH:mm:ss')}</span>
          <select value={d.mesFiltro} onChange={e => d.setMesFiltro(e.target.value)}
            style={{ padding:'6px 10px', background:'var(--bg-input)', border:'1.5px solid #2e3d5c', borderRadius:8, color:'var(--text-primary)', fontSize:13, cursor:'pointer' }}>
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
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginBottom:4 }}>
        <KPICard label="Alumnos activos"    value={d.totalAlumnosActivos}  sub="En curso + seguimiento"    color="#7ab3ff"  accent="#4e8fff" />
        <KPICard label="Contactabilidad"    value={`${d.contactabilidad}%`} sub={`${d.respondieron} respondieron`} color="#2dd4a0" accent="#2dd4a0" />
        <KPICard label="Activación"         value={`${d.pctActivacion}%`}  sub={`${d.alumnosActivados.length} activados`} color="#b89eff" accent="#b89eff" />
        <KPICard label="Riesgo Alto"        value={d.riesgoAlto}           sub="Requieren intervención"   color="#f07070"  accent="#f07070" />
        <KPICard label="Beneficio total"    value={`S/ ${fmt(d.beneficioTotal)}`} sub="Convertido a soles" color="#f5b93a" accent="#f5b93a" />
      </div>

      {/* ══ SECCIÓN RIESGO ══ */}
      <SectionTitle icon={AlertTriangle} title="Sistema de Riesgo de Deserción" color="#f07070" />

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:16 }}>
        {/* Distribución de riesgo */}
        <div className="crm-card" style={{ padding:18 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>Distribución de riesgo</div>
          {[
            { label:'Bajo 🟢',  value: d.riesgoBajo,  color:'#4ade80', pct: d.totalAlumnosActivos > 0 ? Math.round(d.riesgoBajo/d.totalAlumnosActivos*100) : 0 },
            { label:'Medio 🟡', value: d.riesgoMedio, color:'#fbbf24', pct: d.totalAlumnosActivos > 0 ? Math.round(d.riesgoMedio/d.totalAlumnosActivos*100) : 0 },
            { label:'Alto 🔴',  value: d.riesgoAlto,  color:'#f87171', pct: d.totalAlumnosActivos > 0 ? Math.round(d.riesgoAlto/d.totalAlumnosActivos*100) : 0 },
          ].map(({ label, value, color, pct }) => (
            <div key={label} style={{ marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontSize:13, color:'var(--text-secondary)' }}>{label}</span>
                <span style={{ fontSize:13, fontWeight:700, color }}>{value} <span style={{ color:'var(--text-muted)', fontWeight:400, fontSize:11 }}>({pct}%)</span></span>
              </div>
              <div style={{ height:6, background:'rgba(255,255,255,0.06)', borderRadius:3, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:3 }} />
              </div>
            </div>
          ))}
        </div>

        {/* Último contacto */}
        <div className="crm-card" style={{ padding:18 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>Último contacto efectivo</div>
          {[
            { label:'< 7 días (reciente)',    value: d.segContacto.reciente,    color:'#4ade80' },
            { label:'7–14 días',              value: d.segContacto.d7,          color:'#fbbf24' },
            { label:'14–21 días (urgente)',   value: d.segContacto.d14,         color:'#fb923c' },
            { label:'> 21 días (crítico)',    value: d.segContacto.d21,         color:'#f87171' },
            { label:'Sin contacto registrado',value: d.segContacto.sinContacto, color:'var(--text-muted)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize:12, color:'var(--text-secondary)' }}>{label}</span>
              <span style={{ fontSize:13, fontWeight:700, color }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Alumnos en riesgo alto */}
        <div className="crm-card" style={{ padding:18, overflowY:'auto', maxHeight:220 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>Alumnos en riesgo alto</div>
          {d.alumnosRiesgoAlto.length === 0 ? (
            <div style={{ color:'var(--text-muted)', fontSize:12, textAlign:'center', padding:'20px 0' }}>✓ Sin alumnos en riesgo alto</div>
          ) : d.alumnosRiesgoAlto.slice(0,8).map(al => (
            <div key={al.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'5px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)' }}>{al.nombre}</div>
                <div style={{ fontSize:10, color:'var(--text-muted)' }}>{al.programa}</div>
              </div>
              <RiesgoBadge nivel={al.riesgo_nivel} score={al.riesgo_score} />
            </div>
          ))}
        </div>
      </div>

      {/* ══ PIPELINE ══ */}
      <SectionTitle icon={TrendingUp} title="Pipeline Demo → Real → Fondeo" color="#2dd4a0" />

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        {/* Dona pipeline */}
        <div className="crm-card" style={{ padding:18 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>Distribución actual (historial completo)</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={Object.entries(d.pipeline).map(([k,v])=>({name:k,value:v}))}
                cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                {Object.keys(d.pipeline).map((_,i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip content={customTooltip} />
              <Legend wrapperStyle={{ fontSize:11, color:'var(--text-secondary)' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Pipeline por programa */}
        <div className="crm-card" style={{ padding:18 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>Pipeline por programa</div>
          <div style={{ overflowX:'auto' }}>
            <table className="crm-table">
              <thead><tr><th>Programa</th><th>Demo</th><th>Real</th><th>Fondeo</th><th>No op.</th></tr></thead>
              <tbody>
                {d.pipelinePorPrograma.map(p => (
                  <tr key={p.programa}>
                    <td style={{ fontWeight:500 }}>{p.programa}</td>
                    <td style={{ color: p.Demo > 0 ? '#7ab3ff' : '#3d5070', textAlign:'center' }}>{p.Demo || '—'}</td>
                    <td style={{ color: p.Real > 0 ? '#2dd4a0' : '#3d5070', textAlign:'center' }}>{p.Real || '—'}</td>
                    <td style={{ color: p.Fondeo > 0 ? '#f5b93a' : '#3d5070', textAlign:'center' }}>{p.Fondeo || '—'}</td>
                    <td style={{ color: p['No opera'] > 0 ? '#f07070' : '#3d5070', textAlign:'center' }}>{p['No opera'] || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {d.alumnosDemoEstancados.length > 0 && (
            <div style={{ marginTop:12, padding:'8px 10px', borderRadius:8, background:'rgba(245,166,35,0.08)', border:'1px solid rgba(245,166,35,0.2)', fontSize:11, color:'#f5b93a' }}>
              ⚠️ {d.alumnosDemoEstancados.length} alumnos en Demo desde semana 12+
            </div>
          )}
        </div>
      </div>

      {/* ══ ACTIVACIÓN ══ */}
      <SectionTitle icon={Zap} title="Indicador de Activación" color="#b89eff" />

      <div className="crm-card" style={{ padding:18, marginBottom:16 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>
          Activación por programa — Activado = tiene cuenta + avance ≥20% + contacto en 14 días
        </div>
        {d.activacionPorPrograma.filter(p => p.total > 0).map(p => (
          <PctBar key={p.programa} label={p.programa} pct={p.pct} count={p.activados} total={p.total} color="#b89eff" />
        ))}
      </div>

      {/* ══ DESEMPEÑO POR ASESORA ══ */}
      <SectionTitle icon={Users} title="Desempeño por Asesora" color="#7ab3ff" />

      <div className="crm-card" style={{ marginBottom:16, overflowX:'auto' }}>
        <table className="crm-table">
          <thead>
            <tr>
              <th>Asesora</th>
              <th>Alumnos</th>
              <th>Llamadas</th>
              <th>Contactabilidad</th>
              <th>T. Reacción</th>
              <th>Riesgo Alto</th>
              <th>Sin contacto 7d+</th>
            </tr>
          </thead>
          <tbody>
            {d.desempenoPorAsesora.map((a, i) => (
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
                <td style={{ textAlign:'center', fontSize:12, color: a.tiempoReaccion ? (a.tiempoReaccion <= 24 ? '#2dd4a0' : a.tiempoReaccion <= 48 ? '#f5b93a' : '#f07070') : '#3d5070' }}>
                  {a.tiempoReaccion ? `${a.tiempoReaccion}h` : '—'}
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

      {/* ══ LLAMADAS ══ */}
      <SectionTitle icon={Phone} title="Seguimiento de Llamadas" color="#4e8fff" />

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        <div className="crm-card" style={{ padding:18 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>Contactabilidad por programa</div>
          {d.contactabilidadPorPrograma.slice(0,8).map(p => (
            <PctBar key={p.programa} label={p.programa} pct={p.pct} count={p.respondieron} total={p.total} color="#4e8fff" />
          ))}
        </div>
        <div className="crm-card" style={{ padding:18 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>Rendimiento hoy por asesora</div>
          {d.statsPorAsesora.length === 0 ? (
            <div style={{ color:'var(--text-muted)', fontSize:13, textAlign:'center', padding:'20px 0' }}>Sin registros hoy</div>
          ) : d.statsPorAsesora.map(a => (
            <PctBar key={a.asesora} label={a.asesora} pct={a.pct} count={a.respondieron} total={a.total} color="#2dd4a0" />
          ))}
        </div>
      </div>

      {/* Tipos de cuenta */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16, marginBottom:16 }}>
        <div className="crm-card" style={{ padding:18 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>Tipos de cuenta</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={Object.entries(d.tiposCuenta).map(([k,v])=>({name:k,value:v}))} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
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
                    <td style={{ color:p.Demo>0?'#e2e8f4':'#3d5070', textAlign:'center' }}>{p.Demo||'—'}</td>
                    <td style={{ color:p.Real>0?'#2dd4a0':'#3d5070', textAlign:'center' }}>{p.Real||'—'}</td>
                    <td style={{ color:p.Fondeo>0?'#f5b93a':'#3d5070', textAlign:'center' }}>{p.Fondeo||'—'}</td>
                    <td style={{ color:p['No opera']>0?'#f07070':'#3d5070', textAlign:'center' }}>{p['No opera']||'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="crm-card" style={{ padding:18 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>Capital real (USD)</div>
          <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:10 }}>Total: <span style={{ color:'#7ab3ff', fontWeight:700 }}>{d.totalCuentasReales}</span></div>
          {d.rangosCapital.map(r => (
            <div key={r.label} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize:12, color: r.label==='Sin dato'?'#506080':'#9aaccb', fontStyle:r.label==='Sin dato'?'italic':'normal' }}>{r.label}</span>
              <div style={{ display:'flex', gap:8 }}>
                <span style={{ fontSize:12, color:r.count>0?'#e2e8f4':'#3d5070', fontWeight:600 }}>{r.count}</span>
                <span style={{ fontSize:11, color:'var(--text-muted)' }}>{d.totalCuentasReales>0?Math.round(r.count/d.totalCuentasReales*100):0}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ RECAUDACIÓN ══ */}
      <SectionTitle icon={CreditCard} title="Recaudación" color="#2dd4a0" />

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
        <KPICard label="Pagadas"      value={d.cuotasPagadas}   sub={`de ${d.totalCuotas} cuotas`} color="#2dd4a0" accent="#2dd4a0" />
        <KPICard label="Pago parcial" value={d.cuotasParciales} color="#f5b93a" accent="#f5b93a" />
        <KPICard label="No iniciadas" value={d.cuotasPendientes} color="#7a8aaa" accent="#506080" />
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
            <XAxis dataKey="programa" tick={{ fill:'#506080', fontSize:11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill:'#506080', fontSize:11 }} axisLine={false} tickLine={false} />
            <Tooltip content={customTooltip} />
            <Bar dataKey="total"   name="Total"   fill="rgba(78,143,255,0.3)"  radius={[4,4,0,0]} />
            <Bar dataKey="pagadas" name="Pagadas" fill="#2dd4a0" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ══ ORIENTACIÓN ══ */}
      <SectionTitle icon={MonitorSmartphone} title="Orientación Técnica" color="#b89eff" />

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
        <KPICard label="Total sesiones"   value={d.totalSesiones}       color="#b89eff" accent="#b89eff" />
        <KPICard label="Concretadas"      value={d.sesionesConcretadas} color="#2dd4a0" accent="#2dd4a0" />
        <KPICard label="Reprogramadas"    value={d.sesionesReprogram}   color="#f5b93a" accent="#f5b93a" />
        <KPICard label="No se conectaron" value={d.sesionesNoConecto}   color="#f07070" accent="#f07070" />
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

    </div>
  )
}
