import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { upsertOnboardingPasos, updateOnboardingPaso, hoyLima } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const PASOS_INFO = [
  { key: 'terminos_condiciones',  label: 'Términos y condiciones',   icon: '📋', responsable: 'Alumno' },
  { key: 'ficha_alumno',          label: 'Ficha del alumno',         icon: '👤', responsable: 'Alumno + Asesor' },
  { key: 'acceso_aula',           label: 'Acceso al aula virtual',   icon: '🏫', responsable: 'Asesor' },
  { key: 'evaluacion_dedicacion', label: 'Evaluación de dedicación', icon: '📝', responsable: 'Alumno' },
  { key: 'asignacion_contenido',  label: 'Asignación de contenido',  icon: '📚', responsable: 'Asesor' },
  { key: 'ingreso_whatsapp',      label: 'Ingreso al grupo WhatsApp',icon: '💬', responsable: 'Asesor' },
]

export function useOnboarding() {
  const { user } = useAuth()
  const asesoraIdPropia = user?.rol === 'asesora' ? user.asesora_id : undefined
  const [alumnos,   setAlumnos]   = useState([])
  const [pasos,     setPasos]     = useState({}) // { alumno_id: [pasos] }
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [alumnoSel, setAlumnoSel] = useState(null) // alumno abierto en panel
  const [filtro,    setFiltro]    = useState('todos') // todos | pendiente | en_proceso | detenido | listo

  const hoy = hoyLima()

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      // Alumnos con fecha_inicio futura (próxima promoción)
      let queryAls = supabase
        .from('alumnos')
        .select('id, nombre, programa, estado, asesora, fecha_inicio, ultimo_contacto_at')
        .gt('fecha_inicio', hoy)
        .order('fecha_inicio')
      if (asesoraIdPropia) queryAls = queryAls.eq('asesora_id', asesoraIdPropia)
      const { data: als, error: e1 } = await queryAls
      if (e1) throw e1

      // Sus pasos de onboarding
      const ids = (als || []).map(a => a.id)
      let pasosData = []
      if (ids.length > 0) {
        const { data: ps, error: e2 } = await supabase
          .from('onboarding_pasos')
          .select('*')
          .in('alumno_id', ids)
        if (e2) throw e2
        pasosData = ps || []
      }

      // Agrupar pasos por alumno
      const pasosMap = {}
      pasosData.forEach(p => {
        if (!pasosMap[p.alumno_id]) pasosMap[p.alumno_id] = []
        pasosMap[p.alumno_id].push(p)
      })

      // Generar pasos si un alumno no los tiene todavía
      for (const al of (als || [])) {
        if (!pasosMap[al.id] || pasosMap[al.id].length < 6) {
          await upsertOnboardingPasos(al.id)
        }
      }

      // Recargar pasos después de generar
      if (ids.length > 0) {
        const { data: ps2 } = await supabase
          .from('onboarding_pasos')
          .select('*')
          .in('alumno_id', ids)
        const pm2 = {}
        ;(ps2 || []).forEach(p => {
          if (!pm2[p.alumno_id]) pm2[p.alumno_id] = []
          pm2[p.alumno_id].push(p)
        })
        setPasos(pm2)
      }

      setAlumnos(als || [])
    } catch (err) {
      toast.error('Error al cargar onboarding')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [hoy, asesoraIdPropia])

  useEffect(() => { cargar() }, [cargar])

  // Calcular estado de un alumno
  const calcEstado = useCallback((alumnoId) => {
    const ps = pasos[alumnoId] || []
    const completados = ps.filter(p => p.estado === 'Completado').length
    if (completados === 0) return 'pendiente'
    if (completados === 6) return 'listo'

    // Detectar si está detenido (updated_at hace más de 24h sin completar todos)
    const incompletos = ps.filter(p => p.estado !== 'Completado')
    if (incompletos.length > 0) {
      const masAntiguo = incompletos.reduce((min, p) => {
        const t = new Date(p.updated_at).getTime()
        return t < min ? t : min
      }, Infinity)
      const horasSin = (Date.now() - masAntiguo) / 3600000
      if (horasSin >= 48) return 'critico'
      if (horasSin >= 24) return 'detenido'
    }

    return 'en_proceso'
  }, [pasos])

  const calcAvance = useCallback((alumnoId) => {
    const ps = pasos[alumnoId] || []
    return ps.length > 0 ? Math.round((ps.filter(p => p.estado === 'Completado').length / 6) * 100) : 0
  }, [pasos])

  // Marcar paso como completado o pendiente
  const togglePaso = useCallback(async (alumnoId, pasoKey, completadoPor = '') => {
    const ps = pasos[alumnoId] || []
    const paso = ps.find(p => p.paso === pasoKey)
    if (!paso) return

    const nuevoEstado = paso.estado === 'Completado' ? 'Pendiente' : 'Completado'
    setSaving(true)
    try {
      await updateOnboardingPaso(alumnoId, pasoKey, {
        estado: nuevoEstado,
        fecha_completado: nuevoEstado === 'Completado' ? new Date().toISOString() : null,
        completado_por: nuevoEstado === 'Completado' ? completadoPor : null,
      })
      toast.success(nuevoEstado === 'Completado' ? 'Paso completado ✓' : 'Paso marcado como pendiente')
      cargar()
    } catch (err) {
      toast.error('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }, [pasos, cargar])

  // Filtrar alumnos
  const alumnosFiltrados = alumnos.filter(al => {
    if (filtro === 'todos') return true
    return calcEstado(al.id) === filtro
  })

  // Stats del embudo
  const embudo = PASOS_INFO.map(p => {
    const count = alumnos.filter(al => {
      const ps = pasos[al.id] || []
      return ps.some(pp => pp.paso === p.key && pp.estado === 'Completado')
    }).length
    return { ...p, count, pct: alumnos.length > 0 ? Math.round(count / alumnos.length * 100) : 0 }
  })

  const stats = {
    total:       alumnos.length,
    pendiente:   alumnos.filter(al => calcEstado(al.id) === 'pendiente').length,
    en_proceso:  alumnos.filter(al => calcEstado(al.id) === 'en_proceso').length,
    detenido:    alumnos.filter(al => calcEstado(al.id) === 'detenido').length,
    critico:     alumnos.filter(al => calcEstado(al.id) === 'critico').length,
    listo:       alumnos.filter(al => calcEstado(al.id) === 'listo').length,
  }

  return {
    alumnos, alumnosFiltrados, pasos, loading, saving,
    alumnoSel, setAlumnoSel,
    filtro, setFiltro,
    calcEstado, calcAvance, togglePaso,
    embudo, stats, cargar,
    PASOS_INFO,
  }
}
