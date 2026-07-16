import { X, Loader2 } from 'lucide-react'
import { CATALOGO_COMPLEMENTOS } from '../../lib/api'

export default function ModalEditarVenta({ editando, alumnos, asesoras, onCampo, onGuardar, onCerrar, guardando }) {
  if (!editando) return null
  const { venta, form } = editando
  const complementoSeleccionado = CATALOGO_COMPLEMENTOS.find(c => c.key === form.complemento)
  const esImpulso = complementoSeleccionado?.tipo === 'impulso'
  const esMentoria = complementoSeleccionado?.tipo === 'mentoria'

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onCerrar()}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>

        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Corregir venta</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {venta.alumno?.nombre || 'Alumno sin vincular'} · registrada el {venta.fecha_registro}
            </div>
          </div>
          <button onClick={onCerrar} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <Field label="Asesora">
              <select className="crm-input" value={form.asesora_id} onChange={e => onCampo('asesora_id', e.target.value)}>
                <option value="">— Sin asignar —</option>
                {asesoras.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </Field>
            <Field label="Fecha de registro">
              <input type="date" className="crm-input" value={form.fecha_registro} onChange={e => onCampo('fecha_registro', e.target.value)} />
            </Field>
          </div>

          <Field label="Alumno">
            <select className="crm-input" value={form.alumno_id} onChange={e => onCampo('alumno_id', e.target.value)}>
              <option value="">— Sin vincular —</option>
              {alumnos.map(a => <option key={a.id} value={a.id}>{a.nombre} — {a.programa}</option>)}
            </select>
          </Field>

          <div style={{ height: 14 }} />
          <Field label="Complemento">
            <select className="crm-input" value={form.complemento} onChange={e => onCampo('complemento', e.target.value)}>
              <option value="">— Seleccionar —</option>
              {CATALOGO_COMPLEMENTOS.map(c => <option key={c.key} value={c.key}>{c.key}</option>)}
            </select>
          </Field>

          <div style={{ height: 14 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <Field label="Valor del producto ($)">
              <input type="number" step="0.01" className="crm-input" value={form.valor_producto} onChange={e => onCampo('valor_producto', e.target.value)} />
            </Field>
            <Field label="Valor de comisión (S/)">
              <input type="number" step="0.01" className="crm-input" value={form.valor_comision} onChange={e => onCampo('valor_comision', e.target.value)} />
            </Field>
          </div>

          {esImpulso && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <Field label="Fecha de inicio">
                <input type="date" className="crm-input" value={form.fecha_inicio} onChange={e => onCampo('fecha_inicio', e.target.value)} />
              </Field>
              <Field label="Fecha de fin">
                <input type="date" className="crm-input" value={form.fecha_fin} onChange={e => onCampo('fecha_fin', e.target.value)} />
              </Field>
            </div>
          )}

          {esMentoria && (
            <Field label="Estado de la mentoría">
              <div style={{ display: 'flex', gap: 8 }}>
                {['Vigente', 'Finalizado'].map(op => (
                  <button key={op} onClick={() => onCampo('estado_mentoria', op)}
                    style={{ flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      background: form.estado_mentoria === op ? 'rgba(101,167,166,0.15)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${form.estado_mentoria === op ? 'rgba(101,167,166,0.4)' : 'rgba(255,255,255,0.08)'}`,
                      color: form.estado_mentoria === op ? 'var(--accent)' : 'var(--text-secondary)' }}>
                    {op}
                  </button>
                ))}
              </div>
            </Field>
          )}

          <div style={{ height: 14 }} />
          <Field label="N° de operación">
            <input className="crm-input" value={form.nro_operacion} onChange={e => onCampo('nro_operacion', e.target.value)} />
          </Field>

          <button className="crm-btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 18 }}
            onClick={onGuardar} disabled={guardando}>
            {guardando ? <><Loader2 size={14} className="animate-spin" /> Guardando...</> : '✓ Guardar corrección'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</label>
      {children}
    </div>
  )
}
