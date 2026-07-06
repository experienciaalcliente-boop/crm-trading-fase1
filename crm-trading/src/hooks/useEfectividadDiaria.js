import { useState, useEffect, useCallback } from 'react'
import { fetchAsesorasLlamadas, fetchRegistrosHoy, fetchSinResponderAcumulado, fetchAgendadasHoy } from '../lib/api'

// Monitoreo diario del supervisor: qué está haciendo cada asesora HOY, sin
// esperar al corte de mes. Reutiliza los mismos fetches que ya alimentan el
// panel de la asesora (registros de hoy, sin responder acumulado), más el
// conteo de llamadas agendadas hoy.
export function useEfectividadDiaria() {
  const [asesoras,     setAsesoras]     = useState([])
  const [registrosHoy, setRegistrosHoy] = useState([])
  const [sinResponder, setSinResponder] = useState([])
  const [agendadasHoy, setAgendadasHoy] = useState([])
  const [loading,      setLoading]      = useState(true)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [as, regs, sinResp, agend] = await Promise.all([
        fetchAsesorasLlamadas(),
        fetchRegistrosHoy(),
        fetchSinResponderAcumulado(),
        fetchAgendadasHoy(),
      ])
      setAsesoras(as)
      setRegistrosHoy(regs)
      setSinResponder(sinResp)
      setAgendadasHoy(agend)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

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

  return { filas, totales, loading, cargar }
}
