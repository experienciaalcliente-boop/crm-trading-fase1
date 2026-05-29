import Select from 'react-select'

// Estilos inline para React-Select — evita conflictos con CSS externo
const rsStyles = {
  control: (base, state) => ({
    ...base,
    background: '#1e2840',
    border: `1.5px solid ${state.isFocused ? '#4e8fff' : '#2e3d5c'}`,
    borderRadius: 8,
    minHeight: 38,
    boxShadow: state.isFocused ? '0 0 0 3px rgba(78,143,255,0.15)' : 'none',
    '&:hover': { borderColor: '#4e8fff' },
  }),
  menu: (base) => ({
    ...base,
    background: '#1e2840',
    border: '1.5px solid #2e3d5c',
    borderRadius: 10,
    boxShadow: '0 8px 28px rgba(0,0,0,0.5)',
    zIndex: 9999,
  }),
  menuList: (base) => ({
    ...base,
    background: '#1e2840',
    borderRadius: 10,
    padding: 4,
  }),
  option: (base, state) => ({
    ...base,
    background: state.isSelected
      ? 'rgba(78,143,255,0.25)'
      : state.isFocused
      ? 'rgba(78,143,255,0.15)'
      : '#1e2840',
    color: state.isSelected ? '#7ab3ff' : state.isFocused ? '#ffffff' : '#c8d8f0',
    fontWeight: state.isSelected ? 600 : 400,
    borderRadius: 6,
    fontSize: 13,
    padding: '9px 12px',
    cursor: 'pointer',
  }),
  singleValue: (base) => ({ ...base, color: '#ffffff', fontWeight: 500 }),
  placeholder: (base) => ({ ...base, color: '#506080' }),
  input: (base) => ({ ...base, color: '#ffffff' }),
  indicatorSeparator: (base) => ({ ...base, background: '#2e3d5c' }),
  dropdownIndicator: (base) => ({ ...base, color: '#506080' }),
  clearIndicator: (base) => ({ ...base, color: '#506080' }),
  noOptionsMessage: (base) => ({ ...base, color: '#506080', background: '#1e2840' }),
}

const SI_NO  = [{ value: 'Sí', label: 'Sí' }, { value: 'No', label: 'No' }]
const CUENTAS = [
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

export default function FormLlamada({ form, setField, onAlumnoChange, onProgramaChange, programasOpts, alumnosOpts, asesorasOpts }) {
  const cuenta = form.cuenta?.value
  const retiro = form.retiro?.value

  return (
    <div className="crm-card" style={{ padding: 20, marginBottom: 16 }}>

      {/* Fila 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
        <Field label="Código de registro">
          <input className="crm-input" style={{ fontFamily: 'DM Mono, monospace', color: '#7ab3ff', fontWeight: 600 }} value={form.codigo} readOnly />
        </Field>
        <Field label="Fecha">
          <input type="date" className="crm-input" value={form.fecha} onChange={e => setField('fecha', e.target.value)} />
        </Field>
        <Field label="¿Respondió?">
          <Select styles={rsStyles} options={SI_NO} value={form.respondio} onChange={v => setField('respondio', v)} placeholder="Seleccionar..." isClearable />
        </Field>
      </div>

      {divider}

      {/* Fila 2 */}
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

      {/* Fila 3 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
        <Field label="Asesora">
          <Select styles={rsStyles} options={asesorasOpts} value={form.asesora} onChange={v => setField('asesora', v)} placeholder="Seleccionar..." isClearable />
        </Field>
        <Field label="Avance del aula (%)">
          <input type="number" min="0" max="100" className="crm-input" value={form.avance} onChange={e => setField('avance', e.target.value)} placeholder="0 – 100" />
        </Field>
        <Field label="¿Asistió a mentoría?">
          <Select styles={rsStyles} options={SI_NO} value={form.mentoria} onChange={v => setField('mentoria', v)} placeholder="Seleccionar..." isClearable />
        </Field>
      </div>

      {divider}

      {/* Cuenta + condicionales */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
        <Field label="Tipo de cuenta">
          <Select styles={rsStyles} options={CUENTAS} value={form.cuenta} onChange={v => setField('cuenta', v)} placeholder="Seleccionar..." isClearable />
        </Field>
        {cuenta === 'Real' && (
          <Field label="Capital en cuenta real (USD)">
            <input type="number" min="0" className="crm-input" value={form.capital_real} onChange={e => setField('capital_real', e.target.value)} placeholder="0.00" />
          </Field>
        )}
        {cuenta === 'Fondeo' && (
          <Field label="Fase de fondeo">
            <Select styles={rsStyles} options={FASES} value={form.fase_fondeo} onChange={v => setField('fase_fondeo', v)} placeholder="Seleccionar fase..." isClearable />
          </Field>
        )}
      </div>

      {/* Beneficio + Retiro */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
        {cuenta !== 'No opera' && (
          <Field label="Beneficio semanal (USD)">
            <input type="number" min="0" className="crm-input" value={form.beneficio} onChange={e => setField('beneficio', e.target.value)} placeholder="0.00" />
          </Field>
        )}
        <Field label="¿Realizó retiro?">
          <Select styles={rsStyles} options={SI_NO} value={form.retiro} onChange={v => setField('retiro', v)} placeholder="Seleccionar..." isClearable />
        </Field>
        {retiro === 'Sí' && (
          <Field label="Monto retirado (USD)">
            <input type="number" min="0" className="crm-input" value={form.monto_retiro} onChange={e => setField('monto_retiro', e.target.value)} placeholder="0.00" />
          </Field>
        )}
      </div>

      {/* Observaciones */}
      <Field label="Observaciones y compromisos">
        <textarea className="crm-input" rows={4} style={{ resize: 'vertical' }}
          value={form.observaciones} onChange={e => setField('observaciones', e.target.value)}
          placeholder="Escribe aquí los compromisos del alumno, situación de la cuenta, próximos pasos..." />
      </Field>
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
