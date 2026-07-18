// v-2026-06-20 16:06:13
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { programaActivo, fetchEncuestasSatisfaccion, calcularNPS, calcularCSAT, hoyLima,
  mapaProgramaAsesora, distribucionEscala, distribucionCategorica } from '../lib/api'
import toast from 'react-hot-toast'

// Safe calcularRiesgo — no crashes. Además del score, arma `motivos`: la
// lista en texto plano de cada factor que sí sumó puntos, para poder
// explicarle a la asesora POR QUÉ un alumno puntual quedó en riesgo (no
// solo mostrarle el número).
function calcularRiesgoLocal(alumno, cuotas, llamadas) {
  if (!alumno) return { score: 0, nivel: 'Bajo', motivos: [] }
  let score = 0
  const motivos = []
  const hoy = new Date()
  const hoyStr = hoyLima()

  if (alumno.ultimo_contacto_at) {
    const dias = Math.floor((hoy - new Date(alumno.ultimo_contacto_at + 'T00:00:00')) / 86400000)
    if (dias >= 21) { score += 40; motivos.push(`Sin contacto hace ${dias} días`) }
    else if (dias >= 15) { score += 25; motivos.push(`Sin contacto hace ${dias} días`) }
    else if (dias >= 7) { score += 15; motivos.push(`Sin contacto hace ${dias} días`) }
  } else {
    score += 25
    motivos.push('Nunca se le ha registrado un contacto')
  }

  const cuotasArr = Array.isArray(cuotas) ? cuotas : []
  const vencidas = cuotasArr.filter(c => c && c.fecha_vence && c.fecha_vence < hoyStr && c.estado !== 'Pagada')
  if (vencidas.length >= 2) { score += 25; motivos.push(`${vencidas.length} cuotas vencidas`) }
  else if (vencidas.length === 1) { score += 15; motivos.push('1 cuota vencida') }

  const llamadasArr = Array.isArray(llamadas) ? llamadas.filter(Boolean) : []
  const semana = parseInt(alumno.semana_actual) || 0
  const ult = llamadasArr[0]
  if (ult && semana >= 8 && (ult.avance || 0) < 30) { score += 15; motivos.push(`Avance bajo (${ult.avance || 0}%) para su semana ${semana}`) }
  if (ult && semana >= 12 && ult.cuenta === 'Demo') { score += 10; motivos.push(`Sigue en cuenta Demo en semana ${semana}`) }
  if (alumno.nivel_atencion === 'Crítico') { score += 10; motivos.push('Nivel de atención marcado como Crítico') }

  score = Math.min(score, 100)
  return { score, nivel: score >= 56 ? 'Alto' : score >= 26 ? 'Medio' : 'Bajo', motivos }
}

async function fetchDashboard() {
  const [r1, r2, r3, r4, r5, r6, encuestas] = await Promise.all([
    supabase.from('registros_llamadas')
      .select('id, fecha, respondio, avance, cuenta, capital_real, fase_fondeo, beneficio, retiro, monto_retiro, created_at, alumno_id, alumno:alumnos(nombre, programa), asesora:asesoras(nombre)')
      .order('fecha', { ascending: false })
      .limit(2000),
    supabase.from('cuotas')
      .select('id, alumno_id, numero_cuota, fecha_vence, estado, monto, monto_pagado, monto_soles, moneda, tipo_cambio, alumno:alumnos(nombre, programa)'),
    supabase.from('sesiones_orientacion')
      .select('id, alumno_id, orientador_id, fecha, estado, motivo, tiene_mt5, tiene_broker, tiene_tradingview, tiene_ingreso_trade, observaciones, alumno:alumnos(nombre, programa)')
      .order('fecha', { ascending: false })
      .limit(500),
    supabase.from('alumnos')
      .select('id, nombre, programa, estado, semana_actual, asesora, asesora_id, riesgo_nivel, riesgo_score, ultimo_contacto_at, nivel_atencion, estado_operativo, fecha_inicio')
      .in('estado', ['Activo', 'En Curso', 'En Seguimiento', 'activo', 'en curso', 'en seguimiento']),
    supabase.from('asesoras').select('id, nombre'),
    // Evolución por programa: histórico completo desde Ene-26, sin filtrar por
    // estado ni por programaActivo (a propósito — esta vista debe mostrar
    // cómo evolucionaron cohortes que ya culminaron, no solo las vigentes).
    supabase.from('alumnos')
      .select('id, nombre, programa, fecha_inicio')
      .gte('fecha_inicio', '2026-01-01'),
    fetchEncuestasSatisfaccion(),
  ])
  return {
    llamadas:        (r1.data || []).filter(Boolean),
    cuotas:          (r2.data || []).filter(Boolean),
    sesiones:        (r3.data || []).filter(Boolean),
    alumnosActivos:  (r4.data || []).filter(Boolean).filter(programaActivo),
    asesoras:        (r5.data || []).filter(Boolean),
    alumnosEvolucion:(r6.data || []).filter(Boolean),
    encuestas,
  }
}

export function useDashboard() {
  const { user } = useAuth()
  const [mesFiltro, setMesFiltro] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
  })
  const [raw,     setRaw]     = useState({ llamadas:[], cuotas:[], sesiones:[], alumnosActivos:[], asesoras:[], alumnosEvolucion:[], encuestas:[] })
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [fechaComentarios, setFechaComentarios] = useState(hoyLima())
  const [fechaComentariosOrientacion, setFechaComentariosOrientacion] = useState(hoyLima())

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchDashboard()
      setRaw(data)
      setLastUpdate(new Date())
    } catch (err) {
      toast.error('Error al cargar dashboard')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  useEffect(() => {
    const ch = supabase.channel('dash-rt')
      .on('postgres_changes', { event:'*', schema:'public', table:'registros_llamadas' }, cargar)
      .on('postgres_changes', { event:'*', schema:'public', table:'cuotas' }, cargar)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [cargar])

  // ── Datos seguros ──────────────────────────────────────────
  // Una asesora solo ve sus propios alumnos: se filtra acá, una sola vez,
  // para que todo lo que se calcula debajo (riesgo, pipeline, activación,
  // desempeño, recaudación, orientación) quede automáticamente scopeado.
  const esAsesora = user?.rol === 'asesora'
  const esOrientador = user?.rol === 'orientador'
  const alumnosActivos = esAsesora
    ? (raw.alumnosActivos || []).filter(a => a.asesora_id === user.asesora_id)
    : (raw.alumnosActivos || [])
  const misAlumnoIds = esAsesora ? new Set(alumnosActivos.map(a => a.id)) : null
  const llamadas = esAsesora ? (raw.llamadas || []).filter(l => misAlumnoIds.has(l.alumno_id)) : (raw.llamadas || [])
  const cuotas   = esAsesora ? (raw.cuotas   || []).filter(c => misAlumnoIds.has(c.alumno_id)) : (raw.cuotas   || [])
  // El orientador solo ve sus propias sesiones (orientador_id), no las de
  // otro orientador si en el futuro se suma uno más.
  const sesiones = esAsesora
    ? (raw.sesiones || []).filter(s => misAlumnoIds.has(s.alumno_id))
    : esOrientador
    ? (raw.sesiones || []).filter(s => s.orientador_id === user.asesora_id)
    : (raw.sesiones || [])
  const hoy = hoyLima()

  // Rango del mes
  const [anio, mes] = mesFiltro.split('-').map(Number)
  const inicioMes = `${mesFiltro}-01`
  const finMes    = `${mesFiltro}-${String(new Date(anio, mes, 0).getDate()).padStart(2,'0')}`
  const llamadasMes = llamadas.filter(r => r.fecha >= inicioMes && r.fecha <= finMes)
  const cuotasMes   = cuotas.filter(c => c.fecha_vence >= inicioMes && c.fecha_vence <= finMes)
  const sesionesMes = sesiones.filter(s => s.fecha >= inicioMes && s.fecha <= finMes)

  const TC_DEFAULT = 3.6

  const programas = [...new Set(alumnosActivos.map(a => a.programa).filter(Boolean))]
  const totalAlumnosActivos = alumnosActivos.length

  // ── Historial de llamadas por alumno ──────────────────────
  const llamadasPorAlumno = {}
  llamadas.forEach(r => {
    const nombre = r.alumno?.nombre
    if (!nombre) return
    if (!llamadasPorAlumno[nombre]) llamadasPorAlumno[nombre] = []
    llamadasPorAlumno[nombre].push(r)
  })

  // ── Riesgo ────────────────────────────────────────────────
  const alumnosConRiesgo = alumnosActivos.map(al => {
    const hists    = llamadasPorAlumno[al.nombre] || []
    const cuotasAl = cuotas.filter(c => c.alumno?.nombre === al.nombre)
    const { score, nivel, motivos } = calcularRiesgoLocal(al, cuotasAl, hists)
    return { ...al, riesgo_score: score, riesgo_nivel: nivel, riesgo_motivos: motivos }
  })

  // Solo el conteo total sigue vivo — alimenta el KPI de la vista de
  // asesora y la columna "Riesgo Alto" de Desempeño por Asesora. El resto
  // del desglose (bajo/medio, segmentación por último contacto, listado)
  // solo lo usaba la sección "Sistema de Riesgo" ya eliminada del dashboard.
  const riesgoAlto = alumnosConRiesgo.filter(a => a.riesgo_nivel === 'Alto').length

  // Detalle para la vista de la asesora: como alumnosActivos ya viene
  // scopeado a sus propios alumnos cuando esAsesora, este listado solo
  // trae los suyos — con el motivo puntual de cada uno.
  const misAlumnosRiesgoAlto = alumnosConRiesgo
    .filter(a => a.riesgo_nivel === 'Alto')
    .sort((a, b) => b.riesgo_score - a.riesgo_score)

  // ── Contactabilidad ───────────────────────────────────────
  // Solo cuentan los alumnos cuyo programa ya había arrancado al cierre del
  // mes filtrado (fecha_inicio <= finMes) — una cohorte que recién empieza
  // el mes que viene (ej. Ago-26 arrancando el 01/08) todavía no tuvo
  // oportunidad de recibir ninguna llamada, y contarla en el mes anterior
  // castigaba de más a la asesora que la tiene a cargo. También se
  // deduplica por alumno_id (no por nombre) para que numerador y
  // denominador midan exactamente la misma población.
  const alumnosContactablesMes = alumnosActivos.filter(a => a.fecha_inicio <= finMes)
  const idsContactablesMes = new Set(alumnosContactablesMes.map(a => a.id))
  const totalAlumnosContactablesMes = alumnosContactablesMes.length
  const alumnosQueRespondieronMes = new Set(
    llamadasMes.filter(r => r.respondio === 'Sí' && idsContactablesMes.has(r.alumno_id)).map(r => r.alumno_id)
  )
  const contactabilidad = totalAlumnosContactablesMes > 0
    ? Math.round((alumnosQueRespondieronMes.size / totalAlumnosContactablesMes) * 100) : 0

  const contactabilidadPorPrograma = programas.map(prog => {
    const alumnosProg = alumnosContactablesMes.filter(a => a.programa === prog)
    const idsProg = new Set(alumnosProg.map(a => a.id))
    const respondieron = new Set(
      llamadasMes.filter(r => r.respondio === 'Sí' && idsProg.has(r.alumno_id)).map(r => r.alumno_id)
    )
    const fechaOrden = alumnosProg.reduce((min, a) => (!min || a.fecha_inicio < min) ? a.fecha_inicio : min, null)
    return {
      programa: prog, fechaOrden, total: alumnosProg.length, respondieron: respondieron.size,
      pct: alumnosProg.length > 0 ? Math.round((respondieron.size / alumnosProg.length) * 100) : 0
    }
  }).filter(p => p.total > 0).sort((a,b) => (b.fechaOrden || '').localeCompare(a.fechaOrden || ''))

  // ── Heatmap de avance por programa × mes (Ene-26 en adelante) ─
  // A propósito NO se limita a alumnosActivos: esta vista es histórica y
  // debe mostrar cómo evolucionó cada cohorte con el tiempo, incluso las
  // que ya culminaron. Para cada programa y cada mes calendario desde su
  // inicio hasta el mes actual, calcula qué % de sus alumnos ya tenían
  // cuenta Real o Fondeo como último registro conocido HASTA ese mes — un
  // snapshot histórico (no el estado actual), que es lo que permite ver si
  // cada cohorte avanza mes a mes en vez de una sola foto de hoy.
  const registrosPorAlumnoId = {}
  llamadas.forEach(r => {
    if (!r.alumno_id || !r.cuenta || !r.fecha) return
    if (!registrosPorAlumnoId[r.alumno_id]) registrosPorAlumnoId[r.alumno_id] = []
    registrosPorAlumnoId[r.alumno_id].push(r)
  })
  Object.values(registrosPorAlumnoId).forEach(regs => regs.sort((a,b) => a.fecha.localeCompare(b.fecha)))

  function ultimoRegistroHasta(alumnoId, finMesStr) {
    const regs = registrosPorAlumnoId[alumnoId]
    if (!regs) return null
    let resultado = null
    for (const r of regs) {
      if (r.fecha > finMesStr) break
      resultado = r
    }
    return resultado
  }

  const gruposEvolucion = {}
  ;(raw.alumnosEvolucion || []).forEach(al => {
    if (!al.programa || !al.fecha_inicio) return
    if (!gruposEvolucion[al.programa]) gruposEvolucion[al.programa] = { programa: al.programa, fechaOrden: al.fecha_inicio, alumnos: [] }
    gruposEvolucion[al.programa].alumnos.push(al)
    if (al.fecha_inicio < gruposEvolucion[al.programa].fechaOrden) gruposEvolucion[al.programa].fechaOrden = al.fecha_inicio
  })

  const mesActualStr = hoyLima().slice(0, 7)

  const filasHeatmap = Object.values(gruposEvolucion)
    .map(({ programa, fechaOrden, alumnos: als }) => {
      const meses = []
      let [ay, am] = fechaOrden.slice(0, 7).split('-').map(Number)
      while (`${ay}-${String(am).padStart(2,'0')}` <= mesActualStr) {
        meses.push(`${ay}-${String(am).padStart(2,'0')}`)
        am++
        if (am > 12) { am = 1; ay++ }
      }
      const celdas = {}
      meses.forEach(mes => {
        const [my, mm] = mes.split('-').map(Number)
        const finMes = `${mes}-${String(new Date(my, mm, 0).getDate()).padStart(2,'0')}`
        let avanzados = 0
        als.forEach(al => {
          const ult = ultimoRegistroHasta(al.id, finMes)
          if (ult && (ult.cuenta === 'Real' || ult.cuenta === 'Fondeo')) avanzados++
        })
        celdas[mes] = { pct: als.length > 0 ? Math.round((avanzados / als.length) * 100) : 0, avanzados, total: als.length }
      })
      return { programa, fechaOrden, meses, celdas }
    })
    .sort((a,b) => a.fechaOrden.localeCompare(b.fechaOrden))

  const mesesHeatmap = [...new Set(filasHeatmap.flatMap(f => f.meses))].sort()
  const evolucionHeatmap = { filas: filasHeatmap, meses: mesesHeatmap }

  // ── Desempeño por asesora ─────────────────────────────────
  // Se agrupa por asesora_id (identidad real), no por el texto libre
  // alumnos.asesora — ese texto viene del Excel y puede traer variantes del
  // mismo nombre (ej. "Silva Sosa Anael" vs "Anael S."), lo que duplicaba la
  // fila de una misma persona. Los pocos alumnos legado sin asesora_id caen
  // a un grupo de respaldo por su texto tal cual, para no perderlos.
  const nombrePorAsesoraId = {}
  ;(raw.asesoras || []).forEach(a => { nombrePorAsesoraId[a.id] = a.nombre })

  // Mismo criterio que la contactabilidad de arriba: solo alumnos cuya
  // cohorte ya había arrancado al cierre del mes (alumnosContactablesMes),
  // para no penalizar a la asesora con cohortes que todavía no inician.
  const gruposAsesora = {}
  alumnosContactablesMes.forEach(al => {
    const key = al.asesora_id || `sin-id:${al.asesora || 'Sin asignar'}`
    if (!gruposAsesora[key]) {
      gruposAsesora[key] = { nombre: nombrePorAsesoraId[al.asesora_id] || al.asesora || 'Sin asignar', alumnos: [] }
    }
    gruposAsesora[key].alumnos.push(al)
  })

  const desempenoPorAsesora = Object.values(gruposAsesora).map(({ nombre, alumnos: misAlumnos }) => {
    const misAlumnoIds = new Set(misAlumnos.map(a => a.id))
    const misLlamadas = llamadasMes.filter(r => misAlumnoIds.has(r.alumno_id))
    const unicosContactados = new Set(
      misLlamadas.filter(r => r.respondio === 'Sí').map(r => r.alumno_id).filter(Boolean)
    )
    const contactabilidadAs = misAlumnos.length > 0
      ? Math.round((unicosContactados.size / misAlumnos.length) * 100) : 0
    const riesgoAltoAs = alumnosConRiesgo.filter(a => misAlumnoIds.has(a.id) && a.riesgo_nivel === 'Alto').length
    const sinContacto7 = misAlumnos.filter(al => {
      if (!al.ultimo_contacto_at) return true
      return Math.floor((new Date() - new Date(al.ultimo_contacto_at + 'T00:00:00')) / 86400000) >= 7
    }).length
    return { asesora: nombre, totalAlumnos:misAlumnos.length, llamadasMes:misLlamadas.length,
      contactabilidad:contactabilidadAs, unicosContactados:unicosContactados.size,
      riesgoAlto:riesgoAltoAs, sinContacto7 }
  }).sort((a,b) => b.contactabilidad - a.contactabilidad)

  // ── Encuestas de satisfacción (NPS / CSAT) ────────────────
  // Solo el resumen combinado (asesoría + orientación) para el KPI
  // ejecutivo del supervisor — el detalle por asesora/orientador con
  // comentarios vive en sus pestañas correspondientes (Seguimiento y
  // Orientación Técnica), no acá.
  const encuestasMes = (raw.encuestas || []).filter(e => {
    const fecha = e.fecha_respuesta?.slice(0, 10)
    return fecha && fecha >= inicioMes && fecha <= finMes
  })
  const encuestaGeneralCombinada = {
    nps: calcularNPS(encuestasMes.map(e => e.nps_score)),
    csat: calcularCSAT(encuestasMes.map(e => e.csat_label)),
    total: encuestasMes.length,
  }

  // La asesora sí ve el detalle de su propia encuesta acá (resultados
  // generales de todo el histórico, estilo Google Forms, más comentarios
  // navegables por día) — es la única pestaña donde le corresponde verlo.
  const encuestasAsesoria = (raw.encuestas || []).filter(e => e.tipo === 'asesoria')
  const programaAsesoraMap = mapaProgramaAsesora(alumnosActivos)
  const misEncuestas = esAsesora
    ? encuestasAsesoria.filter(e => programaAsesoraMap[e.programa] === user.asesora_id)
    : []
  const encuestaAsesoriaPropia = {
    total: misEncuestas.length,
    nps: calcularNPS(misEncuestas.map(e => e.nps_score)),
    csat: calcularCSAT(misEncuestas.map(e => e.csat_label)),
    npsDist: distribucionEscala(misEncuestas, 'nps_score', 0, 10),
    csatDist: distribucionCategorica(misEncuestas, 'csat_label'),
    r3Dist: distribucionCategorica(misEncuestas, 'respuesta_3'),
    r4Dist: distribucionCategorica(misEncuestas, 'respuesta_4'),
  }
  const comentariosDelDia = misEncuestas
    .filter(e => e.fecha_respuesta?.slice(0, 10) === fechaComentarios)
    .filter(e => e.comentario && e.comentario.trim())
    .map(e => ({ comentario: e.comentario.trim(), programa: e.programa }))

  // El orientador ve el mismo tipo de detalle acá en su Dashboard (no en la
  // pestaña de Orientación Técnica, que es donde lo ve el supervisor).
  const encuestasOrientacionTodas = (raw.encuestas || []).filter(e => e.tipo === 'orientacion')
  const misEncuestasOrientacion = esOrientador ? encuestasOrientacionTodas : []
  const encuestaOrientacionPropia = {
    total: misEncuestasOrientacion.length,
    nps: calcularNPS(misEncuestasOrientacion.map(e => e.nps_score)),
    csat: calcularCSAT(misEncuestasOrientacion.map(e => e.csat_label)),
    npsDist: distribucionEscala(misEncuestasOrientacion, 'nps_score', 0, 10),
    csatDist: distribucionCategorica(misEncuestasOrientacion, 'csat_label'),
    r3Dist: distribucionCategorica(misEncuestasOrientacion, 'respuesta_3'),
    r4Dist: distribucionCategorica(misEncuestasOrientacion, 'respuesta_4'),
  }
  const comentariosDelDiaOrientacion = misEncuestasOrientacion
    .filter(e => e.fecha_respuesta?.slice(0, 10) === fechaComentariosOrientacion)
    .filter(e => e.comentario && e.comentario.trim())
    .map(e => ({ comentario: e.comentario.trim(), programa: e.programa }))

  // ── Tipos de cuenta del mes ───────────────────────────────
  const ultimoRegMesPorAlumno = {}
  llamadasMes.forEach(r => {
    const nombre = r.alumno?.nombre
    if (!nombre || !r.cuenta) return
    if (!ultimoRegMesPorAlumno[nombre]) ultimoRegMesPorAlumno[nombre] = r
  })
  const tiposCuenta = { Demo:0, Real:0, Fondeo:0, 'No opera':0 }
  Object.values(ultimoRegMesPorAlumno).forEach(r => {
    if (tiposCuenta[r.cuenta] !== undefined) tiposCuenta[r.cuenta]++
  })
  const totalCuentas = Object.values(tiposCuenta).reduce((a,b) => a+b, 0)

  const cuentasPorPrograma = programas.map(prog => {
    const ultProg = {}
    llamadasMes.filter(r => r.alumno?.programa === prog && r.cuenta).forEach(r => {
      const n = r.alumno?.nombre
      if (n && !ultProg[n]) ultProg[n] = r
    })
    const unicos = Object.values(ultProg)
    return {
      programa: prog,
      Demo: unicos.filter(r => r.cuenta === 'Demo').length,
      Real: unicos.filter(r => r.cuenta === 'Real').length,
      Fondeo: unicos.filter(r => r.cuenta === 'Fondeo').length,
      'No opera': unicos.filter(r => r.cuenta === 'No opera').length,
    }
  }).filter(p => p.Demo + p.Real + p.Fondeo + p['No opera'] > 0)

  const cuentasReales = Object.values(ultimoRegMesPorAlumno).filter(r => r.cuenta === 'Real')
  const totalCuentasReales = cuentasReales.length
  const rangosCapital = [
    { label:'$0-50',   min:0,    max:50,       count:0 },
    { label:'$50-100', min:50,   max:100,      count:0 },
    { label:'$100-500',min:100,  max:500,      count:0 },
    { label:'$500+',   min:500,  max:Infinity, count:0 },
    { label:'Sin dato',min:-1,   max:-1,       count:0 },
  ]
  cuentasReales.forEach(r => {
    const c = parseFloat(r.capital_real)
    if (!r.capital_real || isNaN(c) || c === 0) { rangosCapital[4].count++; return }
    const rango = rangosCapital.find(rg => rg.min >= 0 && c >= rg.min && c < rg.max)
    if (rango) rango.count++
  })

  const fasesFondeo = { 'Primera fase':0, 'Segunda fase':0, 'Aprobado':0, 'Sin dato':0 }
  Object.values(ultimoRegMesPorAlumno).filter(r => r.cuenta === 'Fondeo').forEach(r => {
    const k = r.fase_fondeo || 'Sin dato'
    if (fasesFondeo[k] !== undefined) fasesFondeo[k]++
  })

  const retiros = llamadasMes.filter(r => r.retiro === 'Sí' && r.monto_retiro > 0)

  // ── Recaudación ───────────────────────────────────────────
  const totalCuotas      = cuotasMes.length
  const cuotasPagadas    = cuotasMes.filter(c => c.estado === 'Pagada').length
  const cuotasParciales  = cuotasMes.filter(c => c.estado === 'Pago parcial').length
  const cuotasPendientes = cuotasMes.filter(c => c.estado === 'No iniciada').length
  const cuotasProrrogas  = cuotasMes.filter(c => c.estado === 'Prórroga').length
  const cuotasReservas   = cuotasMes.filter(c => c.estado === 'Reserva académica').length
  const cuotasRetirados  = cuotasMes.filter(c => c.estado === 'Retirado').length

  // El tipo de cambio se toma SIEMPRE de la propia cuota (calculado al
  // importar como monto_soles / monto) — no de un promedio por alumno, que
  // puede diferir del real cuando un mismo alumno tiene cuotas a tasas
  // distintas entre meses.
  const calcMontoPEN = (c) => {
    const mS = parseFloat(c.monto_soles || 0)
    if (mS > 0) return mS
    const tc = parseFloat(c.tipo_cambio) || TC_DEFAULT
    return parseFloat(c.monto || 0) * (c.moneda === 'USD' ? tc : 1)
  }
  const montoTotalPEN    = cuotasMes.reduce((s,c) => s + calcMontoPEN(c), 0)
  const montoPagadoPEN   = cuotasMes.reduce((s,c) => {
    const tc = parseFloat(c.tipo_cambio) || TC_DEFAULT
    return s + parseFloat(c.monto_pagado||0) * (c.moneda === 'USD' ? tc : 1)
  }, 0)
  const saldoPendientePEN = montoTotalPEN - montoPagadoPEN
  const pctRecaudado = montoTotalPEN > 0 ? Math.round((montoPagadoPEN / montoTotalPEN) * 100) : 0
  const montoTotalUSD    = cuotasMes.filter(c => c.moneda === 'USD').reduce((s,c) => s + parseFloat(c.monto||0), 0)
  const montoPagadoUSD   = cuotasMes.filter(c => c.moneda === 'USD').reduce((s,c) => s + parseFloat(c.monto_pagado||0), 0)
  const saldoPendienteUSD = montoTotalUSD - montoPagadoUSD

  const en7d  = new Date(Date.now() - 5 * 3600000 + 7  * 86400000).toISOString().slice(0, 10)
  const en15d = new Date(Date.now() - 5 * 3600000 + 15 * 86400000).toISOString().slice(0, 10)
  const proximas7  = cuotas.filter(c => c.fecha_vence >= hoy && c.fecha_vence <= en7d  && c.estado !== 'Pagada')
  const proximas15 = cuotas.filter(c => c.fecha_vence >= hoy && c.fecha_vence <= en15d && c.estado !== 'Pagada')
  const montoProximas7  = proximas7.reduce((s,c) => s + calcMontoPEN(c), 0)
  const montoProximas15 = proximas15.reduce((s,c) => s + calcMontoPEN(c), 0)

  const recaudacionPorPrograma = programas.map(prog => {
    const cs = cuotasMes.filter(c => c.alumno?.programa === prog)
    const pagadas = cs.filter(c => c.estado === 'Pagada').length
    return { programa:prog, total:cs.length, pagadas, pct:cs.length>0?Math.round(pagadas/cs.length*100):0 }
  }).filter(p => p.total > 0).sort((a,b) => b.total - a.total)

  // ── Orientación ───────────────────────────────────────────
  const totalSesiones       = sesionesMes.length
  const sesionesConcretadas = sesionesMes.filter(s => s.estado === 'Concretada').length
  const sesionesReprogram   = sesionesMes.filter(s => s.estado === 'Reprogramada').length
  const sesionesNoConecto   = sesionesMes.filter(s => s.estado === 'No se conectó').length
  const alumnosUnicos       = new Set(sesionesMes.map(s => s.alumno?.nombre).filter(Boolean)).size
  const motivosCount = {}
  sesionesMes.forEach(s => { if (s.motivo) motivosCount[s.motivo] = (motivosCount[s.motivo]||0)+1 })
  const motivosFrecuentes = Object.entries(motivosCount).sort((a,b)=>b[1]-a[1]).slice(0,5)
  const concretadas = sesionesMes.filter(s => s.estado === 'Concretada')
  const herramientas = {
    'MT5':         concretadas.filter(s => s.tiene_mt5).length,
    'TradingView': concretadas.filter(s => s.tiene_tradingview).length,
    'Broker':      concretadas.filter(s => s.tiene_broker).length,
    'MT5 Sync':    concretadas.filter(s => s.tiene_ingreso_trade).length,
  }
  const sesionesPorPrograma = programas.map(prog => ({
    programa: prog, total: sesionesMes.filter(s => s.alumno?.programa === prog).length,
  })).filter(p => p.total > 0).sort((a,b) => b.total - a.total)

  // ── Efectividad del orientador ─────────────────────────────
  // % de alumnos (no de sesiones) que NO volvieron a agendar tras una
  // sesión Concretada — se asume que la sesión resolvió el problema por
  // completo. Solo cuentan las sesiones Concretadas (una reprogramada o
  // "no se conectó" no refleja un trabajo real del orientador). El
  // denominador es la cantidad de ALUMNOS únicos, no de sesiones: si se
  // usara el total de sesiones, cada repetición de un mismo alumno
  // penalizaría más de una vez y distorsionaría el indicador.
  const sesionesPorAlumno = {}
  concretadas.forEach(s => {
    if (!s.alumno_id) return
    sesionesPorAlumno[s.alumno_id] = (sesionesPorAlumno[s.alumno_id] || 0) + 1
  })
  const alumnosSinVolver = Object.values(sesionesPorAlumno).filter(n => n === 1).length
  const totalAlumnosConcretada = Object.keys(sesionesPorAlumno).length
  const efectividadOrientador = totalAlumnosConcretada > 0
    ? Math.round((alumnosSinVolver / totalAlumnosConcretada) * 100) : 0

  return {
    loading, cargar, lastUpdate, mesFiltro, setMesFiltro,
    hoy, programas, alumnosConRiesgo, riesgoAlto,
    evolucionHeatmap,
    desempenoPorAsesora,
    encuestaGeneralCombinada,
    encuestaAsesoriaPropia, fechaComentarios, setFechaComentarios, comentariosDelDia,
    encuestaOrientacionPropia, fechaComentariosOrientacion, setFechaComentariosOrientacion, comentariosDelDiaOrientacion,
    totalAlumnosActivos, totalLlamadas:llamadasMes.length, misAlumnosRiesgoAlto,
    alumnosQueRespondieronMes, respondieron:alumnosQueRespondieronMes.size,
    contactabilidad, contactabilidadPorPrograma,
    tiposCuenta, totalCuentas, cuentasPorPrograma,
    rangosCapital, cuentasReales, totalCuentasReales, fasesFondeo,
    retiros,
    totalCuotas, cuotasPagadas, cuotasParciales, cuotasPendientes,
    cuotasProrrogas, cuotasReservas, cuotasRetirados,
    montoTotalPEN, montoTotalUSD, montoPagadoPEN, montoPagadoUSD,
    saldoPendientePEN, saldoPendienteUSD, pctRecaudado, recaudacionPorPrograma,
    proximas7, proximas15, montoProximas7, montoProximas15,
    totalSesiones, sesionesConcretadas, sesionesReprogram, sesionesNoConecto,
    alumnosUnicos, motivosFrecuentes, herramientas, sesionesPorPrograma,
    efectividadOrientador,
  }
}
