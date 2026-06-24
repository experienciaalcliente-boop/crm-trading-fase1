import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchAlumnoCompleto, upsertValidacion, updateCompromiso, insertTimeline } from '../lib/api'
import { calcularRiesgo } from '../lib/api'
import { RiesgoBadge, UltimoContactoBadge, CicloVidaBadge } from '../components/shared/Badges'
import { ArrowLeft, Phone, CreditCard, MonitorSmartphone, CheckCircle, Clock, AlertTriangle, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'

const PASOS_ONBOARDING = [
  { key:'terminos_condiciones',   label:'Términos y condiciones',    icon:'📋' },
  { key:'ficha_alumno',           label:'Ficha del alumno',          icon:'👤' },
  { key:'acceso_aula',            label:'Acceso al aula virtual',    icon:'🏫' },
  { key:'evaluacion_dedicacion',  label:'Evaluación de dedicación',  icon:'📝' },
  { key:'asignacion_contenido',   label:'Asignación de contenido',   icon:'📚' },
  { key:'ingreso_whatsapp',       label:'Ingreso al WhatsApp',       icon:'💬' },
]

const ITEMS_VALIDACION = [
  { key:'financiamiento_ok', label:'Financiamiento correcto' },
  { key:'programa_ok',       label:'Programa adquirido confirmado' },
  { key:'beneficios_ok',     label:'Beneficios explicados' },
  { key:'contrato_ok',       label:'Información contractual revisada' },
  { key:'preparacion_ok',    label:'Preparado para iniciar clases' },
]

const TIPO_TIMELINE = {
  llamada:        { icon:'📞', color:'#7ab3ff' },
  pago:           { icon:'💰', color:'#2dd4a0' },
  sesion_tecnica: { icon:'💻', color:'#b89eff' },
  cambio_estado:  { icon:'🔄', color:'#f5b93a' },
  onboarding:     { icon:'🎓', color:'#4e8fff' },
  validacion:     { icon:'✅', color:'#2dd4a0' },
  compromiso:     { icon:'🤝', color:'#f07070' },
  nota:           { icon:'📝', color:'var(--text-muted)' },
}

function Seccion({ title, children, color = '#4e8fff' }) {
  return (
    <div style={{ marginBottom:24 }}>
      <h3 style={{ fontSize:13, fontWeight:700, color, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12, paddingBottom:8, borderBottom:`1px solid rgba(255,255,255,0.07)` }}>{title}</h3>
      {children}
    </div>
  )
}

function InfoRow({ label, value, color }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ fontSize:12, color:'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize:12, color: color || '#e2e8f4', fontWeight:500 }}>{value || '—'}</span>
    </div>
  )
}

export default function FichaAlumnoPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [tabActiva, setTabActiva] = useState('resumen')
  const [guardandoVal, setGuardandoVal] = useState(false)

  const cargar = async () => {
    setLoading(true)
    try {
      const result = await fetchAlumnoCompleto(id)
      setData(result)
    } catch (err) {
      toast.error('Error al cargar ficha')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [id])

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', gap:10, color:'var(--text-muted)' }}>
      <Loader2 size={18} className="animate-spin" /><span>Cargando ficha...</span>
    </div>
  )

  if (!data?.alumno) return (
    <div style={{ padding:24, color:'var(--text-muted)' }}>Alumno no encontrado</div>
  )

  const { alumno, llamadas, cuotas, sesiones, compromisos, onboarding, validacion, timeline } = data
  const { score, nivel } = calcularRiesgo(alumno, cuotas, llamadas)

  // Semana calculada
  let semanaCalc = alumno.semana_actual || '—'
  if (alumno.fecha_inicio) {
    const dias = Math.floor((new Date() - new Date(alumno.fecha_inicio + 'T00:00:00')) / 86400000)
    const s = Math.ceil((dias + 1) / 7)
    if (s >= 1 && s <= 24) semanaCalc = `${s} (automática)`
  }

  // Pipeline
  const ultimaLlamadaConCuenta = llamadas.find(r => r.cuenta)
  const pipeline = ultimaLlamadaConCuenta?.cuenta || 'Sin registro'

  // Onboarding avance
  const pasosCompletados = onboarding.filter(p => p.estado === 'Completado').length
  const avanceOnboarding = onboarding.length > 0 ? Math.round((pasosCompletados / 6) * 100) : 0

  // Herramientas técnicas
  const ultimaSesion = sesiones.find(s => s.estado === 'Concretada')
  const herramientasCompletas = ultimaSesion &&
    ultimaSesion.tiene_mt5 && ultimaSesion.tiene_broker &&
    ultimaSesion.tiene_tradingview && ultimaSesion.tiene_ingreso_trade

  // Toggle validación
  const toggleValidacion = async (campo) => {
    setGuardandoVal(true)
    try {
      const actual = validacion?.[campo] || false
      const nuevoVal = !actual
      const payload = { [campo]: nuevoVal }
      // Verificar si todos los ítems quedan true
      const todos = ITEMS_VALIDACION.every(i => i.key === campo ? nuevoVal : (validacion?.[i.key] || false))
      if (todos) { payload.validacion_completada = true; payload.fecha_validacion = new Date().toISOString() }
      await upsertValidacion(alumno.id, payload)
      toast.success('Validación actualizada ✓')
      cargar()
    } catch { toast.error('Error al guardar') }
    finally { setGuardandoVal(false) }
  }

  const tabs = [
    { key:'resumen',    label:'Resumen' },
    { key:'llamadas',   label:`Llamadas (${llamadas.length})` },
    { key:'cuotas',     label:`Cuotas (${cuotas.length})` },
    { key:'tecnico',    label:`Técnico (${sesiones.length})` },
    { key:'compromisos',label:`Compromisos (${compromisos.length})` },
    { key:'timeline',   label:'Timeline' },
  ]

  return (
    <div style={{ height:'100%', overflowY:'auto' }}>
      {/* Header */}
      <div style={{ background:'var(--bg-surface)', borderBottom:'1px solid var(--border-default)', padding:'16px 24px', position:'sticky', top:0, zIndex:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={() => navigate(-1)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex', alignItems:'center', gap:6, fontSize:13 }}>
            <ArrowLeft size={16} /> Volver
          </button>
          <div style={{ width:1, height:20, background:'rgba(255,255,255,0.1)' }} />
          <div style={{ flex:1 }}>
            <h1 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, color:'var(--text-primary)', fontSize:18, margin:0 }}>{alumno.nombre}</h1>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:4, flexWrap:'wrap' }}>
              <span style={{ fontSize:12, color:'var(--text-muted)' }}>{alumno.programa} · Sem. {semanaCalc}</span>
              <CicloVidaBadge estadoOperativo={alumno.estado_operativo || 'Activo'} />
              <RiesgoBadge nivel={nivel} score={score} />
              <UltimoContactoBadge fecha={alumno.ultimo_contacto_at} />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:4, marginTop:14, overflowX:'auto' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTabActiva(t.key)}
              style={{ padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:500, cursor:'pointer', whiteSpace:'nowrap',
                background: tabActiva === t.key ? 'rgba(78,143,255,0.15)' : 'transparent',
                border: `1px solid ${tabActiva === t.key ? 'rgba(78,143,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
                color: tabActiva === t.key ? '#7ab3ff' : '#506080' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding:24, maxWidth:900, margin:'0 auto' }}>

        {/* ── TAB RESUMEN ── */}
        {tabActiva === 'resumen' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
            {/* Datos generales */}
            <div className="crm-card" style={{ padding:18 }}>
              <Seccion title="Datos generales">
                <InfoRow label="Asesora"          value={alumno.asesora} />
                <InfoRow label="Estado"            value={alumno.estado} />
                <InfoRow label="Fecha de inicio"   value={alumno.fecha_inicio ? format(new Date(alumno.fecha_inicio + 'T00:00:00'), 'dd MMM yyyy', { locale:es }) : null} />
                <InfoRow label="Código alumno"     value={alumno.codigo_alumno} />
                <InfoRow label="Pipeline"          value={pipeline} color={pipeline === 'Real' ? '#2dd4a0' : pipeline === 'Fondeo' ? '#f5b93a' : undefined} />
                <InfoRow label="Último avance"     value={llamadas[0]?.avance ? `${llamadas[0].avance}%` : null} />
              </Seccion>
            </div>

            {/* Riesgo */}
            <div className="crm-card" style={{ padding:18 }}>
              <Seccion title="Indicador de riesgo" color="#f07070">
                <div style={{ textAlign:'center', padding:'12px 0 16px' }}>
                  <div style={{ fontSize:48, fontWeight:700, color: nivel==='Alto'?'#f87171':nivel==='Medio'?'#fbbf24':'#4ade80', fontFamily:'Syne,sans-serif', lineHeight:1 }}>{score}</div>
                  <div style={{ marginTop:8 }}><RiesgoBadge nivel={nivel} /></div>
                </div>
                <div style={{ height:8, background:'rgba(255,255,255,0.06)', borderRadius:4, overflow:'hidden', marginBottom:16 }}>
                  <div style={{ height:'100%', width:`${score}%`, background: nivel==='Alto'?'#f87171':nivel==='Medio'?'#fbbf24':'#4ade80', borderRadius:4, transition:'width 0.5s' }} />
                </div>
                <InfoRow label="Días sin contacto" value={alumno.ultimo_contacto_at ? `${Math.floor((new Date()-new Date(alumno.ultimo_contacto_at+'T00:00:00'))/86400000)}d` : 'Sin registro'} />
                <InfoRow label="Nivel de atención" value={alumno.nivel_atencion} />
              </Seccion>
            </div>

            {/* Onboarding */}
            <div className="crm-card" style={{ padding:18 }}>
              <Seccion title="Onboarding" color="#7ab3ff">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                  <span style={{ fontSize:12, color:'var(--text-secondary)' }}>Avance</span>
                  <span style={{ fontSize:18, fontWeight:700, color: avanceOnboarding===100?'#2dd4a0':'#7ab3ff', fontFamily:'Syne,sans-serif' }}>{avanceOnboarding}%</span>
                </div>
                <div style={{ height:6, background:'rgba(255,255,255,0.06)', borderRadius:3, overflow:'hidden', marginBottom:12 }}>
                  <div style={{ height:'100%', width:`${avanceOnboarding}%`, background: avanceOnboarding===100?'#2dd4a0':'#4e8fff', borderRadius:3 }} />
                </div>
                {PASOS_ONBOARDING.map(p => {
                  const paso = onboarding.find(op => op.paso === p.key)
                  const ok = paso?.estado === 'Completado'
                  return (
                    <div key={p.key} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                      <span style={{ fontSize:14 }}>{ok ? '✅' : '⬜'}</span>
                      <span style={{ fontSize:12, color: ok ? '#2dd4a0' : '#9aaccb', textDecoration: ok ? 'line-through' : 'none' }}>{p.label}</span>
                    </div>
                  )
                })}
              </Seccion>
            </div>

            {/* Validación */}
            <div className="crm-card" style={{ padding:18 }}>
              <Seccion title="Validación" color="#2dd4a0">
                {validacion?.validacion_completada && (
                  <div style={{ padding:'6px 10px', borderRadius:8, background:'rgba(45,212,160,0.1)', border:'1px solid rgba(45,212,160,0.25)', fontSize:11, color:'#2dd4a0', marginBottom:12 }}>
                    ✓ Validación completada · {validacion.fecha_validacion ? format(new Date(validacion.fecha_validacion), 'dd MMM yyyy', { locale:es }) : ''}
                  </div>
                )}
                {ITEMS_VALIDACION.map(item => {
                  const ok = validacion?.[item.key] || false
                  return (
                    <label key={item.key} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,0.04)', cursor:'pointer' }}>
                      <input type="checkbox" checked={ok} onChange={() => toggleValidacion(item.key)} disabled={guardandoVal}
                        style={{ width:16, height:16, accentColor:'#2dd4a0', cursor:'pointer' }} />
                      <span style={{ fontSize:12, color: ok ? '#2dd4a0' : '#9aaccb', textDecoration: ok ? 'line-through' : 'none' }}>{item.label}</span>
                    </label>
                  )
                })}
              </Seccion>
            </div>

            {/* Técnico resumen */}
            <div className="crm-card" style={{ padding:18, gridColumn:'span 2' }}>
              <Seccion title="Herramientas técnicas" color="#b89eff">
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
                  {[
                    { label:'MT5',         key:'tiene_mt5' },
                    { label:'Broker',      key:'tiene_broker' },
                    { label:'TradingView', key:'tiene_tradingview' },
                    { label:'MT5 Sync',    key:'tiene_ingreso_trade' },
                  ].map(({ label, key }) => {
                    const ok = ultimaSesion?.[key]
                    return (
                      <div key={key} style={{ padding:'10px 12px', borderRadius:10, textAlign:'center',
                        background: ok ? 'rgba(45,212,160,0.1)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${ok ? 'rgba(45,212,160,0.25)' : 'rgba(255,255,255,0.07)'}` }}>
                        <div style={{ fontSize:20, marginBottom:4 }}>{ok ? '✅' : '⬜'}</div>
                        <div style={{ fontSize:11, color: ok ? '#2dd4a0' : '#506080', fontWeight:600 }}>{label}</div>
                      </div>
                    )
                  })}
                </div>
                {herramientasCompletas && (
                  <div style={{ marginTop:10, padding:'8px 10px', borderRadius:8, background:'rgba(45,212,160,0.08)', border:'1px solid rgba(45,212,160,0.2)', fontSize:12, color:'#2dd4a0', textAlign:'center' }}>
                    🎉 Herramientas completas
                  </div>
                )}
              </Seccion>
            </div>
          </div>
        )}

        {/* ── TAB LLAMADAS ── */}
        {tabActiva === 'llamadas' && (
          <div className="crm-card" style={{ overflowX:'auto' }}>
            <table className="crm-table">
              <thead><tr><th>Fecha</th><th>Sem.</th><th>Respondió</th><th>Avance</th><th>Cuenta</th><th>Beneficio</th><th>Observaciones</th></tr></thead>
              <tbody>
                {llamadas.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign:'center', color:'var(--text-muted)', padding:30 }}>Sin registros</td></tr>
                ) : llamadas.map(r => (
                  <tr key={r.id}>
                    <td style={{ whiteSpace:'nowrap', fontSize:12 }}>{format(new Date(r.fecha + 'T00:00:00'), 'dd MMM yy', { locale:es })}</td>
                    <td style={{ textAlign:'center' }}>{r.semana_registro || r.semana || '—'}</td>
                    <td><span style={{ color: r.respondio==='Sí'?'#2dd4a0':'#f07070', fontWeight:600, fontSize:12 }}>{r.respondio}</span></td>
                    <td style={{ textAlign:'center' }}>{r.avance != null ? `${r.avance}%` : '—'}</td>
                    <td><span style={{ fontSize:11, color:'#b89eff' }}>{r.cuenta || '—'}</span></td>
                    <td style={{ color:'#2dd4a0' }}>{r.beneficio ? `$${r.beneficio}` : '—'}</td>
                    <td style={{ fontSize:11, color:'var(--text-secondary)', maxWidth:200, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>{r.observaciones || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── TAB CUOTAS ── */}
        {tabActiva === 'cuotas' && (
          <div className="crm-card" style={{ overflowX:'auto' }}>
            <table className="crm-table">
              <thead><tr><th>#</th><th>Vence</th><th>Moneda</th><th>Monto</th><th>Pagado</th><th>Estado</th></tr></thead>
              <tbody>
                {cuotas.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign:'center', color:'var(--text-muted)', padding:30 }}>Sin cuotas</td></tr>
                ) : cuotas.map(c => {
                  const vencida = c.fecha_vence < new Date().toISOString().split('T')[0] && c.estado !== 'Pagada'
                  return (
                    <tr key={c.id}>
                      <td style={{ textAlign:'center' }}>#{c.numero_cuota}</td>
                      <td style={{ color: vencida ? '#f07070' : '#e2e8f4', fontSize:12 }}>{c.fecha_vence ? format(new Date(c.fecha_vence + 'T00:00:00'), 'dd MMM yyyy', { locale:es }) : '—'}</td>
                      <td><span style={{ color: c.moneda==='USD'?'#7ab3ff':'#2dd4a0', fontSize:11, fontWeight:600 }}>{c.moneda}</span></td>
                      <td style={{ fontWeight:600 }}>{Number(c.monto).toFixed(2)}</td>
                      <td style={{ color: c.monto_pagado > 0 ? '#f5b93a' : '#3d5070' }}>{c.monto_pagado > 0 ? Number(c.monto_pagado).toFixed(2) : '—'}</td>
                      <td><span style={{ fontSize:11, fontWeight:600, color: c.estado==='Pagada'?'#2dd4a0':c.estado==='No iniciada'?'#506080':'#f5b93a' }}>{c.estado}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── TAB TÉCNICO ── */}
        {tabActiva === 'tecnico' && (
          <div className="crm-card" style={{ overflowX:'auto' }}>
            <table className="crm-table">
              <thead><tr><th>Fecha</th><th>Motivo</th><th>Estado</th><th>MT5</th><th>Broker</th><th>TV</th><th>Sync</th><th>Observaciones</th></tr></thead>
              <tbody>
                {sesiones.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign:'center', color:'var(--text-muted)', padding:30 }}>Sin sesiones</td></tr>
                ) : sesiones.map(s => (
                  <tr key={s.id}>
                    <td style={{ whiteSpace:'nowrap', fontSize:12 }}>{format(new Date(s.fecha + 'T00:00:00'), 'dd MMM yy', { locale:es })}</td>
                    <td style={{ fontSize:12 }}>{s.motivo || '—'}</td>
                    <td><span style={{ fontSize:11, fontWeight:600, color: s.estado==='Concretada'?'#2dd4a0':s.estado==='Reprogramada'?'#f5b93a':'#f07070' }}>{s.estado}</span></td>
                    {['tiene_mt5','tiene_broker','tiene_tradingview','tiene_ingreso_trade'].map(k => (
                      <td key={k} style={{ textAlign:'center' }}>{s[k] ? '✅' : '—'}</td>
                    ))}
                    <td style={{ fontSize:11, color:'var(--text-secondary)', maxWidth:160 }}>{s.observaciones || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── TAB COMPROMISOS ── */}
        {tabActiva === 'compromisos' && (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {compromisos.length === 0 ? (
              <div className="crm-card" style={{ padding:30, textAlign:'center', color:'var(--text-muted)' }}>Sin compromisos registrados</div>
            ) : compromisos.map(c => (
              <div key={c.id} className="crm-card" style={{ padding:14 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)', flex:1 }}>{c.descripcion}</div>
                  <span style={{ fontSize:11, fontWeight:600, marginLeft:8,
                    color: c.estado==='Cumplido'?'#2dd4a0':c.estado==='Incumplido'?'#f07070':c.fecha_limite < new Date().toISOString().split('T')[0]?'#f07070':'#f5b93a',
                    background: 'rgba(255,255,255,0.05)', padding:'2px 8px', borderRadius:20 }}>
                    {c.estado}
                  </span>
                </div>
                <div style={{ fontSize:11, color:'var(--text-muted)' }}>
                  Responsable: <span style={{ color:'var(--text-secondary)' }}>{c.responsable}</span>
                  {' · '}Vence: <span style={{ color:'var(--text-secondary)' }}>{c.fecha_limite ? format(new Date(c.fecha_limite + 'T00:00:00'), 'dd MMM yyyy', { locale:es }) : '—'}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── TAB TIMELINE ── */}
        {tabActiva === 'timeline' && (
          <div style={{ position:'relative', paddingLeft:24 }}>
            <div style={{ position:'absolute', left:8, top:0, bottom:0, width:2, background:'rgba(255,255,255,0.07)' }} />
            {timeline.length === 0 ? (
              <div className="crm-card" style={{ padding:30, textAlign:'center', color:'var(--text-muted)' }}>Sin eventos en el timeline</div>
            ) : timeline.map(ev => {
              const cfg = TIPO_TIMELINE[ev.tipo] || TIPO_TIMELINE.nota
              return (
                <div key={ev.id} style={{ position:'relative', marginBottom:14 }}>
                  <div style={{ position:'absolute', left:-20, top:4, width:12, height:12, borderRadius:'50%',
                    background: cfg.color, border:'2px solid #0b0e14', boxShadow:`0 0 0 2px ${cfg.color}40` }} />
                  <div className="crm-card" style={{ padding:'10px 14px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
                      <span style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)' }}>{cfg.icon} {ev.titulo}</span>
                      <span style={{ fontSize:10, color:'var(--text-muted)' }}>{format(new Date(ev.created_at), 'dd MMM yy HH:mm', { locale:es })}</span>
                    </div>
                    {ev.descripcion && <div style={{ fontSize:11, color:'var(--text-secondary)' }}>{ev.descripcion}</div>}
                    {ev.registrado_por && <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>Por: {ev.registrado_por}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}
