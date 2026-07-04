// v-20260622-1614
import React from 'react'
import { useOrientacion } from '../hooks/useOrientacion'
import { useAuth } from '../context/AuthContext'
import { updateSesionZoomUrl } from '../lib/api'
import ModalTipificacion from '../components/modules/ModalTipificacion'
import Select from 'react-select'
import { Loader2, RefreshCw, Video, Clock, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { format, addDays, subDays } from 'date-fns'
import { es } from 'date-fns/locale'

const rsStyles = {
  control: (base, state) => ({ ...base, background: 'var(--bg-input)', border: `1.5px solid ${state.isFocused ? '#4e8fff' : '#2e3d5c'}`, borderRadius: 8, minHeight: 38, boxShadow: state.isFocused ? '0 0 0 3px rgba(78,143,255,0.15)' : 'none' }),
  menu: (base) => ({ ...base, background: 'var(--bg-input)', border: '1.5px solid #2e3d5c', borderRadius: 10, boxShadow: '0 8px 28px rgba(0,0,0,0.5)', zIndex: 9999 }),
  menuList: (base) => ({ ...base, background: 'var(--bg-input)', borderRadius: 10, padding: 4 }),
  option: (base, state) => ({ ...base, background: state.isSelected ? 'rgba(78,143,255,0.25)' : state.isFocused ? 'rgba(78,143,255,0.15)' : '#1e2840', color: state.isSelected ? '#7ab3ff' : state.isFocused ? '#fff' : '#c8d8f0', borderRadius: 6, fontSize: 13, padding: '9px 12px' }),
  singleValue: (base) => ({ ...base, color: '#fff', fontWeight: 500 }),
  placeholder: (base) => ({ ...base, color: 'var(--text-muted)' }),
  input: (base) => ({ ...base, color: '#fff' }),
  indicatorSeparator: (base) => ({ ...base, background: '#2e3d5c' }),
  dropdownIndicator: (base) => ({ ...base, color: 'var(--text-muted)' }),
  noOptionsMessage: (base) => ({ ...base, color: 'var(--text-muted)', background: 'var(--bg-input)' }),
}

const ESTADO_STYLE = {
  'Pendiente':     { bg: 'rgba(78,143,255,0.12)',  color: '#7ab3ff',  border: 'rgba(78,143,255,0.25)'  },
  'Concretada':    { bg: 'rgba(34,201,142,0.12)',  color: '#2dd4a0',  border: 'rgba(34,201,142,0.25)'  },
  'Reprogramada':  { bg: 'rgba(245,166,35,0.12)',  color: '#f5b93a',  border: 'rgba(245,166,35,0.25)'  },
  'No se conectó': { bg: 'rgba(240,92,92,0.12)',   color: '#f07070',  border: 'rgba(240,92,92,0.25)'   },
}

function EstadoBadge({ estado }) {
  const s = ESTADO_STYLE[estado] || ESTADO_STYLE['Pendiente']
  return <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{estado}</span>
}

// Horarios cada 55 minutos (45 min sesión + 10 min margen entre sesiones)
const HORAS_MANANA  = ['09:00','09:55','10:50','11:45']
const HORAS_TARDE   = ['14:30','15:25','16:20','17:15']
const TODAS_HORAS   = [...HORAS_MANANA, ...HORAS_TARDE]

// Los sábados el orientador entra a las 9am pero solo turno mañana (sale a
// la 2pm): la disponibilidad arranca a las 9:30 y la última sesión inicia
// a la 1:15pm, sin horario de tarde.
const HORAS_SABADO  = ['09:30','10:25','11:20','12:15','13:15']

function esFechaSabado(fecha) {
  if (!fecha) return false
  return new Date(fecha + 'T00:00:00').getDay() === 6
}

const ASESORAS = ['Fabiola M.', 'Katerin F.', 'Anael S.']

function horaDisponible(hora, fechaSeleccionada) {
  const hoy = format(new Date(), 'yyyy-MM-dd')
  // Si la fecha es futura, todas las horas disponibles
  if (fechaSeleccionada > hoy) return true
  // Si es hoy, verificar si la hora ya pasó (con 15 min de margen)
  if (fechaSeleccionada === hoy) {
    const ahora = new Date()
    const [h, m] = hora.split(':').map(Number)
    const horaSlot = new Date()
    horaSlot.setHours(h, m + 15, 0, 0) // 15 min de margen
    return horaSlot > ahora
  }
  // Fecha pasada — ninguna hora disponible
  return false
}


function ZoomCell({ sesion, onUpdate }) {
  const [editando, setEditando] = React.useState(false)
  const [url, setUrl] = React.useState(sesion.zoom_join_url || '')
  const [saving, setSaving] = React.useState(false)
  const [copiado, setCopiado] = React.useState(false)

  const copiar = () => {
    navigator.clipboard.writeText(sesion.zoom_join_url || url)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  const guardar = async () => {
    if (!url.startsWith('http')) { return }
    setSaving(true)
    try {
      await updateSesionZoomUrl(sesion.id, url)
      setEditando(false)
      onUpdate && onUpdate()
    } catch(e) { console.error(e) }
    finally { setSaving(false) }
  }

  if (editando) {
    return (
      <div style={{ display:'flex', gap:4, alignItems:'center' }}>
        <input value={url} onChange={e => setUrl(e.target.value)}
          placeholder="https://zoom.us/j/..."
          style={{ width:160, padding:'3px 7px', fontSize:11, background:'var(--bg-input)',
            border:'1px solid var(--border-input)', borderRadius:6, color:'var(--text-primary)', outline:'none' }} />
        <button onClick={guardar} disabled={saving}
          style={{ padding:'3px 7px', fontSize:10, background:'rgba(45,212,160,0.12)',
            border:'1px solid rgba(45,212,160,0.3)', color:'#2dd4a0', borderRadius:5, cursor:'pointer' }}>
          {saving ? '...' : '✓'}
        </button>
        <button onClick={() => setEditando(false)}
          style={{ padding:'3px 6px', fontSize:10, background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer' }}>
          ✕
        </button>
      </div>
    )
  }

  if (sesion.zoom_join_url || url) {
    const link = sesion.zoom_join_url || url
    return (
      <div style={{ display:'flex', gap:4, alignItems:'center' }}>
        <a href={link} target="_blank" rel="noopener noreferrer"
          style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, color:'var(--accent)',
            textDecoration:'none', background:'var(--accent-light)', padding:'3px 8px', borderRadius:6 }}>
          <Video size={11} /> Unirse
        </a>
        <button onClick={copiar} title="Copiar enlace"
          style={{ padding:'3px 7px', fontSize:10, background: copiado ? 'rgba(45,212,160,0.12)' : 'var(--bg-input)',
            border:`1px solid ${copiado ? 'rgba(45,212,160,0.3)' : 'var(--border-input)'}`,
            color: copiado ? '#2dd4a0' : 'var(--text-muted)', borderRadius:5, cursor:'pointer' }}>
          {copiado ? '✓ Copiado' : '📋'}
        </button>
        <button onClick={() => setEditando(true)} title="Editar enlace"
          style={{ padding:'3px 6px', fontSize:10, background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer' }}>
          ✎
        </button>
      </div>
    )
  }

  return (
    <button onClick={() => setEditando(true)}
      style={{ padding:'3px 9px', fontSize:11, background:'rgba(245,166,35,0.1)',
        border:'1px solid rgba(245,166,35,0.25)', color:'var(--yellow)', borderRadius:6, cursor:'pointer' }}>
      + Agregar enlace
    </button>
  )
}

export default function OrientacionPage() {
  const o = useOrientacion()
  const { user } = useAuth()
  const esOrientador = user?.rol === 'orientador'
  const fechaDisplay = format(new Date(o.fechaVista + 'T00:00:00'), "EEEE d 'de' MMMM, yyyy", { locale: es })
  const horasOcupadas = o.sesiones.map(s => s.hora_inicio?.slice(0,5))

  return (
    <div style={{ display: 'flex', height: '100%' }}>

      {/* ── COLUMNA PRINCIPAL ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: 'var(--text-primary)', fontSize: 20 }}>Orientación Técnica</h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', textTransform: 'capitalize', marginTop: 3 }}>{fechaDisplay}</p>
          </div>
          <button className="crm-btn crm-btn-sm" onClick={() => o.cargarSesiones()}>
            <RefreshCw size={13} /> Actualizar
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Total',         value: o.stats.total,          color: '#7ab3ff' },
            { label: 'Pendientes',    value: o.stats.pendientes,     color: 'var(--text-muted)' },
            { label: 'Concretadas',   value: o.stats.concretadas,    color: '#2dd4a0' },
            { label: 'Reprogramadas', value: o.stats.reprogramadas,  color: '#f5b93a' },
            { label: 'No conectaron', value: o.stats.noConectaron,   color: '#f07070' },
          ].map(({ label, value, color }) => (
            <div key={label} className="crm-card" style={{ padding: '12px 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: 'Syne, sans-serif', lineHeight: 1 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Toggle Día / Historial completo */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {[['dia', 'Día'], ['historial', 'Historial completo']].map(([key, label]) => (
            <button key={key} onClick={() => o.setVista(key)}
              style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: o.vista === key ? '#4e8fff' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${o.vista === key ? '#4e8fff' : 'rgba(255,255,255,0.08)'}`,
                color: o.vista === key ? '#fff' : '#9aaccb' }}>
              {label}
            </button>
          ))}
        </div>

        {o.vista === 'dia' && (
          <>
          {/* Navegación fecha */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <button className="crm-btn crm-btn-sm" onClick={() => o.setFechaVista(format(subDays(new Date(o.fechaVista + 'T00:00:00'), 1), 'yyyy-MM-dd'))}>
              <ChevronLeft size={14} />
            </button>
            <input type="date" className="crm-input" style={{ width: 160 }}
              value={o.fechaVista} onChange={e => o.setFechaVista(e.target.value)} />
            <button className="crm-btn crm-btn-sm" onClick={() => o.setFechaVista(format(addDays(new Date(o.fechaVista + 'T00:00:00'), 1), 'yyyy-MM-dd'))}>
              <ChevronRight size={14} />
            </button>
            <button className="crm-btn crm-btn-sm" onClick={() => o.setFechaVista(format(new Date(), 'yyyy-MM-dd'))}>
              Hoy
            </button>
          </div>

          {/* Tabla sesiones del día */}
          <div className="crm-card">
            <div style={{ padding: '13px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.02)', borderRadius: '12px 12px 0 0' }}>
              <Clock size={14} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Sesiones del día</span>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>{o.sesiones.length} sesiones agendadas</span>
            </div>

            {o.loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 50, gap: 10, color: 'var(--text-muted)' }}>
                <Loader2 size={16} className="animate-spin" /><span style={{ fontSize: 13 }}>Cargando...</span>
              </div>
            ) : !o.sesiones.length ? (
              <div style={{ textAlign: 'center', padding: 50, color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📅</div>
                <p style={{ fontSize: 13 }}>No hay sesiones agendadas para este día</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="crm-table">
                  <thead>
                    <tr>
                      <th>Hora</th><th>Alumno</th><th>Programa</th><th>Motivo</th>
                      <th>Agendado por</th><th>Zoom</th><th>Estado</th><th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {o.sesiones.map(s => (
                      <tr key={s.id}>
                        <td style={{ whiteSpace: 'nowrap', fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#7ab3ff' }}>
                          {s.hora_inicio?.slice(0,5)} – {s.hora_fin?.slice(0,5)}
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.alumno?.nombre || '—'}</td>
                        <td style={{ fontSize: 12 }}>{s.alumno?.programa || '—'}</td>
                        <td style={{ fontSize: 12, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.motivo}</td>
                        <td style={{ fontSize: 12 }}>{s.agendado_por || '—'}</td>
                        <td>
                          <ZoomCell sesion={s} onUpdate={o.cargarSesiones} />
                        </td>
                        <td><EstadoBadge estado={s.estado} /></td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {s.estado === 'Pendiente' && (
                              <button className="crm-btn crm-btn-sm" style={{ fontSize: 11 }}
                                onClick={() => o.abrirTipificacion(s)}>
                                Tipificar
                              </button>
                            )}
                            <button
                              onClick={() => o.eliminarSesion(s)}
                              style={{ background: 'rgba(240,92,92,0.1)', border: '1px solid rgba(240,92,92,0.25)', color: '#f07070', padding: '4px 8px', borderRadius: 6, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                              <Trash2 size={11} /> Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          </>
        )}

        {o.vista === 'historial' && (
          <div className="crm-card">
            <div style={{ padding: '13px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.02)', borderRadius: '12px 12px 0 0' }}>
              <Clock size={14} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Historial del mes</span>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)', marginRight: 10 }}>{o.historial.length} sesiones</span>
              <select value={o.mesHistorial} onChange={e => o.setMesHistorial(e.target.value)}
                style={{ padding: '5px 10px', background: 'var(--bg-input)', border: '1.5px solid #2e3d5c', borderRadius: 8, color: 'var(--text-primary)', fontSize: 12, cursor: 'pointer' }}>
                {/* Solo desde enero de este año — no hay datos de antes */}
                {Array.from({ length: new Date().getMonth() + 1 }, (_, i) => {
                  const mesActual = new Date().getMonth() // 0=Ene ... i va de mesActual hacia atrás hasta 0
                  const dt = new Date(new Date().getFullYear(), mesActual - i, 1)
                  const val = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
                  return <option key={val} value={val}>{dt.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })}</option>
                })}
              </select>
            </div>

            {o.loadingHistorial ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 50, gap: 10, color: 'var(--text-muted)' }}>
                <Loader2 size={16} className="animate-spin" /><span style={{ fontSize: 13 }}>Cargando...</span>
              </div>
            ) : !o.historial.length ? (
              <div style={{ textAlign: 'center', padding: 50, color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
                <p style={{ fontSize: 13 }}>Sin sesiones registradas todavía</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto', maxHeight: 560, overflowY: 'auto' }}>
                <table className="crm-table">
                  <thead>
                    <tr>
                      <th>Fecha</th><th>Hora</th><th>Alumno</th><th>Programa</th><th>Motivo</th>
                      <th>Agendado por</th><th>Zoom</th><th>Estado</th><th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {o.historial.map(s => (
                      <tr key={s.id}>
                        <td style={{ whiteSpace: 'nowrap', fontSize: 12, color: 'var(--text-secondary)' }}>
                          {format(new Date(s.fecha + 'T00:00:00'), 'dd/MM/yyyy')}
                        </td>
                        <td style={{ whiteSpace: 'nowrap', fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#7ab3ff' }}>
                          {s.hora_inicio?.slice(0,5)} – {s.hora_fin?.slice(0,5)}
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.alumno?.nombre || '—'}</td>
                        <td style={{ fontSize: 12 }}>{s.alumno?.programa || '—'}</td>
                        <td style={{ fontSize: 12, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.motivo}</td>
                        <td style={{ fontSize: 12 }}>{s.agendado_por || '—'}</td>
                        <td>
                          <ZoomCell sesion={s} onUpdate={o.cargarHistorial} />
                        </td>
                        <td><EstadoBadge estado={s.estado} /></td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {s.estado === 'Pendiente' && (
                              <button className="crm-btn crm-btn-sm" style={{ fontSize: 11 }}
                                onClick={() => o.abrirTipificacion(s)}>
                                Tipificar
                              </button>
                            )}
                            <button
                              onClick={() => o.eliminarSesion(s)}
                              style={{ background: 'rgba(240,92,92,0.1)', border: '1px solid rgba(240,92,92,0.25)', color: '#f07070', padding: '4px 8px', borderRadius: 6, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                              <Trash2 size={11} /> Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── PANEL DERECHO: Agendar (el orientador no agenda, solo atiende) ── */}
      {!esOrientador && (
      <aside style={{ width: 300, flexShrink: 0, borderLeft: '1px solid rgba(255,255,255,0.07)', background: 'var(--bg-surface)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Agendar sesión</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Crea una reunión Zoom automáticamente</div>
        </div>

        <div style={{ padding: 14, flex: 1 }}>
          <Field label="Alumno">
            <Select styles={rsStyles} options={o.alumnosOpts} value={o.form.alumno}
              onChange={v => o.setField('alumno', v)} placeholder="Buscar alumno..."
              isSearchable isClearable noOptionsMessage={() => 'Sin resultados'} />
          </Field>

          <div style={{ height: 12 }} />
          <Field label="Fecha">
            <input type="date" className="crm-input" value={o.form.fecha}
              min={format(new Date(), 'yyyy-MM-dd')}
              onChange={e => {
                const nuevaFecha = e.target.value
                const horasValidas = esFechaSabado(nuevaFecha) ? HORAS_SABADO : TODAS_HORAS
                o.setField('fecha', nuevaFecha)
                if (!horasValidas.includes(o.form.hora)) o.setField('hora', horasValidas[0])
              }} />
          </Field>

          <div style={{ height: 12 }} />
          <Field label="Horario disponible (45 min c/u)">
            {/* Mañana (sábado tiene su propio turno único, más corto) */}
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {esFechaSabado(o.form.fecha) ? 'Sábado · 9:30 – 1:15 pm (turno único)' : 'Mañana · 9:00 – 12:40'}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
              {(esFechaSabado(o.form.fecha) ? HORAS_SABADO : HORAS_MANANA).map(h => {
                const ocupada  = horasOcupadas.includes(h) && o.fechaVista === o.form.fecha
                const pasada   = !horaDisponible(h, o.form.fecha)
                const disabled = ocupada || pasada
                return (
                  <button key={h} onClick={() => !disabled && o.setField('hora', h)} disabled={disabled}
                    style={{
                      padding: '5px 10px', borderRadius: 7, fontSize: 12, fontWeight: 500,
                      cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
                      background: o.form.hora === h ? '#4e8fff' : disabled ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${o.form.hora === h ? '#4e8fff' : disabled ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.1)'}`,
                      color: o.form.hora === h ? '#fff' : disabled ? '#2e3d5c' : '#9aaccb',
                      textDecoration: ocupada ? 'line-through' : 'none',
                      opacity: pasada ? 0.35 : 1,
                    }}>
                    {h}
                  </button>
                )
              })}
            </div>
            {/* Tarde — no aplica los sábados (turno único de mañana) */}
            {!esFechaSabado(o.form.fecha) && (<>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Tarde · 14:30 – 18:00
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {HORAS_TARDE.map(h => {
                  const ocupada  = horasOcupadas.includes(h) && o.fechaVista === o.form.fecha
                  const pasada   = !horaDisponible(h, o.form.fecha)
                  const disabled = ocupada || pasada
                  return (
                    <button key={h} onClick={() => !disabled && o.setField('hora', h)} disabled={disabled}
                      style={{
                        padding: '5px 10px', borderRadius: 7, fontSize: 12, fontWeight: 500,
                        cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
                        background: o.form.hora === h ? '#4e8fff' : disabled ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${o.form.hora === h ? '#4e8fff' : disabled ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.1)'}`,
                        color: o.form.hora === h ? '#fff' : disabled ? '#2e3d5c' : '#9aaccb',
                        textDecoration: ocupada ? 'line-through' : 'none',
                        opacity: pasada ? 0.35 : 1,
                      }}>
                      {h}
                    </button>
                  )
                })}
              </div>
            </>)}
          </Field>

          <div style={{ height: 12 }} />
          <Field label="Motivo de la sesión">
            <select className="crm-input" value={o.form.motivo} onChange={e => o.setField('motivo', e.target.value)}>
              <option value="">— Seleccionar motivo —</option>
              {o.MOTIVOS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>

          <div style={{ height: 12 }} />
          <Field label="Agendado por">
            <select className="crm-input" value={o.form.agendado_por} onChange={e => o.setField('agendado_por', e.target.value)}>
              <option value="">— Seleccionar asesora —</option>
              {ASESORAS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </Field>

          <div style={{ height: 16 }} />
          <button className="crm-btn-primary" style={{ width: '100%', justifyContent: 'center' }}
            onClick={o.agendarSesion} disabled={o.saving}>
            {o.saving
              ? <><Loader2 size={14} className="animate-spin" /> Agendando...</>
              : <><Video size={14} /> Agendar y crear Zoom</>}
          </button>

          <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 8, background: 'rgba(78,143,255,0.06)', border: '1px solid rgba(78,143,255,0.15)', fontSize: 11, color: 'var(--text-muted)' }}>
            💡 Duración: 45 min + 10 min margen · Zona horaria: Lima
          </div>
        </div>
      </aside>
      )}

      {o.tipifModal && (
        <ModalTipificacion
          sesion={o.tipifModal}
          form={o.tipifForm}
          setField={o.setTipifField}
          onGuardar={o.guardarTipificacion}
          onCerrar={o.cerrarTipificacion}
          saving={o.saving}
        />
      )}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 10, fontWeight: 700, color: '#7a8aaa', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</label>
      {children}
    </div>
  )
}
