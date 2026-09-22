import { useState } from 'react'
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

function FocusItem({ n, label, color, muted }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 30, lineHeight: 1, color: muted ? 'var(--text-muted)' : (color || 'var(--text-primary)') }}>{n}</span>
      <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{label}</span>
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

const TABS_DETALLE = ['Ideas y actividad', 'Level Up', 'Impulso BURS', 'Cartera por segmento']

export default function PanelCoordinacionPage() {
  const c = useCoordinacion()
  const [tabDetalle, setTabDetalle] = useState(TABS_DETALLE[0])
  const [corteExpandido, setCorteExpandido] = useState(null)

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

      {/* Enfoque de hoy — lo primero que se lee, sin tener que interpretar nada más */}
      <div className="crm-card" style={{ padding: '18px 20px', marginBottom: 20, display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center' }}>
        <FocusItem n={c.accionesPendientes.length} label="por aprobar" color={c.accionesPendientes.length > 0 ? '#f5b93a' : undefined} muted={c.accionesPendientes.length === 0} />
        <FocusItem n={c.vencidas} label="tareas vencidas" color={c.vencidas > 0 ? '#f07070' : undefined} muted={c.vencidas === 0} />
        <FocusItem n={c.urgentes} label="tareas urgentes (≤3d)" color={c.urgentes > 0 ? '#f5b93a' : undefined} muted={c.urgentes === 0} />
        <FocusItem
          n={c.impulso.hoy + c.impulso.vencidos}
          label="toques de Impulso al día"
          color={c.impulso.vencidos > 0 ? '#f07070' : undefined}
          muted={c.impulso.hoy + c.impulso.vencidos === 0}
        />
        {c.agenda[0] && (
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <span style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Próximo hito</span>
            <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{c.agenda[0].titulo} · {c.agenda[0].dias === 0 ? 'hoy' : `+${c.agenda[0].dias}d`}</span>
          </div>
        )}
      </div>

      {/* Cola de aprobación — agrupada por agente para no leerla como una sola lista larga */}
      {c.accionesPendientes.length > 0 && (
        <div className="crm-card" style={{ padding: 18, marginBottom: 20, borderLeft: '3px solid #f5b93a' }}>
          <SectionTitle title="Cola de aprobación" right={`${c.accionesPendientes.length} pendientes`} />
          {Object.entries(
            c.accionesPendientes.reduce((acc, a) => { (acc[a.agente] ||= []).push(a); return acc }, {})
          ).map(([agente, items]) => (
            <div key={agente} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '8px 0 4px' }}>{agente.replace('_', ' ')}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map(a => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border-default)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{a.resumen}</div>
                    </div>
                    <button className="crm-btn crm-btn-sm crm-btn-primary" onClick={() => c.revisarAccion(a, true)}>Aprobar</button>
                    <button className="crm-btn crm-btn-sm" onClick={() => c.revisarAccion(a, false)}>Rechazar</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* KPIs — detalle secundario, ya no es lo primero que se lee */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12, marginBottom: 24 }}>
        <KPICard label="Retención cohorte (dato manual)" value={fmtPct(c.retencionActual * 100)} sub="Meta 85% · último dato cargado a mano, no se recalcula solo" accent="#f07070" color="#f07070" />
        <KPICard label="Cartera de retirados" value={fmtUSD(c.totalDeuda)} sub={`${c.totalPersonas} contactables (dato real) · ${c.excluidosSensibilidad} excl. sensibilidad · ${c.sinDatoCuota} sin dato`} accent="var(--accent)" />
        <KPICard label="Proyección 90 días (estimado)" value={fmtUSD(c.proyeccionTotal)} sub="Fija desde Fase 1 · avance real está en Objetivos y medición" accent="#2dd4a0" color="#2dd4a0" />
        <KPICard label="Riesgo mes 2 (estimado)" value={fmtUSD(c.riesgoMes2)} sub="USD por trimestre · punto de ruptura, dato fijo" accent="#f5b93a" color="#f5b93a" />
        <KPICard label="Plan 90 días" value={`${c.hechas}/${c.totalTareas}`} sub={`${c.vencidas} vencidas · ${c.urgentes} urgentes`} accent="var(--accent)" />
      </div>

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

      {/* Detalle secundario — en pestañas: antes eran 5 tarjetas siempre visibles a la vez,
          ahora se ve una cosa por vez para que no compita todo por la atención. */}
      <div style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 14, borderBottom: '1px solid var(--border-default)' }}>
          {TABS_DETALLE.map(tab => (
            <button key={tab} onClick={() => setTabDetalle(tab)}
              style={{ padding: '8px 14px', fontSize: 12.5, fontWeight: 600, background: 'transparent', border: 'none', borderBottom: tabDetalle === tab ? '2px solid var(--accent)' : '2px solid transparent', color: tabDetalle === tab ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer' }}>
              {tab}
            </button>
          ))}
        </div>

      {tabDetalle === 'Ideas y actividad' && (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 24, alignItems: 'start' }}>

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
      </div>
      )}

      {tabDetalle === 'Level Up' && (
        <div className="crm-card" style={{ padding: 18 }}>
          <SectionTitle title="Level Up (Plan Exalumnos)" right={<a href="/exalumnos" style={{ color: 'var(--accent)' }}>Abrir panel completo →</a>} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
              <span style={{ color: 'var(--text-muted)' }}>Estado</span>
              <span style={{ color: c.levelUp.activa ? '#2dd4a0' : 'var(--text-muted)', fontWeight: 600 }}>{c.levelUp.activa ? 'Activa' : 'Pausada'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
              <span style={{ color: 'var(--text-muted)' }}>Total contactos</span>
              <span style={{ color: 'var(--text-primary)' }}>{c.levelUp.total.toLocaleString('en-US')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
              <span style={{ color: 'var(--text-muted)' }}>Pendientes (sin arrancar)</span>
              <span style={{ color: 'var(--text-primary)' }}>{c.levelUp.pendientes.toLocaleString('en-US')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
              <span style={{ color: 'var(--text-muted)' }}>Cierre enviado</span>
              <span style={{ color: 'var(--text-primary)' }}>{c.levelUp.cierreEnviado.toLocaleString('en-US')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
              <span style={{ color: 'var(--text-muted)' }}>Interesados / en conversación</span>
              <span style={{ color: 'var(--accent)' }}>{c.levelUp.interesados.toLocaleString('en-US')}</span>
            </div>
          </div>
          <span style={{ fontSize: 10.5, color: 'var(--text-muted)', display: 'block', marginTop: 10 }}>
            Mismo proyecto que Level Up — sigue enviándose por Gmail desde su propio panel. Acá solo se refleja el estado.
          </span>
        </div>
      )}

      {tabDetalle === 'Impulso BURS' && (
        <div className="crm-card" style={{ padding: 18 }}>
          <SectionTitle title="Impulso BURS al egreso" right={`${c.impulso.ventasCount} ventas · USD ${Math.round(c.impulso.ventasUSD).toLocaleString('en-US')}`} />
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <input className="crm-input" placeholder="Programa (ej. Mar-26)" value={c.cohorteInput} onChange={e => c.setCohorteInput(e.target.value)}
              style={{ flex: 1, minWidth: 0, padding: '7px 9px', background: 'var(--bg-input)', border: '1.5px solid var(--border-default)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 12.5 }} />
            <select value={c.asesoraInput} onChange={e => c.setAsesoraInput(e.target.value)}
              style={{ padding: '7px 9px', background: 'var(--bg-input)', border: '1.5px solid var(--border-default)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 12.5 }}>
              <option>Katerin</option>
              <option>Anael</option>
            </select>
            <button className="crm-btn crm-btn-primary crm-btn-sm" disabled={c.definiendoCohorte} onClick={c.definirCohorteImpulso}>Definir cohorte</button>
          </div>
          <div style={{ marginBottom: 12 }}>
            <button className="crm-btn crm-btn-sm" disabled={c.enviandoCorreoCierre || !c.cohorteInput.trim()}
              onClick={() => c.enviarCorreoCierreImpulso(c.cohorteInput.trim())}>
              {c.enviandoCorreoCierre ? 'Enviando…' : 'Enviar correo de cierre'}
            </button>
            <span style={{ fontSize: 10.5, color: 'var(--text-muted)', marginLeft: 8 }}>
              Escribe el programa arriba y manda el refuerzo por correo (felicitación + opción de continuar) — una sola vez por cohorte, en paralelo a los toques de WhatsApp.
            </span>
          </div>
          <span style={{ fontSize: 10.5, color: 'var(--text-muted)', display: 'block', marginBottom: 10 }}>
            Los 5 toques (días 0/3/7/10/14 desde el egreso real de cada alumno) se arman con "Definir cohorte". El envío por WhatsApp lo hace la asesora desde su propia vista — acá solo el avance por corte y el mensaje que se está mandando.
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 60px 70px 70px', gap: 8, paddingBottom: 6, borderBottom: '1px solid var(--border-default)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            <span>Corte</span><span style={{ textAlign: 'right' }}>Total</span><span style={{ textAlign: 'right' }}>Enviados</span><span style={{ textAlign: 'right' }}>Vencidos</span>
          </div>
          {c.impulsoPorCorte.map(corte => (
            <div key={corte.touch_numero}>
              <button onClick={() => setCorteExpandido(x => x === corte.touch_numero ? null : corte.touch_numero)}
                style={{ width: '100%', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 60px 70px 70px', gap: 8, padding: '9px 0', borderBottom: '1px solid var(--border-default)', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ fontSize: 12.5, color: 'var(--text-primary)' }}>Toque {corte.touch_numero}/5 {corteExpandido === corte.touch_numero ? '▾' : '▸'}</span>
                <span style={{ fontSize: 12, textAlign: 'right', color: 'var(--text-primary)' }}>{corte.total}</span>
                <span style={{ fontSize: 12, textAlign: 'right', color: '#2dd4a0' }}>{corte.enviados}</span>
                <span style={{ fontSize: 12, textAlign: 'right', color: corte.vencidos > 0 ? '#f07070' : 'var(--text-muted)' }}>{corte.vencidos}</span>
              </button>
              {corteExpandido === corte.touch_numero && (
                <div style={{ padding: '10px 0 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>Variantes reales (se alterna por alumno para no mandar el mismo texto 55 veces):</span>
                  {corte.variantes.map((texto, i) => (
                    <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'var(--bg-input)', borderRadius: 8, padding: '8px 10px', lineHeight: 1.4 }}>
                      {texto}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {c.impulsoPorCorte.every(x => x.total === 0) && <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: '10px 0' }}>Sin cohorte definida todavía.</div>}
        </div>
      )}

      {tabDetalle === 'Cartera por segmento' && (
        <div className="crm-card" style={{ padding: 18 }}>
          <SectionTitle title="Cartera por segmento" right={<a href="/recuperacion-seguimiento" style={{ color: 'var(--accent)' }}>Ver seguimiento →</a>} />
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 46px 76px 60px', gap: 8, paddingBottom: 6, borderBottom: '1px solid var(--border-default)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            <span>Segmento</span><span style={{ textAlign: 'right' }}>Pers.</span><span style={{ textAlign: 'right' }}>Deuda</span><span style={{ textAlign: 'right' }}>En envío</span>
          </div>
          {c.segmentos.map(s => (
            <a key={s.segmento} href={`/recuperacion-seguimiento?segmento=${s.segmento}`} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 46px 76px 60px', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--border-default)', textDecoration: 'none' }}>
              <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>Segmento {s.segmento}</span>
              <span style={{ fontSize: 12, textAlign: 'right', color: 'var(--text-primary)' }}>{s.personas}</span>
              <span style={{ fontSize: 12, textAlign: 'right', color: 'var(--text-primary)' }}>{Math.round(s.deuda).toLocaleString('en-US')}</span>
              <span style={{ fontSize: 12, textAlign: 'right', color: 'var(--accent)' }}>{s.enSecuencia}</span>
            </a>
          ))}
          <span style={{ fontSize: 10.5, color: 'var(--text-muted)', display: 'block', marginTop: 8 }}>
            {c.excluidosSensibilidad} excluidos por sensibilidad (salud, duelo, motivos familiares) · {c.sinDatoCuota} sin dato de cuota, en depuración.
          </span>
        </div>
      )}
      </div>
    </div>
  )
}
