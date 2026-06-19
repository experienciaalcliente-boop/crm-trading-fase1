import { useState, useEffect, useCallback } from 'react'
import { fetchCompromisosHoy, insertCompromiso, updateCompromiso } from '../lib/api'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const TIPOS = [
  { value: 'pago_pendiente',      label: 'Pago pendiente' },
  { value: 'envio_documento',     label: 'Envío de documento' },
  { value: 'revision_contenido',  label: 'Revisión de contenido' },
  { value: 'llamada_programada',  label: 'Llamada programada' },
  { value: 'completar_onboarding',label: 'Completar onboarding' },
  { value: 'otro',                label: 'Otro' },
]

const FORM_INICIAL = {
  alumno_id:    null,
  asesora_id:   null,
  registro_id:  null,
  descripcion:  '',
  tipo:         'otro',
  responsable:  'alumno',
  fecha_limite: '',
  observaciones:'',
}

export function useCompromisos() {
  const [compromisos,  setCompromisos]  = useState([])
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [form,         setForm]         = useState(FORM_INICIAL)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchCompromisosHoy()
      setCompromisos(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  // Realtime
  useEffect(() => {
    const ch = supabase.channel('compromisos-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'compromisos' }, cargar)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [cargar])

  const setField = useCallback((k, v) => setForm(f => ({ ...f, [k]: v })), [])

  const abrirModal = useCallback((preData = {}) => {
    setForm({ ...FORM_INICIAL, ...preData })
    setModalAbierto(true)
  }, [])

  const cerrarModal = useCallback(() => {
    setModalAbierto(false)
    setForm(FORM_INICIAL)
  }, [])

  const guardar = useCallback(async () => {
    if (!form.alumno_id)    { toast.error('Selecciona el alumno'); return }
    if (!form.descripcion)  { toast.error('Escribe la descripción'); return }
    if (!form.fecha_limite) { toast.error('Indica la fecha límite'); return }
    setSaving(true)
    try {
      await insertCompromiso({
        alumno_id:    form.alumno_id,
        asesora_id:   form.asesora_id || null,
        registro_id:  form.registro_id || null,
        descripcion:  form.descripcion,
        tipo:         form.tipo,
        responsable:  form.responsable,
        fecha_limite: form.fecha_limite,
        observaciones:form.observaciones || null,
        estado:       'Pendiente',
      })
      toast.success('Compromiso registrado ✓')
      cerrarModal()
      cargar()
    } catch (err) {
      toast.error('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }, [form, cargar, cerrarModal])

  const cerrarCompromiso = useCallback(async (id, estado) => {
    try {
      await updateCompromiso(id, { estado, fecha_cierre: new Date().toISOString().split('T')[0] })
      toast.success(`Compromiso marcado como ${estado} ✓`)
      cargar()
    } catch (err) {
      toast.error('Error: ' + err.message)
    }
  }, [cargar])

  // Stats
  const hoy = new Date().toISOString().split('T')[0]
  const vencidosSinCerrar = compromisos.filter(c => c.fecha_limite < hoy && c.estado === 'Pendiente')
  const vencenHoy         = compromisos.filter(c => c.fecha_limite === hoy && c.estado === 'Pendiente')
  const proximos3         = compromisos.filter(c => c.fecha_limite > hoy && c.estado === 'Pendiente')

  return {
    compromisos, loading, saving,
    modalAbierto, form, setField,
    abrirModal, cerrarModal, guardar, cerrarCompromiso,
    vencidosSinCerrar, vencenHoy, proximos3,
    TIPOS, cargar,
  }
}
