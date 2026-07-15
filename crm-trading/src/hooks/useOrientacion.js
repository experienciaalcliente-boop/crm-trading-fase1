import { useState, useEffect, useCallback } from 'react'
import { fetchAlumnos, fetchSesionesFecha, fetchHistorialSesiones, insertSesion, updateSesion, crearReunionZoom, deleteSesion, fetchOrientadorId } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const MOTIVOS = [
  'Vinculación del bróker',
  'Uso del MetaTrader',
  'Uso del TradingView',
  'Consultas sobre el bróker',
  'Creación de plataformas',
  'Otros',
]

const FORM_INICIAL = {
  alumno:      null,
  fecha:       format(new Date(), 'yyyy-MM-dd'),
  hora:        '09:00',
  motivo:      '',
  agendado_por: '',
}

const TIPIF_INICIAL = {
  estado:       '',
  pais:         '',
  broker:       '',
  tiene_mt5:    false,
  tiene_tradingview: false,
  tiene_broker: false,
  tiene_ingreso_trade: false,
  preguntas_adicionales: '',
  observaciones: '',
  nueva_fecha:  '',
  nueva_hora:   '',
}

export function useOrientacion() {
  const { user } = useAuth()
  const asesoraIdPropia = user?.rol === 'asesora' ? user.asesora_id : undefined
  const [alumnos,       setAlumnos]       = useState([])
  const [sesiones,      setSesiones]      = useState([])
  const [fechaVista,    setFechaVista]    = useState(format(new Date(), 'yyyy-MM-dd'))
  const [loading,       setLoading]       = useState(true)
  const [saving,        setSaving]        = useState(false)
  const [form,          setForm]          = useState(FORM_INICIAL)
  const [tipifModal,    setTipifModal]    = useState(null) // sesión a tipificar
  const [tipifForm,     setTipifForm]     = useState(TIPIF_INICIAL)
  const [orientadorId,  setOrientadorId]  = useState(null)
  // 'dia' = agenda del día (como hoy) · 'historial' = todas las sesiones,
  // de cualquier fecha, en una sola vista.
  const [vista,         setVista]         = useState('dia')
  const [historial,     setHistorial]     = useState([])
  const [loadingHistorial, setLoadingHistorial] = useState(false)
  const [mesHistorial,  setMesHistorial]  = useState(() => new Date().toISOString().slice(0, 7))

  useEffect(() => {
    fetchOrientadorId().then(setOrientadorId).catch(console.error)
  }, [])

  // El orientador ve solo su propio historial; supervisor/asesora ven todo
  // (igual que ya podían ver todas las sesiones del día). Se limita al mes
  // seleccionado, no todo el histórico de una sola vez.
  const cargarHistorial = useCallback(async () => {
    setLoadingHistorial(true)
    try {
      const data = await fetchHistorialSesiones(user?.rol === 'orientador' ? orientadorId : undefined, mesHistorial)
      setHistorial(data)
    } catch (err) {
      toast.error('Error al cargar el historial')
    } finally {
      setLoadingHistorial(false)
    }
  }, [user?.rol, orientadorId, mesHistorial])

  useEffect(() => {
    if (vista === 'historial') cargarHistorial()
  }, [vista, cargarHistorial])

  useEffect(() => {
    fetchAlumnos(asesoraIdPropia).then(setAlumnos).catch(console.error)
  }, [asesoraIdPropia])

  const cargarSesiones = useCallback(async (fecha) => {
    setLoading(true)
    try {
      const data = await fetchSesionesFecha(fecha || fechaVista)
      setSesiones(data)
    } catch (err) {
      toast.error('Error al cargar sesiones')
    } finally {
      setLoading(false)
    }
  }, [fechaVista])

  useEffect(() => { cargarSesiones() }, [cargarSesiones])

  // Horas ocupadas para la fecha que se está AGENDANDO en el formulario —
  // deliberadamente independiente de `fechaVista` (la fecha que se está
  // viendo en la tabla principal). Antes se reusaba `sesiones` (atado a
  // fechaVista) para pintar los botones de hora como ocupados, así que
  // agendar para una fecha distinta a la que estaba en pantalla (lo más
  // común al agendar con anticipación) no mostraba ningún choque —eso
  // permitió que 4 asesoras distintas reservaran las 9:55 del mismo día
  // sin que nadie viera la hora como ocupada.
  const [horasOcupadasForm, setHorasOcupadasForm] = useState([])
  useEffect(() => {
    if (!form.fecha) { setHorasOcupadasForm([]); return }
    let activo = true
    fetchSesionesFecha(form.fecha)
      .then(data => { if (activo) setHorasOcupadasForm(data.map(s => s.hora_inicio?.slice(0, 5))) })
      .catch(console.error)
    return () => { activo = false }
  }, [form.fecha])

  const setField = useCallback((key, val) => {
    setForm(f => ({ ...f, [key]: val }))
  }, [])

  const setTipifField = useCallback((key, val) => {
    setTipifForm(f => ({ ...f, [key]: val }))
  }, [])

  // ── Agendar nueva sesión ──
  const agendarSesion = useCallback(async () => {
    if (!form.alumno)  { toast.error('Selecciona un alumno'); return }
    if (!form.hora)    { toast.error('Indica la hora'); return }
    if (!form.motivo)  { toast.error('Selecciona el motivo'); return }

    setSaving(true)
    try {
      // Re-chequeo justo antes de guardar (no solo confiar en el estado ya
      // cargado en pantalla) — si alguien más tomó esta hora hace segundos,
      // se avisa aquí en vez de crear una reunión Zoom que ya no hace falta.
      const sesionesActuales = await fetchSesionesFecha(form.fecha)
      if (sesionesActuales.some(s => s.hora_inicio?.slice(0, 5) === form.hora)) {
        toast.error('Esa hora ya fue tomada por otra persona — elige otro horario')
        setHorasOcupadasForm(sesionesActuales.map(s => s.hora_inicio?.slice(0, 5)))
        setSaving(false)
        return
      }

      // 1. Crear reunión en Zoom
      let zoomData = {}
      try {
        zoomData = await crearReunionZoom({
          fecha:   form.fecha,
          hora:    form.hora,
          alumno:  form.alumno.label,
          titulo:  form.motivo,
          duracion: 45,
        })
        toast.success('Reunión Zoom creada ✓')
      } catch (zoomErr) {
        console.warn('Zoom no disponible:', zoomErr.message)
        toast('Sesión agendada sin Zoom. Configura las credenciales para activarlo.', { icon: '⚠️' })
      }

      // 2. Guardar en Supabase
      const horaFin = calcularHoraFin(form.hora, 45)
      await insertSesion({
        alumno_id:       form.alumno.value,
        orientador_id:   orientadorId,
        fecha:           form.fecha,
        hora_inicio:     form.hora,
        hora_fin:        horaFin,
        motivo:          form.motivo,
        agendado_por:    form.agendado_por || null,
        zoom_meeting_id: zoomData.meeting_id || null,
        zoom_join_url:   zoomData.join_url   || null,
        zoom_start_url:  zoomData.start_url  || null,
        estado:          'Pendiente',
      })

      toast.success('Sesión agendada correctamente ✓')
      // La tabla debe mostrar la fecha recién agendada (que puede ser
      // distinta a la que se estaba viendo), para que el enlace de Zoom
      // recién creado aparezca de inmediato en vez de quedar "oculto"
      // hasta que alguien cambie manualmente de fecha.
      const fechaAgendada = form.fecha
      setForm(FORM_INICIAL)
      setFechaVista(fechaAgendada)
      cargarSesiones(fechaAgendada)
    } catch (err) {
      toast.error('Error al agendar: ' + err.message)
      console.error(err)
    } finally {
      setSaving(false)
    }
  }, [form, cargarSesiones, orientadorId])

  // ── Tipificar sesión ──
  const abrirTipificacion = useCallback((sesion) => {
    setTipifModal(sesion)
    setTipifForm(TIPIF_INICIAL)
  }, [])

  const cerrarTipificacion = useCallback(() => {
    setTipifModal(null)
    setTipifForm(TIPIF_INICIAL)
  }, [])

  const guardarTipificacion = useCallback(async () => {
    if (!tipifForm.estado) { toast.error('Selecciona el resultado de la sesión'); return }
    if (tipifForm.estado === 'Reprogramada' && !tipifForm.nueva_fecha) {
      toast.error('Indica la nueva fecha'); return
    }

    setSaving(true)
    try {
      await updateSesion(tipifModal.id, {
        estado:                 tipifForm.estado,
        pais:                   tipifForm.pais || null,
        broker:                 tipifForm.broker || null,
        tiene_mt5:              tipifForm.tiene_mt5,
        tiene_tradingview:      tipifForm.tiene_tradingview,
        tiene_broker:           tipifForm.tiene_broker,
        tiene_ingreso_trade:    tipifForm.tiene_ingreso_trade,
        preguntas_adicionales:  tipifForm.preguntas_adicionales || null,
        observaciones:          tipifForm.observaciones || null,
        nueva_fecha:            tipifForm.nueva_fecha || null,
        nueva_hora:             tipifForm.nueva_hora || null,
      })
      toast.success('Sesión tipificada ✓')
      cerrarTipificacion()
      cargarSesiones()
      if (vista === 'historial') cargarHistorial()
    } catch (err) {
      toast.error('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }, [tipifModal, tipifForm, cargarSesiones, cerrarTipificacion, vista, cargarHistorial])

  // ── Eliminar sesión ──
  const eliminarSesion = useCallback(async (sesion) => {
    if (!window.confirm(`¿Eliminar la sesión de ${sesion.alumno?.nombre}? También se cancelará la reunión de Zoom.`)) return
    try {
      await deleteSesion(sesion.id, sesion.zoom_meeting_id)
      toast.success('Sesión eliminada y reunión Zoom cancelada ✓')
      cargarSesiones()
      if (vista === 'historial') cargarHistorial()
    } catch (err) {
      toast.error('Error al eliminar: ' + err.message)
    }
  }, [cargarSesiones, vista, cargarHistorial])

  const alumnosOpts = alumnos.map(a => ({ value: a.id, label: a.nombre, data: a }))

  // Stats del día
  const stats = {
    total:        sesiones.length,
    pendientes:   sesiones.filter(s => s.estado === 'Pendiente').length,
    concretadas:  sesiones.filter(s => s.estado === 'Concretada').length,
    reprogramadas: sesiones.filter(s => s.estado === 'Reprogramada').length,
    noConectaron: sesiones.filter(s => s.estado === 'No se conectó').length,
  }

  return {
    alumnos, alumnosOpts, sesiones, loading, saving,
    form, setField, agendarSesion, horasOcupadasForm,
    fechaVista, setFechaVista: (f) => { setFechaVista(f); cargarSesiones(f) },
    tipifModal, tipifForm, setTipifField,
    abrirTipificacion, cerrarTipificacion, guardarTipificacion,
    stats, MOTIVOS, cargarSesiones, eliminarSesion,
    vista, setVista, historial, loadingHistorial, cargarHistorial,
    mesHistorial, setMesHistorial,
  }
}

function calcularHoraFin(horaInicio, minutos) {
  const [h, m] = horaInicio.split(':').map(Number)
  const total = h * 60 + m + minutos
  const hf = Math.floor(total / 60) % 24
  const mf = total % 60
  return `${String(hf).padStart(2,'0')}:${String(mf).padStart(2,'0')}`
}
