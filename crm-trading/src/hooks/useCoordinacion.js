import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const FRENTES = ['Retirados', 'Level Up', 'Retención', 'Datos', 'Impulso', 'Gestión']

// PostgREST tope 1000 filas por página por default — campana_exalumnos_alumnos
// tiene ~3200, así que hay que paginar o el conteo queda truncado en 1000.
async function fetchTodosPaginado(construirQuery) {
  const TAMANO_PAGINA = 1000
  let desde = 0
  let todos = []
  while (true) {
    const { data, error } = await construirQuery(desde, desde + TAMANO_PAGINA - 1)
    if (error) throw error
    todos = todos.concat(data || [])
    if (!data || data.length < TAMANO_PAGINA) break
    desde += TAMANO_PAGINA
  }
  return todos
}

async function fetchCoordinacion() {
  const [rTareas, rIdeas, rLog, rSupuestos, rSegmentos, rAcciones, rLevelUpConfig] = await Promise.all([
    supabase.from('panel_tareas').select('*').order('orden_original', { ascending: true }),
    supabase.from('panel_ideas').select('*').order('created_at', { ascending: false }),
    supabase.from('panel_log').select('*').order('cuando', { ascending: false }).limit(8),
    supabase.from('panel_supuestos').select('*'),
    supabase.from('recuperacion_2026_alumnos').select('segmento, deuda_usd, estado_campana, excluido'),
    supabase.from('panel_acciones_pendientes').select('*').order('created_at', { ascending: false }),
    supabase.from('campana_exalumnos_config').select('*').eq('id', 'default').maybeSingle(),
  ])
  // Level Up = Plan Exalumnos ya existente (mismo proyecto, confirmado por el usuario) — se
  // mapea acá en modo lectura, no se toca su lógica de envío (sigue en ExpCampanaPage/Gmail).
  const levelUpRows = await fetchTodosPaginado((desde, hasta) =>
    supabase.from('campana_exalumnos_alumnos').select('estado_campana, excluido, monto_faltante').order('id').range(desde, hasta)
  )
  const [rImpulso, rVentasImpulso] = await Promise.all([
    supabase.from('impulso_secuencia').select('*, alumno:alumnos(nombre, programa)').order('fecha_prevista', { ascending: true }),
    supabase.from('ventas_complementos').select('complemento, valor_producto').ilike('complemento', 'Impulso%'),
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
    levelUp: levelUpRows,
    levelUpConfig: rLevelUpConfig.data || null,
    impulso: rImpulso.data || [],
    ventasImpulso: rVentasImpulso.data || [],
  }
}

export function useCoordinacion() {
  const [raw, setRaw] = useState({ tareas: [], ideas: [], log: [], supuestos: {}, segmentos: [], acciones: [], levelUp: [], levelUpConfig: null, impulso: [], ventasImpulso: [] })
  const [cohorteInput, setCohorteInput] = useState('')
  const [asesoraInput, setAsesoraInput] = useState('Katerin')
  const [definiendoCohorte, setDefiniendoCohorte] = useState(false)
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

  const levelUpActivos = raw.levelUp.filter(l => !l.excluido)
  const levelUpResumen = {
    total: levelUpActivos.length,
    activa: raw.levelUpConfig?.campana_activa ?? false,
    pendientes: levelUpActivos.filter(l => l.estado_campana === 'Pendiente').length,
    cierreEnviado: levelUpActivos.filter(l => l.estado_campana === 'Cierre enviado').length,
    interesados: levelUpActivos.filter(l => ['Interesado', 'Negociación', 'Contactado'].includes(l.estado_campana)).length,
    noInteresados: levelUpActivos.filter(l => l.estado_campana === 'No interesado').length,
  }

  const ventasImpulsoTotal = raw.ventasImpulso.reduce((s, v) => s + (parseFloat(v.valor_producto) || 0), 0)
  const impulsoConDias = raw.impulso.map(t => ({ ...t, dias: diasHasta(t.fecha_prevista) }))
  const impulsoPendientes = impulsoConDias
    .filter(t => t.estado === 'Pendiente')
    .sort((a, b) => (a.dias ?? 999) - (b.dias ?? 999))
  const impulsoResumen = {
    cohortesActivas: [...new Set(raw.impulso.map(t => t.cohorte_egreso))],
    totalToques: raw.impulso.length,
    pendientes: impulsoPendientes.length,
    vencidos: impulsoPendientes.filter(t => t.dias !== null && t.dias < 0).length,
    enviados: raw.impulso.filter(t => t.estado === 'Enviado' || t.estado === 'Respondido').length,
    ventasCount: raw.ventasImpulso.length,
    ventasUSD: ventasImpulsoTotal,
  }

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
      target: `${levelUpResumen.total.toLocaleString('en-US')} contactos (Plan Exalumnos)`,
      pct: levelUpResumen.total > 0 ? (levelUpResumen.interesados / levelUpResumen.total) * 100 : 0,
      nota: `${levelUpResumen.activa ? 'Campaña activa' : 'Campaña pausada'} · ${levelUpResumen.cierreEnviado.toLocaleString('en-US')} cierres enviados · ${levelUpResumen.interesados} interesados`,
    },
    {
      label: 'Impulso BURS al egreso', value: `${impulsoResumen.ventasCount} ventas · USD ${Math.round(impulsoResumen.ventasUSD).toLocaleString('en-US')}`,
      target: `meta USD ${Math.round(proyImpulso).toLocaleString('en-US')} · ticket real USD ${Math.round(num('ticket_promedio_impulso_usd'))}`,
      pct: proyImpulso > 0 ? Math.min(100, (impulsoResumen.ventasUSD / proyImpulso) * 100) : 0,
      nota: `${impulsoResumen.pendientes} toques pendientes (${impulsoResumen.vencidos} vencidos) · solo exalumnos al egresar (R3)`,
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

  // Definir la cohorte que egresa es, a propósito, una decisión 100% humana
  // (tarea 19 del Mapa Operativo) — no hay dato confiable de "fecha de
  // egreso" en el esquema para que un agente la adivine. El supervisor
  // elige el programa y la asesora; el sistema arma los 5 toques (días 0,
  // 3, 7, 10, 14, ventana de 2 semanas) para que no se pierda ninguno.
  const DIAS_TOQUE = [0, 3, 7, 10, 14]
  const definirCohorteImpulso = async () => {
    const programa = cohorteInput.trim()
    if (!programa) { toast.error('Escribe el programa de la cohorte (ej. Mar-26)'); return }
    setDefiniendoCohorte(true)
    try {
      const { data: elegibles, error: errAl } = await supabase
        .from('alumnos').select('id, nombre')
        .eq('programa', programa).eq('estado_operativo', 'Activo')
      if (errAl) throw errAl
      if (!elegibles || elegibles.length === 0) { toast.error(`No hay alumnos activos en "${programa}"`); return }

      const { data: yaTienen } = await supabase
        .from('impulso_secuencia').select('alumno_id').eq('cohorte_egreso', programa)
      const idsConSecuencia = new Set((yaTienen || []).map(r => r.alumno_id))
      const nuevos = elegibles.filter(a => !idsConSecuencia.has(a.id))
      if (nuevos.length === 0) { toast('Esta cohorte ya tiene su secuencia armada', { icon: 'ℹ️' }); return }

      const hoy = new Date()
      const filas = []
      for (const al of nuevos) {
        for (let i = 0; i < DIAS_TOQUE.length; i++) {
          const f = new Date(hoy); f.setDate(f.getDate() + DIAS_TOQUE[i])
          filas.push({
            alumno_id: al.id, cohorte_egreso: programa, touch_numero: i + 1,
            estado: 'Pendiente', fecha_prevista: f.toISOString().slice(0, 10), asesora_nombre: asesoraInput,
          })
        }
      }
      const { error: errIns } = await supabase.from('impulso_secuencia').insert(filas)
      if (errIns) throw errIns

      await supabase.from('panel_log').insert({
        que: `Cohorte de Impulso definida: "${programa}" (${nuevos.length} alumnos, ${asesoraInput}). Secuencia de 5 toques armada.`,
        donde: 'Fase 4 — Impulso BURS', agente: 'impulso',
      })
      toast.success(`Secuencia armada para ${nuevos.length} alumnos de ${programa}`)
      setCohorteInput('')
      cargar()
    } catch (err) {
      toast.error(err.message || 'No se pudo definir la cohorte')
      console.error(err)
    } finally {
      setDefiniendoCohorte(false)
    }
  }

  const marcarToqueImpulso = async (toque, estado) => {
    const { error } = await supabase.from('impulso_secuencia')
      .update({ estado, enviado_at: estado !== 'Pendiente' ? new Date().toISOString() : null })
      .eq('id', toque.id)
    if (error) { toast.error('No se pudo actualizar el toque'); console.error(error); return }
    cargar()
  }

  return {
    loading, cargar,
    filtro, setFiltro, frentes: FRENTES,
    tareas: tareasFiltradas, totalTareas: tareasConEstado.length, hechas, vencidas, urgentes,
    agenda,
    ideas: raw.ideas, draft, setDraft, agregarIdea, ciclarIdea,
    log: raw.log,
    segmentos: segmentosResumen, totalPersonas, totalDeuda,
    levelUp: levelUpResumen,
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
    impulso: impulsoResumen,
    impulsoPendientes,
    cohorteInput, setCohorteInput, asesoraInput, setAsesoraInput, definiendoCohorte, definirCohorteImpulso,
    marcarToqueImpulso,
  }
}
