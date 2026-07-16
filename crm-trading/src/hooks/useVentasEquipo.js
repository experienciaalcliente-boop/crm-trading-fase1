import { useState, useEffect, useCallback } from 'react'
import { fetchVentasComplementosDesde, fetchAlumnos, fetchAsesoras, updateVentaComplemento } from '../lib/api'
import toast from 'react-hot-toast'

// El feature de venta de complementos arrancó en junio-26 (no hay ventas
// reales antes de esa fecha) — se usa como punto de partida único tanto
// para el historial como para el gráfico de evolución mensual.
const INICIO_HISTORICO = '2026-06-01'

// Resumen de equipo para el supervisor: todas las ventas de todas las
// asesoras (no solo las propias, a diferencia de useVentasComplementos).
export function useVentasEquipo() {
  const [ventas,  setVentas]  = useState([])
  const [loading, setLoading] = useState(true)
  const [alumnos, setAlumnos] = useState([])
  const [asesoras, setAsesoras] = useState([])
  const [editando, setEditando] = useState(null) // { venta, form }
  const [guardando, setGuardando] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [data, als, ases] = await Promise.all([
        fetchVentasComplementosDesde(INICIO_HISTORICO),
        fetchAlumnos(undefined, { soloActivos: false }),
        fetchAsesoras(),
      ])
      setVentas(data)
      setAlumnos(als)
      setAsesoras(ases)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  // ── Corregir un dato mal colocado por la asesora (solo supervisor) ──
  const abrirEdicion = useCallback((venta) => {
    setEditando({
      venta,
      form: {
        asesora_id:      venta.asesora_id || '',
        alumno_id:       venta.alumno_id || '',
        complemento:     venta.complemento || '',
        valor_producto:  venta.valor_producto ?? '',
        valor_comision:  venta.valor_comision ?? '',
        nro_operacion:   venta.nro_operacion || '',
        fecha_registro:  venta.fecha_registro || '',
        fecha_inicio:    venta.fecha_inicio || '',
        fecha_fin:       venta.fecha_fin || '',
        estado_mentoria: venta.estado_mentoria || '',
      },
    })
  }, [])

  const cerrarEdicion = useCallback(() => setEditando(null), [])

  const setCampoEdicion = useCallback((key, val) => {
    setEditando(e => e ? { ...e, form: { ...e.form, [key]: val } } : e)
  }, [])

  const guardarEdicion = useCallback(async () => {
    if (!editando) return
    const { venta, form } = editando
    setGuardando(true)
    try {
      await updateVentaComplemento(venta.id, {
        asesora_id:      form.asesora_id || null,
        alumno_id:       form.alumno_id || null,
        complemento:     form.complemento,
        valor_producto:  form.valor_producto === '' ? null : parseFloat(form.valor_producto),
        valor_comision:  form.valor_comision === '' ? null : parseFloat(form.valor_comision),
        nro_operacion:   form.nro_operacion,
        fecha_registro:  form.fecha_registro,
        fecha_inicio:    form.fecha_inicio || null,
        fecha_fin:       form.fecha_fin || null,
        estado_mentoria: form.estado_mentoria || null,
      })
      toast.success('Venta corregida ✓')
      setEditando(null)
      cargar()
    } catch (err) {
      toast.error('Error al corregir: ' + err.message)
    } finally {
      setGuardando(false)
    }
  }, [editando, cargar])

  const mesActual = new Date().toISOString().slice(0, 7)
  const ventasMes = ventas.filter(v => v.fecha_registro?.slice(0, 7) === mesActual)

  // ── Resumen del mes ────────────────────────────────────────
  const totalVentasMes = ventasMes.length
  const montoTotalMes = ventasMes.reduce((s, v) => s + (parseFloat(v.valor_comision) || 0), 0)
  const conteoComplemento = {}
  ventasMes.forEach(v => { conteoComplemento[v.complemento] = (conteoComplemento[v.complemento] || 0) + 1 })
  const complementoMasVendido = Object.entries(conteoComplemento).sort((a, b) => b[1] - a[1])[0]?.[0] || null

  // ── Por asesora (mes) ──────────────────────────────────────
  const gruposAsesora = {}
  ventasMes.forEach(v => {
    const key = v.asesora_id || 'sin-asesora'
    if (!gruposAsesora[key]) gruposAsesora[key] = { nombre: v.asesora?.nombre || 'Sin asignar', cantidad: 0, monto: 0 }
    gruposAsesora[key].cantidad++
    gruposAsesora[key].monto += parseFloat(v.valor_comision) || 0
  })
  const porAsesora = Object.values(gruposAsesora).sort((a, b) => b.monto - a.monto)

  // ── Por complemento (mes) ──────────────────────────────────
  const gruposComplemento = {}
  ventasMes.forEach(v => {
    if (!gruposComplemento[v.complemento]) gruposComplemento[v.complemento] = { complemento: v.complemento, cantidad: 0, monto: 0 }
    gruposComplemento[v.complemento].cantidad++
    gruposComplemento[v.complemento].monto += parseFloat(v.valor_comision) || 0
  })
  const porComplemento = Object.values(gruposComplemento).sort((a, b) => b.monto - a.monto)

  // ── Evolución mensual (desde Jun-26) ───────────────────────
  const gruposMes = {}
  ventas.forEach(v => {
    const mes = v.fecha_registro?.slice(0, 7)
    if (!mes) return
    if (!gruposMes[mes]) gruposMes[mes] = { mes, cantidad: 0, monto: 0 }
    gruposMes[mes].cantidad++
    gruposMes[mes].monto += parseFloat(v.valor_comision) || 0
  })
  const evolucionMensual = Object.values(gruposMes).sort((a, b) => a.mes.localeCompare(b.mes))

  return {
    ventas, loading, cargar,
    totalVentasMes, montoTotalMes, complementoMasVendido,
    porAsesora, porComplemento, evolucionMensual,
    alumnos, asesoras,
    editando, abrirEdicion, cerrarEdicion, setCampoEdicion, guardarEdicion, guardando,
  }
}
