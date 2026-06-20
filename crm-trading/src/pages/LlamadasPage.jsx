// v-2026-06-20 16:06:13
import { useLlamadas } from '../hooks/useLlamadas'
import { useCompromisos } from '../hooks/useCompromisos'
import FormLlamada from '../components/modules/FormLlamada'
import HistorialAlumno from '../components/modules/HistorialAlumno'
import PanelDerecho from '../components/modules/PanelDerecho'
import CompromisosPanel from '../components/modules/CompromisosPanel'
import CompromisosModal from '../components/modules/CompromisosModal'

export default function LlamadasPage() {
  try {
    return <LlamadasPageInner />
  } catch(e) {
    console.error('LlamadasPage crash:', e)
    return <div style={{padding:24, color:'#f07070'}}>Error: {e.message}</div>
  }
}

function LlamadasPageInner() {
  const state = useLlamadas()
  const comp  = useCompromisos()

  const handleNuevoCompromiso = () => {
    comp.abrirModal({
      alumno_id:  state.form.alumno?.value || null,
      asesora_id: state.form.asesora?.value || null,
    })
  }

  if (!state) return null

  return (
    <div style={{ display:'flex', height:'100%' }}>

      {/* ── Columna principal ── */}
      <div style={{ flex:1, overflowY:'auto', padding:24, minWidth:0 }}>
        <div style={{ marginBottom:20 }}>
          <h1 style={{ fontFamily:'Syne, sans-serif', fontWeight:700, color:'#e2e8f4', fontSize:20 }}>Registro de Llamadas</h1>
          <p style={{ fontSize:13, color:'#506080', textTransform:'capitalize', marginTop:3 }}>
            {new Date().toLocaleDateString('es-PE', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
          </p>
        </div>
        <FormLlamada state={state} onNuevoCompromiso={handleNuevoCompromiso} />
        <HistorialAlumno
          historial={state.historial}
          alumno={state.form.alumno}
          onRefresh={() => state.form.alumno && state.recargarHistorial(state.form.alumno.value)}
        />
      </div>

      {/* ── Panel derecho: pendientes + compromisos ── */}
      <div style={{ width:288, flexShrink:0, borderLeft:'1px solid rgba(255,255,255,0.07)', background:'#0f1520', display:'flex', flexDirection:'column' }}>

        {/* Mitad superior: pendientes sin respuesta */}
        <div style={{ flex:1, minHeight:0, overflowY:'auto', borderBottom:'1px solid rgba(255,255,255,0.1)' }}>
          <PanelDerecho
            asesoras={state.asesorasForm}
            asesorasPanelOpts={state.asesorasPanelOpts}
            registrosHoy={state.registrosHoy}
            stats={state.stats}
            asesoraPanel={state.asesoraPanel}
            setAsesoraPanel={state.setAsesoraPanel}
            onSeleccionarAlumno={state.seleccionarDesdePanelDerecho}
          />
        </div>

        {/* Mitad inferior: compromisos */}
        <div style={{ flex:1, minHeight:0, overflowY:'auto' }}>
          <CompromisosPanel
            compromisos={comp.compromisos}
            vencidosSinCerrar={comp.vencidosSinCerrar}
            vencenHoy={comp.vencenHoy}
            proximos3={comp.proximos3}
            onCerrar={comp.cerrarCompromiso}
            onNuevo={handleNuevoCompromiso}
            loading={comp.loading}
          />
        </div>
      </div>

      {/* Modal de nuevo compromiso */}
      {comp.modalAbierto && (
        <CompromisosModal
          form={comp.form}
          setField={comp.setField}
          onGuardar={comp.guardar}
          onCerrar={comp.cerrarModal}
          saving={comp.saving}
          alumnos={state.alumnos}
        />
      )}
    </div>
  )
}
