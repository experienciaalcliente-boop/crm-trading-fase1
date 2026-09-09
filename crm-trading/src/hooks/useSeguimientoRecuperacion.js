import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

// Mismo límite de 1000 filas por página de PostgREST que ya mordió a
// campana_exalumnos_alumnos (ver useCoordinacion.js) — se mantiene el patrón
// acá aunque recuperacion_2026_alumnos hoy tenga 656 filas, por si crece.
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

export const ESTADOS_WHATSAPP = ['Sin contacto', 'Contactado', 'Respondió', 'En conversación', 'Matriculado', 'No interesado']
const SEGMENTOS = ['A', 'B', 'C', 'D']

async function fetchSeguimiento() {
  const [rAlumnos, rConfig, rTandas] = await Promise.all([
    fetchTodosPaginado((desde, hasta) =>
      supabase.from('recuperacion_2026_alumnos')
        .select('id, nombre, email, segmento, tanda, cuotas_adeudadas, deuda_usd, estado_campana, fecha_ultimo_envio, excluido, estado_whatsapp, whatsapp_contactado_at, whatsapp_asesora, whatsapp_nota')
        .order('segmento').order('nombre')
        .range(desde, hasta)
    ),
    supabase.from('recuperacion_2026_config').select('segmento, asesor_nombre, wa_link'),
    // recuperacion_2026_tandas.metricas trae la apertura AGREGADA por tanda
    // (la calcula el cron diario, 48h después del envío, leyendo Brevo).
    // No hay tracking de apertura/click por persona: recuperacion_2026_envios
    // existe en el esquema pero nada la llena todavía (no hay webhook de Brevo
    // conectado) — por eso el pipeline no muestra esa columna, para no
    // inventar un "no abrió" que en realidad es "no medido".
    supabase.from('recuperacion_2026_tandas').select('segmento, tanda, estado, enviada_at, evaluada_at, metricas'),
  ])
  return {
    alumnos: rAlumnos,
    config: rConfig.data || [],
    tandas: rTandas.data || [],
  }
}

export function useSeguimientoRecuperacion() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [raw, setRaw] = useState({ alumnos: [], config: [], tandas: [] })
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  const segmentoFiltro = searchParams.get('segmento') || 'Todos'
  const estadoFiltro = searchParams.get('estado') || 'Todos'
  const asesoraFiltro = searchParams.get('asesora') || 'Todas'

  const setSegmentoFiltro = (v) => setSearchParams(p => { const n = new URLSearchParams(p); v === 'Todos' ? n.delete('segmento') : n.set('segmento', v); return n })
  const setEstadoFiltro = (v) => setSearchParams(p => { const n = new URLSearchParams(p); v === 'Todos' ? n.delete('estado') : n.set('estado', v); return n })
  const setAsesoraFiltro = (v) => setSearchParams(p => { const n = new URLSearchParams(p); v === 'Todas' ? n.delete('asesora') : n.set('asesora', v); return n })

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchSeguimiento()
      setRaw(data)
    } catch (err) {
      toast.error('Error al cargar el seguimiento de recuperación')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  useEffect(() => {
    const ch = supabase.channel('seguimiento-recuperacion-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recuperacion_2026_alumnos' }, cargar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recuperacion_2026_tandas' }, cargar)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [cargar])

  const contactables = useMemo(() => raw.alumnos.filter(a => !a.excluido), [raw.alumnos])

  const asesoras = useMemo(() => {
    const s = new Set(raw.config.map(c => c.asesor_nombre).filter(Boolean))
    contactables.forEach(a => { if (a.whatsapp_asesora) s.add(a.whatsapp_asesora) })
    return [...s]
  }, [raw.config, contactables])

  const asesorPorSegmento = useMemo(() => {
    const m = {}
    raw.config.forEach(c => { m[c.segmento] = c.asesor_nombre })
    return m
  }, [raw.config])

  const funnelSegmentos = useMemo(() => SEGMENTOS.map(seg => {
    const filas = contactables.filter(a => a.segmento === seg)
    const enviados = filas.filter(a => a.estado_campana !== 'Pendiente')
    const tandasSeg = raw.tandas.filter(t => t.segmento === seg)
    const evaluadas = tandasSeg.filter(t => t.metricas)
    const delivered = evaluadas.reduce((s, t) => s + (t.metricas.delivered || 0), 0)
    const uniqueViews = evaluadas.reduce((s, t) => s + (t.metricas.uniqueViews || 0), 0)
    const tandaEnCurso = tandasSeg.find(t => t.estado !== 'enviada' || !t.evaluada_at)
    return {
      segmento: seg,
      asesor: asesorPorSegmento[seg] || '—',
      total: filas.length,
      enviados: enviados.length,
      delivered, uniqueViews,
      tasaApertura: delivered > 0 ? uniqueViews / delivered : null,
      estadoTanda: tandaEnCurso ? `${tandaEnCurso.tanda} · ${tandaEnCurso.estado}` : (tandasSeg.length ? 'todas evaluadas' : 'sin programar'),
      contactadosWA: filas.filter(a => a.estado_whatsapp !== 'Sin contacto').length,
      respondieron: filas.filter(a => ['Respondió', 'En conversación', 'Matriculado'].includes(a.estado_whatsapp)).length,
      matriculados: filas.filter(a => a.estado_whatsapp === 'Matriculado').length,
      noInteresados: filas.filter(a => a.estado_whatsapp === 'No interesado').length,
    }
  }), [contactables, asesorPorSegmento, raw.tandas])

  const funnelTotal = useMemo(() => {
    const base = funnelSegmentos.reduce((acc, s) => ({
      total: acc.total + s.total, enviados: acc.enviados + s.enviados,
      delivered: acc.delivered + s.delivered, uniqueViews: acc.uniqueViews + s.uniqueViews,
      contactadosWA: acc.contactadosWA + s.contactadosWA,
      respondieron: acc.respondieron + s.respondieron, matriculados: acc.matriculados + s.matriculados,
      noInteresados: acc.noInteresados + s.noInteresados,
    }), { total: 0, enviados: 0, delivered: 0, uniqueViews: 0, contactadosWA: 0, respondieron: 0, matriculados: 0, noInteresados: 0 })
    return { ...base, tasaApertura: base.delivered > 0 ? base.uniqueViews / base.delivered : null }
  }, [funnelSegmentos])

  const pipeline = useMemo(() => {
    let filas = contactables
    if (segmentoFiltro !== 'Todos') filas = filas.filter(a => a.segmento === segmentoFiltro)
    if (estadoFiltro === 'Enviados') filas = filas.filter(a => a.estado_campana !== 'Pendiente')
    else if (estadoFiltro !== 'Todos') filas = filas.filter(a => a.estado_whatsapp === estadoFiltro)
    if (asesoraFiltro !== 'Todas') filas = filas.filter(a => a.whatsapp_asesora === asesoraFiltro)
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase()
      filas = filas.filter(a => a.nombre?.toLowerCase().includes(q) || a.email?.toLowerCase().includes(q))
    }
    return filas
  }, [contactables, segmentoFiltro, estadoFiltro, asesoraFiltro, busqueda])

  const actualizarSeguimientoWA = async (alumno, campos) => {
    const payload = { ...campos }
    if (campos.estado_whatsapp && campos.estado_whatsapp !== 'Sin contacto' && !alumno.whatsapp_contactado_at) {
      payload.whatsapp_contactado_at = new Date().toISOString()
    }
    const { error } = await supabase.from('recuperacion_2026_alumnos').update(payload).eq('id', alumno.id)
    if (error) { toast.error('No se pudo guardar el seguimiento'); console.error(error); return }
    if (campos.estado_whatsapp === 'Matriculado' && alumno.estado_whatsapp !== 'Matriculado') {
      await supabase.from('panel_log').insert({
        que: `${alumno.nombre} (segmento ${alumno.segmento}) se matriculó tras seguimiento por WhatsApp${alumno.whatsapp_asesora ? ' · ' + alumno.whatsapp_asesora : ''}.`,
        donde: 'Seguimiento de Recuperación', agente: 'email-marketing',
      })
    }
    cargar()
  }

  return {
    loading, cargar,
    funnelSegmentos, funnelTotal,
    pipeline, asesoras,
    segmentoFiltro, setSegmentoFiltro,
    estadoFiltro, setEstadoFiltro,
    asesoraFiltro, setAsesoraFiltro,
    busqueda, setBusqueda,
    estadosWhatsapp: ESTADOS_WHATSAPP,
    actualizarSeguimientoWA,
  }
}
