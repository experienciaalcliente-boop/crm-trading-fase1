import { useCoordinacion } from '../hooks/useCoordinacion'
import { Loader2, RefreshCw, CheckCircle2 } from 'lucide-react'

const fmtUSD = n => `USD ${Math.round(n).toLocaleString('en-US')}`
const fmtPct = n => `${Math.round(n)}%`

function KPICard({ label, value, sub, color = 'var(--accent)', accent }) {
  return (
    <div className="crm-card" style={{ padding: 16, borderLeft: accent ? `3px solid ${accent}` : undefined }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color, fontFamily: 'Syne,sans-serif', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function SectionTitle({ title, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
      <h3 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, color: 'var(--text-primary)', fontSize: 15, margin: 0 }}>{title}</h3>
      {right && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>{right}</span>}
    </div>
  )
}

function ProgressBar({ pct, color = 'var(--accent)' }) {
  return (
    <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, pct))}%`, background: color, borderRadius: 3, transition: 'width 0.5s' }} />
    </div>
  )
}

const CHIP_ESTILOS = {
  Hecho: { bg: 'rgba(255,255,255,0.08)', fg: 'var(--text-muted)' },
  Programada: { bg: 'transparent', fg: 'var(--accent)' },
  vencida: { bg: 'rgba(240,112,112,0.15)', fg: '#f07070' },
  urgente: { bg: 'rgba(245,185,58,0.15)', fg: '#f5b93a' },
  default: { bg: 'transparent', fg: 'var(--text-muted)' },
}

function chipTarea(t) {
  if (t.estado === 'Hecho') return { ...CHIP_ESTILOS.Hecho, label: 'HECHO' }
  if (t.estado === 'Programada') return { ...CHIP_ESTILOS.Programada, label: 'PROGRAMADA' }
  if (t.vencida) return { ...CHIP_ESTILOS.vencida, label: 'VENCIDA' }
  if (t.urgente) return { ...CHIP_ESTILOS.urgente, label: 'URGENTE' }
  return { ...CHIP_ESTILOS.default, label: 'EN PLAZO' }
}

const IDEA_CHIP = {
  'Viable': { bg: 'rgba(45,212,160,0.15)', fg: '#2dd4a0' },
  'En ejecución': { bg: 'var(--accent)', fg: '#fff' },
  'Descartada': { bg: 'rgba(255,255,255,0.08)', fg: 'var(--text-muted)' },
  'Por evaluar': { bg: 'transparent', fg: 'var(--text-muted)' },
}

export default function PanelCoordinacionPage() {
  const c = useCoordinacion()

  if (c.loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, color: 'var(--text-muted)' }}>
      <Loader2 size={18} className="animate-spin" /><span style={{ fontSize: 13 }}>Cargando panel de coordinación...</span>
    </div>
  )

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, color: 'var(--text-primary)', fontSize: 22 }}>Panel de Coordinación</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Experiencia del Cliente · Burs Advisory</p>
        </div>
        <button className="crm-btn crm-btn-sm" onClick={c.cargar}><RefreshCw size={13} /> Actualizar</button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12, marginBottom: 28 }}>
        <KPICard label="Retención cohorte" value={fmtPct(c.retencionActual * 100)} sub="Meta 85% · tendencia a la baja (78 → 76 → 74)" accent="#f07070" color="#f07070" />
        <KPICard label="Cartera de retirados" value={fmtUSD(c.totalDeuda)} sub={`${c.totalPersonas} contactables · ${c.excluidosSensibilidad} excl. sensibilidad · ${c.sinDatoCuota} sin dato`} accent="var(--accent)" />
        <KPICard label="Proyección 90 días" value={fmtUSD(c.proyeccionTotal)} sub="USD incrementales · 3 frentes" accent="#2dd4a0" color="#2dd4a0" />
        <KPICard label="Riesgo mes 2" value={fmtUSD(c.riesgoMes2)} sub="USD por trimestre · punto de ruptura" accent="#f5b93a" color="#f5b93a" />
        <KPICard label="Plan 90 días" value={`${c.hechas}/${c.totalTareas}`} sub={`${c.vencidas} vencidas · ${c.urgentes} urgentes`} accent="var(--accent)" />
      </div>

      {/* Cola de aprobación */}
      {c.accionesPendientes.length > 0 && (
        <div className="crm-card" style={{ padding: 18, marginBottom: 24, borderLeft: '3px solid #f5b93a' }}>
          <SectionTitle title="Cola de aprobación" right={`${c.accionesPendientes.length} pendientes`} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {c.accionesPendientes.map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border-default)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{a.agente} · {a.tipo}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{a.resumen}</div>
                </div>
                <button className="crm-btn crm-btn-sm crm-btn-primary" onClick={() => c.revisarAccion(a, true)}>Aprobar</button>
                <button className="crm-btn crm-btn-sm" onClick={() => c.revisarAccion(a, false)}>Rechazar</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', gap: 24, alignItems: 'start' }}>

        {/* Panel de tareas */}
        <div className="crm-card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
            <h3 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, color: 'var(--text-primary)', fontSize: 15, margin: 0 }}>Panel de tareas</h3>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.vencidas} vencidas · {c.urgentes} urgentes · {c.hechas} hechas de {c.totalTareas}</span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['Todas', 'Esta semana', 'Urgentes', ...c.frentes].map(f => (
                <button key={f} onClick={() => c.setFiltro(f)} className="crm-btn crm-btn-sm"
                  style={{ background: c.filtro === f ? 'var(--accent)' : 'var(--bg-input)', color: c.filtro === f ? '#fff' : 'var(--text-muted)', borderColor: c.filtro === f ? 'var(--accent)' : 'var(--border-default)' }}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '24px minmax(0,1fr) 90px 90px 70px 90px', gap: '0 10px', padding: '0 0 6px', borderBottom: '1px solid var(--border-default)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            <span></span><span>Tarea</span><span>Frente</span><span>Responsable</span><span>Límite</span><span>Estado</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {c.tareas.map(t => {
              const chip = chipTarea(t)
              const done = t.estado === 'Hecho'
              return (
                <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '24px minmax(0,1fr) 90px 90px 70px 90px', gap: '0 10px', alignItems: 'start', padding: '8px 0', borderBottom: '1px solid var(--border-default)' }}>
                  <button onClick={() => c.toggleTarea(t)} title="Marcar hecho"
                    style={{ width: 15, height: 15, marginTop: 2, padding: 0, cursor: 'pointer', border: '1px solid var(--text-muted)', borderRadius: 3, background: done ? 'var(--accent)' : 'transparent', color: '#fff', fontSize: 10, lineHeight: 1, display: 'grid', placeItems: 'center' }}>
                    {done && <CheckCircle2 size={11} />}
                  </button>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, lineHeight: 1.35, color: done ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: done ? 'line-through' : 'none' }}>{t.titulo}</div>
                    {t.nota && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{t.nota}</div>}
                  </div>
                  <span><span className="badge-blue" style={{ fontSize: 10, padding: '2px 6px', borderRadius: 5 }}>{t.frente}</span></span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.responsable}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.fecha_limite}</span>
                  <span><span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 5, background: chip.bg, color: chip.fg, border: `1px solid ${chip.fg}33` }}>{chip.label}</span></span>
                </div>
              )
            })}
            {c.tareas.length === 0 && <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Sin tareas en este filtro.</div>}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Objetivos y medición */}
          <div className="crm-card" style={{ padding: 18 }}>
            <SectionTitle title="Objetivos y medición" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {c.goals.map(g => (
                <div key={g.label}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{g.label}</span>
                    <span style={{ marginLeft: 'auto', fontFamily: 'Syne,sans-serif', fontSize: 14, color: 'var(--text-primary)' }}>{g.value}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{g.target}</span>
                  </div>
                  <ProgressBar pct={g.pct} />
                  <span style={{ fontSize: 10.5, color: 'var(--text-muted)', display: 'block', marginTop: 3 }}>{g.nota}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Próximos hitos */}
          <div className="crm-card" style={{ padding: 18 }}>
            <SectionTitle title="Próximos hitos" />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {c.agenda.map(t => (
                <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '70px minmax(0,1fr)', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--border-default)' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.fecha_limite} {t.dias === 0 ? '· hoy' : `· +${t.dias}d`}</span>
                  <div>
                    <span style={{ display: 'block', fontSize: 9.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{t.frente}</span>
                    <span style={{ display: 'block', fontSize: 12.5, lineHeight: 1.3, color: 'var(--text-primary)' }}>{t.titulo}</span>
                  </div>
                </div>
              ))}
              {c.agenda.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Sin hitos próximos.</div>}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 24, marginTop: 24, alignItems: 'start' }}>

        {/* Bandeja de ideas */}
        <div className="crm-card" style={{ padding: 18 }}>
          <SectionTitle title="Bandeja de ideas" right={`${c.ideas.length} anotadas`} />
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input className="crm-input" placeholder="Anotar una idea antes de olvidarla…" value={c.draft}
              onChange={e => c.setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') c.agregarIdea() }}
              style={{ flex: 1, padding: '8px 10px', background: 'var(--bg-input)', border: '1.5px solid var(--border-default)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13 }} />
            <button className="crm-btn crm-btn-primary crm-btn-sm" onClick={c.agregarIdea}>Añadir</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {c.ideas.map(i => {
              const chip = IDEA_CHIP[i.estado] || IDEA_CHIP['Por evaluar']
              return (
                <div key={i.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border-default)' }}>
                  <span style={{ fontSize: 12.5, color: i.estado === 'Descartada' ? 'var(--text-muted)' : 'var(--text-primary)' }}>{i.texto}</span>
                  <button onClick={() => c.ciclarIdea(i)} title="Cambiar estado"
                    style={{ cursor: 'pointer', fontSize: 10, padding: '2px 6px', borderRadius: 5, background: chip.bg, color: chip.fg, border: `1px solid ${chip.fg}33` }}>{i.estado}</button>
                </div>
              )
            })}
            {c.ideas.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Sin ideas anotadas.</div>}
          </div>
        </div>

        {/* Documento vivo */}
        <div className="crm-card" style={{ padding: 18 }}>
          <SectionTitle title="Documento vivo" />
          <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: -6, marginBottom: 10 }}>Actividad de los agentes y del equipo. Las cifras del panel se leen de las tablas de Supabase, no de las hojas.</p>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {c.log.map(l => (
              <div key={l.id} style={{ display: 'grid', gridTemplateColumns: '54px minmax(0,1fr)', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--border-default)' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(l.cuando).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}</span>
                <div>
                  <span style={{ display: 'block', fontSize: 12.5, lineHeight: 1.35, color: 'var(--text-primary)' }}>{l.que}</span>
                  <span style={{ display: 'block', fontSize: 10.5, color: 'var(--text-muted)' }}>{l.donde}</span>
                </div>
              </div>
            ))}
            {c.log.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Sin actividad registrada.</div>}
          </div>
        </div>

        {/* Cartera por segmento */}
        <div className="crm-card" style={{ padding: 18 }}>
          <SectionTitle title="Cartera por segmento" />
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 46px 76px 60px', gap: 8, paddingBottom: 6, borderBottom: '1px solid var(--border-default)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            <span>Segmento</span><span style={{ textAlign: 'right' }}>Pers.</span><span style={{ textAlign: 'right' }}>Deuda</span><span style={{ textAlign: 'right' }}>En envío</span>
          </div>
          {c.segmentos.map(s => (
            <div key={s.segmento} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 46px 76px 60px', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--border-default)' }}>
              <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>Segmento {s.segmento}</span>
              <span style={{ fontSize: 12, textAlign: 'right', color: 'var(--text-primary)' }}>{s.personas}</span>
              <span style={{ fontSize: 12, textAlign: 'right', color: 'var(--text-primary)' }}>{Math.round(s.deuda).toLocaleString('en-US')}</span>
              <span style={{ fontSize: 12, textAlign: 'right', color: 'var(--accent)' }}>{s.enSecuencia}</span>
            </div>
          ))}
          <span style={{ fontSize: 10.5, color: 'var(--text-muted)', display: 'block', marginTop: 8 }}>
            {c.excluidosSensibilidad} excluidos por sensibilidad (salud, duelo, motivos familiares) · {c.sinDatoCuota} sin dato de cuota, en depuración.
          </span>
        </div>
      </div>
    </div>
  )
}
