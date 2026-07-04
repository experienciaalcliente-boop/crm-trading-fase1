import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import Select from 'react-select'

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
  noOptionsMessage: (base) => ({ ...base, color: 'var(--text-muted)', background: 'var(--bg-input)' }),
}

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
              <Select styles={rsStyles} options={alumnosOpts} isClearable
                value={alumnosOpts.find(a => a.value === form.alumno_id) || null}
                onChange={opt => setField('alumno_id', opt?.value || '')}
                placeholder="Escribe para buscar un alumno..." noOptionsMessage={() => 'Sin coincidencias'} />
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
