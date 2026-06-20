import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export function useLlamadasProgramadas() {
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
        .eq('fecha', hoy)
        .eq('estado', 'Pendiente')
        .order('hora')
      // Si la tabla no existe aún, ignorar el error silenciosamente
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
        l.hora?.slice(0,5) >= horaActual && l.hora?.slice(0,5) <= hora5
      )
      if (activa && (!recordatorio || recordatorio.id !== activa.id)) {
        setRecordatorio(activa)
      }
    }
    check()
    const interval = setInterval(check, 60000)
    return () => clearInterval(interval)
  }, [llamadas, recordatorio])

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

  const vencidas = llamadas.filter(l => {
    const hh = new Date().toTimeString().slice(0,5)
    return l.hora?.slice(0,5) < hh
  })

  return { llamadas, loading, recordatorio, cerrarRecordatorio, registrarResultado, agregarLlamada, vencidas, cargar }
}
