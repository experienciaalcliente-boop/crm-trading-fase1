import { useState, useEffect, useCallback } from 'react'
import { fetchAsesorasLlamadas, fetchRegistrosHoy, fetchSinResponderAcumulado, fetchAgendadasHoy,
  fetchAlumnos, fetchEncuestasSatisfaccion, calcularNPS, calcularCSAT, mapaProgramaAsesora,
  distribucionEscala, distribucionCategorica } from '../lib/api'

const hoyStr = () => new Date().toISOString().split('T')[0]

// Monitoreo diario del supervisor: qué está haciendo cada asesora HOY, sin
// esperar al corte de mes. La encuesta de satisfacción es una sección
// aparte — "general" (todo el histórico, como el resumen nativo de Google
// Forms), no atada al día; solo los comentarios se navegan día a día.
export function useEfectividadDiaria() {
  const [asesoras,     setAsesoras]     = useState([])
  const [registrosHoy, setRegistrosHoy] = useState([])
  const [sinResponder, setSinResponder] = useState([])
  const [agendadasHoy, setAgendadasHoy] = useState([])
  const [encuestas,    setEncuestas]    = useState([])
  const [alumnos,      setAlumnos]      = useState([])
  const [loading,      setLoading]      = useState(true)
  const [fecha,        setFecha]        = useState(hoyStr())

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [as, regs, sinResp, agend, enc, als] = await Promise.all([
        fetchAsesorasLlamadas(),
        fetchRegistrosHoy(),
        fetchSinResponderAcumulado(),
        fetchAgendadasHoy(),
        fetchEncuestasSatisfaccion(),
        fetchAlumnos(),
      ])
      setAsesoras(as)
      setRegistrosHoy(regs)
      setSinResponder(sinResp)
      setAgendadasHoy(agend)
      setEncuestas(enc)
      setAlumnos(als)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  // ── Efectividad diaria (hoy, siempre) ──────────────────────
  const filas = asesoras.map(a => {
    const misRegs = registrosHoy.filter(r => r.asesora_id === a.id)
    const respondieron = misRegs.filter(r => r.respondio === 'Sí').length
    const misAgendadas = agendadasHoy.filter(x => x.asesora_id === a.id).length
    const misSinResponder = sinResponder.filter(r => r.asesora?.nombre === a.nombre).length
    return {
      id: a.id,
      nombre: a.nombre,
      llamadasHoy: misRegs.length,
      respondieronHoy: respondieron,
      contactabilidadHoy: misRegs.length > 0 ? Math.round((respondieron / misRegs.length) * 100) : 0,
      agendadasHoy: misAgendadas,
      sinResponderAcumulado: misSinResponder,
    }
  }).sort((a, b) => b.llamadasHoy - a.llamadasHoy)

  const totales = {
    llamadasHoy: registrosHoy.length,
    respondieronHoy: registrosHoy.filter(r => r.respondio === 'Sí').length,
    agendadasHoy: agendadasHoy.length,
  }

  // ── Encuesta de satisfacción — resultados generales (todo el histórico) ──
  const encuestasAsesoria = encuestas.filter(e => e.tipo === 'asesoria')
  const programaAsesoraMap = mapaProgramaAsesora(alumnos)
  const encuestasConAsesora = encuestasAsesoria.map(e => ({ ...e, asesora_id: programaAsesoraMap[e.programa] || null }))
  const nombrePorId = Object.fromEntries(asesoras.map(a => [a.id, a.nombre]))

  const encuestaPorAsesora = asesoras.map(a => {
    const rows = encuestasConAsesora.filter(e => e.asesora_id === a.id)
    return {
      asesoraId: a.id,
      nombre: a.nombre,
      total: rows.length,
      nps: calcularNPS(rows.map(e => e.nps_score)),
      csat: calcularCSAT(rows.map(e => e.csat_label)),
    }
  })

  const encuestaGeneral = {
    total: encuestasAsesoria.length,
    nps: calcularNPS(encuestasAsesoria.map(e => e.nps_score)),
    csat: calcularCSAT(encuestasAsesoria.map(e => e.csat_label)),
    npsDist: distribucionEscala(encuestasAsesoria, 'nps_score', 0, 10),
    csatDist: distribucionCategorica(encuestasAsesoria, 'csat_label'),
    r3Dist: distribucionCategorica(encuestasAsesoria, 'respuesta_3'),
    r4Dist: distribucionCategorica(encuestasAsesoria, 'respuesta_4'),
  }

  // ── Comentarios de un día específico (navegable) ───────────
  const comentariosDelDia = encuestasConAsesora
    .filter(e => e.fecha_respuesta?.slice(0, 10) === fecha)
    .filter(e => e.comentario && e.comentario.trim())
    .map(e => ({ comentario: e.comentario.trim(), programa: e.programa, extra: nombrePorId[e.asesora_id] || 'Sin asignar' }))

  return {
    filas, totales, loading, cargar,
    encuestaPorAsesora, encuestaGeneral,
    fecha, setFecha, comentariosDelDia,
  }
}
