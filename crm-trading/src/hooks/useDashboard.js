import { useState, useEffect, useCallback } from 'react'
import { fetchDashboardLlamadas, fetchDashboardRecaudacion, fetchDashboardOrientacion, fetchAlumnosActivos } from '../lib/api'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export function useDashboard() {
  const [mesFiltro,   setMesFiltro]   = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
  })
  const [llamadas,    setLlamadas]    = useState([])
  const [cuotas,      setCuotas]      = useState([])
  const [sesiones,    setSesiones]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [lastUpdate,  setLastUpdate]  = useState(new Date())
  const [alumnosActivos, setAlumnosActivos] = useState([])

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

  // Realtime
  useEffect(() => {
    const ch1 = supabase.channel('dash-llamadas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registros_llamadas' }, cargar)
      .subscribe()
    const ch2 = supabase.channel('dash-cuotas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cuotas' }, cargar)
      .subscribe()
    const ch3 = supabase.channel('dash-sesiones')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sesiones_orientacion' }, cargar)
      .subscribe()
    return () => {
      supabase.removeChannel(ch1)
      supabase.removeChannel(ch2)
      supabase.removeChannel(ch3)
    }
  }, [cargar])

  const hoy = new Date().toISOString().split('T')[0]

  // ── MÉTRICAS LLAMADAS ──────────────────────────────────────
  const llamadasHoy    = llamadas.filter(r => r.fecha === hoy)
  const totalLlamadas  = llamadas.length

  // Total alumnos activos (base real, excluye retirados)
  const totalAlumnosActivos = alumnosActivos.length

  // Rango del mes filtrado
  const [anioFiltro, mesFiltroNum] = mesFiltro.split('-').map(Number)
  const inicioMesStr = `${mesFiltro}-01`
  const finMes = new Date(anioFiltro, mesFiltroNum, 0) // último día del mes
  const finMesStr = `${mesFiltro}-${String(finMes.getDate()).padStart(2,'0')}`
  const alumnosQueRespondieronMes = new Set(
    llamadas.filter(r => r.respondio === 'Sí' && r.fecha >= inicioMesStr && r.fecha <= finMesStr).map(r => r.alumno?.nombre).filter(Boolean)
  )
  const contactabilidad = totalAlumnosActivos > 0
    ? Math.round((alumnosQueRespondieronMes.size / totalAlumnosActivos) * 100) : 0

  // Contactabilidad por programa — alumnos que respondieron vs alumnos del programa
  const programas = [...new Set(alumnosActivos.map(a => a.programa).filter(Boolean))]
  const contactabilidadPorPrograma = programas.map(prog => {
    const alumnosProg = alumnosActivos.filter(a => a.programa === prog)
    const respondieronProg = new Set(
      llamadas.filter(r => r.alumno?.programa === prog && r.respondio === 'Sí' && r.fecha >= inicioMesStr && r.fecha <= finMesStr)
        .map(r => r.alumno?.nombre).filter(Boolean)
    )
    return {
      programa: prog,
      total: alumnosProg.length,
      respondieron: respondieronProg.size,
      pct: alumnosProg.length > 0 ? Math.round((respondieronProg.size / alumnosProg.length) * 100) : 0
    }
  }).sort((a, b) => b.total - a.total)

  // Tipos de cuenta — por alumno único, usando su registro más reciente
  // (el historial ya viene ordenado por created_at desc, entonces el primero es el más reciente)
  const ultimoRegistroPorAlumno = {}
  llamadas.forEach(r => {
    if (!r.alumno?.nombre) return
    if (!ultimoRegistroPorAlumno[r.alumno.nombre]) {
      ultimoRegistroPorAlumno[r.alumno.nombre] = r // ya viene desc, el primero es el más reciente
    }
  })
  const tiposCuenta = { Demo: 0, Real: 0, Fondeo: 0, 'No opera': 0 }
  Object.values(ultimoRegistroPorAlumno).forEach(r => {
    if (r.cuenta && tiposCuenta[r.cuenta] !== undefined) tiposCuenta[r.cuenta]++
  })
  const totalCuentas = Object.values(tiposCuenta).reduce((a, b) => a + b, 0)

  // Tipos de cuenta por programa — alumno único con su último registro
  const cuentasPorPrograma = programas.map(prog => {
    // Último registro por alumno dentro de este programa
    const ultPorAlumnoProg = {}
    llamadas
      .filter(r => r.alumno?.programa === prog && r.cuenta)
      .forEach(r => {
        if (!ultPorAlumnoProg[r.alumno.nombre]) {
          ultPorAlumnoProg[r.alumno.nombre] = r
        }
      })
    const unicos = Object.values(ultPorAlumnoProg)
    return {
      programa:   prog,
      Demo:       unicos.filter(r => r.cuenta === 'Demo').length,
      Real:       unicos.filter(r => r.cuenta === 'Real').length,
      Fondeo:     unicos.filter(r => r.cuenta === 'Fondeo').length,
      'No opera': unicos.filter(r => r.cuenta === 'No opera').length,
    }
  }).filter(p => p.Demo + p.Real + p.Fondeo + p['No opera'] > 0)

  // Distribución de capital real (rangos) — por alumno único, capital más reciente
  const cuentasReales = Object.values(ultimoRegistroPorAlumno)
    .filter(r => r.cuenta === 'Real' && r.capital_real > 0)
  const rangosCapital = [
    { label: '$0-50',      min: 0,    max: 50,   count: 0 },
    { label: '$50-100',    min: 50,   max: 100,  count: 0 },
    { label: '$100-500',   min: 100,  max: 500,  count: 0 },
    { label: '$500-1000',  min: 500,  max: 1000, count: 0 },
    { label: '+$1000',     min: 1000, max: Infinity, count: 0 },
  ]
  cuentasReales.forEach(r => {
    const c = parseFloat(r.capital_real)
    const rango = rangosCapital.find(rg => c >= rg.min && c < rg.max)
    if (rango) rango.count++
  })

  // Fondeo por fase — alumno único con su fase más reciente
  const cuentasFondeo = Object.values(ultimoRegistroPorAlumno).filter(r => r.cuenta === 'Fondeo')
  const fasesFondeo = {
    'Primera fase': cuentasFondeo.filter(r => r.fase_fondeo === 'Primera fase').length,
    'Segunda fase': cuentasFondeo.filter(r => r.fase_fondeo === 'Segunda fase').length,
    'Aprobado':     cuentasFondeo.filter(r => r.fase_fondeo === 'Aprobado').length,
  }

  // Retiros por rango
  const retiros = llamadas.filter(r => r.retiro === 'Sí' && r.monto_retiro > 0)
  const rangosRetiro = [
    { label: '$0-100',    min: 0,   max: 100,  count: 0 },
    { label: '$100-500',  min: 100, max: 500,  count: 0 },
    { label: '$500-1000', min: 500, max: 1000, count: 0 },
    { label: '+$1000',    min: 1000,max: Infinity, count: 0 },
  ]
  retiros.forEach(r => {
    const m = parseFloat(r.monto_retiro)
    const rango = rangosRetiro.find(rg => m >= rg.min && m < rg.max)
    if (rango) rango.count++
  })

  // Beneficio total
  const beneficioTotal = llamadas.filter(r => r.beneficio > 0).reduce((s, r) => s + parseFloat(r.beneficio || 0), 0)

  // Por asesora hoy
  const asesoras = [...new Set(llamadasHoy.map(r => r.asesora?.nombre).filter(Boolean))]
  const statsPorAsesora = asesoras.map(a => {
    const regs = llamadasHoy.filter(r => r.asesora?.nombre === a)
    const resp = regs.filter(r => r.respondio === 'Sí').length
    return { asesora: a, total: regs.length, respondieron: resp, pct: regs.length > 0 ? Math.round((resp/regs.length)*100) : 0 }
  })

  // ── MÉTRICAS RECAUDACIÓN ──────────────────────────────────
  const totalCuotas    = cuotas.length
  const cuotasPagadas  = cuotas.filter(c => c.estado === 'Pagada').length
  const cuotasParciales= cuotas.filter(c => c.estado === 'Pago parcial').length
  const cuotasPendientes = cuotas.filter(c => c.estado === 'No iniciada').length
  const cuotasProrrogas= cuotas.filter(c => c.estado === 'Prórroga').length
  const cuotasReservas = cuotas.filter(c => c.estado === 'Reserva académica').length
  const cuotasRetirados= cuotas.filter(c => c.estado === 'Retirado').length

  // Montos
  const montoTotalPEN  = cuotas.filter(c => c.moneda === 'PEN').reduce((s,c) => s + parseFloat(c.monto||0), 0)
  const montoTotalUSD  = cuotas.filter(c => c.moneda === 'USD').reduce((s,c) => s + parseFloat(c.monto||0), 0)
  const montoPagadoPEN = cuotas.filter(c => c.moneda === 'PEN').reduce((s,c) => s + parseFloat(c.monto_pagado||0), 0)
  const montoPagadoUSD = cuotas.filter(c => c.moneda === 'USD').reduce((s,c) => s + parseFloat(c.monto_pagado||0), 0)
  const saldoPendientePEN = montoTotalPEN - montoPagadoPEN
  const saldoPendienteUSD = montoTotalUSD - montoPagadoUSD

  // Recaudación por programa
  const recaudacionPorPrograma = programas.map(prog => {
    const cs = cuotas.filter(c => c.alumno?.programa === prog)
    const pagadas = cs.filter(c => c.estado === 'Pagada').length
    return { programa: prog, total: cs.length, pagadas, pct: cs.length > 0 ? Math.round((pagadas/cs.length)*100) : 0 }
  }).filter(p => p.total > 0).sort((a,b) => b.total - a.total)

  // ── MÉTRICAS ORIENTACIÓN ──────────────────────────────────
  const totalSesiones      = sesiones.length
  const sesionesConcretadas= sesiones.filter(s => s.estado === 'Concretada').length
  const sesionesReprogram  = sesiones.filter(s => s.estado === 'Reprogramada').length
  const sesionesNoConecto  = sesiones.filter(s => s.estado === 'No se conectó').length
  const alumnosUnicos      = new Set(sesiones.map(s => s.alumno?.nombre).filter(Boolean)).size

  // Motivos frecuentes
  const motivosCount = {}
  sesiones.forEach(s => { if (s.motivo) motivosCount[s.motivo] = (motivosCount[s.motivo]||0)+1 })
  const motivosFrecuentes = Object.entries(motivosCount).sort((a,b)=>b[1]-a[1]).slice(0,5)

  // Herramientas
  const concretadas = sesiones.filter(s => s.estado === 'Concretada')
  const herramientas = {
    'MT5':           concretadas.filter(s => s.tiene_mt5).length,
    'TradingView':   concretadas.filter(s => s.tiene_tradingview).length,
    'Broker':        concretadas.filter(s => s.tiene_broker).length,
    'Ingreso trade': concretadas.filter(s => s.tiene_ingreso_trade).length,
  }

  // Sesiones por programa
  const sesionesPorPrograma = programas.map(prog => ({
    programa: prog,
    total: sesiones.filter(s => s.alumno?.programa === prog).length,
  })).filter(p => p.total > 0).sort((a,b) => b.total - a.total)

  return {
    loading, cargar, lastUpdate, mesFiltro, setMesFiltro,
    hoy, programas,
    // Llamadas
    totalLlamadas, totalAlumnosActivos, alumnosQueRespondieronMes, respondieron: alumnosQueRespondieronMes.size, contactabilidad,
    contactabilidadPorPrograma, tiposCuenta, totalCuentas,
    rangosCapital, cuentasReales, fasesFondeo, retiros, rangosRetiro, cuentasPorPrograma,
    beneficioTotal, llamadasHoy, statsPorAsesora,
    // Recaudación
    totalCuotas, cuotasPagadas, cuotasParciales, cuotasPendientes,
    cuotasProrrogas, cuotasReservas, cuotasRetirados,
    montoTotalPEN, montoTotalUSD, montoPagadoPEN, montoPagadoUSD,
    saldoPendientePEN, saldoPendienteUSD, recaudacionPorPrograma,
    // Orientación
    totalSesiones, sesionesConcretadas, sesionesReprogram, sesionesNoConecto,
    alumnosUnicos, motivosFrecuentes, herramientas, sesionesPorPrograma,
  }
}
