import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export const ESTADOS_REACTIVATE = [
  'Pendiente',
  'Correo 0 enviado', 'Correo 1 enviado', 'Correo 2 enviado', 'Correo 3 enviado',
  'Correo 4 enviado', 'Correo 5 enviado', 'Correo 6 enviado',
  'Interesado', 'Contactado', 'Negociación', 'Reactivado', 'No interesado', 'Sin respuesta',
]

// Estados a los que el supervisor/asesor puede mover manualmente a un alumno
// tras conversar por WhatsApp — coincide con la sección 9 del plan.
export const ESTADOS_GESTIONABLES = ['Interesado', 'Contactado', 'Negociación', 'Reactivado', 'No interesado', 'Sin respuesta']

export function useReactivate() {
  const [alumnos, setAlumnos] = useState([])
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState(null)
  const [filtroEstado, setFiltroEstado] = useState('Todos')
  const [buscar, setBuscar] = useState('')
  const [detalle, setDetalle] = useState(null) // { alumno, envios, seguimiento }

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: alumnosData, error: errA }, { data: configData, error: errC }] = await Promise.all([
        supabase.from('reactivate_alumnos').select('*').eq('excluido', false).order('created_at', { ascending: false }),
        supabase.from('reactivate_config').select('*').eq('id', 'default').maybeSingle(),
      ])
      if (errA) throw errA
      if (errC) throw errC
      setAlumnos(alumnosData || [])
      setConfig(configData)
    } catch (err) {
      toast.error('Error al cargar el Plan Reactivate')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const toggleCampana = useCallback(async () => {
    if (!config) return
    const nuevoValor = !config.campana_activa
    const { error } = await supabase.from('reactivate_config').update({ campana_activa: nuevoValor, updated_at: new Date().toISOString() }).eq('id', 'default')
    if (error) { toast.error('No se pudo actualizar'); return }
    setConfig((prev) => ({ ...prev, campana_activa: nuevoValor }))
    toast.success(nuevoValor ? 'Campaña activada — los correos empezarán a enviarse automáticamente' : 'Campaña pausada')
  }, [config])

  const abrirDetalle = useCallback(async (alumno) => {
    setDetalle({ alumno, envios: [], seguimiento: [], loadingDetalle: true })
    const [{ data: envios }, { data: seguimiento }] = await Promise.all([
      supabase.from('reactivate_envios').select('*').eq('alumno_id', alumno.id).order('correo_numero'),
      supabase.from('reactivate_seguimiento').select('*').eq('alumno_id', alumno.id).order('registrado_en', { ascending: false }),
    ])
    setDetalle({ alumno, envios: envios || [], seguimiento: seguimiento || [], loadingDetalle: false })
  }, [])

  const cerrarDetalle = useCallback(() => setDetalle(null), [])

  const registrarAvance = useCallback(async ({ estadoNuevo, nota, registradoPor }) => {
    if (!detalle?.alumno) return
    const alumno = detalle.alumno
    const { error: errUpdate } = await supabase.from('reactivate_alumnos')
      .update({ estado_campana: estadoNuevo, updated_at: new Date().toISOString() })
      .eq('id', alumno.id)
    if (errUpdate) { toast.error('No se pudo registrar el avance'); return false }

    await supabase.from('reactivate_seguimiento').insert({
      alumno_id: alumno.id,
      estado_anterior: alumno.estado_campana,
      estado_nuevo: estadoNuevo,
      nota: nota || null,
      registrado_por: registradoPor || 'Supervisor',
    })

    toast.success('Avance registrado ✓')
    await cargar()
    await abrirDetalle({ ...alumno, estado_campana: estadoNuevo })
    return true
  }, [detalle, cargar, abrirDetalle])

  const alumnosFiltrados = alumnos.filter((a) => {
    if (filtroEstado !== 'Todos' && a.estado_campana !== filtroEstado) return false
    if (buscar.trim() && !a.nombre.toLowerCase().includes(buscar.toLowerCase())) return false
    return true
  })

  const stats = {
    total: alumnos.length,
    correosEnviados: alumnos.reduce((acc, a) => acc + (a.ultimo_correo_enviado != null ? a.ultimo_correo_enviado + 1 : 0), 0),
    interesados: alumnos.filter((a) => a.estado_campana === 'Interesado').length,
    contactados: alumnos.filter((a) => a.estado_campana === 'Contactado').length,
    negociacion: alumnos.filter((a) => a.estado_campana === 'Negociación').length,
    reactivados: alumnos.filter((a) => a.estado_campana === 'Reactivado').length,
    noInteresados: alumnos.filter((a) => a.estado_campana === 'No interesado').length,
    sinRespuesta: alumnos.filter((a) => a.estado_campana === 'Sin respuesta').length,
    conClic: alumnos.filter((a) => a.primer_click_at).length,
  }

  return {
    alumnos: alumnosFiltrados, totalSinFiltrar: alumnos.length, loading, config,
    filtroEstado, setFiltroEstado, buscar, setBuscar, stats,
    toggleCampana, detalle, abrirDetalle, cerrarDetalle, registrarAvance, cargar,
  }
}
