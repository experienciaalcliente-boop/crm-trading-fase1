import { useDashboard } from '../hooks/useDashboard'
import { Loader2, RefreshCw, Phone, CreditCard, MonitorSmartphone, TrendingUp } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

const COLORS = ['#4e8fff','#2dd4a0','#f5b93a','#f07070','#b89eff','#506080']

const fmt = n => Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function SectionTitle({ icon: Icon, title, color = '#4e8fff' }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, marginTop:28, paddingBottom:10, borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
      <div style={{ width:32, height:32, borderRadius:8, background:`${color}20`, border:`1px solid ${color}40`, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Icon size={15} style={{ color }} />
      </div>
      <h2 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, color:'#e2e8f4', fontSize:16 }}>{title}</h2>
    </div>
  )
}

function MetricCard({ label, value, sub, color = '#e2e8f4', accent }) {
  return (
    <div className="crm-card" style={{ padding:16, borderLeft: accent ? `3px solid ${accent}` : undefined }}>
      <div style={{ fontSize:10, fontWeight:700, color:'#506080', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:26, fontWeight:700, color, fontFamily:'Syne,sans-serif', lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:'#3d5070', marginTop:4 }}>{sub}</div>}
    </div>
  )
}

function PorcentajeBar({ label, pct, count, total, color = '#4e8fff' }) {
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
        <span style={{ fontSize:12, color:'#9aaccb' }}>{label}</span>
        <span style={{ fontSize:12, fontWeight:600, color:'#e2e8f4' }}>{pct}% <span style={{ color:'#506080', fontWeight:400 }}>({count}/{total})</span></span>
      </div>
      <div style={{ height:6, background:'rgba(255,255,255,0.06)', borderRadius:3, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:3, transition:'width 0.5s' }} />
      </div>
    </div>
  )
}

const customTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'#1e2840', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'8px 12px', fontSize:12 }}>
      <div style={{ color:'#e2e8f4', fontWeight:600, marginBottom:4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>{p.name}: {p.value}</div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const d = useDashboard()

  if (d.loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', gap:10, color:'#506080' }}>
      <Loader2 size={18} className="animate-spin" /><span style={{ fontSize:13 }}>Cargando dashboard...</span>
    </div>
  )

  const hoyDisplay = format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es })

  return (
    <div style={{ padding:24, maxWidth:1200, margin:'0 auto' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:8 }}>
        <div>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, color:'#e2e8f4', fontSize:22 }}>Dashboard ejecutivo</h1>
          <p style={{ fontSize:13, color:'#506080', textTransform:'capitalize', marginTop:3 }}>
            {hoyDisplay} · Mostrando: <span style={{ color:'#7ab3ff' }}>{new Date(d.mesFiltro + '-01T00:00:00').toLocaleDateString('es-PE', { month:'long', year:'numeric' })}</span>
          </p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:11, color:'#3d5070' }}>Actualizado: {format(d.lastUpdate, 'HH:mm:ss')}</span>
          <select
            value={d.mesFiltro}
            onChange={e => d.setMesFiltro(e.target.value)}
            style={{ padding:'6px 10px', background:'#1e2840', border:'1.5px solid #2e3d5c', borderRadius:8, color:'#e2e8f4', fontSize:13, cursor:'pointer' }}>
            {(() => {
              const opts = []
              const now = new Date()
              for (let i = 0; i < 12; i++) {
                const d2 = new Date(now.getFullYear(), now.getMonth() - i, 1)
                const val = `${d2.getFullYear()}-${String(d2.getMonth()+1).padStart(2,'0')}`
                const label = d2.toLocaleDateString('es-PE', { month:'long', year:'numeric' })
                opts.push(<option key={val} value={val}>{label}</option>)
              }
              return opts
            })()}
          </select>
          <button className="crm-btn crm-btn-sm" onClick={d.cargar}><RefreshCw size={13} /> Actualizar</button>
        </div>
      </div>

      {/* KPIs generales */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:4 }}>
        <MetricCard label="Alumnos activos" value={d.totalAlumnosActivos} sub="En curso + en seguimiento" color="#7ab3ff" accent="#4e8fff" />
        <MetricCard label="Contactabilidad" value={`${d.contactabilidad}%`} sub={`${d.respondieron} respondieron este mes`} color="#2dd4a0" accent="#2dd4a0" />
        <MetricCard label="Beneficio total" value={`$${fmt(d.beneficioTotal)}`} sub="Acumulado" color="#f5b93a" accent="#f5b93a" />
        <MetricCard label="Sesiones Orient." value={d.totalSesiones} sub={`${d.sesionesConcretadas} concretadas`} color="#b89eff" accent="#b89eff" />
      </div>

      {/* ══════════════════════════════════════
          MÓDULO 1 — SEGUIMIENTO DE LLAMADAS
      ══════════════════════════════════════ */}
      <SectionTitle icon={Phone} title="Seguimiento de llamadas" color="#4e8fff" />

      {/* Contactabilidad general + por programa */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        <div className="crm-card" style={{ padding:18 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#7a8aaa', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>Contactabilidad por programa</div>
          {d.contactabilidadPorPrograma.slice(0,8).map(p => (
            <PorcentajeBar key={p.programa} label={p.programa} pct={p.pct} count={p.respondieron} total={p.total} color="#4e8fff" />
          ))}
        </div>

        <div className="crm-card" style={{ padding:18 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#7a8aaa', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>Rendimiento hoy por asesora</div>
          {d.statsPorAsesora.length === 0 ? (
            <div style={{ color:'#3d5070', fontSize:13, textAlign:'center', padding:'20px 0' }}>Sin registros hoy</div>
          ) : d.statsPorAsesora.map(a => (
            <PorcentajeBar key={a.asesora} label={a.asesora} pct={a.pct} count={a.respondieron} total={a.total} color="#2dd4a0" />
          ))}
        </div>
      </div>

      {/* Tipos de cuenta */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16, marginBottom:16 }}>
        <div className="crm-card" style={{ padding:18 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#7a8aaa', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>Tipos de cuenta</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={Object.entries(d.tiposCuenta).map(([k,v])=>({name:k,value:v}))} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                {Object.keys(d.tiposCuenta).map((_,i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip content={customTooltip} />
              <Legend wrapperStyle={{ fontSize:11, color:'#9aaccb' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="crm-card" style={{ padding:18 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#7a8aaa', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>Tipos de cuenta por programa</div>
          <div style={{ overflowX:'auto', maxHeight:180, overflowY:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
              <thead>
                <tr>{['Programa','Demo','Real','Fondeo','No opera'].map(h=>(
                  <th key={h} style={{ padding:'4px 6px', textAlign:'left', color:'#3d5070', fontWeight:700, textTransform:'uppercase', fontSize:9, letterSpacing:'0.06em', borderBottom:'1px solid rgba(255,255,255,0.07)', whiteSpace:'nowrap' }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {d.cuentasPorPrograma.map(p => (
                  <tr key={p.programa} style={{ borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding:'5px 6px', color:'#9aaccb', fontWeight:500, whiteSpace:'nowrap' }}>{p.programa}</td>
                    {['Demo','Real','Fondeo','No opera'].map(t => (
                      <td key={t} style={{ padding:'5px 6px', color: p[t] > 0 ? '#e2e8f4' : '#3d5070', textAlign:'center', fontWeight: p[t] > 0 ? 600 : 400 }}>
                        {p[t] > 0 ? p[t] : '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="crm-card" style={{ padding:18 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#7a8aaa', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>Distribución capital real (USD)</div>
          {d.rangosCapital.map(r => (
            <div key={r.label} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize:12, color:'#9aaccb' }}>{r.label}</span>
              <div style={{ display:'flex', gap:10 }}>
                <span style={{ fontSize:12, color:'#e2e8f4', fontWeight:600 }}>{r.count}</span>
                <span style={{ fontSize:11, color:'#506080' }}>{d.cuentasReales.length > 0 ? Math.round(r.count/d.cuentasReales.length*100) : 0}%</span>
              </div>
            </div>
          ))}
        </div>

        <div className="crm-card" style={{ padding:18 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#7a8aaa', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>Fondeo por fase</div>
          {Object.entries(d.fasesFondeo).map(([fase, count], i) => (
            <div key={fase} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize:12, color:'#9aaccb' }}>{fase}</span>
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                <span style={{ fontSize:14, fontWeight:700, color:COLORS[i] }}>{count}</span>
                <span style={{ fontSize:11, color:'#506080' }}>
                  {Object.values(d.fasesFondeo).reduce((a,b)=>a+b,0) > 0
                    ? Math.round(count/Object.values(d.fasesFondeo).reduce((a,b)=>a+b,0)*100) : 0}%
                </span>
              </div>
            </div>
          ))}
          <div style={{ marginTop:14, fontSize:11, color:'#506080', borderTop:'1px solid rgba(255,255,255,0.07)', paddingTop:10 }}>
            <div style={{ fontWeight:700, color:'#7a8aaa', marginBottom:6 }}>Retiros registrados: {d.retiros.length}</div>
            {d.rangosRetiro.map(r => (
              <div key={r.label} style={{ display:'flex', justifyContent:'space-between', padding:'3px 0' }}>
                <span>{r.label}</span>
                <span style={{ color:'#e2e8f4', fontWeight:600 }}>{r.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          MÓDULO 2 — RECAUDACIÓN
      ══════════════════════════════════════ */}
      <SectionTitle icon={CreditCard} title="Recaudación" color="#2dd4a0" />

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
        <MetricCard label="Pagadas" value={d.cuotasPagadas} sub={`de ${d.totalCuotas} cuotas`} color="#2dd4a0" accent="#2dd4a0" />
        <MetricCard label="Pago parcial" value={d.cuotasParciales} color="#f5b93a" accent="#f5b93a" />
        <MetricCard label="No iniciadas" value={d.cuotasPendientes} color="#7a8aaa" accent="#506080" />
        <MetricCard label="Prórrogas" value={d.cuotasProrrogas} color="#b89eff" accent="#b89eff" />
        <MetricCard label="Reservas" value={d.cuotasReservas} color="#7ab3ff" accent="#4e8fff" />
        <MetricCard label="Retirados" value={d.cuotasRetirados} color="#f07070" accent="#f07070" />
      </div>

      {/* Montos */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        <div className="crm-card" style={{ padding:18 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#7a8aaa', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>Resumen en Soles (PEN)</div>
          {[
            { label:'Total cuotas',       value:`S/ ${fmt(d.montoTotalPEN)}`,    color:'#e2e8f4' },
            { label:'Recaudado',          value:`S/ ${fmt(d.montoPagadoPEN)}`,   color:'#2dd4a0' },
            { label:'Saldo pendiente',    value:`S/ ${fmt(d.saldoPendientePEN)}`, color:'#f07070' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize:13, color:'#9aaccb' }}>{label}</span>
              <span style={{ fontSize:14, fontWeight:700, color }}>{value}</span>
            </div>
          ))}
        </div>

        <div className="crm-card" style={{ padding:18 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#7a8aaa', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>Resumen en Dólares (USD)</div>
          {[
            { label:'Total cuotas',       value:`$ ${fmt(d.montoTotalUSD)}`,    color:'#e2e8f4' },
            { label:'Recaudado',          value:`$ ${fmt(d.montoPagadoUSD)}`,   color:'#2dd4a0' },
            { label:'Saldo pendiente',    value:`$ ${fmt(d.saldoPendienteUSD)}`, color:'#f07070' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize:13, color:'#9aaccb' }}>{label}</span>
              <span style={{ fontSize:14, fontWeight:700, color }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recaudación por programa */}
      <div className="crm-card" style={{ padding:18, marginBottom:16 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'#7a8aaa', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>Recaudación por programa</div>
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

      {/* ══════════════════════════════════════
          MÓDULO 3 — ORIENTACIÓN TÉCNICA
      ══════════════════════════════════════ */}
      <SectionTitle icon={MonitorSmartphone} title="Orientación técnica" color="#b89eff" />

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
        <MetricCard label="Total sesiones"   value={d.totalSesiones}       color="#b89eff" accent="#b89eff" />
        <MetricCard label="Concretadas"      value={d.sesionesConcretadas} color="#2dd4a0" accent="#2dd4a0" />
        <MetricCard label="Reprogramadas"    value={d.sesionesReprogram}   color="#f5b93a" accent="#f5b93a" />
        <MetricCard label="No se conectaron" value={d.sesionesNoConecto}   color="#f07070" accent="#f07070" />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16, marginBottom:16 }}>
        <div className="crm-card" style={{ padding:18 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#7a8aaa', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>Motivos frecuentes</div>
          {d.motivosFrecuentes.length === 0 ? (
            <div style={{ color:'#3d5070', fontSize:13 }}>Sin datos</div>
          ) : d.motivosFrecuentes.map(([motivo, count], i) => (
            <div key={motivo} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize:12, color:'#9aaccb', flex:1, marginRight:8 }}>{motivo}</span>
              <span style={{ fontSize:13, fontWeight:700, color:COLORS[i] }}>{count}</span>
            </div>
          ))}
        </div>

        <div className="crm-card" style={{ padding:18 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#7a8aaa', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>Herramientas verificadas</div>
          {Object.entries(d.herramientas).map(([tool, count], i) => (
            <div key={tool} style={{ marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontSize:12, color:'#9aaccb' }}>{tool}</span>
                <span style={{ fontSize:12, fontWeight:600, color:'#e2e8f4' }}>
                  {count} <span style={{ color:'#506080', fontWeight:400 }}>({d.sesionesConcretadas > 0 ? Math.round(count/d.sesionesConcretadas*100) : 0}%)</span>
                </span>
              </div>
              <div style={{ height:5, background:'rgba(255,255,255,0.06)', borderRadius:3, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${d.sesionesConcretadas > 0 ? count/d.sesionesConcretadas*100 : 0}%`, background:COLORS[i], borderRadius:3 }} />
              </div>
            </div>
          ))}
          <div style={{ marginTop:12, paddingTop:10, borderTop:'1px solid rgba(255,255,255,0.07)', fontSize:12, color:'#506080' }}>
            Alumnos únicos atendidos: <span style={{ color:'#b89eff', fontWeight:700 }}>{d.alumnosUnicos}</span>
          </div>
        </div>

        <div className="crm-card" style={{ padding:18 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#7a8aaa', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>Sesiones por programa</div>
          {d.sesionesPorPrograma.length === 0 ? (
            <div style={{ color:'#3d5070', fontSize:13 }}>Sin datos</div>
          ) : d.sesionesPorPrograma.map((p, i) => (
            <div key={p.programa} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize:12, color:'#9aaccb' }}>{p.programa}</span>
              <span style={{ fontSize:13, fontWeight:700, color:COLORS[i % COLORS.length] }}>{p.total}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
