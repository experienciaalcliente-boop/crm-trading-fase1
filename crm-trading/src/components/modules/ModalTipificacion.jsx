import { X, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const ESTADOS = [
  { value: 'Concretada',    label: '✓ Se concretó',      color: '#2dd4a0' },
  { value: 'Reprogramada',  label: '📅 Reprogramada',     color: '#f5b93a' },
  { value: 'No se conectó', label: '✗ No se conectó',    color: '#f07070' },
]

const CHECK_ITEMS = [
  { key: 'tiene_mt5',           label: 'MT5' },
  { key: 'tiene_tradingview',   label: 'TradingView' },
  { key: 'tiene_broker',        label: 'Broker' },
  { key: 'tiene_ingreso_trade', label: 'Ingreso de trade' },
]

export default function ModalTipificacion({ sesion, form, setField, onGuardar, onCerrar, saving }) {
  const esConcretada   = form.estado === 'Concretada'
  const esReprogramada = form.estado === 'Reprogramada'

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onCerrar()}>
      <div style={{ background: '#151c2c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f4' }}>Tipificar sesión</div>
            <div style={{ fontSize: 11, color: '#506080', marginTop: 2 }}>
              {sesion.alumno?.nombre} · {format(new Date(sesion.fecha + 'T00:00:00'), 'dd MMM yyyy', { locale: es })} · {sesion.hora_inicio?.slice(0,5)}
            </div>
          </div>
          <button onClick={onCerrar} style={{ background: 'none', border: 'none', color: '#506080', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 20 }}>

          {/* Resultado */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: '#7a8aaa', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
              Resultado de la sesión
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {ESTADOS.map(e => (
                <button key={e.value} onClick={() => setField('estado', e.value)}
                  style={{
                    flex: 1, padding: '9px 8px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center',
                    background: form.estado === e.value ? `${e.color}20` : 'rgba(255,255,255,0.04)',
                    border: `1.5px solid ${form.estado === e.value ? e.color : 'rgba(255,255,255,0.08)'}`,
                    color: form.estado === e.value ? e.color : '#7a8aaa',
                  }}>
                  {e.label}
                </button>
              ))}
            </div>
          </div>

          {/* Si se concretó */}
          {esConcretada && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <Field label="País del alumno">
                  <input className="crm-input" value={form.pais}
                    onChange={e => setField('pais', e.target.value)} placeholder="Ej: Perú, Colombia..." />
                </Field>
                <Field label="Bróker utilizado">
                  <input className="crm-input" value={form.broker}
                    onChange={e => setField('broker', e.target.value)} placeholder="Ej: ICMarkets, XM..." />
                </Field>
              </div>

              {/* Checkboxes herramientas */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#7a8aaa', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 10 }}>
                  Herramientas verificadas
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {CHECK_ITEMS.map(({ key, label }) => (
                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
                      background: form[key] ? 'rgba(34,201,142,0.1)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${form[key] ? 'rgba(34,201,142,0.3)' : 'rgba(255,255,255,0.08)'}` }}>
                      <input type="checkbox" checked={form[key]}
                        onChange={e => setField(key, e.target.checked)}
                        style={{ width: 16, height: 16, accentColor: '#2dd4a0', cursor: 'pointer' }} />
                      <span style={{ fontSize: 13, fontWeight: 500, color: form[key] ? '#2dd4a0' : '#9aaccb' }}>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <Field label="Preguntas adicionales del alumno">
                  <textarea className="crm-input" rows={2} style={{ resize: 'none' }}
                    value={form.preguntas_adicionales}
                    onChange={e => setField('preguntas_adicionales', e.target.value)}
                    placeholder="¿Qué preguntas hizo el alumno durante la sesión?" />
                </Field>
              </div>
            </>
          )}

          {/* Si fue reprogramada */}
          {esReprogramada && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <Field label="Nueva fecha">
                <input type="date" className="crm-input" value={form.nueva_fecha}
                  onChange={e => setField('nueva_fecha', e.target.value)} />
              </Field>
              <Field label="Nueva hora">
                <input type="time" className="crm-input" value={form.nueva_hora}
                  onChange={e => setField('nueva_hora', e.target.value)} />
              </Field>
            </div>
          )}

          {/* Observaciones — siempre */}
          {form.estado && (
            <div style={{ marginBottom: 20 }}>
              <Field label="Observaciones">
                <textarea className="crm-input" rows={3} style={{ resize: 'none' }}
                  value={form.observaciones}
                  onChange={e => setField('observaciones', e.target.value)}
                  placeholder="Notas adicionales sobre la sesión..." />
              </Field>
            </div>
          )}

          <button className="crm-btn-primary" style={{ width: '100%', justifyContent: 'center' }}
            onClick={onGuardar} disabled={saving || !form.estado}>
            {saving ? <><Loader2 size={14} className="animate-spin" /> Guardando...</> : '✓ Guardar tipificación'}
          </button>
        </div>
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
