import Select from 'react-select'

const SI_NO  = [{ value: 'Sí', label: 'Sí' }, { value: 'No', label: 'No' }]
const CUENTAS = [
  { value: 'Demo',     label: 'Demo'     },
  { value: 'Real',     label: 'Real'     },
  { value: 'Fondeo',   label: 'Fondeo'   },
  { value: 'No opera', label: 'No opera' },
  { value: 'Balance',  label: 'Balance'  },
]
const FASES = [
  { value: 'Primera fase', label: 'Primera fase' },
  { value: 'Segunda fase', label: 'Segunda fase' },
  { value: 'Aprobado',     label: 'Aprobado'     },
]

const divider = <div style={{ height: 1, background: '#e4e9f2', margin: '4px 0 16px' }} />

export default function FormLlamada({ form, setField, onAlumnoChange, onProgramaChange, programasOpts, alumnosOpts, asesorasOpts }) {
  const cuenta = form.cuenta?.value
  const retiro = form.retiro?.value

  return (
    <div className="crm-card" style={{ padding: 20, marginBottom: 16 }}>

      {/* Sección 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
        <Field label="Código de registro">
          <input className="crm-input" style={{ fontFamily: 'DM Mono, monospace', color: '#2563eb', fontWeight: 600 }} value={form.codigo} readOnly />
        </Field>
        <Field label="Fecha">
          <input type="date" className="crm-input" value={form.fecha} onChange={e => setField('fecha', e.target.value)} />
        </Field>
        <Field label="¿Respondió?">
          <Select classNamePrefix="rs" options={SI_NO} value={form.respondio} onChange={v => setField('respondio', v)} placeholder="Seleccionar..." isClearable />
        </Field>
      </div>

      {divider}

      {/* Sección 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
        <Field label="Programa">
          <Select classNamePrefix="rs" options={programasOpts} value={form.programa} onChange={onProgramaChange} placeholder="Seleccionar programa..." isClearable />
        </Field>
        <Field label="Alumno">
          <Select classNamePrefix="rs" options={alumnosOpts} value={form.alumno} onChange={onAlumnoChange}
            placeholder={form.programa ? 'Buscar alumno...' : 'Primero selecciona programa'}
            isDisabled={!form.programa} isSearchable isClearable noOptionsMessage={() => 'Sin resultados'} />
        </Field>
        <Field label="Semana actual">
          <input className="crm-input" value={form.semana} readOnly placeholder="Auto" />
        </Field>
      </div>

      {/* Sección 3 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
        <Field label="Asesora">
          <Select classNamePrefix="rs" options={asesorasOpts} value={form.asesora} onChange={v => setField('asesora', v)} placeholder="Seleccionar..." isClearable />
        </Field>
        <Field label="Avance del aula (%)">
          <input type="number" min="0" max="100" className="crm-input" value={form.avance} onChange={e => setField('avance', e.target.value)} placeholder="0 – 100" />
        </Field>
        <Field label="¿Asistió a mentoría?">
          <Select classNamePrefix="rs" options={SI_NO} value={form.mentoria} onChange={v => setField('mentoria', v)} placeholder="Seleccionar..." isClearable />
        </Field>
      </div>

      {divider}

      {/* Cuenta + condicionales */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
        <Field label="Tipo de cuenta">
          <Select classNamePrefix="rs" options={CUENTAS} value={form.cuenta} onChange={v => setField('cuenta', v)} placeholder="Seleccionar..." isClearable />
        </Field>
        {cuenta === 'Real' && (
          <Field label="Capital en cuenta real (USD)">
            <input type="number" min="0" className="crm-input" value={form.capital_real} onChange={e => setField('capital_real', e.target.value)} placeholder="0.00" />
          </Field>
        )}
        {cuenta === 'Fondeo' && (
          <Field label="Fase de fondeo">
            <Select classNamePrefix="rs" options={FASES} value={form.fase_fondeo} onChange={v => setField('fase_fondeo', v)} placeholder="Seleccionar fase..." isClearable />
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
          <Select classNamePrefix="rs" options={SI_NO} value={form.retiro} onChange={v => setField('retiro', v)} placeholder="Seleccionar..." isClearable />
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
      <label style={{ fontSize: 10, fontWeight: 700, color: '#8896b4', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</label>
      {children}
    </div>
  )
}
