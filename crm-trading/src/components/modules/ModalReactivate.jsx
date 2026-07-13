import { useState } from 'react'
import { X, Mail, MailOpen, MousePointerClick, MessageCircle } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAuth } from '../../context/AuthContext'
import { ESTADOS_GESTIONABLES } from '../../hooks/useReactivate'

function fmt(fecha) {
  if (!fecha) return '—'
  return format(new Date(fecha), "dd MMM yyyy, HH:mm", { locale: es })
}

export default function ModalReactivate({ detalle, onCerrar, onRegistrarAvance }) {
  const { user } = useAuth()
  const [estadoNuevo, setEstadoNuevo] = useState('')
  const [nota, setNota] = useState('')
  const [guardando, setGuardando] = useState(false)

  if (!detalle) return null
  const { alumno, envios, seguimiento, loadingDetalle } = detalle

  const guardar = async () => {
    if (!estadoNuevo) return
    setGuardando(true)
    const ok = await onRegistrarAvance({ estadoNuevo, nota, registradoPor: user?.nombre || 'Supervisor' })
    setGuardando(false)
    if (ok) { setEstadoNuevo(''); setNota('') }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, width: '100%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>

        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{alumno.nombre}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {alumno.email} · {alumno.telefono || '—'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              Programa del que se retiró: {alumno.programa_retirado || '—'} · Motivo: {alumno.motivo_retiro || '—'}
            </div>
          </div>
          <button onClick={onCerrar} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 20, background: 'rgba(255,255,255,0.02)', flexWrap: 'wrap' }}>
          <InfoItem label="Estado actual" value={alumno.estado_campana} />
          <InfoItem label="Saldo pendiente" value={alumno.monto_faltante != null ? Number(alumno.monto_faltante).toFixed(2) : '—'} />
          <InfoItem label="Paquete" value={alumno.paquete || '—'} />
        </div>

        {/* Historial de correos */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            Correos enviados
          </div>
          {loadingDetalle ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Cargando…</div>
          ) : !envios.length ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Aún no se ha enviado ningún correo.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {envios.map((e) => (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                  <span style={{ minWidth: 70, color: 'var(--text-primary)', fontWeight: 600 }}>Correo {e.correo_numero}</span>
                  <span style={{ color: 'var(--text-muted)', minWidth: 140 }}>{fmt(e.enviado_at)}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: e.abierto ? '#2dd4a0' : 'var(--text-faint)' }}>
                    {e.abierto ? <MailOpen size={13} /> : <Mail size={13} />} {e.abierto ? 'Abierto' : 'Sin abrir'}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: e.click ? '#25D366' : 'var(--text-faint)' }}>
                    <MousePointerClick size={13} /> {e.click ? 'Clic en WhatsApp' : 'Sin clic'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Historial de seguimiento manual */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            Historial de avance
          </div>
          {!seguimiento?.length ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sin registros todavía.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {seguimiento.map((s) => (
                <div key={s.id} style={{ fontSize: 12, borderLeft: '2px solid var(--accent)', paddingLeft: 10 }}>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{s.estado_anterior || '—'} → {s.estado_nuevo}</div>
                  {s.nota && <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>{s.nota}</div>}
                  <div style={{ color: 'var(--text-faint)', marginTop: 2 }}>{fmt(s.registrado_en)} · {s.registrado_por}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Registrar avance */}
        <div style={{ padding: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <MessageCircle size={13} /> Registrar avance tras la comunicación
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            {ESTADOS_GESTIONABLES.map((estado) => (
              <button key={estado} onClick={() => setEstadoNuevo(estado)}
                style={{
                  padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
                  background: estadoNuevo === estado ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${estadoNuevo === estado ? 'var(--accent)' : 'rgba(255,255,255,0.1)'}`,
                  color: estadoNuevo === estado ? '#fff' : 'var(--text-muted)',
                }}>
                {estado}
              </button>
            ))}
          </div>
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Nota de la conversación (opcional)"
            rows={3}
            style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-input)', border: '1.5px solid var(--border-input)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, resize: 'vertical', marginBottom: 12 }}
          />
          <button className="crm-btn" disabled={!estadoNuevo || guardando} onClick={guardar}>
            {guardando ? 'Guardando…' : 'Guardar avance'}
          </button>
        </div>
      </div>
    </div>
  )
}

function InfoItem({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>{value}</div>
    </div>
  )
}
