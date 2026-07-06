import { useState, useEffect, useCallback } from 'react'
import { fetchSesionesHoy, fetchSesionesAgendadasHoy, fetchOrientadorId, fetchHistorialSesiones } from '../lib/api'

// Mismas asesoras que agendan sesiones en el panel de Orientación Técnica
// (el orientador no agenda — lo hacen ellas en su nombre).
const ASESORAS = ['Fabiola M.', 'Katerin F.', 'Anael S.']

// Monitoreo diario del supervisor para Orientación Técnica: cómo va el
// orientador HOY (sesiones, concretadas, etc.), cuánto está agendando cada
// asesora hacia él hoy, y los indicadores propios del orientador (mismos
// que ya existen en el Dashboard: Efectividad, motivos, herramientas) — acá
// también para no obligar al supervisor a saltar de pestaña.
export function useEfectividadDiariaOrientacion() {
  const [sesionesHoy,  setSesionesHoy]  = useState([])
  const [agendadasHoy, setAgendadasHoy] = useState([])
  const [sesionesMes,  setSesionesMes]  = useState([])
  const [loading,      setLoading]      = useState(true)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const orientadorId = await fetchOrientadorId()
      const mesActual = new Date().toISOString().slice(0, 7)
      const [sh, ah, sm] = await Promise.all([
        fetchSesionesHoy(),
        fetchSesionesAgendadasHoy(),
        fetchHistorialSesiones(orientadorId, mesActual),
      ])
      setSesionesHoy(sh)
      setAgendadasHoy(ah)
      setSesionesMes(sm)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const stats = {
    total:          sesionesHoy.length,
    concretadas:    sesionesHoy.filter(s => s.estado === 'Concretada').length,
    reprogramadas:  sesionesHoy.filter(s => s.estado === 'Reprogramada').length,
    noConectaron:   sesionesHoy.filter(s => s.estado === 'No se conectó').length,
    agendadasHoy:   agendadasHoy.length,
  }

  const filasPorAsesora = ASESORAS.map(nombre => {
    const misSesionesHoy = sesionesHoy.filter(s => s.agendado_por === nombre)
    const misAgendadasHoy = agendadasHoy.filter(s => s.agendado_por === nombre).length
    return {
      nombre,
      sesionesHoy: misSesionesHoy.length,
      concretadas: misSesionesHoy.filter(s => s.estado === 'Concretada').length,
      agendadasHoy: misAgendadasHoy,
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

  const indicadoresOrientador = {
    totalSesionesMes: sesionesMes.length,
    concretadasMes: concretadasMes.length,
    alumnosUnicosMes: new Set(sesionesMes.map(s => s.alumno_id).filter(Boolean)).size,
    efectividad,
    motivosFrecuentes,
    herramientas,
  }

  return { stats, filasPorAsesora, indicadoresOrientador, loading, cargar }
}
