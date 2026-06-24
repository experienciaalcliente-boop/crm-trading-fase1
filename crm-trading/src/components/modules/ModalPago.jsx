import { Loader2, X } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const TIPOS = [
  { value: 'Pago completo',     label: '✓ Pago completo'     },
  { value: 'Pago parcial',      label: '◑ Pago parcial'      },
  { value: 'Prórroga',          label: '📅 Prórroga'          },
  { value: 'Reserva académica', label: '📌 Reserva académica' },
  { value: 'Retiro',            label: '✗ Retiro'             },
]

const MONEDAS = [{ value: 'USD', label: 'USD — Dólares' }, { value: 'PEN', label: 'PEN — Soles' }]

const ESTADO_COLOR = {
  'Pagada':            '#2dd4a0',
  'Pago parcial':      '#f5b93a',
  'No iniciada':       '#7a8aaa',
  'Prórroga':          '#b89eff',
  'Reserva académica': '#7ab3ff',
  'Retirado':          '#f07070',
}

export default function ModalPago({ cuota, form, cuotasAlumno, setField, onGuardar, onCerrar, saving }) {
  const tipo = form.tipo

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onCerrar()}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{cuota.alumno?.nombre}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {cuota.alumno?.programa} · Cuota #{cuota.numero_cuota} · Vence: {format(new Date(cuota.fecha_vence + 'T00:00:00'), 'dd MMM yyyy', { locale: es })}
            </div>
          </div>
          <button onClick={onCerrar} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Info cuota */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 16, background: 'rgba(255,255,255,0.02)' }}>
          <InfoItem label="Monto total"  value={`${cuota.moneda} ${Number(cuota.monto).toFixed(2)}`} />
          <InfoItem label="Pagado"       value={cuota.monto_pagado > 0 ? `${cuota.moneda} ${Number(cuota.monto_pagado).toFixed(2)}` : '—'} />
          <InfoItem label="Pendiente"    value={`${cuota.moneda} ${(cuota.monto - (cuota.monto_pagado||0)).toFixed(2)}`} color="#f07070" />
          <InfoItem label="Estado actual" value={cuota.estado} color={ESTADO_COLOR[cuota.estado]} />
        </div>

        {/* Formulario */}
        <div style={{ padding: 20 }}>

          {/* Tipo de gestión */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: '#7a8aaa', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
              Tipo de gestión
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {TIPOS.map(t => (
                <button key={t.value} onClick={() => setField('tipo', t.value)}
                  style={{
                    padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                    cursor: 'pointer', transition: 'all 0.15s',
                    background: form.tipo === t.value ? '#4e8fff' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${form.tipo === t.value ? '#4e8fff' : 'rgba(255,255,255,0.1)'}`,
                    color: form.tipo === t.value ? '#fff' : '#7a8aaa',
                  }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Campos según tipo */}
          {(tipo === 'Pago completo' || tipo === 'Pago parcial') && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <Field label="Monto pagado">
                <input type="number" min="0" className="crm-input"
                  value={form.monto} onChange={e => setField('monto', e.target.value)} placeholder="0.00" />
              </Field>
              <Field label="Moneda">
                <select className="crm-input" value={form.moneda} onChange={e => setField('moneda', e.target.value)}>
                  {MONEDAS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </Field>
            </div>
          )}

          {tipo === 'Prórroga' && (
            <div style={{ marginBottom: 14 }}>
              {/* Aclaración importante */}
              <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)', fontSize: 11, color: '#b89eff', marginBottom: 10 }}>
                💡 La <strong>fecha de cronograma</strong> ({format(new Date(cuota.fecha_vence + 'T00:00:00'), 'dd MMM yyyy', { locale: es })}) no cambia. Solo se registra una nueva fecha estimada de pago.
              </div>
              <Field label="Nueva fecha estimada de pago">
                <input type="date" className="crm-input"
                  value={form.nueva_fecha} onChange={e => setField('nueva_fecha', e.target.value)} />
              </Field>
            </div>
          )}

          {tipo === 'Retiro' && (
            <div style={{ marginBottom: 14 }}>
              <Field label="Motivo de retiro">
                <input className="crm-input" value={form.motivo}
                  onChange={e => setField('motivo', e.target.value)}
                  placeholder="Describe el motivo del retiro..." />
              </Field>
            </div>
          )}

          {tipo && (
            <>
              <div style={{ marginBottom: 14 }}>
                <Field label="Fecha de registro">
                  <input type="date" className="crm-input"
                    value={form.fecha_pago} onChange={e => setField('fecha_pago', e.target.value)} />
                </Field>
              </div>
              <div style={{ marginBottom: 20 }}>
                <Field label="Observaciones">
                  <textarea className="crm-input" rows={3} style={{ resize: 'none' }}
                    value={form.observaciones} onChange={e => setField('observaciones', e.target.value)}
                    placeholder="Notas adicionales sobre esta gestión..." />
                </Field>
              </div>
            </>
          )}

          <button className="crm-btn-primary" style={{ width: '100%', justifyContent: 'center' }}
            onClick={onGuardar} disabled={saving || !tipo}>
            {saving ? <><Loader2 size={14} className="animate-spin" /> Guardando...</> : '✓ Guardar gestión'}
          </button>
        </div>

        {/* Historial de cuotas del alumno */}
        {cuotasAlumno.length > 0 && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '14px 20px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              Todas las cuotas de este alumno
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {cuotasAlumno.map(c => (
                <div key={c.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px', borderRadius: 8,
                  background: c.id === cuota.id ? 'rgba(78,143,255,0.1)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${c.id === cuota.id ? 'rgba(78,143,255,0.25)' : 'rgba(255,255,255,0.06)'}`,
                }}>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    Cuota #{c.numero_cuota} · {format(new Date(c.fecha_vence + 'T00:00:00'), 'dd MMM yyyy', { locale: es })}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 600 }}>
                      {c.moneda} {Number(c.monto).toFixed(2)}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                      background: `${ESTADO_COLOR[c.estado]}20`, color: ESTADO_COLOR[c.estado],
                      border: `1px solid ${ESTADO_COLOR[c.estado]}40`,
                    }}>{c.estado}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
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

function InfoItem({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: color || '#e2e8f4' }}>{value}</div>
    </div>
  )
}
