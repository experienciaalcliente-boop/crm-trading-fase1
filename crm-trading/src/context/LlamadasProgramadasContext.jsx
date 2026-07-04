import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
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

  const hoy = new Date().toISOString().split('T')[0]

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('llamadas_programadas')
        .select('*, alumno:alumnos(nombre, programa, semana_actual)')
        .gte('fecha', hoy)
        .eq('estado', 'Pendiente')
        .order('fecha').order('hora')
      if (error) { console.warn('llamadas_programadas:', error.message); return }
      setLlamadas(data || [])
    } catch (err) {
      console.warn('useLlamadasProgramadas:', err.message)
    } finally {
      setLoading(false)
    }
  }, [hoy])

  useEffect(() => { cargar() }, [cargar])

  // Chequear cada 60 segundos si hay llamadas que deben dispararse
  useEffect(() => {
    const check = () => {
      const ahora = new Date()
      const horaActual = `${String(ahora.getHours()).padStart(2,'0')}:${String(ahora.getMinutes()).padStart(2,'0')}`
      const en5min = new Date(ahora.getTime() + 5 * 60000)
      const hora5 = `${String(en5min.getHours()).padStart(2,'0')}:${String(en5min.getMinutes()).padStart(2,'0')}`

      const activa = llamadas.find(l =>
        l.fecha === hoy && l.hora?.slice(0,5) >= horaActual && l.hora?.slice(0,5) <= hora5
      )
      if (activa && (!recordatorio || recordatorio.id !== activa.id)) {
        setRecordatorio(activa)
      }
    }
    check()
    const interval = setInterval(check, 60000)
    return () => clearInterval(interval)
  }, [llamadas, recordatorio, hoy])

  const cerrarRecordatorio = useCallback(() => setRecordatorio(null), [])

  const registrarResultado = useCallback(async (id, resultado) => {
    try {
      await supabase.from('llamadas_programadas')
        .update({ estado: 'Realizada', resultado })
        .eq('id', id)
      toast.success('Llamada actualizada ✓')
      setRecordatorio(null)
      cargar()
    } catch (err) {
      toast.error('Error: ' + err.message)
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
