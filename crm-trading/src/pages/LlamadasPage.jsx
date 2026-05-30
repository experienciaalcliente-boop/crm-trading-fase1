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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, color: '#506080' }}>
      <Loader2 size={18} className="animate-spin" />
      <span style={{ fontSize: 13 }}>Cargando datos...</span>
    </div>
  )

  const hoy = format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es })

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Columna principal */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#e2e8f4', fontSize: 20 }}>
              Registro de llamadas
            </h1>
            <p style={{ fontSize: 13, color: '#506080', textTransform: 'capitalize', marginTop: 3 }}>{hoy}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="crm-btn crm-btn-sm" onClick={state.limpiar}>↺ Limpiar</button>
            <button className="crm-btn-primary crm-btn-sm" onClick={state.guardar} disabled={state.saving}>
              {state.saving ? <Loader2 size={13} className="animate-spin" /> : '✓'}
              Guardar registro
            </button>
          </div>
        </div>

        {/* Formulario */}
        <FormLlamada {...state} />

        {/* Historial — automático según alumno seleccionado arriba */}
        <HistorialAlumno 
          historial={state.historial} 
          alumno={state.form.alumno}
          onRefresh={() => state.form.alumno && state.recargarHistorial(state.form.alumno.value)}
        />
      </div>

      {/* Panel derecho — solo asesoras de llamadas */}
      <PanelDerecho
        asesoras={state.asesorasForm}
        asesorasPanelOpts={state.asesorasPanelOpts}
        registrosHoy={state.registrosHoy}
        stats={state.stats}
        asesoraPanel={state.asesoraPanel}
        setAsesoraPanel={state.setAsesoraPanel}
      />
    </div>
  )
}
