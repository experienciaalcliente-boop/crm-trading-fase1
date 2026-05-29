import { useState, useEffect, useCallback } from 'react'
import { fetchAlumnos, fetchAsesorasLlamadas, fetchAsesoras, fetchRegistrosHoy, fetchHistorialAlumno, fetchNextCodigo, insertRegistroLlamada, suscribirRegistrosHoy } from '../lib/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const FORM_INICIAL = {
  codigo: '',
  fecha: format(new Date(), 'yyyy-MM-dd'),
  programa: null,
  alumno: null,
  semana: '',
  asesora: null,
  respondio: null,
  avance: '',
  mentoria: null,
  cuenta: null,
  capital_real: '',
  fase_fondeo: null,
  beneficio: '',
  retiro: null,
  monto_retiro: '',
  observaciones: '',
}

export function useLlamadas() {
  const [alumnos,         setAlumnos]         = useState([])
  const [asesoras,        setAsesoras]        = useState([])   // todas (para panel)
  const [asesorasForm,    setAsesorasForm]    = useState([])   // solo llamadas (para form)
  const [registrosHoy,    setRegistrosHoy]    = useState([])
  const [historial,       setHistorial]       = useState([])
  const [form,            setForm]            = useState(FORM_INICIAL)
  const [loading,         setLoading]         = useState(true)
  const [saving,          setSaving]          = useState(false)
  const [asesoraPanel,    setAsesoraPanel]    = useState(null)

  // ── Carga inicial ──
  useEffect(() => {
    Promise.all([
      fetchAlumnos(),
      fetchAsesoras(),        // todas — para tabs del panel
      fetchAsesorasLlamadas(), // solo asesoras — para el form
      fetchRegistrosHoy(),
      fetchNextCodigo()
    ])
      .then(([als, todasAsesoras, asesorasLlamadas, regs, codigo]) => {
        setAlumnos(als)
        setAsesoras(todasAsesoras)
        setAsesorasForm(asesorasLlamadas)
        setRegistrosHoy(regs)
        setForm(f => ({ ...f, codigo }))
      })
      .catch(err => {
        console.error(err)
        toast.error('Error al cargar datos. ¿Configuraste Supabase?')
      })
      .finally(() => setLoading(false))
  }, [])

  // ── Real-time ──
  useEffect(() => {
    const unsub = suscribirRegistrosHoy(() => {
      fetchRegistrosHoy().then(setRegistrosHoy).catch(console.error)
    })
    return unsub
  }, [])

  // ── Opciones para react-select ──
  const programasOpts = [...new Set(alumnos.map(a => a.programa))]
    .filter(Boolean)
    .map(p => ({ value: p, label: p }))

  const alumnosFiltrados = form.programa
    ? alumnos.filter(a => a.programa === form.programa.value)
    : alumnos

  const alumnosOpts = alumnosFiltrados.map(a => ({
    value: a.id,
    label: a.nombre,
    data: a,
  }))

  // Solo asesoras de llamadas para el formulario
  const asesorasOpts = asesorasForm.map(a => ({ value: a.id, label: a.nombre }))

  // Solo asesoras de llamadas para las tabs del panel derecho
  const asesorasPanelOpts = asesorasForm

  // ── Cambio de alumno → autocompletar + cargar historial automáticamente ──
  const onAlumnoChange = useCallback(opt => {
    if (!opt) {
      setForm(f => ({ ...f, alumno: null, semana: '' }))
      setHistorial([])
      return
    }
    const alumno = opt.data
    setForm(f => ({
      ...f,
      alumno: opt,
      semana: alumno.semana_actual || '',
      asesora: asesorasOpts.find(a => a.label === alumno.asesora) || f.asesora,
    }))
    // Historial se carga automáticamente al seleccionar alumno
    fetchHistorialAlumno(alumno.id).then(setHistorial).catch(console.error)
  }, [asesorasOpts])

  // ── Cambio de programa → limpiar alumno e historial ──
  const onProgramaChange = useCallback(opt => {
    setForm(f => ({ ...f, programa: opt, alumno: null, semana: '' }))
    setHistorial([])
  }, [])

  const setField = useCallback((key, val) => {
    setForm(f => ({ ...f, [key]: val }))
  }, [])

  // ── Guardar registro ──
  const guardar = useCallback(async () => {
    if (!form.alumno)    { toast.error('Selecciona un alumno'); return }
    if (!form.respondio) { toast.error('Indica si respondió'); return }
    if (!form.asesora)   { toast.error('Selecciona una asesora'); return }

    setSaving(true)
    try {
      const payload = {
        codigo:       form.codigo,
        fecha:        form.fecha,
        alumno_id:    form.alumno.value,
        asesora_id:   form.asesora.value,
        semana:       form.semana,
        respondio:    form.respondio.value,
        avance:       form.avance ? parseFloat(form.avance) : null,
        mentoria:     form.mentoria?.value || null,
        cuenta:       form.cuenta?.value || null,
        capital_real: form.cuenta?.value === 'Real'   ? parseFloat(form.capital_real) || null : null,
        fase_fondeo:  form.cuenta?.value === 'Fondeo' ? form.fase_fondeo?.value || null : null,
        beneficio:    form.cuenta?.value !== 'No opera' ? parseFloat(form.beneficio) || null : null,
        retiro:       form.retiro?.value || null,
        monto_retiro: form.retiro?.value === 'Sí' ? parseFloat(form.monto_retiro) || null : null,
        observaciones: form.observaciones || null,
      }
      await insertRegistroLlamada(payload)
      toast.success('Registro guardado ✓')

      // Recargar historial del mismo alumno después de guardar
      const alumnoId = form.alumno.value
      const nextCod = await fetchNextCodigo()
      setForm({ ...FORM_INICIAL, codigo: nextCod })
      // Mantener historial visible un momento y luego limpiar
      fetchHistorialAlumno(alumnoId).then(setHistorial).catch(console.error)
    } catch (err) {
      console.error(err)
      toast.error('Error al guardar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }, [form])

  const limpiar = useCallback(async () => {
    const cod = await fetchNextCodigo()
    setForm({ ...FORM_INICIAL, codigo: cod })
    setHistorial([])
  }, [])

  // ── Panel derecho: stats (solo asesoras de llamadas) ──
  const registrosFiltrados = asesoraPanel
    ? registrosHoy.filter(r => r.asesora?.nombre === asesoraPanel)
    : registrosHoy

  const stats = {
    total:        registrosFiltrados.length,
    respondieron: registrosFiltrados.filter(r => r.respondio === 'Sí').length,
    sinRespuesta: registrosFiltrados.filter(r => r.respondio === 'No'),
    efectividad:  registrosFiltrados.length
      ? Math.round((registrosFiltrados.filter(r => r.respondio === 'Sí').length / registrosFiltrados.length) * 100)
      : 0,
  }

  return {
    alumnos, asesoras, asesorasForm, registrosHoy, historial,
    form, setField, onAlumnoChange, onProgramaChange,
    programasOpts, alumnosOpts, asesorasOpts,
    guardar, limpiar,
    loading, saving,
    asesoraPanel, setAsesoraPanel, stats,
    asesorasPanelOpts,
  }
}
