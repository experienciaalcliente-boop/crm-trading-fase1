import { useState, useEffect, useCallback } from 'react'
import { fetchAlumnos, fetchAsesorasLlamadas, fetchAsesoras, fetchRegistrosHoy, fetchHistorialAlumno, fetchNextCodigo, insertRegistroLlamada, suscribirRegistrosHoy, fetchSinResponderAcumulado } from '../lib/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

// Función para obtener siempre la fecha actual del día
const formInicial = () => ({
  codigo: '',
  fecha: new Date().toISOString().split('T')[0], // siempre fecha de HOY
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
})

export function useLlamadas() {
  const [alumnos,         setAlumnos]         = useState([])
  const [asesoras,        setAsesoras]        = useState([])   // todas (para panel)
  const [asesorasForm,    setAsesorasForm]    = useState([])   // solo llamadas (para form)
  const [registrosHoy,    setRegistrosHoy]    = useState([])
  const [historial,       setHistorial]       = useState([])
  const [form,            setForm]            = useState(formInicial())
  const [loading,         setLoading]         = useState(true)
  const [saving,          setSaving]          = useState(false)
  const [asesoraPanel,    setAsesoraPanel]    = useState(null)
  const [sinResponder,    setSinResponder]    = useState([])

  // ── Carga inicial ──
  useEffect(() => {
    Promise.all([
      fetchAlumnos(),
      fetchAsesoras(),
      fetchAsesorasLlamadas(),
      fetchRegistrosHoy(),
      fetchSinResponderAcumulado(),
    ])
      .then(([als, todasAsesoras, asesorasLlamadas, regs, sinResp]) => {
        setAlumnos(als)
        setAsesoras(todasAsesoras)
        setAsesorasForm(asesorasLlamadas)
        setRegistrosHoy(regs)
        setSinResponder(sinResp)
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
      fetchSinResponderAcumulado().then(setSinResponder).catch(console.error)
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
    // Validaciones básicas siempre requeridas
    if (!form.alumno)    { toast.error('Selecciona un alumno'); return }
    if (!form.respondio) { toast.error('Indica si respondió'); return }
    if (!form.asesora)   { toast.error('Selecciona una asesora'); return }

    // Si contestó → validar campos obligatorios
    if (form.respondio.value === 'Sí') {
      const faltantes = []
      if (!form.avance)   faltantes.push('Avance del aula')
      if (!form.mentoria) faltantes.push('Asistió a mentoría')
      if (!form.cuenta)   faltantes.push('Tipo de cuenta')
      if (form.cuenta?.value === 'Real'   && !form.capital_real) faltantes.push('Capital en cuenta real')
      if (form.cuenta?.value === 'Fondeo' && !form.fase_fondeo)  faltantes.push('Fase de fondeo')
      if (form.cuenta?.value !== 'No opera' && !form.beneficio)  faltantes.push('Beneficio semanal')
      if (!form.retiro) faltantes.push('¿Realizó retiro?')
      if (form.retiro?.value === 'Sí' && !form.monto_retiro) faltantes.push('Monto retirado')

      if (faltantes.length > 0) {
        const msg = 'Faltan campos: ' + faltantes.join(', ')
        toast.error(msg, { duration: 5000 })
        return
      }
    }

    setSaving(true)
    try {
      // Generar código fresco en el momento exacto de guardar
      const codigoFresco = await fetchNextCodigo()
      const payload = {
        codigo:       codigoFresco,
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

      // Recargar historial y lista sin responder
      const alumnoId = form.alumno.value
      setForm({ ...formInicial(), codigo: '...' })
      fetchSinResponderAcumulado().then(setSinResponder).catch(console.error)
      // Mantener historial visible un momento y luego limpiar
      fetchHistorialAlumno(alumnoId).then(setHistorial).catch(console.error)
    } catch (err) {
      console.error(err)
      toast.error('Error al guardar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }, [form])

  // ── Seleccionar alumno desde el panel derecho ──
  const seleccionarDesdePanelDerecho = useCallback((registro) => {
    const alumno = registro.alumno
    if (!alumno) return

    // Buscar el programa del alumno
    const alumnoData = alumnos.find(a => a.id === registro.alumno_id)
    if (!alumnoData) return

    const progOpt = programasOpts.find(p => p.value === alumnoData.programa)
    const alumnoOpt = { value: alumnoData.id, label: alumnoData.nombre, data: alumnoData }
    const asesoraOpt = asesorasOpts.find(a => a.label === registro.asesora?.nombre) || null

    setForm(f => ({
      ...f,
      programa: progOpt || null,
      alumno:   alumnoOpt,
      semana:   alumnoData.semana_actual || '',
      asesora:  asesoraOpt,
    }))

    // Cargar historial
    fetchHistorialAlumno(alumnoData.id).then(setHistorial).catch(console.error)

    // Scroll al formulario
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [alumnos, programasOpts, asesorasOpts])

  const recargarHistorial = useCallback((alumnoId) => {
    if (alumnoId) fetchHistorialAlumno(alumnoId).then(setHistorial).catch(console.error)
  }, [])

  const limpiar = useCallback(() => {
    setForm({ ...formInicial(), codigo: '...' })
    setHistorial([])
  }, [])

  // ── Panel derecho: stats del día (filtrado por asesora) ──
  const registrosFiltrados = asesoraPanel
    ? registrosHoy.filter(r => r.asesora?.nombre === asesoraPanel)
    : registrosHoy

  // Lista acumulada sin responder (filtrada por asesora si aplica)
  const sinRespuestaAcumulada = asesoraPanel
    ? sinResponder.filter(r => r.asesora?.nombre === asesoraPanel)
    : sinResponder

  const stats = {
    total:        registrosFiltrados.length,
    respondieron: registrosFiltrados.filter(r => r.respondio === 'Sí').length,
    sinRespuesta: sinRespuestaAcumulada, // ahora es la lista acumulada
    efectividad:  registrosFiltrados.length
      ? Math.round((registrosFiltrados.filter(r => r.respondio === 'Sí').length / registrosFiltrados.length) * 100)
      : 0,
  }

  return {
    alumnos, asesoras, asesorasForm, registrosHoy, historial,
    form, setField, onAlumnoChange, onProgramaChange,
    programasOpts, alumnosOpts, asesorasOpts,
    guardar, limpiar, recargarHistorial, seleccionarDesdePanelDerecho,
    loading, saving,
    asesoraPanel, setAsesoraPanel, stats, sinResponder,
    asesorasPanelOpts,
  }
}
