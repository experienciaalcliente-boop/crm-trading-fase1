import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const FRENTES = ['Retirados', 'Level Up', 'Retención', 'Datos', 'Impulso', 'Gestión']

async function fetchCoordinacion() {
  const [rTareas, rIdeas, rLog, rSupuestos, rSegmentos, rAcciones] = await Promise.all([
    supabase.from('panel_tareas').select('*').order('orden_original', { ascending: true }),
    supabase.from('panel_ideas').select('*').order('created_at', { ascending: false }),
    supabase.from('panel_log').select('*').order('cuando', { ascending: false }).limit(8),
    supabase.from('panel_supuestos').select('*'),
    supabase.from('recuperacion_2026_alumnos').select('segmento, deuda_usd, estado_campana, excluido'),
    supabase.from('panel_acciones_pendientes').select('*').order('created_at', { ascending: false }),
  ])
  const supuestos = {}
  ;(rSupuestos.data || []).forEach(s => { supuestos[s.clave] = s.valor })
  return {
    tareas: rTareas.data || [],
    ideas: rIdeas.data || [],
    log: rLog.data || [],
    supuestos,
    segmentos: rSegmentos.data || [],
    acciones: rAcciones.data || [],
  }
}

export function useCoordinacion() {
  const [raw, setRaw] = useState({ tareas: [], ideas: [], log: [], supuestos: {}, segmentos: [], acciones: [] })
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('Todas')
  const [draft, setDraft] = useState('')

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchCoordinacion()
      setRaw(data)
    } catch (err) {
      toast.error('Error al cargar el panel de coordinación')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  useEffect(() => {
    const ch = supabase.channel('coordinacion-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'panel_tareas' }, cargar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'panel_ideas' }, cargar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'panel_log' }, cargar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'panel_acciones_pendientes' }, cargar)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [cargar])

  const num = (clave, def = 0) => {
    const v = raw.supuestos[clave]
    return v === undefined ? def : parseFloat(v)
  }

  const hoy = new Date()
  const diasHasta = (fechaISO) => {
    if (!fechaISO) return null
    const d = new Date(fechaISO + 'T00:00:00')
    return Math.round((d - new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())) / 86400000)
  }

  const tareasConEstado = raw.tareas.map(t => {
    const dias = diasHasta(t.fecha_limite)
    const vencida = t.estado !== 'Hecho' && t.estado !== 'Programada' && dias !== null && dias < 0
    const urgente = t.estado !== 'Hecho' && t.estado !== 'Programada' && dias !== null && dias >= 0 && dias <= 3
    return { ...t, dias, vencida, urgente }
  })

  let tareasFiltradas = tareasConEstado
  if (filtro === 'Urgentes') tareasFiltradas = tareasConEstado.filter(t => t.vencida || t.urgente)
  else if (filtro === 'Esta semana') tareasFiltradas = tareasConEstado.filter(t => t.dias !== null && t.dias >= 0 && t.dias <= 7)
  else if (FRENTES.includes(filtro)) tareasFiltradas = tareasConEstado.filter(t => t.frente === filtro)

  const hechas = tareasConEstado.filter(t => t.estado === 'Hecho').length
  const vencidas = tareasConEstado.filter(t => t.vencida).length
  const urgentes = tareasConEstado.filter(t => t.urgente).length

  const agenda = tareasConEstado
    .filter(t => t.estado !== 'Hecho' && t.dias !== null && t.dias >= 0)
    .sort((a, b) => a.dias - b.dias)
    .slice(0, 8)

  const segmentosResumen = ['A', 'B', 'C', 'D'].map(seg => {
    const filas = raw.segmentos.filter(s => s.segmento === seg && !s.excluido)
    return {
      segmento: seg,
      personas: filas.length,
      deuda: filas.reduce((s, f) => s + (parseFloat(f.deuda_usd) || 0), 0),
      enSecuencia: filas.filter(f => (f.estado_campana || '').startsWith('Correo')).length,
      pendientes: filas.filter(f => f.estado_campana === 'Pendiente').length,
    }
  })
  const totalPersonas = segmentosResumen.reduce((s, r) => s + r.personas, 0)
  const totalDeuda = segmentosResumen.reduce((s, r) => s + r.deuda, 0)

  const metaRecuperacion = num('meta_recuperacion_usd', 150000)
  const proyRecuperacion = num('proyeccion_recuperacion_90d_usd')
  const proyLevelUp = num('proyeccion_levelup_90d_usd')
  const proyImpulso = num('proyeccion_impulso_90d_usd')
  const proyeccionTotal = proyRecuperacion + proyLevelUp + proyImpulso

  const goals = [
    {
      label: 'Recuperación de cartera', value: `USD ${Math.round(proyRecuperacion).toLocaleString('en-US')}`,
      target: `meta ${Math.round(metaRecuperacion).toLocaleString('en-US')}`,
      pct: Math.min(100, metaRecuperacion > 0 ? (proyRecuperacion / metaRecuperacion) * 100 : 0),
      nota: `Segmentos A–D con tasas conservadoras`,
    },
    {
      label: 'Retención por cohorte', value: `${Math.round(num('retencion_actual') * 100)}%`,
      target: `meta ${Math.round(num('meta_retencion') * 100)}%`,
      pct: num('retencion_actual') * 100,
      nota: 'Punto de ruptura: mes 2 (42% de los retiros)',
    },
    {
      label: 'Level Up · aula y seminarios', value: `USD ${Math.round(proyLevelUp).toLocaleString('en-US')}`,
      target: `base ${Math.round(num('base_contactable_email')).toLocaleString('en-US')} contactos`,
      pct: 44, nota: 'Bloqueado hasta el export de exalumnos sin deuda',
    },
    {
      label: 'Impulso BURS al egreso', value: `USD ${Math.round(proyImpulso).toLocaleString('en-US')}`,
      target: `${num('egresados_por_cohorte_mensual')} egresados/mes`,
      pct: 12, nota: `Ticket real USD ${Math.round(num('ticket_promedio_impulso_usd'))} · solo exalumnos (R3)`,
    },
    {
      label: 'Avance del plan 90 días', value: `${hechas}/${tareasConEstado.length}`,
      target: '12 semanas',
      pct: tareasConEstado.length > 0 ? (hechas / tareasConEstado.length) * 100 : 0,
      nota: `${vencidas} vencidas · ${urgentes} en los próximos 3 días`,
    },
  ]

  const toggleTarea = async (tarea) => {
    const nuevoEstado = tarea.estado === 'Hecho' ? 'Pendiente' : 'Hecho'
    const { error } = await supabase.from('panel_tareas').update({ estado: nuevoEstado, updated_at: new Date().toISOString() }).eq('id', tarea.id)
    if (error) { toast.error('No se pudo actualizar la tarea'); console.error(error); return }
    cargar()
  }

  const CICLO_IDEA = ['Por evaluar', 'Viable', 'En ejecución', 'Descartada']
  const ciclarIdea = async (idea) => {
    const siguiente = CICLO_IDEA[(CICLO_IDEA.indexOf(idea.estado) + 1) % CICLO_IDEA.length]
    const { error } = await supabase.from('panel_ideas').update({ estado: siguiente }).eq('id', idea.id)
    if (error) { toast.error('No se pudo actualizar la idea'); console.error(error); return }
    cargar()
  }

  const agregarIdea = async () => {
    const texto = draft.trim()
    if (!texto) return
    const { error } = await supabase.from('panel_ideas').insert({ texto, estado: 'Por evaluar', creado_por: 'humano' })
    if (error) { toast.error('No se pudo guardar la idea'); console.error(error); return }
    setDraft('')
    cargar()
  }

  const revisarAccion = async (accion, aprobar) => {
    if (!aprobar) {
      const { error } = await supabase.from('panel_acciones_pendientes')
        .update({ estado: 'rechazada', revisado_at: new Date().toISOString() })
        .eq('id', accion.id)
      if (error) { toast.error('No se pudo rechazar la acción'); console.error(error); return }
      cargar()
      return
    }
    try {
      const res = await fetch('/api/reactivate-activar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campana: 'coordinacion', accionId: accion.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al ejecutar la acción')
      if (data.ok === false) toast(data.mensaje || 'La acción no se pudo completar', { icon: '⚠️' })
      else toast.success('Acción aprobada y ejecutada')
    } catch (err) {
      toast.error(err.message || 'No se pudo aprobar la acción')
      console.error(err)
    } finally {
      cargar()
    }
  }

  return {
    loading, cargar,
    filtro, setFiltro, frentes: FRENTES,
    tareas: tareasFiltradas, totalTareas: tareasConEstado.length, hechas, vencidas, urgentes,
    agenda,
    ideas: raw.ideas, draft, setDraft, agregarIdea, ciclarIdea,
    log: raw.log,
    segmentos: segmentosResumen, totalPersonas, totalDeuda,
    goals,
    proyeccionTotal, metaRecuperacion,
    retencionActual: num('retencion_actual'),
    riesgoMes2: num('riesgo_trimestral_fuga_mes2_usd'),
    excluidosSensibilidad: num('segmento_excluidos_sensibilidad'),
    sinDatoCuota: num('segmento_sin_dato_cuota'),
    toggleTarea,
    acciones: raw.acciones,
    accionesPendientes: raw.acciones.filter(a => a.estado === 'pendiente'),
    revisarAccion,
  }
}
