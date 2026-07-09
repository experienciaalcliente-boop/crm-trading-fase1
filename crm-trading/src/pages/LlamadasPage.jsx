// v-2026-06-20 16:06:13
import { useState } from 'react'
import { useLlamadas } from '../hooks/useLlamadas'
import { useLlamadasProgramadas } from '../context/LlamadasProgramadasContext'
import { useAuth } from '../context/AuthContext'
import FormLlamada from '../components/modules/FormLlamada'
import HistorialAlumno from '../components/modules/HistorialAlumno'
import PanelDerecho from '../components/modules/PanelDerecho'
import LlamadasProgramadasPanel from '../components/modules/LlamadasProgramadasPanel'
import AgendarLlamadaModal from '../components/modules/AgendarLlamadaModal'
import EfectividadDiariaAsesoras from '../components/modules/EfectividadDiariaAsesoras'

export default function LlamadasPage() {
  try {
    return <LlamadasPageInner />
  } catch(e) {
    console.error('LlamadasPage crash:', e)
    return <div style={{padding:24, color:'#f07070'}}>Error: {e.message}</div>
  }
}

// Encuesta de satisfacción de la asesora (mes actual, solo sus programas) —
// vive acá porque es el detalle de "asesoría académica"; el resumen
// ejecutivo combinado sigue en el Dashboard.
function EncuestaPropia({ encuesta, comentarios }) {
  return (
    <div style={{ marginTop:20, marginBottom:20 }}>
      <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>Encuesta de satisfacción (mes actual)</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        <div className="crm-card" style={{ padding:18, textAlign:'center' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>NPS</div>
          {encuesta.total > 0 ? (
            <>
              <div style={{ fontSize:28, fontWeight:700, color:'var(--text-primary)', fontFamily:'Syne,sans-serif' }}>{encuesta.nps}%</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:6 }}>{encuesta.total} respuestas</div>
            </>
          ) : <div style={{ fontSize:13, color:'var(--text-muted)', padding:'12px 0' }}>Sin datos aún este mes</div>}
        </div>
        <div className="crm-card" style={{ padding:18, textAlign:'center' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>SAT</div>
          {encuesta.total > 0 ? (
            <>
              <div style={{ fontSize:28, fontWeight:700, color:'#2dd4a0', fontFamily:'Syne,sans-serif' }}>{encuesta.csat}%</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:6 }}>{encuesta.total} respuestas</div>
            </>
          ) : <div style={{ fontSize:13, color:'var(--text-muted)', padding:'12px 0' }}>Sin datos aún este mes</div>}
        </div>
      </div>
      <div className="crm-card" style={{ padding:18 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>Comentarios de tus alumnos</div>
        {comentarios.length === 0 ? (
          <div style={{ fontSize:13, color:'var(--text-muted)', padding:'10px 0' }}>Sin comentarios este mes</div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10, maxHeight:240, overflowY:'auto' }}>
            {comentarios.map((c, i) => (
              <div key={i} style={{ padding:'10px 12px', background:'rgba(255,255,255,0.03)', borderRadius:8, borderLeft:'3px solid #f5b93a' }}>
                <div style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.4 }}>"{c.comentario}"</div>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:6 }}>
                  {c.programa || 'Sin programa'} · {c.fecha ? new Date(c.fecha).toLocaleDateString('es-PE') : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function LlamadasPageInner() {
  const { user } = useAuth()
  // El supervisor no registra llamadas — necesita monitoreo diario de sus
  // asesoras, no el formulario de captura. Se separa en un componente propio
  // para no llamar a useLlamadas() (fetches de alumnos/form) sin necesidad.
  if (user?.rol === 'supervisor') return <EfectividadDiariaAsesoras />
  return <RegistroLlamadasAsesora />
}

function RegistroLlamadasAsesora() {
  const state = useLlamadas()
  const lp = useLlamadasProgramadas()
  const { user } = useAuth()
  const [modalAbierto, setModalAbierto] = useState(false)
  const [preAlumnoId, setPreAlumnoId] = useState(null)
  const [llamadaEnEdicion, setLlamadaEnEdicion] = useState(null)

  const abrirModalAgendar = (alumnoId) => {
    setLlamadaEnEdicion(null)
    setPreAlumnoId(alumnoId || state.form.alumno?.value || null)
    setModalAbierto(true)
  }

  const abrirModalEditar = (llamada) => {
    setLlamadaEnEdicion(llamada)
    setModalAbierto(true)
  }

  if (!state) return null

  return (
    <div style={{ display:'flex', height:'100%' }}>

      {/* ── Columna principal ── */}
      <div style={{ flex:1, overflowY:'auto', padding:24, minWidth:0 }}>
        <div style={{ marginBottom:20 }}>
          <h1 style={{ fontFamily:'Syne, sans-serif', fontWeight:700, color:'var(--text-primary)', fontSize:20 }}>Registro de Llamadas</h1>
          <p style={{ fontSize:13, color:'var(--text-muted)', textTransform:'capitalize', marginTop:3 }}>
            {new Date().toLocaleDateString('es-PE', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
          </p>
        </div>
        <FormLlamada state={state} onAgendarLlamada={() => abrirModalAgendar()} />
        <EncuestaPropia encuesta={state.encuestaPropia} comentarios={state.comentariosPropios} />
        <HistorialAlumno
          historial={state.historial}
          alumno={state.form.alumno}
          onRefresh={() => state.form.alumno && state.recargarHistorial(state.form.alumno.value)}
        />
      </div>

      {/* ── Panel derecho: pendientes + llamadas programadas ── */}
      <div style={{ width:288, flexShrink:0, borderLeft:'1px solid var(--border-default)', background:'var(--bg-surface)', display:'flex', flexDirection:'column' }}>

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

        {/* Mitad inferior: llamadas programadas */}
        <div style={{ flex:1, minHeight:0, overflowY:'auto' }}>
          <LlamadasProgramadasPanel
            llamadas={lp.llamadas}
            vencidas={lp.vencidas}
            loading={lp.loading}
            onNuevo={() => abrirModalAgendar()}
            onEditar={abrirModalEditar}
            onEliminar={lp.eliminarLlamada}
          />
        </div>
      </div>

      {/* Modal de agendar llamada */}
      {modalAbierto && (
        <AgendarLlamadaModal
          alumnos={state.alumnos}
          asesoraId={user?.asesora_id}
          preAlumnoId={preAlumnoId}
          llamadaExistente={llamadaEnEdicion}
          onGuardar={llamadaEnEdicion ? lp.editarLlamada : lp.agregarLlamada}
          onCerrar={() => { setModalAbierto(false); setLlamadaEnEdicion(null) }}
        />
      )}
    </div>
  )
}
