import { useState, useEffect, useCallback } from 'react'
import { fetchAsesorasLlamadas, fetchRegistrosHoy, fetchSinResponderAcumulado, fetchAgendadasHoy,
  fetchAlumnos, fetchEncuestasSatisfaccion, calcularNPS, calcularCSAT, mapaProgramaAsesora } from '../lib/api'

// Monitoreo diario del supervisor: qué está haciendo cada asesora HOY, sin
// esperar al corte de mes. Reutiliza los mismos fetches que ya alimentan el
// panel de la asesora (registros de hoy, sin responder acumulado), más el
// conteo de llamadas agendadas hoy y el NPS/CSAT del mes (cruzado por
// programa→asesora, ver mapaProgramaAsesora en lib/api.js).
export function useEfectividadDiaria() {
  const [asesoras,     setAsesoras]     = useState([])
  const [registrosHoy, setRegistrosHoy] = useState([])
  const [sinResponder, setSinResponder] = useState([])
  const [agendadasHoy, setAgendadasHoy] = useState([])
  const [encuestas,    setEncuestas]    = useState([])
  const [alumnos,      setAlumnos]      = useState([])
  const [loading,      setLoading]      = useState(true)

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

  const mesActual = new Date().toISOString().slice(0, 7)
  const encuestasMes = encuestas.filter(e => e.tipo === 'asesoria' && e.fecha_respuesta?.slice(0, 7) === mesActual)
  const programaAsesoraMap = mapaProgramaAsesora(alumnos)
  const encuestasConAsesora = encuestasMes.map(e => ({ ...e, asesora_id: programaAsesoraMap[e.programa] || null }))

  const filas = asesoras.map(a => {
    const misRegs = registrosHoy.filter(r => r.asesora_id === a.id)
    const respondieron = misRegs.filter(r => r.respondio === 'Sí').length
    const misAgendadas = agendadasHoy.filter(x => x.asesora_id === a.id).length
    const misSinResponder = sinResponder.filter(r => r.asesora?.nombre === a.nombre).length
    const misEncuestas = encuestasConAsesora.filter(e => e.asesora_id === a.id)
    return {
      id: a.id,
      nombre: a.nombre,
      llamadasHoy: misRegs.length,
      respondieronHoy: respondieron,
      contactabilidadHoy: misRegs.length > 0 ? Math.round((respondieron / misRegs.length) * 100) : 0,
      agendadasHoy: misAgendadas,
      sinResponderAcumulado: misSinResponder,
      nps: calcularNPS(misEncuestas.map(e => e.nps_score)),
      csat: calcularCSAT(misEncuestas.map(e => e.csat_label)),
    }
  }).sort((a, b) => b.llamadasHoy - a.llamadasHoy)

  const totales = {
    llamadasHoy: registrosHoy.length,
    respondieronHoy: registrosHoy.filter(r => r.respondio === 'Sí').length,
    agendadasHoy: agendadasHoy.length,
  }

  return { filas, totales, loading, cargar }
}
