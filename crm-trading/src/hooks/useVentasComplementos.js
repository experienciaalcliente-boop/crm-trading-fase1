import { useState, useEffect, useCallback } from 'react'
import { fetchAlumnos, fetchVentasComplementos, insertVentaComplemento, CATALOGO_COMPLEMENTOS, MINIMO_COMPLEMENTOS_COMISION, hoyLima } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const hoyStr = hoyLima

const crearFormInicial = () => ({
  alumno_id: '',
  complemento: '',
  nro_operacion: '',
  fecha_registro: hoyStr(),
  fecha_inicio: '',
  fecha_fin: '',
  estado_mentoria: '',
})

export function useVentasComplementos() {
  const { user } = useAuth()
  // A diferencia de Seguimiento/Orientación/Onboarding, acá SÍ debe verse
  // la base completa de alumnos y programas para todos los roles (asesora,
  // orientador y supervisor): cualquiera puede vender un complemento a
  // cualquier alumno, no solo a los propios. Solo el historial de "mis
  // ventas" queda scopeado por asesora.
  const asesoraIdPropia = user?.rol === 'asesora' ? user.asesora_id : undefined

  const [alumnos,       setAlumnos]       = useState([])
  const [ventas,        setVentas]        = useState([])
  const [loading,       setLoading]       = useState(true)
  const [saving,        setSaving]        = useState(false)
  const [form,          setForm]          = useState(crearFormInicial)
  const [programaFiltro, setProgramaFiltro] = useState('')

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      // Las ventas de complementos pueden ser de programas ya culminados
      // (alumnos antiguos), no solo de los activos — por eso soloActivos:false.
      const [als, vts] = await Promise.all([
        fetchAlumnos(undefined, { soloActivos: false }),
        fetchVentasComplementos(asesoraIdPropia),
      ])
      setAlumnos(als)
      setVentas(vts)
    } catch (err) {
      toast.error('Error al cargar ventas de complementos')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [asesoraIdPropia])

  useEffect(() => { cargar() }, [cargar])

  const setField = useCallback((key, val) => {
    setForm(f => ({ ...f, [key]: val }))
  }, [])

  // Todos los programas presentes en la base de alumnos cargada (activos e
  // históricos), para poder filtrar el selector de alumno por programa.
  const programasOpts = [...new Set(alumnos.map(a => a.programa))].filter(Boolean).sort()
  const alumnosFiltrados = programaFiltro ? alumnos.filter(a => a.programa === programaFiltro) : alumnos
  const alumnosOpts = alumnosFiltrados.map(a => ({ value: a.id, label: a.nombre, data: a }))
  const alumnoSeleccionado = alumnos.find(a => a.id === form.alumno_id) || null
  const complementoSeleccionado = CATALOGO_COMPLEMENTOS.find(c => c.key === form.complemento) || null

  const guardar = async () => {
    if (!form.alumno_id)      { toast.error('Selecciona un alumno'); return }
    if (!form.complemento)    { toast.error('Selecciona el complemento vendido'); return }
    if (!form.fecha_registro) { toast.error('Indica la fecha de registro'); return }
    if (!form.nro_operacion) { toast.error('Ingresa el N° de operación del comprobante'); return }
    if (complementoSeleccionado.tipo === 'impulso' && (!form.fecha_inicio || !form.fecha_fin)) {
      toast.error('Indica fecha de inicio y fin del Impulso Burs'); return
    }
    if (complementoSeleccionado.tipo === 'mentoria' && !form.estado_mentoria) {
      toast.error('Indica si la mentoría está vigente o finalizada'); return
    }

    setSaving(true)
    try {
      await insertVentaComplemento({
        alumno_id:       form.alumno_id,
        asesora_id:      asesoraIdPropia || alumnoSeleccionado?.asesora_id || null,
        complemento:     form.complemento,
        valor_producto:  complementoSeleccionado.valorProducto,
        valor_comision:  complementoSeleccionado.valorComision,
        nro_operacion:   form.nro_operacion,
        fecha_registro:  form.fecha_registro,
        fecha_inicio:    complementoSeleccionado.tipo === 'impulso' ? form.fecha_inicio : null,
        fecha_fin:       complementoSeleccionado.tipo === 'impulso' ? form.fecha_fin : null,
        estado_mentoria: complementoSeleccionado.tipo === 'mentoria' ? form.estado_mentoria : null,
      })
      toast.success('Venta registrada ✓')
      setForm(crearFormInicial())
      cargar()
    } catch (err) {
      toast.error('Error al registrar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const totalVentasMes = ventas.length
  const faltanParaComision = Math.max(0, MINIMO_COMPLEMENTOS_COMISION - totalVentasMes)

  return {
    alumnos, alumnosOpts, ventas, loading, saving,
    form, setField, guardar,
    programaFiltro, setProgramaFiltro, programasOpts,
    alumnoSeleccionado, complementoSeleccionado,
    totalVentasMes, faltanParaComision,
    CATALOGO_COMPLEMENTOS, MINIMO_COMPLEMENTOS_COMISION,
  }
}
