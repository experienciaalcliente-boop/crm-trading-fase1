import { useState, useEffect, useCallback } from 'react'
import { fetchCuotas, fetchCuotasAlumno, registrarPago, hoyLima } from '../lib/api'
import toast from 'react-hot-toast'

export function useRecaudacion() {
  const [cuotas,        setCuotas]        = useState([])
  const [loading,       setLoading]       = useState(true)
  const [saving,        setSaving]        = useState(false)
  const [filtroEstado,  setFiltroEstado]  = useState('Todos')
  const [filtroPrograma,setFiltroPrograma]= useState('Todos')
  const [filtroMes,     setFiltroMes]     = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
  })
  const [modalData,     setModalData]     = useState(null) // cuota seleccionada
  const [cuotasAlumno,  setCuotasAlumno]  = useState([])

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchCuotas({ estado: filtroEstado, programa: filtroPrograma, ordenVencidas: true, mes: filtroMes })
      setCuotas(data)
    } catch (err) {
      toast.error('Error al cargar cuotas')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [filtroEstado, filtroPrograma, filtroMes])

  useEffect(() => { cargar() }, [cargar])

  const abrirModal = useCallback(async (cuota) => {
    setModalData({ cuota, form: formInicial(cuota) })
    const historial = await fetchCuotasAlumno(cuota.alumno_id)
    setCuotasAlumno(historial)
  }, [])

  const cerrarModal = useCallback(() => {
    setModalData(null)
    setCuotasAlumno([])
  }, [])

  const setFormField = useCallback((key, val) => {
    setModalData(prev => ({ ...prev, form: { ...prev.form, [key]: val } }))
  }, [])

  const guardarPago = useCallback(async () => {
    if (!modalData) return
    const { cuota, form } = modalData

    if (!form.tipo) { toast.error('Selecciona el tipo de gestión'); return }

    // Validaciones por tipo
    if (form.tipo === 'Pago parcial' && !form.monto) { toast.error('Ingresa el monto pagado'); return }
    if (form.tipo === 'Prórroga' && !form.nueva_fecha) { toast.error('Selecciona la nueva fecha'); return }
    if (form.tipo === 'Retiro' && !form.motivo) { toast.error('Indica el motivo de retiro'); return }

    setSaving(true)
    try {
      const estadoMap = {
        'Pago completo':      'Pagada',
        'Pago parcial':       'Pago parcial',
        'Prórroga':           'Prórroga',
        'Reserva académica':  'Reserva académica',
        'Retiro':             'Retirado',
      }
      await registrarPago(cuota.id, {
        alumno_id:    cuota.alumno_id,
        tipo:         form.tipo,
        monto:        form.monto ? parseFloat(form.monto) : null,
        moneda:       form.moneda || cuota.moneda,
        fecha_pago:   form.fecha_pago,
        nueva_fecha:  form.nueva_fecha || null,
        motivo:       form.motivo || null,
        observaciones: form.observaciones || null,
        estado:       estadoMap[form.tipo],
        monto_pagado: form.tipo === 'Pago parcial' ? parseFloat(form.monto) : form.tipo === 'Pago completo' ? cuota.monto : cuota.monto_pagado,
      })
      toast.success('Gestión registrada ✓')
      cerrarModal()
      cargar()
    } catch (err) {
      toast.error('Error: ' + err.message)
      console.error(err)
    } finally {
      setSaving(false)
    }
  }, [modalData, cargar, cerrarModal])

  // Stats rápidas
  const hoy = hoyLima()
  const stats = {
    total:      cuotas.length,
    pagadas:    cuotas.filter(c => c.estado === 'Pagada').length,
    parciales:  cuotas.filter(c => c.estado === 'Pago parcial').length,
    pendientes: cuotas.filter(c => c.estado === 'No iniciada').length,
    vencidas:   cuotas.filter(c => c.fecha_vence < hoy && c.estado !== 'Pagada').length,
    prorrogas:  cuotas.filter(c => c.estado === 'Prórroga').length,
  }

  const programas = [...new Set(cuotas.map(c => c.alumno?.programa).filter(Boolean))]

  return {
    cuotas, loading, saving, stats, programas,
    filtroEstado, setFiltroEstado,
    filtroPrograma, setFiltroPrograma,
    filtroMes, setFiltroMes,
    modalData, abrirModal, cerrarModal,
    setFormField, guardarPago,
    cuotasAlumno, cargar,
  }
}

function formInicial(cuota) {
  return {
    tipo:        null,
    monto:       '',
    moneda:      cuota.moneda || 'USD',
    fecha_pago:  hoyLima(),
    nueva_fecha: '',
    motivo:      '',
    observaciones: '',
  }
}
