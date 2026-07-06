import { useState, useEffect, useCallback } from 'react'
import { fetchSesionesHoy, fetchSesionesAgendadasHoy } from '../lib/api'

// Mismas asesoras que agendan sesiones en el panel de Orientación Técnica
// (el orientador no agenda — lo hacen ellas en su nombre).
const ASESORAS = ['Fabiola M.', 'Katerin F.', 'Anael S.']

// Monitoreo diario del supervisor para Orientación Técnica: cómo va el
// orientador HOY (sesiones, concretadas, etc.) y cuánto está agendando cada
// asesora hacia él hoy — sin esperar al corte de mes.
export function useEfectividadDiariaOrientacion() {
  const [sesionesHoy,  setSesionesHoy]  = useState([])
  const [agendadasHoy, setAgendadasHoy] = useState([])
  const [loading,      setLoading]      = useState(true)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [sh, ah] = await Promise.all([fetchSesionesHoy(), fetchSesionesAgendadasHoy()])
      setSesionesHoy(sh)
      setAgendadasHoy(ah)
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

  return { stats, filasPorAsesora, loading, cargar }
}
