import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { mensajeToqueImpulso, waLink } from '../lib/impulsoMensajes'

// Vista de la asesora: solo sus propios toques pendientes de Impulso BURS,
// con el mensaje ya armado (variante por alumno) y el link de WhatsApp
// listo — nada de redactar ni copiar/pegar. El supervisor ve todo (para
// poder revisar si hace falta), la asesora solo ve lo suyo.
export function useImpulsoEnvios() {
  const { user } = useAuth()
  const [raw, setRaw] = useState([])
  const [loading, setLoading] = useState(true)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('impulso_secuencia')
        .select('*, alumno:alumnos(nombre, telefono, asesora_id, programa)')
        .eq('estado', 'Pendiente')
        .order('fecha_prevista', { ascending: true })
      if (error) throw error
      setRaw(data || [])
    } catch (err) {
      toast.error('Error al cargar tus envíos de Impulso')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  useEffect(() => {
    const ch = supabase.channel('impulso-envios-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'impulso_secuencia' }, cargar)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [cargar])

  const diasHasta = (fechaISO) => {
    if (!fechaISO) return null
    const hoy = new Date()
    const d = new Date(fechaISO + 'T00:00:00')
    return Math.round((d - new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())) / 86400000)
  }

  const propios = user?.rol === 'supervisor' ? raw : raw.filter(t => t.alumno?.asesora_id === user?.asesora_id)

  const pendientes = propios
    .map(t => {
      const mensaje = mensajeToqueImpulso(t.alumno_id, t.touch_numero, t.alumno?.nombre)
      return { ...t, dias: diasHasta(t.fecha_prevista), mensaje, waHref: waLink(t.alumno?.telefono, mensaje) }
    })
    .sort((a, b) => (a.dias ?? 999) - (b.dias ?? 999))

  const marcarHecho = async (toque) => {
    const { error } = await supabase.from('impulso_secuencia')
      .update({ estado: 'Enviado', enviado_at: new Date().toISOString() })
      .eq('id', toque.id)
    if (error) { toast.error('No se pudo actualizar el toque'); console.error(error); return }
    toast.success('Marcado como enviado')
    cargar()
  }

  return { loading, pendientes, marcarHecho, cargar, esSupervisor: user?.rol === 'supervisor' }
}
