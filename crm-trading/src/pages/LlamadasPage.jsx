import { useLlamadas } from '../hooks/useLlamadas'
import FormLlamada from '../components/modules/FormLlamada'
import HistorialAlumno from '../components/modules/HistorialAlumno'
import PanelDerecho from '../components/modules/PanelDerecho'
import { Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function LlamadasPage() {
  const state = useLlamadas()

  if (state.loading) return (
    <div className="flex items-center justify-center h-full gap-3 text-muted">
      <Loader2 size={18} className="animate-spin" />
      <span className="text-sm">Cargando datos...</span>
    </div>
  )

  const hoy = format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es })

  return (
    <div className="flex h-full">
      {/* ── COLUMNA PRINCIPAL ── */}
      <div className="flex-1 overflow-y-auto p-6 min-w-0">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="font-display font-bold text-white text-xl">Registro de llamadas</h1>
            <p className="text-sm text-muted capitalize mt-0.5">{hoy}</p>
          </div>
          <div className="flex gap-2">
            <button className="crm-btn crm-btn-sm" onClick={state.limpiar}>
              ↺ Limpiar
            </button>
            <button
              className="crm-btn-primary crm-btn-sm"
              onClick={state.guardar}
              disabled={state.saving}
            >
              {state.saving ? <Loader2 size={13} className="animate-spin" /> : '✓'}
              Guardar registro
            </button>
          </div>
        </div>

        {/* Formulario */}
        <FormLlamada {...state} />

        {/* Historial */}
        <HistorialAlumno historial={state.historial} alumno={state.form.alumno} />
      </div>

      {/* ── PANEL DERECHO ── */}
      <PanelDerecho
        asesoras={state.asesoras}
        registrosHoy={state.registrosHoy}
        stats={state.stats}
        asesoraPanel={state.asesoraPanel}
        setAsesoraPanel={state.setAsesoraPanel}
      />
    </div>
  )
}
