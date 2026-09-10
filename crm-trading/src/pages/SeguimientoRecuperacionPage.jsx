import { useState } from 'react'
import { Loader2, RefreshCw, ArrowLeft } from 'lucide-react'
import { useSeguimientoRecuperacion, ESTADOS_WHATSAPP } from '../hooks/useSeguimientoRecuperacion'

const fmtUSD = n => `USD ${Math.round(n || 0).toLocaleString('en-US')}`
const fmtPct = (n, d) => d > 0 ? `${Math.round((n / d) * 100)}%` : '—'
const fmtFecha = iso => iso ? new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }) : '—'

const ESTADO_WA_COLOR = {
  'Sin contacto': { bg: 'transparent', fg: 'var(--text-muted)' },
  'Contactado': { bg: 'rgba(78,143,255,0.15)', fg: 'var(--accent)' },
  'Respondió': { bg: 'rgba(245,185,58,0.15)', fg: '#f5b93a' },
  'En conversación': { bg: 'rgba(245,185,58,0.15)', fg: '#f5b93a' },
  'Matriculado': { bg: 'rgba(45,212,160,0.15)', fg: '#2dd4a0' },
  'No interesado': { bg: 'rgba(240,112,112,0.15)', fg: '#f07070' },
}

function FunnelStat({ label, value, pct, color = 'var(--text-primary)' }) {
  return (
    <div className="crm-card" style={{ padding: '12px 14px', flex: 1, minWidth: 110 }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 21, fontWeight: 700, color, fontFamily: 'Syne,sans-serif', lineHeight: 1 }}>{value}</div>
      {pct !== undefined && <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 3 }}>{pct}</div>}
    </div>
  )
}

function NotaCell({ alumno, onGuardar }) {
  const [valor, setValor] = useState(alumno.whatsapp_nota || '')
  return (
    <input
      defaultValue={valor}
      placeholder="Nota…"
      onChange={e => setValor(e.target.value)}
      onBlur={() => { if (valor !== (alumno.whatsapp_nota || '')) onGuardar(alumno, { whatsapp_nota: valor }) }}
      style={{ width: '100%', padding: '5px 7px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 11.5 }}
    />
  )
}

export default function SeguimientoRecuperacionPage() {
  const s = useSeguimientoRecuperacion()

  if (s.loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, color: 'var(--text-muted)' }}>
      <Loader2 size={18} className="animate-spin" /><span style={{ fontSize: 13 }}>Cargando seguimiento…</span>
    </div>
  )

  const f = s.funnelTotal

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <a href="/coordinacion" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--text-muted)', textDecoration: 'none', marginBottom: 6 }}>
            <ArrowLeft size={12} /> Volver a Coordinación
          </a>
          <h1 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, color: 'var(--text-primary)', fontSize: 22 }}>Seguimiento de Recuperación</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Segmentos A–D · correo (Brevo) + WhatsApp con asesora, en una sola vista</p>
        </div>
        <button className="crm-btn crm-btn-sm" onClick={s.cargar}><RefreshCw size={13} /> Actualizar</button>
      </div>

      {/* Embudo agregado */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
        <FunnelStat label="Enviados" value={f.enviados} pct={`de ${f.total} contactables`} />
        <FunnelStat label="Apertura (Brevo)" value={f.tasaApertura === null ? '—' : `${Math.round(f.tasaApertura * 100)}%`} pct={f.tasaApertura === null ? 'aún sin medir (48h post-envío)' : `${f.uniqueViews} de ${f.delivered} entregados`} />
        <FunnelStat label="Contactados WA" value={f.contactadosWA} pct={fmtPct(f.contactadosWA, f.enviados) + ' de enviados'} color="#f5b93a" />
        <FunnelStat label="Respondieron" value={f.respondieron} pct={fmtPct(f.respondieron, f.contactadosWA) + ' de contactados'} color="#f5b93a" />
        <FunnelStat label="Matriculados" value={f.matriculados} pct={fmtPct(f.matriculados, f.enviados) + ' de enviados'} color="#2dd4a0" />
        <FunnelStat label="No interesados" value={f.noInteresados} pct={fmtPct(f.noInteresados, f.contactadosWA) + ' de contactados'} color="#f07070" />
      </div>
      <p style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 0, marginBottom: 20 }}>
        La apertura es un % agregado por tanda que calcula el cron 48h después del envío (no hay tracking de apertura/click por persona — eso requeriría un webhook de Brevo que todavía no está conectado).
      </p>

      {/* Desglose por segmento */}
      <div className="crm-card" style={{ padding: 16, marginBottom: 24 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
            <thead>
              <tr style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                {['Segmento', 'Asesor', 'Tanda', 'Pers.', 'Enviados', 'Apertura', 'Contact. WA', 'Respond.', 'Matric.', 'No interés'].map(h => (
                  <th key={h} style={{ textAlign: ['Segmento', 'Asesor', 'Tanda'].includes(h) ? 'left' : 'right', padding: '0 8px 8px', borderBottom: '1px solid var(--border-default)', fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {s.funnelSegmentos.map(seg => (
                <tr key={seg.segmento} style={{ fontSize: 12.5 }}>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>Segmento {seg.segmento}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>{seg.asesor}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid var(--border-default)', color: 'var(--text-muted)', fontSize: 11 }}>{seg.estadoTanda}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid var(--border-default)', textAlign: 'right', color: 'var(--text-primary)' }}>{seg.total}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid var(--border-default)', textAlign: 'right', color: 'var(--text-primary)' }}>{seg.enviados}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid var(--border-default)', textAlign: 'right', color: 'var(--text-muted)' }}>{seg.tasaApertura === null ? '—' : `${Math.round(seg.tasaApertura * 100)}%`}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid var(--border-default)', textAlign: 'right', color: '#f5b93a' }}>{seg.contactadosWA}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid var(--border-default)', textAlign: 'right', color: '#f5b93a' }}>{seg.respondieron}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid var(--border-default)', textAlign: 'right', color: '#2dd4a0' }}>{seg.matriculados}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid var(--border-default)', textAlign: 'right', color: '#f07070' }}>{seg.noInteresados}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <select value={s.segmentoFiltro} onChange={e => s.setSegmentoFiltro(e.target.value)}
          style={{ padding: '7px 9px', background: 'var(--bg-input)', border: '1.5px solid var(--border-default)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 12.5 }}>
          <option value="Todos">Todos los segmentos</option>
          {['A', 'B', 'C', 'D'].map(seg => <option key={seg} value={seg}>Segmento {seg}</option>)}
        </select>
        <select value={s.estadoFiltro} onChange={e => s.setEstadoFiltro(e.target.value)}
          style={{ padding: '7px 9px', background: 'var(--bg-input)', border: '1.5px solid var(--border-default)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 12.5 }}>
          <option value="Enviados">Solo ya enviados</option>
          <option value="Todos">Todos (incl. pendientes de envío)</option>
          {ESTADOS_WHATSAPP.map(e => <option key={e} value={e}>Estado WA: {e}</option>)}
        </select>
        <select value={s.asesoraFiltro} onChange={e => s.setAsesoraFiltro(e.target.value)}
          style={{ padding: '7px 9px', background: 'var(--bg-input)', border: '1.5px solid var(--border-default)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 12.5 }}>
          <option value="Todas">Todas las asesoras</option>
          {s.asesoras.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <input className="crm-input" placeholder="Buscar nombre o correo…" value={s.busqueda} onChange={e => s.setBusqueda(e.target.value)}
          style={{ flex: 1, minWidth: 180, padding: '7px 9px', background: 'var(--bg-input)', border: '1.5px solid var(--border-default)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 12.5 }} />
        <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{s.pipeline.length} en esta vista</span>
      </div>
      <p style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: -6, marginBottom: 12 }}>
        La deuda se calcula en vivo desde las cuotas reales cuando el registro está vinculado al alumno. El ⚠ marca a quien no se pudo vincular (nombre duplicado en la base) — ese monto es el del CSV original y puede estar desactualizado; verifícalo en la ficha del alumno antes de comunicarlo.
      </p>

      {/* Pipeline */}
      <div className="crm-card" style={{ padding: 16 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                {['Alumno', 'Seg.', 'Deuda', 'Correo', 'Estado WhatsApp', 'Asesora', 'Contacto', 'Nota'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '0 8px 8px', borderBottom: '1px solid var(--border-default)', fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {s.pipeline.map(a => {
                const chip = ESTADO_WA_COLOR[a.estado_whatsapp] || ESTADO_WA_COLOR['Sin contacto']
                return (
                  <tr key={a.id}>
                    <td style={{ padding: '7px 8px', borderBottom: '1px solid var(--border-default)', maxWidth: 200 }}>
                      <div style={{ fontSize: 12.5, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.nombre}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.email}</div>
                    </td>
                    <td style={{ padding: '7px 8px', borderBottom: '1px solid var(--border-default)', fontSize: 12, color: 'var(--text-muted)' }}>{a.segmento}</td>
                    <td style={{ padding: '7px 8px', borderBottom: '1px solid var(--border-default)', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {a.deuda_verificada
                        ? <span style={{ color: 'var(--text-primary)' }} title="Calculada en vivo desde las cuotas reales del alumno">{fmtUSD(a.deuda_usd_real)}</span>
                        : <span style={{ color: '#f5b93a' }} title="No se pudo vincular con el alumno real — este monto es el que traía el CSV original y puede estar desactualizado">⚠ {fmtUSD(a.deuda_usd)}</span>}
                    </td>
                    <td style={{ padding: '7px 8px', borderBottom: '1px solid var(--border-default)', fontSize: 11 }}>
                      {a.estado_campana === 'Pendiente'
                        ? <span style={{ color: 'var(--text-muted)' }}>Sin enviar</span>
                        : <span style={{ color: 'var(--text-primary)' }}>Enviado {fmtFecha(a.fecha_ultimo_envio)}</span>}
                    </td>
                    <td style={{ padding: '7px 8px', borderBottom: '1px solid var(--border-default)' }}>
                      <select value={a.estado_whatsapp} onChange={e => s.actualizarSeguimientoWA(a, { estado_whatsapp: e.target.value })}
                        style={{ padding: '4px 6px', borderRadius: 6, fontSize: 11.5, background: chip.bg, color: chip.fg, border: `1px solid ${chip.fg}44` }}>
                        {ESTADOS_WHATSAPP.map(e => <option key={e} value={e}>{e}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '7px 8px', borderBottom: '1px solid var(--border-default)' }}>
                      <input defaultValue={a.whatsapp_asesora || ''} placeholder="—" list="asesoras-list"
                        onBlur={e => { if (e.target.value !== (a.whatsapp_asesora || '')) s.actualizarSeguimientoWA(a, { whatsapp_asesora: e.target.value }) }}
                        style={{ width: 90, padding: '5px 7px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 11.5 }} />
                    </td>
                    <td style={{ padding: '7px 8px', borderBottom: '1px solid var(--border-default)', fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmtFecha(a.whatsapp_contactado_at)}</td>
                    <td style={{ padding: '7px 8px', borderBottom: '1px solid var(--border-default)', minWidth: 160 }}>
                      <NotaCell alumno={a} onGuardar={s.actualizarSeguimientoWA} />
                    </td>
                  </tr>
                )
              })}
              {s.pipeline.length === 0 && (
                <tr><td colSpan={8} style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Nadie en este filtro.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <datalist id="asesoras-list">
          {s.asesoras.map(a => <option key={a} value={a} />)}
        </datalist>
      </div>
    </div>
  )
}
