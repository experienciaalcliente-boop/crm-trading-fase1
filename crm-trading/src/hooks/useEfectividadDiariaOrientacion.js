import { useState, useEffect, useCallback } from 'react'
import { fetchSesionesFecha, fetchSesionesAgendadasFecha, fetchHistorialSesiones,
  fetchEncuestasSatisfaccion, calcularNPS, calcularCSAT, distribucionEscala, distribucionCategorica, hoyLima } from '../lib/api'

// Mismas asesoras que agendan sesiones en el panel de Orientación Técnica
// (el orientador no agenda — lo hacen ellas en su nombre).
const ASESORAS = ['Fabiola M.', 'Katerin F.', 'Anael S.']
const hoyStr = hoyLima

// Monitoreo del supervisor para Orientación Técnica: dos filtros de tiempo
// independientes.
// - "Gestión del día" (stats, filasPorAsesora): un día puntual, navegable con
//   `fecha` (por defecto hoy) — cuánto agendó cada asesora y cómo le fue al
//   orientador ESE día.
// - "Indicadores del orientador" (motivos, herramientas, efectividad): todo
//   el mes seleccionado con `mesIndicadores`, no solo un día — mismo criterio
//   que el selector de mes del Historial completo del propio orientador.
// La encuesta de satisfacción en sí (NPS/SAT) es "general" (todo el
// histórico), aparte de ambos filtros.
export function useEfectividadDiariaOrientacion() {
  const [sesionesDia,  setSesionesDia]  = useState([])
  const [agendadasDia, setAgendadasDia] = useState([])
  const [fecha,        setFecha]        = useState(hoyStr())
  const [sesionesMes,  setSesionesMes]  = useState([])
  const [mesIndicadores, setMesIndicadores] = useState(() => hoyStr().slice(0, 7))
  const [encuestas,    setEncuestas]    = useState([])
  const [loading,      setLoading]      = useState(true)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [sd, ad, sm, enc] = await Promise.all([
        fetchSesionesFecha(fecha),
        fetchSesionesAgendadasFecha(fecha),
        fetchHistorialSesiones(undefined, mesIndicadores),
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
  }, [fecha, mesIndicadores])

  useEffect(() => { cargar() }, [cargar])

  // ── Gestión del día (día seleccionado con `fecha`) ──
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

  // ── Indicadores operativos del orientador (mes seleccionado) ──
  // Misma definición de Efectividad ya usada en el Dashboard: % de alumnos
  // que NO volvieron a agendar tras una sesión Concretada, sobre el total
  // de sesiones Concretadas de ese mes.
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
    totalSesionesDia: sesionesMes.length,
    concretadasDia: concretadasMes.length,
    alumnosUnicosDia: new Set(sesionesMes.map(s => s.alumno_id).filter(Boolean)).size,
    efectividad,
    motivosFrecuentes,
    herramientas,
  }

  // ── Encuesta de satisfacción — resultados generales (todo el histórico) ──
  // El NPS/SAT de esta encuesta es del orientador (solo hay uno) — no tiene
  // sentido desglosarlo por asesora, porque la asesora solo agenda la
  // sesión, no la da ella.
  const encuestasOrientacion = encuestas.filter(e => e.tipo === 'orientacion')
  const encuestaGeneral = {
    total: encuestasOrientacion.length,
    nps: calcularNPS(encuestasOrientacion.map(e => e.nps_score)),
    csat: calcularCSAT(encuestasOrientacion.map(e => e.csat_label)),
    npsDist: distribucionEscala(encuestasOrientacion, 'nps_score', 0, 10),
    csatDist: distribucionCategorica(encuestasOrientacion, 'csat_label'),
    r3Dist: distribucionCategorica(encuestasOrientacion, 'respuesta_3'),
    r4Dist: distribucionCategorica(encuestasOrientacion, 'respuesta_4'),
  }

  // ── Comentarios del día seleccionado (mismo `fecha` de Gestión del día) ──
  const comentariosDelDia = encuestasOrientacion
    .filter(e => e.fecha_respuesta?.slice(0, 10) === fecha)
    .filter(e => e.comentario && e.comentario.trim())
    .map(e => ({ comentario: e.comentario.trim(), programa: e.programa }))

  return {
    stats, filasPorAsesora, indicadoresOrientador, loading, cargar,
    fecha, setFecha, mesIndicadores, setMesIndicadores,
    comentariosDelDia, encuestaGeneral,
  }
}
