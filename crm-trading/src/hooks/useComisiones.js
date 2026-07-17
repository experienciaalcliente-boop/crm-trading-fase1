import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import {
  fetchAsesorasLlamadas, fetchOrientadorId, fetchEncuestasSatisfaccion,
  calcularNPS, calcularCSAT, mapaProgramaAsesora, programaActivo,
  fetchTestimonios, insertTestimonio, actualizarEstadoTestimonio, ENFOQUES_TESTIMONIO,
} from '../lib/api'
import { INDICADORES_ATC, INDICADORES_ORIENTADOR, calcularComision } from '../lib/comisiones'
import toast from 'react-hot-toast'

// Bono de Incentivos — cálculo 100% automático a partir de datos que ya
// existen en el CRM (nada se ingresa a mano, salvo el registro de
// testimonios, que además requiere aprobación del supervisor). Cierra con
// el mes calendario, igual que el resto de los indicadores del CRM.
export function useComisiones() {
  const { user } = useAuth()
  const esAsesora = user?.rol === 'asesora'
  const esOrientador = user?.rol === 'orientador'
  const esSupervisor = user?.rol === 'supervisor'

  const [mesFiltro, setMesFiltro] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [asesoras,      setAsesoras]      = useState([])
  const [alumnos,       setAlumnos]       = useState([])
  const [llamadas,      setLlamadas]      = useState([])
  const [sesiones,      setSesiones]      = useState([])
  const [encuestas,     setEncuestas]     = useState([])
  const [testimonios,   setTestimonios]   = useState([])
  const [orientadorId,  setOrientadorId]  = useState(null)
  const [alumnosPropios, setAlumnosPropios] = useState([]) // para el selector del form de testimonio
  const [loading,       setLoading]       = useState(true)
  const [saving,        setSaving]        = useState(false)
  const [form,          setForm]          = useState({ alumno_id: '', enfoque: '' })
  // El orientador no viene en fetchAsesorasLlamadas (la excluye a propósito),
  // así que se resuelve su nombre aparte solo para el resumen del supervisor.
  const [nombreOrientador, setNombreOrientador] = useState('')

  const [anio, mes] = mesFiltro.split('-').map(Number)
  const inicioMes = `${mesFiltro}-01`
  const finMes = `${mesFiltro}-${String(new Date(anio, mes, 0).getDate()).padStart(2, '0')}`

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [asesorasData, alumnosRes, llamadasRes, sesionesRes, encuestasData, testimoniosData, orientadorIdData] = await Promise.all([
        fetchAsesorasLlamadas(),
        supabase.from('alumnos').select('id, nombre, programa, asesora_id, estado, fecha_inicio')
          .in('estado', ['Activo', 'En Curso', 'En Seguimiento', 'activo', 'en curso', 'en seguimiento']),
        supabase.from('registros_llamadas').select('alumno_id, respondio, fecha').gte('fecha', inicioMes).lte('fecha', finMes),
        supabase.from('sesiones_orientacion').select('alumno_id, orientador_id, estado, fecha').gte('fecha', inicioMes).lte('fecha', finMes),
        fetchEncuestasSatisfaccion(),
        fetchTestimonios(esAsesora ? user.asesora_id : undefined),
        fetchOrientadorId(),
      ])
      setAsesoras(asesorasData || [])
      setAlumnos((alumnosRes.data || []).filter(programaActivo))
      setLlamadas(llamadasRes.data || [])
      setSesiones(sesionesRes.data || [])
      setEncuestas(encuestasData || [])
      setTestimonios(testimoniosData || [])
      setOrientadorId(orientadorIdData)
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar comisiones')
    } finally {
      setLoading(false)
    }
  }, [mesFiltro, esAsesora, user?.asesora_id])

  useEffect(() => { cargar() }, [cargar])

  useEffect(() => {
    if (!esAsesora) return
    supabase.from('alumnos').select('id, nombre, programa')
      .eq('asesora_id', user.asesora_id).eq('activo', true).order('nombre')
      .then(({ data }) => setAlumnosPropios(data || []))
  }, [esAsesora, user?.asesora_id])

  // ── Cálculo por asesora (ATC) ──────────────────────────────
  const encuestasMes = encuestas.filter(e => {
    const f = e.fecha_respuesta?.slice(0, 10)
    return f && f >= inicioMes && f <= finMes
  })
  const programaAsesoraMap = mapaProgramaAsesora(alumnos)

  function calcularResultadoAsesora(asesoraId) {
    // Igual que en el Dashboard: se excluyen cohortes cuyo programa todavía
    // no arranca al cierre del mes filtrado (fecha_inicio > finMes) — no
    // pueden tener contacto real y no deben penalizar la contactabilidad.
    const misAlumnos = alumnos.filter(a => a.asesora_id === asesoraId && a.fecha_inicio <= finMes)
    const misAlumnoIds = new Set(misAlumnos.map(a => a.id))
    const misLlamadas = llamadas.filter(r => misAlumnoIds.has(r.alumno_id))
    const contactados = new Set(misLlamadas.filter(r => r.respondio === 'Sí').map(r => r.alumno_id))
    const contactabilidad = misAlumnos.length > 0 ? Math.round((contactados.size / misAlumnos.length) * 100) : null

    const misEncuestas = encuestasMes.filter(e => e.tipo === 'asesoria' && programaAsesoraMap[e.programa] === asesoraId)
    const testimoniosAprobados = testimonios.filter(t =>
      t.asesora_id === asesoraId && t.estado === 'Aprobado' && t.fecha_registro?.slice(0, 7) === mesFiltro
    ).length

    return calcularComision(INDICADORES_ATC, {
      nps:         { valor: calcularNPS(misEncuestas.map(e => e.nps_score)), hayDatos: misEncuestas.length > 0 },
      csat:        { valor: calcularCSAT(misEncuestas.map(e => e.csat_label)), hayDatos: misEncuestas.length > 0 },
      seguimiento: { valor: contactabilidad, hayDatos: misAlumnos.length > 0 },
      testimonios: { valor: testimoniosAprobados, hayDatos: true },
    })
  }

  // ── Cálculo del orientador ──────────────────────────────────
  function calcularResultadoOrientador() {
    const misSesiones = sesiones.filter(s => s.orientador_id === orientadorId)
    const concretadas = misSesiones.filter(s => s.estado === 'Concretada')
    const sesionesPorAlumno = {}
    concretadas.forEach(s => { if (s.alumno_id) sesionesPorAlumno[s.alumno_id] = (sesionesPorAlumno[s.alumno_id] || 0) + 1 })
    const sinVolver = Object.values(sesionesPorAlumno).filter(n => n === 1).length
    const totalAlumnosConcretada = Object.keys(sesionesPorAlumno).length
    const efectividad = totalAlumnosConcretada > 0 ? Math.round((sinVolver / totalAlumnosConcretada) * 100) : null

    const misEncuestas = encuestasMes.filter(e => e.tipo === 'orientacion')

    return calcularComision(INDICADORES_ORIENTADOR, {
      nps:         { valor: calcularNPS(misEncuestas.map(e => e.nps_score)), hayDatos: misEncuestas.length > 0 },
      csat:        { valor: calcularCSAT(misEncuestas.map(e => e.csat_label)), hayDatos: misEncuestas.length > 0 },
      efectividad: { valor: efectividad, hayDatos: concretadas.length > 0 },
    })
  }

  const miResultado = esAsesora ? calcularResultadoAsesora(user.asesora_id)
    : esOrientador ? calcularResultadoOrientador()
    : null

  useEffect(() => {
    if (esSupervisor && orientadorId) {
      supabase.from('asesoras').select('nombre').eq('id', orientadorId).single()
        .then(({ data }) => setNombreOrientador(data?.nombre || 'Orientador técnico'))
    }
  }, [esSupervisor, orientadorId])

  // ── Resumen del supervisor ──────────────────────────────────
  const resumenGeneral = esSupervisor ? [
    ...asesoras.map(a => ({ id: a.id, nombre: a.nombre, rol: 'Asesora académica', ...calcularResultadoAsesora(a.id) })),
    ...(orientadorId ? [{ id: orientadorId, nombre: nombreOrientador || 'Orientador técnico', rol: 'Orientador técnico', ...calcularResultadoOrientador() }] : []),
  ] : []

  // ── Testimonios: registro (asesora) y aprobación (supervisor) ──
  const misTestimonios = esAsesora ? testimonios : []
  const testimoniosPendientes = esSupervisor ? testimonios.filter(t => t.estado === 'Pendiente') : []
  const testimoniosHistorial = esSupervisor ? testimonios.filter(t => t.estado !== 'Pendiente') : []

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const registrarTestimonio = async () => {
    if (!form.alumno_id) { toast.error('Selecciona un alumno'); return }
    if (!form.enfoque)   { toast.error('Selecciona el enfoque del video'); return }
    setSaving(true)
    try {
      await insertTestimonio({ asesora_id: user.asesora_id, alumno_id: form.alumno_id, enfoque: form.enfoque })
      toast.success('Testimonio registrado — queda pendiente de aprobación ✓')
      setForm({ alumno_id: '', enfoque: '' })
      cargar()
    } catch (err) {
      toast.error('Error al registrar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const aprobarTestimonio = async (id) => {
    try {
      await actualizarEstadoTestimonio(id, 'Aprobado')
      toast.success('Testimonio aprobado ✓')
      cargar()
    } catch (err) {
      toast.error('Error: ' + err.message)
    }
  }

  const rechazarTestimonio = async (id) => {
    const motivo = window.prompt('Motivo del rechazo (opcional):') || ''
    try {
      await actualizarEstadoTestimonio(id, 'Rechazado', motivo)
      toast.success('Testimonio rechazado')
      cargar()
    } catch (err) {
      toast.error('Error: ' + err.message)
    }
  }

  return {
    loading, cargar, saving,
    mesFiltro, setMesFiltro,
    esAsesora, esOrientador, esSupervisor,
    miResultado,
    resumenGeneral,
    alumnosPropios, form, setField, registrarTestimonio,
    misTestimonios, testimoniosPendientes, testimoniosHistorial,
    aprobarTestimonio, rechazarTestimonio,
    ENFOQUES_TESTIMONIO,
  }
}
