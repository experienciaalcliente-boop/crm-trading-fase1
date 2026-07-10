import { Loader2, RefreshCw, TrendingUp, Video, CheckCircle2, XCircle } from 'lucide-react'
import Select from 'react-select'
import { useComisiones } from '../hooks/useComisiones'

const rsStyles = {
  control: (base, state) => ({ ...base, background: 'var(--bg-input)', border: `1.5px solid ${state.isFocused ? 'var(--accent)' : 'var(--border-input)'}`, borderRadius: 8, minHeight: 38, boxShadow: state.isFocused ? '0 0 0 3px rgba(101,167,166,0.15)' : 'none' }),
  menu: (base) => ({ ...base, background: 'var(--bg-input)', border: '1.5px solid var(--border-input)', borderRadius: 10, boxShadow: '0 8px 28px rgba(0,0,0,0.5)', zIndex: 9999 }),
  menuList: (base) => ({ ...base, background: 'var(--bg-input)', borderRadius: 10, padding: 4 }),
  option: (base, state) => ({ ...base, background: state.isSelected ? 'rgba(101,167,166,0.25)' : state.isFocused ? 'rgba(101,167,166,0.15)' : 'var(--bg-input)', color: state.isSelected ? 'var(--accent)' : state.isFocused ? 'var(--text-primary)' : 'var(--text-secondary)', borderRadius: 6, fontSize: 13, padding: '9px 12px' }),
  singleValue: (base) => ({ ...base, color: 'var(--text-primary)', fontWeight: 500 }),
  placeholder: (base) => ({ ...base, color: 'var(--text-muted)' }),
  input: (base) => ({ ...base, color: 'var(--text-primary)' }),
  indicatorSeparator: (base) => ({ ...base, background: 'var(--border-input)' }),
  dropdownIndicator: (base) => ({ ...base, color: 'var(--text-muted)' }),
}

const ESTADO_STYLE = {
  'Pendiente': { bg: 'rgba(245,166,35,0.12)', color: '#f5b93a', border: 'rgba(245,166,35,0.25)' },
  'Aprobado':  { bg: 'rgba(34,201,142,0.12)', color: '#2dd4a0', border: 'rgba(34,201,142,0.25)' },
  'Rechazado': { bg: 'rgba(240,92,92,0.12)',  color: '#f07070', border: 'rgba(240,92,92,0.25)' },
}
function EstadoBadge({ estado }) {
  const s = ESTADO_STYLE[estado] || ESTADO_STYLE['Pendiente']
  return <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{estado}</span>
}

function colorCumpl(pct) {
  if (pct >= 100) return '#2dd4a0'
  if (pct >= 80) return '#65a7a6'
  if (pct >= 50) return '#f5b93a'
  return '#f07070'
}

function TarjetaIndicador({ ind }) {
  const color = colorCumpl(ind.cumpl)
  return (
    <div className="crm-card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{ind.titulo}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Peso {ind.peso}%</div>
        </div>
        <span style={{ fontSize: 13, fontWeight: 800, color, background: `${color}20`, border: `1px solid ${color}40`, padding: '3px 10px', borderRadius: 8 }}>{ind.cumpl}%</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center', borderTop: '1px dashed var(--border-default)', paddingTop: 10 }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Valor</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{ind.hayDatos ? `${ind.valor}${ind.unidad}` : '—'}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Rango</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{ind.rango || 'Sin datos'}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Aporte</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{ind.aporte.toFixed(1)} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>/ {ind.peso}</span></div>
        </div>
      </div>
    </div>
  )
}

function PanelResultado({ resultado }) {
  const color = colorCumpl(resultado.cumplimientoTotal)
  return (
    <div className="crm-card" style={{ padding: 24, marginBottom: 16, background: 'linear-gradient(160deg, var(--bg-card), rgba(101,167,166,0.06))' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Cumplimiento</div>
          <div style={{ fontSize: 48, fontWeight: 800, color, fontFamily: 'Syne,sans-serif', lineHeight: 1 }}>{resultado.cumplimientoTotal}%</div>
        </div>
        <div style={{ textAlign: 'center', borderLeft: '1px solid var(--border-default)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Comisión del mes</div>
          <div style={{ fontSize: 40, fontWeight: 800, color: resultado.comisionMonto > 0 ? '#2dd4a0' : 'var(--text-muted)', fontFamily: 'Syne,sans-serif', lineHeight: 1 }}>S/ {resultado.comisionMonto}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{resultado.comisionLabel}</div>
        </div>
      </div>
    </div>
  )
}

function SeccionTestimonios({ c }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 28, marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--border-default)' }}>
        <Video size={16} style={{ color: '#f5b93a' }} />
        <h2 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, color: 'var(--text-primary)', fontSize: 16 }}>Testimonios</h2>
      </div>

      <div className="crm-card" style={{ padding: 18, marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Registrar testimonio</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>Alumno</label>
            <Select styles={rsStyles} options={c.alumnosPropios.map(a => ({ value: a.id, label: a.nombre }))}
              value={c.alumnosPropios.map(a => ({ value: a.id, label: a.nombre })).find(o => o.value === c.form.alumno_id) || null}
              onChange={opt => c.setField('alumno_id', opt?.value || '')}
              placeholder="Buscar alumno..." />
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>Enfoque del video</label>
            <select className="crm-input" value={c.form.enfoque} onChange={e => c.setField('enfoque', e.target.value)}>
              <option value="">— Seleccionar —</option>
              {c.ENFOQUES_TESTIMONIO.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <button className="crm-btn-primary" onClick={c.registrarTestimonio} disabled={c.saving}>
            {c.saving ? <Loader2 size={14} className="animate-spin" /> : 'Registrar'}
          </button>
        </div>
      </div>

      <div className="crm-card" style={{ overflowX: 'auto' }}>
        <table className="crm-table">
          <thead><tr><th>Alumno</th><th>Enfoque</th><th>Fecha</th><th>Estado</th><th>Motivo rechazo</th></tr></thead>
          <tbody>
            {c.misTestimonios.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>Aún no registras testimonios</td></tr>
            ) : c.misTestimonios.map(t => (
              <tr key={t.id}>
                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.alumno?.nombre || '—'}</td>
                <td style={{ fontSize: 12 }}>{t.enfoque}</td>
                <td style={{ fontSize: 12 }}>{t.fecha_registro}</td>
                <td><EstadoBadge estado={t.estado} /></td>
                <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.motivo_rechazo || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function SeccionAprobacionTestimonios({ c }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 28, marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--border-default)' }}>
        <Video size={16} style={{ color: '#f5b93a' }} />
        <h2 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, color: 'var(--text-primary)', fontSize: 16 }}>Testimonios pendientes de aprobación</h2>
      </div>

      <div className="crm-card" style={{ overflowX: 'auto', marginBottom: 24 }}>
        <table className="crm-table">
          <thead><tr><th>Asesora</th><th>Alumno</th><th>Enfoque</th><th>Fecha</th><th>Acciones</th></tr></thead>
          <tbody>
            {c.testimoniosPendientes.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>Sin testimonios pendientes</td></tr>
            ) : c.testimoniosPendientes.map(t => (
              <tr key={t.id}>
                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.asesora?.nombre || '—'}</td>
                <td>{t.alumno?.nombre || '—'}</td>
                <td style={{ fontSize: 12 }}>{t.enfoque}</td>
                <td style={{ fontSize: 12 }}>{t.fecha_registro}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => c.aprobarTestimonio(t.id)}
                      style={{ background: 'rgba(34,201,142,0.1)', border: '1px solid rgba(34,201,142,0.25)', color: '#2dd4a0', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600 }}>
                      <CheckCircle2 size={12} /> Aprobar
                    </button>
                    <button onClick={() => c.rechazarTestimonio(t.id)}
                      style={{ background: 'rgba(240,92,92,0.1)', border: '1px solid rgba(240,92,92,0.25)', color: '#f07070', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600 }}>
                      <XCircle size={12} /> Rechazar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Historial</div>
      <div className="crm-card" style={{ overflowX: 'auto' }}>
        <table className="crm-table">
          <thead><tr><th>Asesora</th><th>Alumno</th><th>Enfoque</th><th>Fecha</th><th>Estado</th></tr></thead>
          <tbody>
            {c.testimoniosHistorial.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>Sin historial aún</td></tr>
            ) : c.testimoniosHistorial.map(t => (
              <tr key={t.id}>
                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.asesora?.nombre || '—'}</td>
                <td>{t.alumno?.nombre || '—'}</td>
                <td style={{ fontSize: 12 }}>{t.enfoque}</td>
                <td style={{ fontSize: 12 }}>{t.fecha_registro}</td>
                <td><EstadoBadge estado={t.estado} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default function ComisionesPage() {
  const c = useComisiones()

  if (c.loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, color: 'var(--text-muted)' }}>
      <Loader2 size={18} className="animate-spin" /><span style={{ fontSize: 13 }}>Cargando...</span>
    </div>
  )

  const mesDisplay = new Date(c.mesFiltro + '-01T00:00:00').toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, color: 'var(--text-primary)', fontSize: 20 }}>Bono de Incentivos</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3, textTransform: 'capitalize' }}>
            {c.esSupervisor ? 'Resumen del equipo' : 'Cálculo automático de tu comisión'} · <span style={{ color: 'var(--accent)' }}>{mesDisplay}</span>
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <select value={c.mesFiltro} onChange={e => c.setMesFiltro(e.target.value)}
            style={{ padding: '6px 10px', background: 'var(--bg-input)', border: '1.5px solid var(--border-input)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer' }}>
            {Array.from({ length: 12 }, (_, i) => {
              const dt = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1)
              const val = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
              return <option key={val} value={val}>{dt.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })}</option>
            })}
          </select>
          <button className="crm-btn crm-btn-sm" onClick={c.cargar}><RefreshCw size={13} /> Actualizar</button>
        </div>
      </div>

      {(c.esAsesora || c.esOrientador) && c.miResultado && (
        <>
          <PanelResultado resultado={c.miResultado} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14 }}>
            {c.miResultado.detalle.map(ind => <TarjetaIndicador key={ind.id} ind={ind} />)}
          </div>
        </>
      )}

      {c.esAsesora && <SeccionTestimonios c={c} />}

      {c.esSupervisor && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--border-default)' }}>
            <TrendingUp size={16} style={{ color: 'var(--accent)' }} />
            <h2 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, color: 'var(--text-primary)', fontSize: 16 }}>Resumen del equipo</h2>
          </div>
          <div className="crm-card" style={{ overflowX: 'auto', marginBottom: 8 }}>
            <table className="crm-table">
              <thead><tr><th>Nombre</th><th>Rol</th><th>Cumplimiento</th><th>Comisión</th><th>¿Comisionó?</th></tr></thead>
              <tbody>
                {c.resumenGeneral.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.nombre}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.rol}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: colorCumpl(r.cumplimientoTotal) }}>{r.cumplimientoTotal}%</td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: r.comisionMonto > 0 ? '#2dd4a0' : 'var(--text-muted)' }}>S/ {r.comisionMonto}</td>
                    <td style={{ textAlign: 'center' }}>
                      {r.comisionMonto > 0
                        ? <span style={{ color: '#2dd4a0', fontWeight: 700 }}>✓ Sí</span>
                        : <span style={{ color: 'var(--text-muted)' }}>No aún</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <SeccionAprobacionTestimonios c={c} />
        </>
      )}
    </div>
  )
}
