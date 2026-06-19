import { X, Loader2 } from 'lucide-react'

const TIPOS = [
  { value: 'pago_pendiente',       label: 'Pago pendiente' },
  { value: 'envio_documento',      label: 'Envío de documento' },
  { value: 'revision_contenido',   label: 'Revisión de contenido' },
  { value: 'llamada_programada',   label: 'Llamada programada' },
  { value: 'completar_onboarding', label: 'Completar onboarding' },
  { value: 'otro',                 label: 'Otro' },
]

export default function CompromisosModal({ form, setField, onGuardar, onCerrar, saving, alumnos = [] }) {
  const alumnosOpts = alumnos.map(a => ({ value: a.id, label: a.nombre }))

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={e => e.target === e.currentTarget && onCerrar()}>
      <div style={{ background:'#151c2c', border:'1px solid rgba(255,255,255,0.1)', borderRadius:14, width:'100%', maxWidth:460, boxShadow:'0 20px 60px rgba(0,0,0,0.6)' }}>

        {/* Header */}
        <div style={{ padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ fontSize:14, fontWeight:700, color:'#e2e8f4' }}>Registrar compromiso</div>
          <button onClick={onCerrar} style={{ background:'none', border:'none', color:'#506080', cursor:'pointer' }}><X size={18} /></button>
        </div>

        <div style={{ padding:20, display:'flex', flexDirection:'column', gap:14 }}>

          {/* Alumno (si no viene preseleccionado) */}
          {!form.alumno_id && (
            <Field label="Alumno">
              <select className="crm-input" value={form.alumno_id || ''} onChange={e => setField('alumno_id', e.target.value)}>
                <option value="">— Seleccionar alumno —</option>
                {alumnosOpts.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </Field>
          )}

          {/* Descripción */}
          <Field label="Descripción del compromiso">
            <textarea className="crm-input" rows={3} style={{ resize:'none' }}
              value={form.descripcion} onChange={e => setField('descripcion', e.target.value)}
              placeholder="¿Qué se acordó? Ej: El alumno depositará el viernes..." />
          </Field>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {/* Tipo */}
            <Field label="Tipo">
              <select className="crm-input" value={form.tipo} onChange={e => setField('tipo', e.target.value)}>
                {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>

            {/* Responsable */}
            <Field label="Responsable del cumplimiento">
              <div style={{ display:'flex', gap:6 }}>
                {[['alumno','Alumno'],['asesora','Asesora']].map(([v, l]) => (
                  <button key={v} onClick={() => setField('responsable', v)}
                    style={{ flex:1, padding:'7px 0', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer',
                      background: form.responsable === v ? 'rgba(78,143,255,0.15)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${form.responsable === v ? 'rgba(78,143,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
                      color: form.responsable === v ? '#7ab3ff' : '#9aaccb' }}>
                    {l}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          {/* Fecha límite */}
          <Field label="Fecha límite de cumplimiento">
            <input type="date" className="crm-input" value={form.fecha_limite}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => setField('fecha_limite', e.target.value)} />
          </Field>

          {/* Observaciones */}
          <Field label="Observaciones (opcional)">
            <input className="crm-input" value={form.observaciones}
              onChange={e => setField('observaciones', e.target.value)}
              placeholder="Contexto adicional..." />
          </Field>

          <button className="crm-btn-primary" style={{ width:'100%', justifyContent:'center', marginTop:4 }}
            onClick={onGuardar} disabled={saving}>
            {saving ? <><Loader2 size={14} className="animate-spin" /> Guardando...</> : '✓ Registrar compromiso'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
      <label style={{ fontSize:10, fontWeight:700, color:'#7a8aaa', textTransform:'uppercase', letterSpacing:'0.08em' }}>{label}</label>
      {children}
    </div>
  )
}
