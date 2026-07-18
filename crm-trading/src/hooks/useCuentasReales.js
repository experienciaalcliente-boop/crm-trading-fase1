import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { fetchAlumnosEnCursoOSeguimiento } from '../lib/api'
import toast from 'react-hot-toast'

export const TOTAL_SEMANAS = 24

// Semana del programa (1-24) relativa a la fecha de inicio propia del
// alumno — mismo criterio que useSeguimientoSemanal, para que "semana"
// signifique siempre lo mismo en todo el CRM.
function semanaDesde(fechaInicio, fechaRef) {
  if (!fechaInicio || !fechaRef) return null
  const inicio = new Date(fechaInicio + 'T00:00:00')
  const ref = new Date(fechaRef + 'T00:00:00')
  const diffDias = Math.floor((ref - inicio) / 86400000)
  const semana = Math.ceil((diffDias + 1) / 7)
  return semana >= 1 ? semana : null
}

// Reporte de supervisor: alumnos cuya cuenta de trading está en estado
// "Real" (según el último registro de llamada que la reporta), con su
// capital y el beneficio semanal que fueron declarando semana a semana.
// El estado de cuenta es el ÚLTIMO conocido por alumno, no un conteo de
// registros — un alumno puede haber pasado por Demo antes de llegar a Real.
export function useCuentasReales() {
  const [alumnos,       setAlumnos]       = useState([])
  const [registros,     setRegistros]     = useState([])
  const [asesoras,      setAsesoras]      = useState([])
  const [loading,       setLoading]       = useState(true)
  const [asesoraFiltro, setAsesoraFiltro] = useState('')
  const [programaFiltro,setProgramaFiltro]= useState('')

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [als, aseRes] = await Promise.all([
        fetchAlumnosEnCursoOSeguimiento(),
        supabase.from('asesoras').select('id, nombre'),
      ])
      const alumnoIds = als.map(a => a.id)
      const { data: regs, error } = alumnoIds.length
        ? await supabase.from('registros_llamadas')
            .select('alumno_id, fecha, semana_registro, cuenta, capital_real, beneficio, retiro, monto_retiro')
            .in('alumno_id', alumnoIds)
            .order('fecha')
        : { data: [], error: null }
      if (error) throw error
      setAlumnos(als)
      setRegistros(regs || [])
      setAsesoras(aseRes.data || [])
    } catch (err) {
      toast.error('Error al cargar cuentas reales')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const nombrePorAsesoraId = Object.fromEntries(asesoras.map(a => [a.id, a.nombre]))

  const registrosPorAlumno = {}
  registros.forEach(r => {
    if (!r.alumno_id) return
    if (!registrosPorAlumno[r.alumno_id]) registrosPorAlumno[r.alumno_id] = []
    registrosPorAlumno[r.alumno_id].push(r)
  })
  Object.values(registrosPorAlumno).forEach(rs => rs.sort((a, b) => a.fecha.localeCompare(b.fecha)))

  const programasOpts = [...new Set(alumnos.map(a => a.programa))].filter(Boolean).sort()

  // Solo alumnos cuyo ÚLTIMO registro indica cuenta Real, con su historial
  // semana a semana ya resuelto (semana_registro, o el cálculo de respaldo
  // para registros históricos que no lo tenían).
  const alumnosReal = alumnos
    .map(al => {
      const regs = registrosPorAlumno[al.id] || []
      const ultimo = regs[regs.length - 1] || null
      const historialPorSemana = {}
      regs.forEach(r => {
        const semana = r.semana_registro || semanaDesde(al.fecha_inicio, r.fecha)
        if (semana != null && semana >= 1 && semana <= TOTAL_SEMANAS) historialPorSemana[semana] = r
      })
      return {
        id: al.id, nombre: al.nombre, programa: al.programa, asesora_id: al.asesora_id,
        asesoraNombre: nombrePorAsesoraId[al.asesora_id] || 'Sin asignar',
        capitalReal: ultimo?.capital_real ?? null,
        semanaActual: semanaDesde(al.fecha_inicio, new Date().toISOString().slice(0, 10)),
        historialPorSemana,
      }
    })
    .filter(al => (registrosPorAlumno[al.id]?.[registrosPorAlumno[al.id].length - 1]?.cuenta) === 'Real')
    .filter(al => !asesoraFiltro || al.asesora_id === asesoraFiltro)
    .filter(al => !programaFiltro || al.programa === programaFiltro)
    .sort((a, b) => a.nombre.localeCompare(b.nombre))

  const capitalTotal = alumnosReal.reduce((sum, al) => sum + (al.capitalReal || 0), 0)

  const totalPorSemana = Array.from({ length: TOTAL_SEMANAS }, (_, i) => {
    const semana = i + 1
    const total = alumnosReal.reduce((sum, al) => sum + (al.historialPorSemana[semana]?.beneficio || 0), 0)
    return { semana, total }
  })

  function exportarCSV() {
    const filas = [['Alumno', 'Programa', 'Asesora', 'Capital Real (USD)', 'Semana', 'Fecha', 'Beneficio semanal (USD)', 'Retiro', 'Monto retiro']]
    alumnosReal.forEach(al => {
      const semanasConDato = Object.keys(al.historialPorSemana).map(Number).sort((a, b) => a - b)
      if (semanasConDato.length === 0) {
        filas.push([al.nombre, al.programa || '', al.asesoraNombre, al.capitalReal ?? '', '', '', '', '', ''])
        return
      }
      semanasConDato.forEach(semana => {
        const r = al.historialPorSemana[semana]
        filas.push([al.nombre, al.programa || '', al.asesoraNombre, al.capitalReal ?? '', semana, r.fecha, r.beneficio ?? 0, r.retiro || '', r.monto_retiro ?? ''])
      })
    })
    const csv = filas.map(f => f.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cuentas_reales_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return {
    loading, cargar, alumnosReal, capitalTotal, totalPorSemana,
    asesoras, asesoraFiltro, setAsesoraFiltro,
    programasOpts, programaFiltro, setProgramaFiltro,
    exportarCSV,
  }
}
