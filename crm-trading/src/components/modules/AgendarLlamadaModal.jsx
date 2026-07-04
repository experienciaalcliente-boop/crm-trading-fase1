import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'

const FORM_INICIAL = { alumno_id: '', fecha: new Date().toISOString().split('T')[0], hora: '', motivo: '' }

export default function AgendarLlamadaModal({ onGuardar, onCerrar, alumnos = [], asesoraId, preAlumnoId, llamadaExistente }) {
  const editando = !!llamadaExistente
  const [form, setForm] = useState(editando ? {
    alumno_id: llamadaExistente.alumno_id,
    fecha: llamadaExistente.fecha,
    hora: llamadaExistente.hora?.slice(0, 5) || '',
    motivo: llamadaExistente.motivo || '',
  } : { ...FORM_INICIAL, alumno_id: preAlumnoId || '' })
  const [saving, setSaving] = useState(false)
  const alumnosOpts = alumnos.map(a => ({ value: a.id, label: a.nombre }))

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const guardar = async () => {
    if (!form.alumno_id) return
    if (!form.fecha || !form.hora) return
    setSaving(true)
    try {
      if (editando) {
        await onGuardar(llamadaExistente.id, {
          alumno_id: form.alumno_id,
          fecha: form.fecha,
          hora: form.hora,
          motivo: form.motivo || null,
        })
      } else {
        await onGuardar({
          alumno_id: form.alumno_id,
          asesora_id: asesoraId || null,
          fecha: form.fecha,
          hora: form.hora,
          motivo: form.motivo || null,
          estado: 'Pendiente',
        })
      }
      onCerrar()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={e => e.target === e.currentTarget && onCerrar()}>
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-default)', borderRadius:14, width:'100%', maxWidth:420, boxShadow:'0 20px 60px rgba(0,0,0,0.6)' }}>

        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border-default)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)' }}>{editando ? 'Editar llamada' : 'Agendar llamada'}</div>
          <button onClick={onCerrar} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer' }}><X size={18} /></button>
        </div>

        <div style={{ padding:20, display:'flex', flexDirection:'column', gap:14 }}>
          {!preAlumnoId && (
            <Field label="Alumno">
              <select className="crm-input" value={form.alumno_id} onChange={e => setField('alumno_id', e.target.value)}>
                <option value="">— Seleccionar alumno —</option>
                {alumnosOpts.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </Field>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Fecha">
              <input type="date" className="crm-input" value={form.fecha}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => setField('fecha', e.target.value)} />
            </Field>
            <Field label="Hora">
              <input type="time" className="crm-input" value={form.hora}
                onChange={e => setField('hora', e.target.value)} />
            </Field>
          </div>

          <Field label="Motivo (opcional)">
            <input className="crm-input" value={form.motivo}
              onChange={e => setField('motivo', e.target.value)}
              placeholder="Ej: Seguimiento de avance, confirmar pago..." />
          </Field>

          <button className="crm-btn-primary" style={{ width:'100%', justifyContent:'center', marginTop:4 }}
            onClick={guardar} disabled={saving || !form.alumno_id || !form.fecha || !form.hora}>
            {saving ? <><Loader2 size={14} className="animate-spin" /> Guardando...</> : editando ? '✓ Guardar cambios' : '📞 Agendar llamada'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
      <label style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em' }}>{label}</label>
      {children}
    </div>
  )
}
