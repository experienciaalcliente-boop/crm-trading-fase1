import { useState, useEffect, useCallback } from 'react'
import { fetchSesionesFecha, fetchSesionesAgendadasFecha,
  fetchEncuestasSatisfaccion, calcularNPS, calcularCSAT } from '../lib/api'

// Mismas asesoras que agendan sesiones en el panel de Orientación Técnica
// (el orientador no agenda — lo hacen ellas en su nombre).
const ASESORAS = ['Fabiola M.', 'Katerin F.', 'Anael S.']
const hoyStr = () => new Date().toISOString().split('T')[0]

// Monitoreo diario del supervisor para Orientación Técnica: cómo va el
// orientador HOY (sesiones, concretadas, etc. — siempre hoy, fijo) y cuánto
// agendó cada asesora hacia él hoy. Los "Indicadores del orientador" son un
// bloque aparte que sí se puede navegar día a día con `fecha` (por defecto
// hoy) — es el único filtro que el supervisor pidió, y solo afecta a ese
// bloque, no al monitoreo de arriba.
export function useEfectividadDiariaOrientacion() {
  const [sesionesHoy,  setSesionesHoy]  = useState([])
  const [agendadasHoy, setAgendadasHoy] = useState([])
  const [fecha,        setFecha]        = useState(hoyStr())
  const [sesionesDia,  setSesionesDia]  = useState([])
  const [encuestas,    setEncuestas]    = useState([])
  const [loading,      setLoading]      = useState(true)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const hoy = hoyStr()
      const [sh, ah, sd, enc] = await Promise.all([
        fetchSesionesFecha(hoy),
        fetchSesionesAgendadasFecha(hoy),
        fetchSesionesFecha(fecha),
        fetchEncuestasSatisfaccion(),
      ])
      setSesionesHoy(sh)
      setAgendadasHoy(ah)
      setSesionesDia(sd)
      setEncuestas(enc)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [fecha])

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

  // ── Indicadores propios del orientador (día seleccionado) ──
  // Misma definición de Efectividad ya usada en el Dashboard: % de alumnos
  // que NO volvieron a agendar tras una sesión Concretada, sobre el total
  // de sesiones Concretadas de ese día.
  const concretadasDia = sesionesDia.filter(s => s.estado === 'Concretada')
  const sesionesPorAlumno = {}
  concretadasDia.forEach(s => {
    if (!s.alumno_id) return
    sesionesPorAlumno[s.alumno_id] = (sesionesPorAlumno[s.alumno_id] || 0) + 1
  })
  const alumnosSinVolver = Object.values(sesionesPorAlumno).filter(n => n === 1).length
  const efectividad = concretadasDia.length > 0 ? Math.round((alumnosSinVolver / concretadasDia.length) * 100) : 0

  const motivosCount = {}
  sesionesDia.forEach(s => { if (s.motivo) motivosCount[s.motivo] = (motivosCount[s.motivo] || 0) + 1 })
  const motivosFrecuentes = Object.entries(motivosCount).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const herramientas = {
    'MT5':         concretadasDia.filter(s => s.tiene_mt5).length,
    'TradingView': concretadasDia.filter(s => s.tiene_tradingview).length,
    'Broker':      concretadasDia.filter(s => s.tiene_broker).length,
    'MT5 Sync':    concretadasDia.filter(s => s.tiene_ingreso_trade).length,
  }

  // El NPS/SAT de esta encuesta es del orientador (solo hay uno) — no tiene
  // sentido desglosarlo por asesora, porque la asesora solo agenda la
  // sesión, no la da ella.
  const encuestasDia = encuestas.filter(e => e.tipo === 'orientacion' && e.fecha_respuesta?.slice(0, 10) === fecha)
  const comentarios = encuestasDia
    .filter(e => e.comentario && e.comentario.trim())
    .map(e => ({ comentario: e.comentario.trim(), programa: e.programa, fecha: e.fecha_respuesta }))
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))

  const indicadoresOrientador = {
    totalSesionesDia: sesionesDia.length,
    concretadasDia: concretadasDia.length,
    alumnosUnicosDia: new Set(sesionesDia.map(s => s.alumno_id).filter(Boolean)).size,
    efectividad,
    motivosFrecuentes,
    herramientas,
    nps: calcularNPS(encuestasDia.map(e => e.nps_score)),
    csat: calcularCSAT(encuestasDia.map(e => e.csat_label)),
    totalEncuestas: encuestasDia.length,
    comentarios,
  }

  return { stats, filasPorAsesora, indicadoresOrientador, loading, cargar, fecha, setFecha }
}
