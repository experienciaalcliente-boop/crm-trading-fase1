import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export const ESTADOS_EXCAMPANA = [
  'Pendiente',
  'Correo 0 enviado', 'Correo 1 enviado',
  'Interesado', 'Contactado', 'Negociación', 'Reactivado', 'No interesado', 'Sin respuesta',
]

export const ESTADOS_GESTIONABLES = ['Interesado', 'Contactado', 'Negociación', 'Reactivado', 'No interesado', 'Sin respuesta']

const NOMBRE_CORREO = { 0: 'Aula Virtual', 1: 'Impulso' }
export function nombreCorreo(numero) {
  return numero != null ? (NOMBRE_CORREO[numero] || `Correo ${numero}`) : null
}

// Plan Exalumnos — mismo patrón que useReactivate.js (Plan Reactivate Burs),
// pero con un reparto por asesora_id: el supervisor ve las 4 asesoras
// juntas (con desglose), cada asesora/orientador solo ve sus propios leads
// (scopeado acá, igual que el resto del CRM, vía asesora_id del usuario).
export function useExpCampana() {
  const { user } = useAuth()
  const esSupervisor = user?.rol === 'supervisor'
  const asesoraIdPropia = !esSupervisor ? user?.asesora_id : undefined

  const [leads,   setLeads]   = useState([])
  const [asesoras, setAsesoras] = useState([])
  const [loading, setLoading] = useState(true)
  const [config,  setConfig]  = useState(null)
  const [filtroEstado, setFiltroEstado] = useState('Todos')
  const [filtroAsesora, setFiltroAsesora] = useState('')
  const [buscar, setBuscar] = useState('')
  const [detalle, setDetalle] = useState(null)
  const [activando, setActivando] = useState(false)

  // PostgREST solo devuelve 1000 filas por consulta por defecto — con 3202
  // leads en la campaña hay que paginar con .range(), si no el supervisor
  // (y cualquier vista sin filtro de asesora_id) se queda con el primer
  // millar nada más. Mismo patrón que fetchTodasLasPaginas en lib/api.js.
  const fetchTodosLosLeads = useCallback(async () => {
    const TAMANO_PAGINA = 1000
    let desde = 0
    let todos = []
    while (true) {
      let query = supabase.from('campana_exalumnos_alumnos').select('*')
        .eq('excluido', false)
        .order('created_at', { ascending: false })
        .range(desde, desde + TAMANO_PAGINA - 1)
      if (asesoraIdPropia) query = query.eq('asesora_id', asesoraIdPropia)
      const { data, error } = await query
      if (error) throw error
      todos = todos.concat(data || [])
      if (!data || data.length < TAMANO_PAGINA) break
      desde += TAMANO_PAGINA
    }
    return todos
  }, [asesoraIdPropia])

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [leadsData, { data: configData, error: errC }, { data: asesorasData }] = await Promise.all([
        fetchTodosLosLeads(),
        supabase.from('campana_exalumnos_config').select('*').eq('id', 'default').maybeSingle(),
        esSupervisor ? supabase.from('asesoras').select('id, nombre') : Promise.resolve({ data: [] }),
      ])
      if (errC) throw errC
      setLeads(leadsData || [])
      setConfig(configData)
      setAsesoras(asesorasData || [])
    } catch (err) {
      toast.error('Error al cargar el Plan Exalumnos')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [fetchTodosLosLeads, esSupervisor])

  useEffect(() => { cargar() }, [cargar])

  const toggleCampana = useCallback(async () => {
    if (!config || !esSupervisor) return
    const nuevoValor = !config.campana_activa

    if (!nuevoValor) {
      const { error } = await supabase.from('campana_exalumnos_config').update({ campana_activa: false, updated_at: new Date().toISOString() }).eq('id', 'default')
      if (error) { toast.error('No se pudo pausar la campaña'); return }
      setConfig((prev) => ({ ...prev, campana_activa: false }))
      toast.success('Campaña pausada')
      return
    }

    setActivando(true)
    try {
      const res = await fetch('/api/reactivate-activar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campana: 'exalumnos' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al activar')
      setConfig((prev) => ({ ...prev, campana_activa: true }))
      toast.success(`Campaña activada — Correo Aula Virtual enviado a ${data.enviados} de ${data.total} leads`)
      await cargar()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setActivando(false)
    }
  }, [config, esSupervisor, cargar])

  const abrirDetalle = useCallback(async (lead) => {
    setDetalle({ lead, envios: [], seguimiento: [], loadingDetalle: true })
    const [{ data: envios }, { data: seguimiento }] = await Promise.all([
      supabase.from('campana_exalumnos_envios').select('*').eq('alumno_id', lead.id).order('correo_numero'),
      supabase.from('campana_exalumnos_seguimiento').select('*').eq('alumno_id', lead.id).order('registrado_en', { ascending: false }),
    ])
    setDetalle({ lead, envios: envios || [], seguimiento: seguimiento || [], loadingDetalle: false })
  }, [])

  const cerrarDetalle = useCallback(() => setDetalle(null), [])

  const registrarAvance = useCallback(async ({ estadoNuevo, nota, registradoPor }) => {
    if (!detalle?.lead) return false
    const lead = detalle.lead
    const { error: errUpdate } = await supabase.from('campana_exalumnos_alumnos')
      .update({ estado_campana: estadoNuevo, updated_at: new Date().toISOString() })
      .eq('id', lead.id)
    if (errUpdate) { toast.error('No se pudo registrar el avance'); return false }

    await supabase.from('campana_exalumnos_seguimiento').insert({
      alumno_id: lead.id,
      estado_anterior: lead.estado_campana,
      estado_nuevo: estadoNuevo,
      nota: nota || null,
      registrado_por: registradoPor || 'Asesora',
    })

    toast.success('Avance registrado ✓')
    await cargar()
    await abrirDetalle({ ...lead, estado_campana: estadoNuevo })
    return true
  }, [detalle, cargar, abrirDetalle])

  const leadsFiltrados = leads.filter((l) => {
    if (filtroEstado !== 'Todos' && l.estado_campana !== filtroEstado) return false
    if (filtroAsesora && l.asesora_id !== filtroAsesora) return false
    if (buscar.trim() && !l.nombre.toLowerCase().includes(buscar.toLowerCase())) return false
    return true
  })

  function calcularStats(arr) {
    return {
      total: arr.length,
      correosEnviados: arr.reduce((acc, a) => acc + (a.ultimo_correo_enviado != null ? a.ultimo_correo_enviado + 1 : 0), 0),
      interesados: arr.filter((a) => a.estado_campana === 'Interesado').length,
      contactados: arr.filter((a) => a.estado_campana === 'Contactado').length,
      negociacion: arr.filter((a) => a.estado_campana === 'Negociación').length,
      reactivados: arr.filter((a) => a.estado_campana === 'Reactivado').length,
      noInteresados: arr.filter((a) => a.estado_campana === 'No interesado').length,
      sinRespuesta: arr.filter((a) => a.estado_campana === 'Sin respuesta').length,
      conClic: arr.filter((a) => a.primer_click_at).length,
    }
  }

  const stats = calcularStats(leadsFiltrados)

  // Desglose por asesora — solo lo arma el supervisor (las asesoras ya ven
  // solo lo suyo, no tiene sentido desglosarlo para ellas).
  const nombrePorAsesoraId = Object.fromEntries(asesoras.map(a => [a.id, a.nombre]))
  const porAsesora = esSupervisor
    ? Object.entries(
        leads.reduce((acc, l) => {
          (acc[l.asesora_id] ||= []).push(l)
          return acc
        }, {})
      ).map(([asesoraId, arr]) => ({ asesoraId, nombre: nombrePorAsesoraId[asesoraId] || 'Sin asignar', ...calcularStats(arr) }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
    : []

  return {
    leads: leadsFiltrados, totalSinFiltrar: leads.length, loading, config, esSupervisor,
    filtroEstado, setFiltroEstado, filtroAsesora, setFiltroAsesora, asesoras, buscar, setBuscar,
    stats, porAsesora,
    toggleCampana, activando, detalle, abrirDetalle, cerrarDetalle, registrarAvance, cargar,
  }
}
