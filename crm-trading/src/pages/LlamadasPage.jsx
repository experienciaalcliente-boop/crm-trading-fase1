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
    <div className="flex items-center justify-center h-full gap-3" style={{ color: '#a0acc4' }}>
      <Loader2 size={18} className="animate-spin" />
      <span style={{ fontSize: 13 }}>Cargando datos...</span>
    </div>
  )

  const hoy = format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es })

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Columna principal */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24, minWidth: 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#1a2035', fontSize: 20 }}>Registro de llamadas</h1>
            <p style={{ fontSize: 13, color: '#8896b4', textTransform: 'capitalize', marginTop: 3 }}>{hoy}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="crm-btn crm-btn-sm" onClick={state.limpiar}>↺ Limpiar</button>
            <button className="crm-btn-primary crm-btn-sm" onClick={state.guardar} disabled={state.saving}>
              {state.saving ? <Loader2 size={13} className="animate-spin" /> : '✓'}
              Guardar registro
            </button>
          </div>
        </div>
        <FormLlamada {...state} />
        <HistorialAlumno historial={state.historial} alumno={state.form.alumno} />
      </div>
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
