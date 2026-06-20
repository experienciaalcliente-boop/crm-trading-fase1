import { useState, useEffect, useCallback } from 'react'
import { fetchDashboardLlamadas, fetchDashboardRecaudacion, fetchDashboardOrientacion, fetchAlumnosActivos, calcularRiesgo } from '../lib/api'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export function useDashboard() {
  const [mesFiltro, setMesFiltro] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
  })
  const [llamadas,       setLlamadas]       = useState([])
  const [cuotas,         setCuotas]         = useState([])
  const [sesiones,       setSesiones]       = useState([])
  const [alumnosActivos, setAlumnosActivos] = useState([])
  const [loading,        setLoading]        = useState(true)
  const [lastUpdate,     setLastUpdate]     = useState(new Date())

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [l, c, s, al] = await Promise.all([
        fetchDashboardLlamadas(),
        fetchDashboardRecaudacion(),
        fetchDashboardOrientacion(),
        fetchAlumnosActivos(),
      ])
      setLlamadas(l)
      setCuotas(c)
      setSesiones(s)
      setAlumnosActivos(al)
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
    const ch1 = supabase.channel('dash-llamadas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registros_llamadas' }, cargar).subscribe()
    const ch2 = supabase.channel('dash-cuotas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cuotas' }, cargar).subscribe()
    const ch3 = supabase.channel('dash-sesiones')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sesiones_orientacion' }, cargar).subscribe()
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); supabase.removeChannel(ch3) }
  }, [cargar])

  const hoy = new Date().toISOString().split('T')[0]

  // Safety: if data is still loading or empty, return safe defaults
  const safeAlumnosActivos = alumnosActivos || []
  const safeLlamadas = llamadas || []
  const safeCuotas = cuotas || []
  const safeSesiones = sesiones || []

  // ── Rango del mes ─────────────────────────────────────────
  const [anioFiltro, mesFiltroNum] = mesFiltro.split('-').map(Number)
  const inicioMesStr = `${mesFiltro}-01`
  const finMes = new Date(anioFiltro, mesFiltroNum, 0)
  const finMesStr = `${mesFiltro}-${String(finMes.getDate()).padStart(2,'0')}`
  const llamadasMes = safeLlamadas.filter(r => r?.fecha >= inicioMesStr && r?.fecha <= finMesStr)
  const cuotasMes   = safeCuotas.filter(c => c?.fecha_vence >= inicioMesStr && c?.fecha_vence <= finMesStr)
  const sesionesMes = safeSesiones.filter(s => s?.fecha >= inicioMesStr && s?.fecha <= finMesStr)
  const llamadasHoy = safeLlamadas.filter(r => r?.fecha === hoy)

  // ── Tipo de cambio por alumno ─────────────────────────────
  const tcPorAlumno = {}
  cuotas.forEach(c => {
    if (c.tipo_cambio && c.tipo_cambio > 1 && c.alumno?.nombre)
      tcPorAlumno[c.alumno.nombre] = parseFloat(c.tipo_cambio)
  })
  const TC_DEFAULT = 3.6

  // ── Programas ─────────────────────────────────────────────
  const programas = [...new Set(safeAlumnosActivos.map(a => a?.programa).filter(Boolean))]

  // ── SCORE DE RIESGO — calculado en frontend por alumno ────
  // Historial de llamadas por alumno (todas, no solo del mes)
  const llamadasPorAlumno = {}
  safeLlamadas.forEach(r => {
    if (!r.alumno?.nombre) return
    if (!llamadasPorAlumno[r.alumno.nombre]) llamadasPorAlumno[r.alumno.nombre] = []
    llamadasPorAlumno[r.alumno.nombre].push(r)
  })

  const alumnosConRiesgo = safeAlumnosActivos.map(al => {
    if (!al?.nombre) return { ...al, riesgo_score: 0, riesgo_nivel: 'Bajo' }
    const hists = llamadasPorAlumno[al.nombre] || []
    const cuotasAl = safeCuotas.filter(c => c?.alumno?.nombre === al.nombre)
    const { score, nivel } = calcularRiesgo(al, cuotasAl, hists)
    return { ...al, riesgo_score: score, riesgo_nivel: nivel }
  })

  const riesgoBajo   = alumnosConRiesgo.filter(a => a.riesgo_nivel === 'Bajo').length
  const riesgoMedio  = alumnosConRiesgo.filter(a => a.riesgo_nivel === 'Medio').length
  const riesgoAlto   = alumnosConRiesgo.filter(a => a.riesgo_nivel === 'Alto').length
  const alumnosRiesgoAlto = alumnosConRiesgo.filter(a => a.riesgo_nivel === 'Alto')
    .sort((a, b) => b.riesgo_score - a.riesgo_score)

  // ── ÚLTIMO CONTACTO — segmentación ───────────────────────
  const segContacto = { reciente: 0, d7: 0, d14: 0, d21: 0, sinContacto: 0 }
  alumnosConRiesgo.forEach(al => {
    if (!al.ultimo_contacto_at) { segContacto.sinContacto++; return }
    const dias = Math.floor((new Date() - new Date(al.ultimo_contacto_at + 'T00:00:00')) / 86400000)
    if (dias < 7)        segContacto.reciente++
    else if (dias < 14)  segContacto.d7++
    else if (dias < 21)  segContacto.d14++
    else                 segContacto.d21++
  })

  // ── CONTACTABILIDAD ───────────────────────────────────────
  const totalAlumnosActivos = alumnosActivos.length
  const alumnosQueRespondieronMes = new Set(
    llamadasMes.filter(r => r.respondio === 'Sí').map(r => r.alumno?.nombre).filter(Boolean)
  )
  const contactabilidad = totalAlumnosActivos > 0
    ? Math.round((alumnosQueRespondieronMes.size / totalAlumnosActivos) * 100) : 0

  const contactabilidadPorPrograma = programas.map(prog => {
    const alumnosProg = alumnosActivos.filter(a => a.programa === prog)
    const respondieronProg = new Set(
      llamadasMes.filter(r => r.alumno?.programa === prog && r.respondio === 'Sí')
        .map(r => r.alumno?.nombre).filter(Boolean)
    )
    return { programa: prog, total: alumnosProg.length, respondieron: respondieronProg.size,
      pct: alumnosProg.length > 0 ? Math.round((respondieronProg.size / alumnosProg.length) * 100) : 0 }
  }).sort((a, b) => b.total - a.total)

  // ── PIPELINE Demo → Real → Fondeo ─────────────────────────
  // Último registro CON cuenta por alumno (historial completo, no solo del mes)
  const ultimoRegPorAlumno = {}
  safeLlamadas.forEach(r => {
    if (!r?.alumno?.nombre || !r?.cuenta) return
    if (!ultimoRegPorAlumno[r.alumno.nombre]) ultimoRegPorAlumno[r.alumno.nombre] = r
  })

  const pipeline = { Demo: 0, Real: 0, Fondeo: 0, 'No opera': 0, 'Sin registro': 0 }
  safeAlumnosActivos.forEach(al => {
    if (!al || !al.nombre) return
    const ult = ultimoRegPorAlumno[al.nombre]
    if (!ult || !ult.cuenta) { pipeline['Sin registro']++; return }
    if (pipeline[ult.cuenta] !== undefined) pipeline[ult.cuenta]++
    else pipeline['Sin registro']++
  })

  // Pipeline por programa
  const pipelinePorPrograma = programas.map(prog => {
    const ultProg = {}
    safeLlamadas.filter(r => r?.alumno?.programa === prog && r?.cuenta).forEach(r => {
      if (!ultProg[r.alumno.nombre]) ultProg[r.alumno.nombre] = r
    })
    const unicos = Object.values(ultProg)
    return {
      programa: prog,
      Demo:      unicos.filter(r => r.cuenta === 'Demo').length,
      Real:      unicos.filter(r => r.cuenta === 'Real').length,
      Fondeo:    unicos.filter(r => r.cuenta === 'Fondeo').length,
      'No opera':unicos.filter(r => r.cuenta === 'No opera').length,
    }
  }).filter(p => p.Demo + p.Real + p.Fondeo + p['No opera'] > 0)

  // Alumnos estancados en Demo (semana 12+)
  const alumnosDemoEstancados = safeAlumnosActivos.filter(al => {
    if (!al?.nombre) return false
    const ult = ultimoRegPorAlumno[al.nombre]
    const semana = parseInt(al.semana_actual) || 0
    return ult?.cuenta === 'Demo' && semana >= 12
  })

  // ── INDICADOR DE ACTIVACIÓN ───────────────────────────────
  // Activado = tiene cuenta + avance >= 20% + contactado en 14 días
  const alumnosActivados = safeAlumnosActivos.filter(al => {
    if (!al?.nombre) return false
    const ult = ultimoRegPorAlumno[al.nombre]
    if (!ult?.cuenta || ult.cuenta === 'No opera') return false
    if ((ult.avance || 0) < 20) return false
    if (!al.ultimo_contacto_at) return false
    const dias = Math.floor((new Date() - new Date(al.ultimo_contacto_at + 'T00:00:00')) / 86400000)
    return dias <= 14
  })
  const pctActivacion = totalAlumnosActivos > 0
    ? Math.round((alumnosActivados.length / totalAlumnosActivos) * 100) : 0

  const activacionPorPrograma = programas.map(prog => {
    const alumnosProg = safeAlumnosActivos.filter(a => a?.programa === prog)
    const activadosProg = alumnosProg.filter(al => {
      if (!al?.nombre) return false
      if (!al?.nombre) return false
      const ult = ultimoRegPorAlumno[al.nombre]
      if (!ult?.cuenta || ult.cuenta === 'No opera') return false
      if ((ult.avance || 0) < 20) return false
      if (!al.ultimo_contacto_at) return false
      const dias = Math.floor((new Date() - new Date(al.ultimo_contacto_at + 'T00:00:00')) / 86400000)
      return dias <= 14
    })
    return {
      programa: prog,
      total: alumnosProg.length,
      activados: activadosProg.length,
      pct: alumnosProg.length > 0 ? Math.round((activadosProg.length / alumnosProg.length) * 100) : 0,
    }
  })

  // ── DESEMPEÑO POR ASESORA ─────────────────────────────────
  const todasAsesoras = [...new Set(safeAlumnosActivos.map(a => a?.asesora).filter(Boolean))]
  const desempenoPorAsesora = todasAsesoras.map(asesora => {
    const misAlumnos = safeAlumnosActivos.filter(a => a?.asesora === asesora)
    const misLlamadas = llamadasMes.filter(r => r.asesora?.nombre === asesora)
    const misLlamadasAll = llamadas.filter(r => r.asesora?.nombre === asesora)

    // Contactabilidad
    const unicosContactados = new Set(
      misLlamadas.filter(r => r.respondio === 'Sí').map(r => r.alumno?.nombre).filter(Boolean)
    )
    const contactabilidadAs = misAlumnos.length > 0
      ? Math.round((unicosContactados.size / misAlumnos.length) * 100) : 0

    // Tiempo de reacción: horas entre No y el siguiente intento
    let sumaReaccion = 0, countReaccion = 0
    const porAlumno = {}
    misLlamadasAll.sort((a,b) => new Date(a.created_at) - new Date(b.created_at)).forEach(r => {
      if (!porAlumno[r.alumno_id]) porAlumno[r.alumno_id] = []
      porAlumno[r.alumno_id].push(r)
    })
    Object.values(porAlumno).forEach(regs => {
      for (let i = 0; i < regs.length - 1; i++) {
        if (regs[i].respondio === 'No') {
          const diff = (new Date(regs[i+1].created_at) - new Date(regs[i].created_at)) / 3600000
          if (diff > 0 && diff < 336) { sumaReaccion += diff; countReaccion++ }
        }
      }
    })
    const tiempoReaccion = countReaccion > 0 ? Math.round(sumaReaccion / countReaccion) : null

    // Alumnos en riesgo Alto en su cartera
    const misAlumnosRiesgo = alumnosConRiesgo.filter(a => a.asesora === asesora && a.riesgo_nivel === 'Alto')

    // Sin contacto > 7 días
    const sinContacto7 = misAlumnos.filter(al => {
      if (!al.ultimo_contacto_at) return true
      const dias = Math.floor((new Date() - new Date(al.ultimo_contacto_at + 'T00:00:00')) / 86400000)
      return dias >= 7
    })

    return {
      asesora,
      totalAlumnos:     misAlumnos.length,
      llamadasMes:      misLlamadas.length,
      contactabilidad:  contactabilidadAs,
      unicosContactados:unicosContactados.size,
      tiempoReaccion,
      riesgoAlto:       misAlumnosRiesgo.length,
      sinContacto7:     sinContacto7.length,
    }
  }).sort((a, b) => b.contactabilidad - a.contactabilidad)

  // ── TIPOSDECUENTA (mes) ────────────────────────────────────
  const ultimoRegMesPorAlumno = {}
  llamadasMes.forEach(r => {
    if (!r.alumno?.nombre || !r.cuenta) return
    if (!ultimoRegMesPorAlumno[r.alumno.nombre]) ultimoRegMesPorAlumno[r.alumno.nombre] = r
  })
  const tiposCuenta = { Demo: 0, Real: 0, Fondeo: 0, 'No opera': 0 }
  Object.values(ultimoRegMesPorAlumno).forEach(r => {
    if (tiposCuenta[r.cuenta] !== undefined) tiposCuenta[r.cuenta]++
  })
  const totalCuentas = Object.values(tiposCuenta).reduce((a, b) => a + b, 0)

  const cuentasPorPrograma = programas.map(prog => {
    const ultProg = {}
    llamadasMes.filter(r => r.alumno?.programa === prog && r.cuenta).forEach(r => {
      if (!ultProg[r.alumno.nombre]) ultProg[r.alumno.nombre] = r
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

  // Capital real
  const cuentasReales = Object.values(ultimoRegMesPorAlumno).filter(r => r.cuenta === 'Real')
  const totalCuentasReales = cuentasReales.length
  const rangosCapital = [
    { label: '$0-50', min: 0, max: 50, count: 0 },
    { label: '$50-100', min: 50, max: 100, count: 0 },
    { label: '$100-500', min: 100, max: 500, count: 0 },
    { label: '$500-1000', min: 500, max: 1000, count: 0 },
    { label: '+$1000', min: 1000, max: Infinity, count: 0 },
    { label: 'Sin dato', min: -1, max: -1, count: 0 },
  ]
  cuentasReales.forEach(r => {
    const c = parseFloat(r.capital_real)
    if (!r.capital_real || isNaN(c) || c === 0) {
      rangosCapital.find(rg => rg.label === 'Sin dato').count++
    } else {
      const rango = rangosCapital.find(rg => rg.min >= 0 && c >= rg.min && c < rg.max)
      if (rango) rango.count++
    }
  })

  // Fondeo fases
  const todosUltimosPorPrograma = {}
  programas.forEach(prog => {
    const ultP = {}
    llamadasMes.filter(r => r.alumno?.programa === prog && r.cuenta).forEach(r => {
      if (!ultP[r.alumno.nombre]) ultP[r.alumno.nombre] = r
    })
    Object.assign(todosUltimosPorPrograma, ultP)
  })
  const cuentasFondeo = Object.values(todosUltimosPorPrograma).filter(r => r.cuenta === 'Fondeo')
  const fasesFondeo = {
    'Primera fase': cuentasFondeo.filter(r => r.fase_fondeo === 'Primera fase').length,
    'Segunda fase': cuentasFondeo.filter(r => r.fase_fondeo === 'Segunda fase').length,
    'Aprobado':     cuentasFondeo.filter(r => r.fase_fondeo === 'Aprobado').length,
    'Sin dato':     cuentasFondeo.filter(r => !r.fase_fondeo).length,
  }

  // Retiros
  const retiros = llamadasMes.filter(r => r.retiro === 'Sí' && r.monto_retiro > 0)
  const rangosRetiro = [
    { label: '$0-100', min: 0, max: 100, count: 0 },
    { label: '$100-500', min: 100, max: 500, count: 0 },
    { label: '$500-1000', min: 500, max: 1000, count: 0 },
    { label: '+$1000', min: 1000, max: Infinity, count: 0 },
  ]
  retiros.forEach(r => {
    const m = parseFloat(r.monto_retiro)
    const rango = rangosRetiro.find(rg => m >= rg.min && m < rg.max)
    if (rango) rango.count++
  })

  // Beneficio total en soles
  const beneficioTotal = llamadasMes.filter(r => r.beneficio > 0).reduce((s, r) => {
    const ben = parseFloat(r.beneficio || 0)
    const tc = tcPorAlumno[r.alumno?.nombre] || TC_DEFAULT
    return s + (ben * tc)
  }, 0)

  const statsPorAsesora = [...new Set(llamadasHoy.map(r => r.asesora?.nombre).filter(Boolean))].map(a => {
    const regs = llamadasHoy.filter(r => r.asesora?.nombre === a)
    const resp = regs.filter(r => r.respondio === 'Sí').length
    return { asesora: a, total: regs.length, respondieron: resp, pct: regs.length > 0 ? Math.round((resp/regs.length)*100) : 0 }
  })

  // ── RECAUDACIÓN ───────────────────────────────────────────
  const totalCuotas     = cuotasMes.length
  const cuotasPagadas   = cuotasMes.filter(c => c.estado === 'Pagada').length
  const cuotasParciales = cuotasMes.filter(c => c.estado === 'Pago parcial').length
  const cuotasPendientes= cuotasMes.filter(c => c.estado === 'No iniciada').length
  const cuotasProrrogas = cuotasMes.filter(c => c.estado === 'Prórroga').length
  const cuotasReservas  = cuotasMes.filter(c => c.estado === 'Reserva académica').length
  const cuotasRetirados = cuotasMes.filter(c => c.estado === 'Retirado').length

  const montoTotalPEN = cuotasMes.reduce((s, c) => {
    const mSoles = parseFloat(c.monto_soles || 0)
    if (mSoles > 0) return s + mSoles
    const tc = tcPorAlumno[c.alumno?.nombre] || TC_DEFAULT
    return s + (parseFloat(c.monto||0) * (c.moneda === 'USD' ? tc : 1))
  }, 0)
  const montoPagadoPEN = cuotasMes.reduce((s, c) => {
    const pagado = parseFloat(c.monto_pagado||0)
    const tc = tcPorAlumno[c.alumno?.nombre] || TC_DEFAULT
    return s + (pagado * (c.moneda === 'USD' ? tc : 1))
  }, 0)
  const saldoPendientePEN = montoTotalPEN - montoPagadoPEN
  const montoTotalUSD  = cuotasMes.filter(c => c.moneda === 'USD').reduce((s,c) => s + parseFloat(c.monto||0), 0)
  const montoPagadoUSD = cuotasMes.filter(c => c.moneda === 'USD').reduce((s,c) => s + parseFloat(c.monto_pagado||0), 0)
  const saldoPendienteUSD = montoTotalUSD - montoPagadoUSD

  // Cuotas próximas a vencer
  const en7dias  = new Date(Date.now() + 7  * 86400000).toISOString().split('T')[0]
  const en15dias = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
  const proximas7  = cuotas.filter(c => c.fecha_vence >= hoy && c.fecha_vence <= en7dias  && c.estado !== 'Pagada')
  const proximas15 = cuotas.filter(c => c.fecha_vence >= hoy && c.fecha_vence <= en15dias && c.estado !== 'Pagada')
  const montoProximas7  = proximas7.reduce((s,c) => { const mS = parseFloat(c.monto_soles||0); const tc = tcPorAlumno[c.alumno?.nombre]||TC_DEFAULT; return s + (mS||parseFloat(c.monto||0)*(c.moneda==='USD'?tc:1)) }, 0)
  const montoProximas15 = proximas15.reduce((s,c) => { const mS = parseFloat(c.monto_soles||0); const tc = tcPorAlumno[c.alumno?.nombre]||TC_DEFAULT; return s + (mS||parseFloat(c.monto||0)*(c.moneda==='USD'?tc:1)) }, 0)

  const recaudacionPorPrograma = programas.map(prog => {
    const cs = cuotasMes.filter(c => c.alumno?.programa === prog)
    const pagadas = cs.filter(c => c.estado === 'Pagada').length
    return { programa: prog, total: cs.length, pagadas, pct: cs.length > 0 ? Math.round((pagadas/cs.length)*100) : 0 }
  }).filter(p => p.total > 0).sort((a,b) => b.total - a.total)

  // ── ORIENTACIÓN ───────────────────────────────────────────
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
    'MT5': concretadas.filter(s => s.tiene_mt5).length,
    'TradingView': concretadas.filter(s => s.tiene_tradingview).length,
    'Broker': concretadas.filter(s => s.tiene_broker).length,
    'Ingreso trade': concretadas.filter(s => s.tiene_ingreso_trade).length,
  }
  const sesionesPorPrograma = programas.map(prog => ({
    programa: prog,
    total: sesionesMes.filter(s => s.alumno?.programa === prog).length,
  })).filter(p => p.total > 0).sort((a,b) => b.total - a.total)

  return {
    loading, cargar, lastUpdate, mesFiltro, setMesFiltro,
    hoy, programas, alumnosConRiesgo,
    // Riesgo
    riesgoBajo, riesgoMedio, riesgoAlto, alumnosRiesgoAlto,
    // Contacto
    segContacto,
    // Pipeline
    pipeline, pipelinePorPrograma, alumnosDemoEstancados,
    // Activación
    alumnosActivados, pctActivacion, activacionPorPrograma,
    // Desempeño asesoras
    desempenoPorAsesora,
    // Llamadas clásicas
    totalLlamadas: llamadasMes.length, totalAlumnosActivos,
    alumnosQueRespondieronMes, respondieron: alumnosQueRespondieronMes.size,
    contactabilidad, contactabilidadPorPrograma,
    tiposCuenta, totalCuentas, cuentasPorPrograma,
    rangosCapital, cuentasReales, totalCuentasReales,
    fasesFondeo, retiros, rangosRetiro,
    beneficioTotal, llamadasHoy, statsPorAsesora,
    // Recaudación
    totalCuotas, cuotasPagadas, cuotasParciales, cuotasPendientes,
    cuotasProrrogas, cuotasReservas, cuotasRetirados,
    montoTotalPEN, montoTotalUSD, montoPagadoPEN, montoPagadoUSD,
    saldoPendientePEN, saldoPendienteUSD, recaudacionPorPrograma,
    proximas7, proximas15, montoProximas7, montoProximas15,
    // Orientación
    totalSesiones, sesionesConcretadas, sesionesReprogram, sesionesNoConecto,
    alumnosUnicos, motivosFrecuentes, herramientas, sesionesPorPrograma,
  }
}
