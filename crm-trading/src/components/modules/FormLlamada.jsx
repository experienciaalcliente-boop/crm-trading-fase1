// v-2026-06-20 16:06:13
import Select from 'react-select'

// Estilos inline para React-Select
const rsStyles = {
  control: (base, state) => ({
    ...base,
    background: state.isDisabled ? 'var(--bg-base)' : 'var(--bg-input)',
    border: `1.5px solid ${state.isFocused ? 'var(--accent)' : 'var(--border-input)'}`,
    borderRadius: 8,
    minHeight: 38,
    boxShadow: state.isFocused ? '0 0 0 3px rgba(101,167,166,0.15)' : 'none',
    opacity: state.isDisabled ? 0.45 : 1,
    cursor: state.isDisabled ? 'not-allowed' : 'default',
    '&:hover': { borderColor: state.isDisabled ? 'var(--border-input)' : 'var(--accent)' },
  }),
  menu: (base) => ({
    ...base,
    background: 'var(--bg-input)',
    border: '1.5px solid var(--border-input)',
    borderRadius: 10,
    boxShadow: '0 8px 28px rgba(0,0,0,0.5)',
    zIndex: 9999,
  }),
  menuList: (base) => ({
    ...base,
    background: 'var(--bg-input)',
    borderRadius: 10,
    padding: 4,
  }),
  option: (base, state) => ({
    ...base,
    background: state.isSelected
      ? 'rgba(101,167,166,0.25)'
      : state.isFocused
      ? 'rgba(101,167,166,0.15)'
      : 'var(--bg-input)',
    color: state.isSelected ? 'var(--accent)' : state.isFocused ? 'var(--text-primary)' : 'var(--text-secondary)',
    fontWeight: state.isSelected ? 600 : 400,
    borderRadius: 6,
    fontSize: 13,
    padding: '9px 12px',
    cursor: 'pointer',
  }),
  singleValue: (base) => ({ ...base, color: 'var(--text-primary)', fontWeight: 500 }),
  placeholder: (base) => ({ ...base, color: 'var(--text-muted)' }),
  input: (base) => ({ ...base, color: 'var(--text-primary)' }),
  indicatorSeparator: (base) => ({ ...base, background: 'var(--border-input)' }),
  dropdownIndicator: (base) => ({ ...base, color: 'var(--text-muted)' }),
  clearIndicator: (base) => ({ ...base, color: 'var(--text-muted)' }),
  noOptionsMessage: (base) => ({ ...base, color: 'var(--text-muted)', background: 'var(--bg-input)' }),
}

const SI_NO    = [{ value: 'Sí', label: 'Sí' }, { value: 'No', label: 'No' }]
const SI_NO_NC = [{ value: 'Sí', label: 'Sí' }, { value: 'No', label: 'No' }, { value: 'No corresponde', label: 'No corresponde' }]
const CUENTAS  = [
  { value: 'Demo',     label: 'Demo'     },
  { value: 'Real',     label: 'Real'     },
  { value: 'Fondeo',   label: 'Fondeo'   },
  { value: 'No opera', label: 'No opera' },
]
const FASES = [
  { value: 'Primera fase', label: 'Primera fase' },
  { value: 'Segunda fase', label: 'Segunda fase' },
  { value: 'Aprobado',     label: 'Aprobado'     },
]

const divider = <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '4px 0 16px' }} />

export default function FormLlamada({ state, onAgendarLlamada }) {
  const { form, setField, onAlumnoChange, onProgramaChange, programasOpts, alumnosOpts, asesorasOpts, guardar, limpiar, saving } = state || {}
  if (!form) return null

  const cuenta     = form.cuenta?.value
  const retiro     = form.retiro?.value
  const respondio  = form.respondio?.value

  // Si no contestó → bloquear todos los campos excepto los de identificación
  const bloqueado  = respondio === 'No'

  // Estilo para campos bloqueados
  const inputBloq  = bloqueado ? { opacity: 0.4, pointerEvents: 'none' } : {}

  return (
    <div className="crm-card" style={{ padding: 20, marginBottom: 16 }}>

      {/* Fila 1: Código / Fecha / Respondió */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
        <Field label="Código de registro">
          <input className="crm-input" style={{ fontFamily: 'DM Mono, monospace', color: 'var(--accent)', fontWeight: 600 }} value={form.codigo} readOnly />
        </Field>
        <Field label="Fecha">
          <input type="date" className="crm-input" value={form.fecha} onChange={e => setField('fecha', e.target.value)} />
        </Field>
        <Field label="¿Respondió?">
          <Select styles={rsStyles} options={SI_NO} value={form.respondio} onChange={v => setField('respondio', v)} placeholder="Seleccionar..." isClearable />
        </Field>
      </div>

      {divider}

      {/* Fila 2: Programa / Alumno / Semana */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
        <Field label="Programa">
          <Select styles={rsStyles} options={programasOpts} value={form.programa} onChange={onProgramaChange} placeholder="Seleccionar programa..." isClearable />
        </Field>
        <Field label="Alumno">
          <Select styles={rsStyles} options={alumnosOpts} value={form.alumno} onChange={onAlumnoChange}
            placeholder={form.programa ? 'Buscar alumno...' : 'Primero selecciona programa'}
            isDisabled={!form.programa} isSearchable isClearable noOptionsMessage={() => 'Sin resultados'} />
        </Field>
        <Field label="Semana actual">
          <input className="crm-input" value={form.semana} readOnly placeholder="Auto" />
        </Field>
      </div>

      {/* Fila 3: Asesora / Avance / Mentoría */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
        <Field label="Asesora">
          <Select styles={rsStyles} options={asesorasOpts} value={form.asesora} onChange={v => setField('asesora', v)} placeholder="Seleccionar..." isClearable />
        </Field>

        {/* Campos bloqueados si no contestó */}
        <Field label="Avance del aula (%)">
          <div style={inputBloq}>
            <input type="number" min="0" max="100" className="crm-input"
              value={form.avance} onChange={e => setField('avance', e.target.value)}
              placeholder="0 – 100" disabled={bloqueado} />
          </div>
        </Field>
        <Field label="¿Asistió a mentoría?">
          <div style={inputBloq}>
            <Select styles={rsStyles} options={SI_NO_NC} value={form.mentoria}
              onChange={v => setField('mentoria', v)} placeholder="Seleccionar..."
              isClearable isDisabled={bloqueado} />
          </div>
        </Field>
      </div>

      {divider}

      {/* Cuenta + condicionales — bloqueados si no contestó */}
      <div style={{ ...inputBloq, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
        <Field label="Tipo de cuenta">
          <Select styles={rsStyles} options={CUENTAS} value={form.cuenta}
            onChange={v => setField('cuenta', v)} placeholder="Seleccionar..."
            isClearable isDisabled={bloqueado} />
        </Field>
        {cuenta === 'Real' && !bloqueado && (
          <Field label="Capital en cuenta real (USD)">
            <input type="number" min="0" className="crm-input" value={form.capital_real}
              onChange={e => setField('capital_real', e.target.value)} placeholder="0.00" />
          </Field>
        )}
        {cuenta === 'Fondeo' && !bloqueado && (
          <Field label="Fase de fondeo">
            <Select styles={rsStyles} options={FASES} value={form.fase_fondeo}
              onChange={v => setField('fase_fondeo', v)} placeholder="Seleccionar fase..." isClearable />
          </Field>
        )}
      </div>

      {/* Beneficio + Retiro — bloqueados si no contestó */}
      <div style={{ ...inputBloq, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
        {cuenta !== 'No opera' && (
          <Field label="Beneficio semanal (USD)">
            <input type="number" min="0" className="crm-input" value={form.beneficio}
              onChange={e => setField('beneficio', e.target.value)}
              placeholder="0.00" disabled={bloqueado} />
          </Field>
        )}
        <Field label="¿Realizó retiro?">
          <Select styles={rsStyles} options={SI_NO} value={form.retiro}
            onChange={v => setField('retiro', v)} placeholder="Seleccionar..."
            isClearable isDisabled={bloqueado} />
        </Field>
        {retiro === 'Sí' && !bloqueado && (
          <Field label="Monto retirado (USD)">
            <input type="number" min="0" className="crm-input" value={form.monto_retiro}
              onChange={e => setField('monto_retiro', e.target.value)} placeholder="0.00" />
          </Field>
        )}
      </div>

      {/* Observaciones — siempre disponible */}
      <Field label="Observaciones y compromisos">
        <textarea className="crm-input" rows={4} style={{ resize: 'vertical' }}
          value={form.observaciones} onChange={e => setField('observaciones', e.target.value)}
          placeholder={bloqueado
            ? 'Registra aquí el motivo por el que no contestó, próximo intento...'
            : 'Escribe aquí los compromisos del alumno, situación de la cuenta, próximos pasos...'} />
      </Field>

      {/* Aviso visual cuando está bloqueado */}
      {bloqueado && (
        <div style={{
          marginTop: 12, padding: '10px 14px', borderRadius: 8,
          background: 'rgba(240,92,92,0.08)', border: '1px solid rgba(240,92,92,0.2)',
          fontSize: 12, color: '#f07070', display: 'flex', alignItems: 'center', gap: 8
        }}>
          <span>⚠</span>
          <span>Registro en modo <strong>No contestó</strong> — solo se guardará la observación. Los demás campos están bloqueados.</span>
        </div>
      )}
      {/* Botones de acción */}
      <div style={{ display:'flex', gap:10, marginTop:16 }}>
        <button onClick={limpiar}
          style={{ padding:'9px 18px', borderRadius:8, background:'rgba(255,255,255,0.06)', border:'1px solid var(--border-default)', color:'var(--text-secondary)', cursor:'pointer', fontSize:13, fontWeight:600 }}>
          Limpiar
        </button>
        <button onClick={guardar} disabled={saving}
          style={{ flex:1, padding:'9px 0', borderRadius:8, background: saving ? 'var(--bg-base)' : 'var(--accent)', border:'none', color:'#fff', cursor: saving ? 'not-allowed' : 'pointer', fontSize:13, fontWeight:700 }}>
          {saving ? 'Guardando...' : '✓ Registrar llamada'}
        </button>
      </div>

      {/* Botón agendar llamada — visible cuando hay alumno seleccionado */}
      {onAgendarLlamada && form?.alumno && (
        <button onClick={onAgendarLlamada}
          style={{ marginTop:12, width:'100%', padding:'8px 0', borderRadius:10, cursor:'pointer',
            background:'rgba(124,58,237,0.1)', border:'1px solid rgba(124,58,237,0.25)',
            color:'#b89eff', fontSize:12, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
          📞 Agendar llamada de seguimiento
        </button>
      )}
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
