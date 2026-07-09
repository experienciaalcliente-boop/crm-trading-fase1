import { useState, useEffect, useCallback } from 'react'
import { fetchSesionesFecha, fetchSesionesAgendadasFecha, fetchOrientadorId, fetchHistorialSesiones,
  fetchEncuestasSatisfaccion, calcularNPS, calcularCSAT } from '../lib/api'

// Mismas asesoras que agendan sesiones en el panel de Orientación Técnica
// (el orientador no agenda — lo hacen ellas en su nombre).
const ASESORAS = ['Fabiola M.', 'Katerin F.', 'Anael S.']
const hoyStr = () => new Date().toISOString().split('T')[0]

// Monitoreo diario del supervisor para Orientación Técnica: cómo va el
// orientador en la fecha seleccionada (sesiones, concretadas, etc. — por
// defecto hoy, pero el supervisor puede elegir otro día), cuánto agendó
// cada asesora hacia él ese día, y los indicadores propios del orientador
// (mismos que ya existen en el Dashboard: Efectividad, motivos,
// herramientas) — acá también para no obligar al supervisor a saltar de
// pestaña.
export function useEfectividadDiariaOrientacion() {
  const [fecha,        setFecha]        = useState(hoyStr())
  const [sesionesDia,  setSesionesDia]  = useState([])
  const [agendadasDia, setAgendadasDia] = useState([])
  const [sesionesMes,  setSesionesMes]  = useState([])
  const [encuestas,    setEncuestas]    = useState([])
  const [loading,      setLoading]      = useState(true)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const orientadorId = await fetchOrientadorId()
      const mesActual = new Date().toISOString().slice(0, 7)
      const [sd, ad, sm, enc] = await Promise.all([
        fetchSesionesFecha(fecha),
        fetchSesionesAgendadasFecha(fecha),
        fetchHistorialSesiones(orientadorId, mesActual),
        fetchEncuestasSatisfaccion(),
      ])
      setSesionesDia(sd)
      setAgendadasDia(ad)
      setSesionesMes(sm)
      setEncuestas(enc)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [fecha])

  useEffect(() => { cargar() }, [cargar])

  const stats = {
    total:          sesionesDia.length,
    concretadas:    sesionesDia.filter(s => s.estado === 'Concretada').length,
    reprogramadas:  sesionesDia.filter(s => s.estado === 'Reprogramada').length,
    noConectaron:   sesionesDia.filter(s => s.estado === 'No se conectó').length,
    agendadasHoy:   agendadasDia.length,
  }

  const filasPorAsesora = ASESORAS.map(nombre => {
    const misSesionesDia = sesionesDia.filter(s => s.agendado_por === nombre)
    const misAgendadasDia = agendadasDia.filter(s => s.agendado_por === nombre).length
    return {
      nombre,
      sesionesHoy: misSesionesDia.length,
      concretadas: misSesionesDia.filter(s => s.estado === 'Concretada').length,
      agendadasHoy: misAgendadasDia,
    }
  })

  // ── Indicadores propios del orientador (mes actual) ────────
  // Misma definición de Efectividad ya usada en el Dashboard: % de alumnos
  // que NO volvieron a agendar tras una sesión Concretada, sobre el total
  // de sesiones Concretadas del mes.
  const concretadasMes = sesionesMes.filter(s => s.estado === 'Concretada')
  const sesionesPorAlumno = {}
  concretadasMes.forEach(s => {
    if (!s.alumno_id) return
    sesionesPorAlumno[s.alumno_id] = (sesionesPorAlumno[s.alumno_id] || 0) + 1
  })
  const alumnosSinVolver = Object.values(sesionesPorAlumno).filter(n => n === 1).length
  const efectividad = concretadasMes.length > 0 ? Math.round((alumnosSinVolver / concretadasMes.length) * 100) : 0

  const motivosCount = {}
  sesionesMes.forEach(s => { if (s.motivo) motivosCount[s.motivo] = (motivosCount[s.motivo] || 0) + 1 })
  const motivosFrecuentes = Object.entries(motivosCount).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const herramientas = {
    'MT5':         concretadasMes.filter(s => s.tiene_mt5).length,
    'TradingView': concretadasMes.filter(s => s.tiene_tradingview).length,
    'Broker':      concretadasMes.filter(s => s.tiene_broker).length,
    'MT5 Sync':    concretadasMes.filter(s => s.tiene_ingreso_trade).length,
  }

  // El NPS/SAT de esta encuesta es del orientador (solo hay uno) — no tiene
  // sentido desglosarlo por asesora, porque la asesora solo agenda la
  // sesión, no la da ella.
  const mesActual = new Date().toISOString().slice(0, 7)
  const encuestasMes = encuestas.filter(e => e.tipo === 'orientacion' && e.fecha_respuesta?.slice(0, 7) === mesActual)

  const indicadoresOrientador = {
    totalSesionesMes: sesionesMes.length,
    concretadasMes: concretadasMes.length,
    alumnosUnicosMes: new Set(sesionesMes.map(s => s.alumno_id).filter(Boolean)).size,
    efectividad,
    motivosFrecuentes,
    herramientas,
    nps: calcularNPS(encuestasMes.map(e => e.nps_score)),
    csat: calcularCSAT(encuestasMes.map(e => e.csat_label)),
    totalEncuestas: encuestasMes.length,
  }

  return { stats, filasPorAsesora, indicadoresOrientador, loading, cargar, fecha, setFecha }
}
