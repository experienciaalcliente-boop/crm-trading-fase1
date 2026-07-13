import { useReactivate, ESTADOS_REACTIVATE } from '../hooks/useReactivate'
import ModalReactivate from '../components/modules/ModalReactivate'
import { Loader2, RefreshCw, Play, Pause, MousePointerClick } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const ESTADO_STYLE = {
  'Pendiente':           { bg: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)',  border: 'rgba(255,255,255,0.1)' },
  'Interesado':          { bg: 'rgba(245,166,35,0.12)',  color: '#f5b93a',            border: 'rgba(245,166,35,0.25)' },
  'Contactado':          { bg: 'rgba(101,167,166,0.12)', color: 'var(--accent)',      border: 'rgba(101,167,166,0.25)' },
  'Negociación':         { bg: 'rgba(167,139,250,0.12)', color: '#b89eff',            border: 'rgba(167,139,250,0.25)' },
  'Reactivado':          { bg: 'rgba(34,201,142,0.12)',  color: '#2dd4a0',            border: 'rgba(34,201,142,0.25)' },
  'No interesado':       { bg: 'rgba(240,92,92,0.12)',   color: '#f07070',            border: 'rgba(240,92,92,0.25)' },
  'Sin respuesta':       { bg: 'rgba(240,92,92,0.08)',   color: '#c98080',            border: 'rgba(240,92,92,0.15)' },
}
function estiloEstado(estado) {
  return ESTADO_STYLE[estado] || { bg: 'rgba(255,255,255,0.04)', color: 'var(--text-faint)', border: 'rgba(255,255,255,0.08)' }
}

function EstadoBadge({ estado }) {
  const s = estiloEstado(estado)
  return (
    <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
      {estado}
    </span>
  )
}

export default function ReactivatePage() {
  const r = useReactivate()

  const tasaApertura = r.stats.correosEnviados > 0 ? Math.round((r.stats.conClic / r.stats.correosEnviados) * 100) : 0

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: 'var(--text-primary)', fontSize: 20 }}>Plan Reactivate Burs</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Seguimiento de la campaña de reactivación de exalumnos retirados con saldo pendiente</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="crm-btn crm-btn-sm" onClick={r.cargar}>
            <RefreshCw size={13} /> Actualizar
          </button>
          {r.config && (
            <button
              onClick={r.toggleCampana}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 8,
                fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none',
                background: r.config.campana_activa ? '#f07070' : '#25D366', color: '#fff',
              }}>
              {r.config.campana_activa ? <><Pause size={13} /> Pausar campaña</> : <><Play size={13} /> Activar campaña</>}
            </button>
          )}
        </div>
      </div>

      {!r.config?.campana_activa && (
        <div style={{ background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 12, color: '#f5b93a' }}>
          La campaña está en pausa — no se enviará ningún correo automático hasta que la actives.
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'En campaña',     value: r.totalSinFiltrar,     color: 'var(--accent)' },
          { label: 'Correos env.',   value: r.stats.correosEnviados, color: 'var(--text-primary)' },
          { label: 'Clics (CTR)',    value: `${tasaApertura}%`,     color: '#25D366' },
          { label: 'Interesados',    value: r.stats.interesados,    color: '#f5b93a' },
          { label: 'Contactados',    value: r.stats.contactados,    color: 'var(--accent)' },
          { label: 'Reactivados',    value: r.stats.reactivados,    color: '#2dd4a0' },
          { label: 'Sin respuesta',  value: r.stats.sinRespuesta,   color: '#c98080' },
        ].map(({ label, value, color }) => (
          <div key={label} className="crm-card" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: 'Syne, sans-serif', lineHeight: 1 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['Todos', ...ESTADOS_REACTIVATE].map((e) => (
            <button key={e} onClick={() => r.setFiltroEstado(e)}
              style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
                background: r.filtroEstado === e ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${r.filtroEstado === e ? 'var(--accent)' : 'rgba(255,255,255,0.1)'}`,
                color: r.filtroEstado === e ? '#fff' : 'var(--text-muted)',
              }}>
              {e}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="🔍 Buscar alumno..."
          value={r.buscar}
          onChange={(e) => r.setBuscar(e.target.value)}
          style={{ padding: '6px 12px', background: 'var(--bg-input)', border: '1.5px solid var(--border-input)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, width: 200, marginLeft: 'auto' }}
        />
      </div>

      {/* Tabla */}
      <div className="crm-card">
        {r.loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 10, color: 'var(--text-muted)' }}>
            <Loader2 size={18} className="animate-spin" /><span style={{ fontSize: 13 }}>Cargando alumnos...</span>
          </div>
        ) : !r.alumnos.length ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
            <p style={{ fontSize: 13 }}>No hay alumnos con ese filtro</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Alumno</th>
                  <th>Programa retirado</th>
                  <th>Motivo</th>
                  <th>Último correo</th>
                  <th>Estado</th>
                  <th>Clic WhatsApp</th>
                  <th>Ver</th>
                </tr>
              </thead>
              <tbody>
                {r.alumnos.map((a) => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{a.nombre}</td>
                    <td style={{ fontSize: 12 }}>{a.programa_retirado || '—'}</td>
                    <td style={{ fontSize: 12 }}>{a.motivo_retiro || '—'}</td>
                    <td style={{ fontSize: 12 }}>
                      {a.ultimo_correo_enviado != null ? `Correo ${a.ultimo_correo_enviado}` : '—'}
                      {a.fecha_ultimo_envio && (
                        <div style={{ color: 'var(--text-faint)', fontSize: 11 }}>{format(new Date(a.fecha_ultimo_envio), 'dd MMM yyyy', { locale: es })}</div>
                      )}
                    </td>
                    <td><EstadoBadge estado={a.estado_campana} /></td>
                    <td>
                      {a.primer_click_at ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#25D366', fontSize: 12 }}>
                          <MousePointerClick size={13} /> Sí
                        </span>
                      ) : <span style={{ color: 'var(--text-faint)', fontSize: 12 }}>—</span>}
                    </td>
                    <td>
                      <button className="crm-btn crm-btn-sm" style={{ fontSize: 11 }} onClick={() => r.abrirDetalle(a)}>
                        Ver / gestionar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ModalReactivate detalle={r.detalle} onCerrar={r.cerrarDetalle} onRegistrarAvance={r.registrarAvance} />
    </div>
  )
}
