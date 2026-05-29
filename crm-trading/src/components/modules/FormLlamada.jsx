import Select from 'react-select'
import { format } from 'date-fns'

const SI_NO = [{ value: 'Sí', label: 'Sí' }, { value: 'No', label: 'No' }]
const CUENTAS = [
  { value: 'Demo',     label: 'Demo' },
  { value: 'Real',     label: 'Real' },
  { value: 'Fondeo',   label: 'Fondeo' },
  { value: 'No opera', label: 'No opera' },
  { value: 'Balance',  label: 'Balance' },
]
const FASES = [
  { value: 'Primera fase',  label: 'Primera fase' },
  { value: 'Segunda fase',  label: 'Segunda fase' },
  { value: 'Aprobado',      label: 'Aprobado' },
]

export default function FormLlamada({
  form, setField, onAlumnoChange, onProgramaChange,
  programasOpts, alumnosOpts, asesorasOpts,
}) {
  const cuenta  = form.cuenta?.value
  const retiro  = form.retiro?.value
  const showBeneficio = cuenta !== 'No opera'
  const showCapital   = cuenta === 'Real'
  const showFondeo    = cuenta === 'Fondeo'
  const showMonto     = retiro === 'Sí'

  return (
    <div className="crm-card p-5 mb-5 animate-fadeUp">
      {/* ── FILA 1: Código / Fecha / Respondió ── */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="crm-field">
          <label className="crm-label">Código de registro</label>
          <input
            className="crm-input font-mono text-brand"
            value={form.codigo}
            readOnly
          />
        </div>
        <div className="crm-field">
          <label className="crm-label">Fecha</label>
          <input
            type="date"
            className="crm-input"
            value={form.fecha}
            onChange={e => setField('fecha', e.target.value)}
          />
        </div>
        <div className="crm-field">
          <label className="crm-label">¿Respondió?</label>
          <Select
            classNamePrefix="rs"
            options={SI_NO}
            value={form.respondio}
            onChange={v => setField('respondio', v)}
            placeholder="Seleccionar..."
            isClearable
          />
        </div>
      </div>

      <div className="h-px bg-line mb-5" />

      {/* ── FILA 2: Programa / Alumno / Semana ── */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="crm-field">
          <label className="crm-label">Programa</label>
          <Select
            classNamePrefix="rs"
            options={programasOpts}
            value={form.programa}
            onChange={onProgramaChange}
            placeholder="Seleccionar programa..."
            isClearable
          />
        </div>
        <div className="crm-field">
          <label className="crm-label">Alumno</label>
          <Select
            classNamePrefix="rs"
            options={alumnosOpts}
            value={form.alumno}
            onChange={onAlumnoChange}
            placeholder={form.programa ? 'Buscar alumno...' : 'Primero selecciona programa'}
            isDisabled={!form.programa}
            isSearchable
            isClearable
            noOptionsMessage={() => 'Sin resultados'}
          />
        </div>
        <div className="crm-field">
          <label className="crm-label">Semana actual</label>
          <input
            className="crm-input"
            value={form.semana}
            readOnly
            placeholder="Auto"
          />
        </div>
      </div>

      {/* ── FILA 3: Asesora / Avance / Mentoría ── */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="crm-field">
          <label className="crm-label">Asesora</label>
          <Select
            classNamePrefix="rs"
            options={asesorasOpts}
            value={form.asesora}
            onChange={v => setField('asesora', v)}
            placeholder="Seleccionar..."
            isClearable
          />
        </div>
        <div className="crm-field">
          <label className="crm-label">Avance del aula (%)</label>
          <input
            type="number"
            min="0" max="100"
            className="crm-input"
            value={form.avance}
            onChange={e => setField('avance', e.target.value)}
            placeholder="0 – 100"
          />
        </div>
        <div className="crm-field">
          <label className="crm-label">¿Asistió a mentoría?</label>
          <Select
            classNamePrefix="rs"
            options={SI_NO}
            value={form.mentoria}
            onChange={v => setField('mentoria', v)}
            placeholder="Seleccionar..."
            isClearable
          />
        </div>
      </div>

      <div className="h-px bg-line mb-4" />

      {/* ── FILA 4: Cuenta + campos condicionales ── */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="crm-field">
          <label className="crm-label">Tipo de cuenta</label>
          <Select
            classNamePrefix="rs"
            options={CUENTAS}
            value={form.cuenta}
            onChange={v => setField('cuenta', v)}
            placeholder="Seleccionar..."
            isClearable
          />
        </div>

        {showCapital && (
          <div className="crm-field">
            <label className="crm-label">Capital en cuenta real (USD)</label>
            <input
              type="number"
              min="0"
              className="crm-input"
              value={form.capital_real}
              onChange={e => setField('capital_real', e.target.value)}
              placeholder="0.00"
            />
          </div>
        )}

        {showFondeo && (
          <div className="crm-field">
            <label className="crm-label">Fase de fondeo</label>
            <Select
              classNamePrefix="rs"
              options={FASES}
              value={form.fase_fondeo}
              onChange={v => setField('fase_fondeo', v)}
              placeholder="Seleccionar fase..."
              isClearable
            />
          </div>
        )}
      </div>

      {/* ── FILA 5: Beneficio / Retiro / Monto ── */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {showBeneficio && (
          <div className="crm-field">
            <label className="crm-label">Beneficio semanal (USD)</label>
            <input
              type="number"
              min="0"
              className="crm-input"
              value={form.beneficio}
              onChange={e => setField('beneficio', e.target.value)}
              placeholder="0.00"
            />
          </div>
        )}
        <div className="crm-field">
          <label className="crm-label">¿Realizó retiro?</label>
          <Select
            classNamePrefix="rs"
            options={SI_NO}
            value={form.retiro}
            onChange={v => setField('retiro', v)}
            placeholder="Seleccionar..."
            isClearable
          />
        </div>
        {showMonto && (
          <div className="crm-field">
            <label className="crm-label">Monto retirado (USD)</label>
            <input
              type="number"
              min="0"
              className="crm-input"
              value={form.monto_retiro}
              onChange={e => setField('monto_retiro', e.target.value)}
              placeholder="0.00"
            />
          </div>
        )}
      </div>

      {/* ── Observaciones ── */}
      <div className="crm-field">
        <label className="crm-label">Observaciones y compromisos</label>
        <textarea
          className="crm-input resize-none"
          rows={4}
          value={form.observaciones}
          onChange={e => setField('observaciones', e.target.value)}
          placeholder="Escribe aquí los compromisos del alumno, situación de la cuenta, próximos pasos..."
        />
      </div>
    </div>
  )
}
