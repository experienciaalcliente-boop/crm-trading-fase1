import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { hoyLima } from '../lib/api'
import toast from 'react-hot-toast'

// Contexto único (no un hook independiente) porque tanto el popup global
// (montado en App.jsx) como el panel de Seguimiento necesitan ver las MISMAS
// llamadas agendadas. Con dos instancias del hook cada una tenía su propio
// estado aislado, así que una llamada agendada desde Seguimiento nunca
// llegaba a la instancia que vigila el popup.
const LlamadasProgramadasContext = createContext(null)

export function LlamadasProgramadasProvider({ children }) {
  const [llamadas,   setLlamadas]   = useState([])
  const [recordatorio, setRecordatorio] = useState(null) // llamada activa para popup
  const [loading,    setLoading]    = useState(false)

  const hoy = hoyLima()
  // Llamadas recién cerradas/gestionadas: se ignoran un rato para que no
  // vuelva a aparecer el mismo popup de inmediato (ver check() más abajo).
  const ignorarHastaRef = useRef({}) // { [id]: timestamp }

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      // OJO: sin filtro de fecha mínima a propósito. Con `.gte('fecha', hoy)`
      // cualquier llamada Pendiente cuya fecha ya pasó (nunca se marcó como
      // Realizada) quedaba fuera de la consulta y desaparecía del panel sin
      // avisar — ni siquiera se marcaba como "vencida", porque `vencidas` se
      // calcula filtrando este mismo array, que ya las había excluido antes.
      const { data, error } = await supabase
        .from('llamadas_programadas')
        .select('*, alumno:alumnos(nombre, programa, semana_actual)')
        .eq('estado', 'Pendiente')
        .order('fecha').order('hora')
      if (error) { console.warn('llamadas_programadas:', error.message); return }
      setLlamadas(data || [])
    } catch (err) {
      console.warn('useLlamadasProgramadas:', err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  // Chequear cada 20 segundos si hay llamadas que deben dispararse. La
  // ventana mira hacia ATRÁS (hora programada ya llegó, hasta 2 min de
  // margen por si la pestaña estaba inactiva) en vez de hacia adelante —
  // antes disparaba hasta 5 minutos ANTES de la hora exacta.
  useEffect(() => {
    const check = () => {
      const ahora = new Date()
      const horaActual = `${String(ahora.getHours()).padStart(2,'0')}:${String(ahora.getMinutes()).padStart(2,'0')}`
      const hace2min = new Date(ahora.getTime() - 2 * 60000)
      const horaAtras = `${String(hace2min.getHours()).padStart(2,'0')}:${String(hace2min.getMinutes()).padStart(2,'0')}`

      const activa = llamadas.find(l => {
        if (l.fecha !== hoy) return false
        const h = l.hora?.slice(0,5)
        if (!(h <= horaActual && h >= horaAtras)) return false
        const hasta = ignorarHastaRef.current[l.id]
        if (hasta && Date.now() < hasta) return false
        return true
      })
      if (activa && (!recordatorio || recordatorio.id !== activa.id)) {
        setRecordatorio(activa)
      }
    }
    check()
    const interval = setInterval(check, 20000)
    return () => clearInterval(interval)
  }, [llamadas, recordatorio, hoy])

  // Cierra el popup sin marcar resultado ("ignorar esta vez"): la llamada
  // sigue pendiente en la lista, pero no debe volver a aparecer de
  // inmediato — antes, al poner recordatorio en null, el próximo chequeo
  // (que corre enseguida por el cambio de dependencia) todavía veía la
  // misma llamada en `llamadas` y la volvía a mostrar al instante.
  const cerrarRecordatorio = useCallback(() => {
    setRecordatorio(r => {
      if (r) ignorarHastaRef.current[r.id] = Date.now() + 3 * 60000
      return null
    })
  }, [])

  const registrarResultado = useCallback(async (id, resultado) => {
    ignorarHastaRef.current[id] = Date.now() + 3 * 60000
    setRecordatorio(null)
    setLlamadas(prev => prev.filter(l => l.id !== id)) // ya no está pendiente
    try {
      await supabase.from('llamadas_programadas')
        .update({ estado: 'Realizada', resultado })
        .eq('id', id)
      toast.success('Llamada actualizada ✓')
    } catch (err) {
      toast.error('Error: ' + err.message)
      cargar() // algo falló — volver a traer el estado real desde la BD
    }
  }, [cargar])

  const agregarLlamada = useCallback(async (payload) => {
    try {
      const { error } = await supabase.from('llamadas_programadas').insert([payload])
      if (error) throw error
      toast.success('Llamada programada ✓')
      cargar()
    } catch (err) {
      toast.error('Error: ' + err.message)
    }
  }, [cargar])

  const editarLlamada = useCallback(async (id, payload) => {
    try {
      const { error } = await supabase.from('llamadas_programadas').update(payload).eq('id', id)
      if (error) throw error
      toast.success('Llamada actualizada ✓')
      cargar()
    } catch (err) {
      toast.error('Error: ' + err.message)
    }
  }, [cargar])

  const eliminarLlamada = useCallback(async (id) => {
    try {
      const { error } = await supabase.from('llamadas_programadas').delete().eq('id', id)
      if (error) throw error
      toast.success('Llamada eliminada ✓')
      cargar()
    } catch (err) {
      toast.error('Error: ' + err.message)
    }
  }, [cargar])

  const vencidas = llamadas.filter(l => {
    const hh = new Date().toTimeString().slice(0,5)
    return l.fecha < hoy || (l.fecha === hoy && l.hora?.slice(0,5) < hh)
  })

  return (
    <LlamadasProgramadasContext.Provider value={{
      llamadas, loading, recordatorio, cerrarRecordatorio, registrarResultado, agregarLlamada, editarLlamada, eliminarLlamada, vencidas, cargar,
    }}>
      {children}
    </LlamadasProgramadasContext.Provider>
  )
}

export const useLlamadasProgramadas = () => useContext(LlamadasProgramadasContext)
