// Cálculo de comisiones de todo el equipo para un mes arbitrario — usado
// por el export de "Dashboard de comisiones" del supervisor (ver
// DescargarDashboardComisiones.jsx). Reimplementa el mismo cálculo que
// useComisiones.js (Bono de Incentivos por cumplimiento de objetivos) más el
// de venta de complementos, pero desacoplado del mes que esté viendo la
// página en pantalla, para poder generar el reporte de cualquier mes bajo
// demanda.
import { supabase } from './supabase'
import {
  fetchAsesorasLlamadas, fetchOrientadorId, fetchEncuestasSatisfaccion, fetchTestimonios,
  calcularNPS, calcularCSAT, mapaProgramaAsesora, programaActivo, fetchVentasComplementosDesde,
} from './api'
import { INDICADORES_ATC, INDICADORES_ORIENTADOR, calcularComision } from './comisiones'

// mes en formato 'YYYY-MM'
export async function calcularComisionesEquipoMes(mes) {
  const [anio, mesNum] = mes.split('-').map(Number)
  const inicioMes = `${mes}-01`
  const finMes = `${mes}-${String(new Date(anio, mesNum, 0).getDate()).padStart(2, '0')}`

  const [asesoras, alumnosRes, llamadasRes, sesionesRes, encuestas, testimonios, orientadorId, ventasDesde] = await Promise.all([
    fetchAsesorasLlamadas(),
    supabase.from('alumnos').select('id, nombre, programa, asesora_id, estado, fecha_inicio')
      .in('estado', ['Activo', 'En Curso', 'En Seguimiento', 'activo', 'en curso', 'en seguimiento']),
    supabase.from('registros_llamadas').select('alumno_id, respondio, fecha').gte('fecha', inicioMes).lte('fecha', finMes),
    supabase.from('sesiones_orientacion').select('alumno_id, orientador_id, estado, fecha').gte('fecha', inicioMes).lte('fecha', finMes),
    fetchEncuestasSatisfaccion(),
    fetchTestimonios(),
    fetchOrientadorId(),
    fetchVentasComplementosDesde(inicioMes),
  ])

  const alumnos = (alumnosRes.data || []).filter(programaActivo)
  const llamadas = llamadasRes.data || []
  const sesiones = sesionesRes.data || []
  // fetchVentasComplementosDesde no tiene tope superior — se recorta acá al
  // mes exacto (misma lógica que useVentasEquipo con mesActual, generalizada
  // a cualquier mes).
  const ventasMes = (ventasDesde || []).filter(v => v.fecha_registro >= inicioMes && v.fecha_registro <= finMes)

  const encuestasMes = encuestas.filter(e => {
    const f = e.fecha_respuesta?.slice(0, 10)
    return f && f >= inicioMes && f <= finMes
  })
  const programaAsesoraMap = mapaProgramaAsesora(alumnos)

  function calcularResultadoAsesora(asesoraId) {
    const misAlumnos = alumnos.filter(a => a.asesora_id === asesoraId && a.fecha_inicio <= finMes)
    const misAlumnoIds = new Set(misAlumnos.map(a => a.id))
    const misLlamadas = llamadas.filter(r => misAlumnoIds.has(r.alumno_id))
    const contactados = new Set(misLlamadas.filter(r => r.respondio === 'Sí').map(r => r.alumno_id))
    const contactabilidad = misAlumnos.length > 0 ? Math.round((contactados.size / misAlumnos.length) * 100) : null

    const misEncuestas = encuestasMes.filter(e => e.tipo === 'asesoria' && programaAsesoraMap[e.programa] === asesoraId)
    const testimoniosAprobados = testimonios.filter(t =>
      t.asesora_id === asesoraId && t.estado === 'Aprobado' && t.fecha_registro?.slice(0, 7) === mes
    ).length

    return calcularComision(INDICADORES_ATC, {
      nps:         { valor: calcularNPS(misEncuestas.map(e => e.nps_score)), hayDatos: misEncuestas.length > 0 },
      csat:        { valor: calcularCSAT(misEncuestas.map(e => e.csat_label)), hayDatos: misEncuestas.length > 0 },
      seguimiento: { valor: contactabilidad, hayDatos: misAlumnos.length > 0 },
      testimonios: { valor: testimoniosAprobados, hayDatos: true },
    })
  }

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

  let nombreOrientador = 'Orientador técnico'
  if (orientadorId) {
    const { data } = await supabase.from('asesoras').select('nombre').eq('id', orientadorId).single()
    nombreOrientador = data?.nombre || nombreOrientador
  }

  const porObjetivos = [
    ...asesoras.map(a => ({ id: a.id, nombre: a.nombre, rol: 'Asesora académica', ...calcularResultadoAsesora(a.id) })),
    ...(orientadorId ? [{ id: orientadorId, nombre: nombreOrientador, rol: 'Orientador técnico', ...calcularResultadoOrientador() }] : []),
  ]

  // ── Venta de complementos: por asesora, por tipo de complemento y detalle ──
  const gruposAsesora = {}
  ventasMes.forEach(v => {
    const key = v.asesora_id || 'sin-asesora'
    if (!gruposAsesora[key]) gruposAsesora[key] = { id: v.asesora_id || null, nombre: v.asesora?.nombre || 'Sin asignar', cantidad: 0, monto: 0 }
    gruposAsesora[key].cantidad++
    gruposAsesora[key].monto += parseFloat(v.valor_comision) || 0
  })
  const porComplementosAsesora = Object.values(gruposAsesora).sort((a, b) => b.monto - a.monto)

  const gruposComplemento = {}
  ventasMes.forEach(v => {
    if (!gruposComplemento[v.complemento]) gruposComplemento[v.complemento] = { complemento: v.complemento, cantidad: 0, monto: 0 }
    gruposComplemento[v.complemento].cantidad++
    gruposComplemento[v.complemento].monto += parseFloat(v.valor_comision) || 0
  })
  const porComplementoTipo = Object.values(gruposComplemento).sort((a, b) => b.monto - a.monto)

  const detalleVentas = [...ventasMes].sort((a, b) => (a.fecha_registro || '').localeCompare(b.fecha_registro || ''))

  // ── Total combinado por persona: lo que efectivamente se le debe pagar ──
  const totalesPorPersona = porObjetivos.map(p => {
    const complementos = porComplementosAsesora.find(c => c.id === p.id)
    return {
      id: p.id,
      nombre: p.nombre,
      rol: p.rol,
      comisionObjetivos: p.comisionMonto,
      cantidadComplementos: complementos?.cantidad || 0,
      comisionComplementos: complementos?.monto || 0,
      totalAPagar: p.comisionMonto + (complementos?.monto || 0),
    }
  })
  // Por si alguien vendió complementos sin tener fila en porObjetivos (no
  // debería pasar en operación normal, pero cubre datos inconsistentes).
  porComplementosAsesora.forEach(c => {
    if (c.id && !totalesPorPersona.find(p => p.id === c.id)) {
      totalesPorPersona.push({ id: c.id, nombre: c.nombre, rol: '—', comisionObjetivos: 0, cantidadComplementos: c.cantidad, comisionComplementos: c.monto, totalAPagar: c.monto })
    }
  })

  const totalGeneralObjetivos = porObjetivos.reduce((s, p) => s + p.comisionMonto, 0)
  const totalGeneralComplementos = ventasMes.reduce((s, v) => s + (parseFloat(v.valor_comision) || 0), 0)

  return {
    mes, inicioMes, finMes,
    porObjetivos,
    porComplementosAsesora, porComplementoTipo, detalleVentas,
    totalesPorPersona,
    totalGeneralObjetivos, totalGeneralComplementos, totalGeneralVentas: ventasMes.length,
    totalGeneralPagar: totalGeneralObjetivos + totalGeneralComplementos,
  }
}
