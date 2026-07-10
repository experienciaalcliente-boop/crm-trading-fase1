import { useState, useEffect, useCallback } from 'react'
import { fetchAlumnosEnCursoOSeguimiento, fetchLlamadasContactadasPorAlumnos, hoyLima } from '../lib/api'
import { useAuth } from '../context/AuthContext'

export const TOTAL_SEMANAS = 24

// Semana del programa (1-24) relativa a la fecha de inicio propia del
// alumno, no al calendario — misma fórmula que calcularSemanaRegistro en
// api.js, para que "semana actual" y "semana en que se contactó" usen
// siempre el mismo criterio.
function semanaDesde(fechaInicio, fechaRef) {
  if (!fechaInicio || !fechaRef) return null
  const inicio = new Date(fechaInicio + 'T00:00:00')
  const ref = new Date(fechaRef + 'T00:00:00')
  const diffDias = Math.floor((ref - inicio) / 86400000)
  const semana = Math.ceil((diffDias + 1) / 7)
  return semana >= 1 ? semana : null
}

// Tabla de contactabilidad semana a semana: filas = alumnos En Curso/En
// Seguimiento (asesora: solo los suyos; supervisor: todos), columnas = las
// 24 semanas del programa. Cada celda indica si esa semana del alumno tuvo
// al menos un contacto exitoso (respondio='Sí').
export function useSeguimientoSemanal() {
  const { user } = useAuth()
  const asesoraIdPropia = user?.rol === 'asesora' ? user.asesora_id : undefined
  const [alumnos,        setAlumnos]        = useState([])
  const [llamadas,       setLlamadas]       = useState([])
  const [loading,        setLoading]        = useState(true)
  const [programaFiltro, setProgramaFiltro] = useState('')
  const [semanaFiltro,   setSemanaFiltro]   = useState('') // '' = todos; N = solo pendientes de esa semana

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const als = await fetchAlumnosEnCursoOSeguimiento(asesoraIdPropia)
      const lls = await fetchLlamadasContactadasPorAlumnos(als.map(a => a.id))
      setAlumnos(als)
      setLlamadas(lls)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [asesoraIdPropia])

  useEffect(() => { cargar() }, [cargar])

  const hoy = hoyLima()
  const programasOpts = [...new Set(alumnos.map(a => a.programa))].filter(Boolean).sort()

  // Semanas con contacto exitoso por alumno — si el registro no trae
  // semana_registro (datos históricos importados antes de ese campo), se
  // calcula al vuelo con la misma fórmula, para no perder ese contacto.
  const alumnosPorId = Object.fromEntries(alumnos.map(a => [a.id, a]))
  const semanasContactadasPorAlumno = {}
  llamadas.forEach(r => {
    const alumno = alumnosPorId[r.alumno_id]
    if (!alumno) return
    const semana = r.semana_registro || semanaDesde(alumno.fecha_inicio, r.fecha)
    if (!semana || semana < 1 || semana > TOTAL_SEMANAS) return
    if (!semanasContactadasPorAlumno[r.alumno_id]) semanasContactadasPorAlumno[r.alumno_id] = new Set()
    semanasContactadasPorAlumno[r.alumno_id].add(semana)
  })

  const filasPrograma = alumnos
    .filter(a => !programaFiltro || a.programa === programaFiltro)
    .map(a => ({
      id: a.id,
      nombre: a.nombre,
      programa: a.programa,
      semanaActual: semanaDesde(a.fecha_inicio, hoy),
      contactadas: semanasContactadasPorAlumno[a.id] || new Set(),
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre))

  // % de contactabilidad por semana, sobre el universo ya filtrado por
  // programa (el filtro de "semana pendiente" es solo para acotar filas,
  // no debe distorsionar este porcentaje). Solo cuentan alumnos que ya
  // llegaron a esa semana — a uno en semana 3 no le toca aún la semana 10.
  const contactabilidadPorSemana = Array.from({ length: TOTAL_SEMANAS }, (_, i) => {
    const semana = i + 1
    const elegibles = filasPrograma.filter(f => f.semanaActual != null && f.semanaActual >= semana)
    const contactados = elegibles.filter(f => f.contactadas.has(semana))
    return {
      semana,
      pct: elegibles.length > 0 ? Math.round((contactados.length / elegibles.length) * 100) : null,
      total: elegibles.length,
    }
  })

  // Filtro "aún faltan contactar": deja solo alumnos que ya llegaron a la
  // semana elegida y no tienen contacto exitoso registrado en ella.
  const semanaFiltroNum = semanaFiltro ? Number(semanaFiltro) : null
  const filas = semanaFiltroNum
    ? filasPrograma.filter(f => f.semanaActual != null && f.semanaActual >= semanaFiltroNum && !f.contactadas.has(semanaFiltroNum))
    : filasPrograma

  return {
    loading, cargar, filas,
    programasOpts, programaFiltro, setProgramaFiltro,
    semanaFiltro, setSemanaFiltro,
    contactabilidadPorSemana, totalSemanas: TOTAL_SEMANAS,
  }
}
