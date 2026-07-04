// v-2026-06-20 16:06:13
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { programaActivo } from '../lib/api'
import toast from 'react-hot-toast'

// Safe calcularRiesgo — no crashes
function calcularRiesgoLocal(alumno, cuotas, llamadas) {
  if (!alumno) return { score: 0, nivel: 'Bajo' }
  let score = 0
  const hoy = new Date()
  const hoyStr = hoy.toISOString().split('T')[0]

  if (alumno.ultimo_contacto_at) {
    const dias = Math.floor((hoy - new Date(alumno.ultimo_contacto_at + 'T00:00:00')) / 86400000)
    if (dias >= 21) score += 40
    else if (dias >= 15) score += 25
    else if (dias >= 7) score += 15
  } else {
    score += 25
  }

  const cuotasArr = Array.isArray(cuotas) ? cuotas : []
  const vencidas = cuotasArr.filter(c => c && c.fecha_vence && c.fecha_vence < hoyStr && c.estado !== 'Pagada')
  if (vencidas.length >= 2) score += 25
  else if (vencidas.length === 1) score += 15

  const llamadasArr = Array.isArray(llamadas) ? llamadas.filter(Boolean) : []
  const semana = parseInt(alumno.semana_actual) || 0
  const ult = llamadasArr[0]
  if (ult && semana >= 8 && (ult.avance || 0) < 30) score += 15
  if (ult && semana >= 12 && ult.cuenta === 'Demo') score += 10
  if (alumno.nivel_atencion === 'Crítico') score += 10

  score = Math.min(score, 100)
  return { score, nivel: score >= 56 ? 'Alto' : score >= 26 ? 'Medio' : 'Bajo' }
}

async function fetchDashboard() {
  const [r1, r2, r3, r4] = await Promise.all([
    supabase.from('registros_llamadas')
      .select('id, fecha, respondio, avance, cuenta, capital_real, fase_fondeo, beneficio, retiro, monto_retiro, created_at, alumno_id, alumno:alumnos(nombre, programa), asesora:asesoras(nombre)')
      .order('fecha', { ascending: false })
      .limit(2000),
    supabase.from('cuotas')
      .select('id, alumno_id, numero_cuota, fecha_vence, estado, monto, monto_pagado, monto_soles, moneda, tipo_cambio, alumno:alumnos(nombre, programa)'),
    supabase.from('sesiones_orientacion')
      .select('id, alumno_id, fecha, estado, motivo, tiene_mt5, tiene_broker, tiene_tradingview, tiene_ingreso_trade, observaciones, alumno:alumnos(nombre, programa)')
      .order('fecha', { ascending: false })
      .limit(500),
    supabase.from('alumnos')
      .select('id, nombre, programa, estado, semana_actual, asesora, asesora_id, riesgo_nivel, riesgo_score, ultimo_contacto_at, nivel_atencion, estado_operativo, fecha_inicio')
      .in('estado', ['Activo', 'En Curso', 'En Seguimiento', 'activo', 'en curso', 'en seguimiento']),
  ])
  return {
    llamadas:      (r1.data || []).filter(Boolean),
    cuotas:        (r2.data || []).filter(Boolean),
    sesiones:      (r3.data || []).filter(Boolean),
    alumnosActivos:(r4.data || []).filter(Boolean).filter(programaActivo),
  }
}

export function useDashboard() {
  const { user } = useAuth()
  const [mesFiltro, setMesFiltro] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
  })
  const [raw,     setRaw]     = useState({ llamadas:[], cuotas:[], sesiones:[], alumnosActivos:[] })
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())

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
  const alumnosActivos = esAsesora
    ? (raw.alumnosActivos || []).filter(a => a.asesora_id === user.asesora_id)
    : (raw.alumnosActivos || [])
  const misAlumnoIds = esAsesora ? new Set(alumnosActivos.map(a => a.id)) : null
  const llamadas = esAsesora ? (raw.llamadas || []).filter(l => misAlumnoIds.has(l.alumno_id)) : (raw.llamadas || [])
  const cuotas   = esAsesora ? (raw.cuotas   || []).filter(c => misAlumnoIds.has(c.alumno_id)) : (raw.cuotas   || [])
  const sesiones = esAsesora ? (raw.sesiones || []).filter(s => misAlumnoIds.has(s.alumno_id)) : (raw.sesiones || [])
  const hoy = new Date().toISOString().split('T')[0]

  // Rango del mes
  const [anio, mes] = mesFiltro.split('-').map(Number)
  const inicioMes = `${mesFiltro}-01`
  const finMes    = `${mesFiltro}-${String(new Date(anio, mes, 0).getDate()).padStart(2,'0')}`
  const llamadasMes = llamadas.filter(r => r.fecha >= inicioMes && r.fecha <= finMes)
  const cuotasMes   = cuotas.filter(c => c.fecha_vence >= inicioMes && c.fecha_vence <= finMes)
  const sesionesMes = sesiones.filter(s => s.fecha >= inicioMes && s.fecha <= finMes)
  const llamadasHoy = llamadas.filter(r => r.fecha === hoy)

  const TC_DEFAULT = 3.6
  const tcPorAlumno = {}
  cuotas.forEach(c => {
    if (c.tipo_cambio && parseFloat(c.tipo_cambio) > 1 && c.alumno?.nombre)
      tcPorAlumno[c.alumno.nombre] = parseFloat(c.tipo_cambio)
  })

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
    const { score, nivel } = calcularRiesgoLocal(al, cuotasAl, hists)
    return { ...al, riesgo_score: score, riesgo_nivel: nivel }
  })

  const riesgoBajo  = alumnosConRiesgo.filter(a => a.riesgo_nivel === 'Bajo').length
  const riesgoMedio = alumnosConRiesgo.filter(a => a.riesgo_nivel === 'Medio').length
  const riesgoAlto  = alumnosConRiesgo.filter(a => a.riesgo_nivel === 'Alto').length
  const alumnosRiesgoAlto = alumnosConRiesgo
    .filter(a => a.riesgo_nivel === 'Alto')
    .sort((a, b) => b.riesgo_score - a.riesgo_score)

  // ── Último contacto ───────────────────────────────────────
  const segContacto = { reciente:0, d7:0, d14:0, d21:0, sinContacto:0 }
  alumnosConRiesgo.forEach(al => {
    if (!al.ultimo_contacto_at) { segContacto.sinContacto++; return }
    const dias = Math.floor((new Date() - new Date(al.ultimo_contacto_at + 'T00:00:00')) / 86400000)
    if (dias < 7)       segContacto.reciente++
    else if (dias < 14) segContacto.d7++
    else if (dias < 21) segContacto.d14++
    else                segContacto.d21++
  })

  // ── Contactabilidad ───────────────────────────────────────
  const alumnosQueRespondieronMes = new Set(
    llamadasMes.filter(r => r.respondio === 'Sí').map(r => r.alumno?.nombre).filter(Boolean)
  )
  const contactabilidad = totalAlumnosActivos > 0
    ? Math.round((alumnosQueRespondieronMes.size / totalAlumnosActivos) * 100) : 0

  const contactabilidadPorPrograma = programas.map(prog => {
    const alumnosProg = alumnosActivos.filter(a => a.programa === prog)
    const respondieron = new Set(
      llamadasMes.filter(r => r.alumno?.programa === prog && r.respondio === 'Sí')
        .map(r => r.alumno?.nombre).filter(Boolean)
    )
    return {
      programa: prog, total: alumnosProg.length, respondieron: respondieron.size,
      pct: alumnosProg.length > 0 ? Math.round((respondieron.size / alumnosProg.length) * 100) : 0
    }
  }).sort((a,b) => b.total - a.total)

  // ── Pipeline Demo→Real→Fondeo (historial completo) ────────
  const ultimoRegPorAlumno = {}
  llamadas.forEach(r => {
    const nombre = r.alumno?.nombre
    if (!nombre || !r.cuenta) return
    if (!ultimoRegPorAlumno[nombre]) ultimoRegPorAlumno[nombre] = r
  })

  const pipeline = { Demo:0, Real:0, Fondeo:0, 'No opera':0, 'Sin registro':0 }
  alumnosActivos.forEach(al => {
    const ult = ultimoRegPorAlumno[al.nombre]
    if (!ult) { pipeline['Sin registro']++; return }
    if (pipeline[ult.cuenta] !== undefined) pipeline[ult.cuenta]++
    else pipeline['Sin registro']++
  })

  const pipelinePorPrograma = programas.map(prog => {
    const ultProg = {}
    llamadas.filter(r => r.alumno?.programa === prog && r.cuenta).forEach(r => {
      const n = r.alumno?.nombre
      if (n && !ultProg[n]) ultProg[n] = r
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

  const alumnosDemoEstancados = alumnosActivos.filter(al => {
    const ult    = ultimoRegPorAlumno[al.nombre]
    const semana = parseInt(al.semana_actual) || 0
    return ult && ult.cuenta === 'Demo' && semana >= 12
  })

  // ── Activación ────────────────────────────────────────────
  const alumnosActivados = alumnosActivos.filter(al => {
    const ult = ultimoRegPorAlumno[al.nombre]
    if (!ult || !ult.cuenta || ult.cuenta === 'No opera') return false
    if ((ult.avance || 0) < 20) return false
    if (!al.ultimo_contacto_at) return false
    return Math.floor((new Date() - new Date(al.ultimo_contacto_at + 'T00:00:00')) / 86400000) <= 14
  })
  const pctActivacion = totalAlumnosActivos > 0
    ? Math.round((alumnosActivados.length / totalAlumnosActivos) * 100) : 0

  const activacionPorPrograma = programas.map(prog => {
    const alumnosProg  = alumnosActivos.filter(a => a.programa === prog)
    const activadosProg = alumnosProg.filter(al => {
      const ult = ultimoRegPorAlumno[al.nombre]
      if (!ult || !ult.cuenta || ult.cuenta === 'No opera') return false
      if ((ult.avance || 0) < 20) return false
      if (!al.ultimo_contacto_at) return false
      return Math.floor((new Date() - new Date(al.ultimo_contacto_at + 'T00:00:00')) / 86400000) <= 14
    })
    return {
      programa: prog, total: alumnosProg.length, activados: activadosProg.length,
      pct: alumnosProg.length > 0 ? Math.round((activadosProg.length / alumnosProg.length) * 100) : 0
    }
  })

  // ── Desempeño por asesora ─────────────────────────────────
  const todasAsesoras = [...new Set(alumnosActivos.map(a => a.asesora).filter(Boolean))]
  const desempenoPorAsesora = todasAsesoras.map(asesora => {
    const misAlumnos  = alumnosActivos.filter(a => a.asesora === asesora)
    const misLlamadas = llamadasMes.filter(r => r.asesora?.nombre === asesora)
    const unicosContactados = new Set(
      misLlamadas.filter(r => r.respondio === 'Sí').map(r => r.alumno?.nombre).filter(Boolean)
    )
    const contactabilidadAs = misAlumnos.length > 0
      ? Math.round((unicosContactados.size / misAlumnos.length) * 100) : 0
    const riesgoAltoAs = alumnosConRiesgo.filter(a => a.asesora === asesora && a.riesgo_nivel === 'Alto').length
    const sinContacto7 = misAlumnos.filter(al => {
      if (!al.ultimo_contacto_at) return true
      return Math.floor((new Date() - new Date(al.ultimo_contacto_at + 'T00:00:00')) / 86400000) >= 7
    }).length
    return { asesora, totalAlumnos:misAlumnos.length, llamadasMes:misLlamadas.length,
      contactabilidad:contactabilidadAs, unicosContactados:unicosContactados.size,
      riesgoAlto:riesgoAltoAs, sinContacto7 }
  }).sort((a,b) => b.contactabilidad - a.contactabilidad)

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

  const beneficioTotal = llamadasMes.filter(r => r.beneficio > 0).reduce((s, r) => {
    const tc = tcPorAlumno[r.alumno?.nombre] || TC_DEFAULT
    return s + (parseFloat(r.beneficio || 0) * tc)
  }, 0)

  const statsPorAsesora = [...new Set(llamadasHoy.map(r => r.asesora?.nombre).filter(Boolean))].map(a => {
    const regs = llamadasHoy.filter(r => r.asesora?.nombre === a)
    const resp = regs.filter(r => r.respondio === 'Sí').length
    return { asesora:a, total:regs.length, respondieron:resp, pct:regs.length > 0 ? Math.round(resp/regs.length*100) : 0 }
  })

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
  const montoTotalUSD    = cuotasMes.filter(c => c.moneda === 'USD').reduce((s,c) => s + parseFloat(c.monto||0), 0)
  const montoPagadoUSD   = cuotasMes.filter(c => c.moneda === 'USD').reduce((s,c) => s + parseFloat(c.monto_pagado||0), 0)
  const saldoPendienteUSD = montoTotalUSD - montoPagadoUSD

  const en7d  = new Date(Date.now() + 7  * 86400000).toISOString().split('T')[0]
  const en15d = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
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

  return {
    loading, cargar, lastUpdate, mesFiltro, setMesFiltro,
    hoy, programas, alumnosConRiesgo,
    riesgoBajo, riesgoMedio, riesgoAlto, alumnosRiesgoAlto,
    segContacto,
    pipeline, pipelinePorPrograma, alumnosDemoEstancados,
    alumnosActivados, pctActivacion, activacionPorPrograma,
    desempenoPorAsesora,
    totalAlumnosActivos, totalLlamadas:llamadasMes.length,
    alumnosQueRespondieronMes, respondieron:alumnosQueRespondieronMes.size,
    contactabilidad, contactabilidadPorPrograma,
    tiposCuenta, totalCuentas, cuentasPorPrograma,
    rangosCapital, cuentasReales, totalCuentasReales, fasesFondeo,
    retiros, beneficioTotal, llamadasHoy, statsPorAsesora,
    totalCuotas, cuotasPagadas, cuotasParciales, cuotasPendientes,
    cuotasProrrogas, cuotasReservas, cuotasRetirados,
    montoTotalPEN, montoTotalUSD, montoPagadoPEN, montoPagadoUSD,
    saldoPendientePEN, saldoPendienteUSD, recaudacionPorPrograma,
    proximas7, proximas15, montoProximas7, montoProximas15,
    totalSesiones, sesionesConcretadas, sesionesReprogram, sesionesNoConecto,
    alumnosUnicos, motivosFrecuentes, herramientas, sesionesPorPrograma,
  }
}
