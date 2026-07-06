import { useState, useEffect, useCallback } from 'react'
import { fetchVentasComplementosDesde } from '../lib/api'

// El feature de venta de complementos arrancó en junio-26 (no hay ventas
// reales antes de esa fecha) — se usa como punto de partida único tanto
// para el historial como para el gráfico de evolución mensual.
const INICIO_HISTORICO = '2026-06-01'

// Resumen de equipo para el supervisor: todas las ventas de todas las
// asesoras (no solo las propias, a diferencia de useVentasComplementos).
export function useVentasEquipo() {
  const [ventas,  setVentas]  = useState([])
  const [loading, setLoading] = useState(true)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchVentasComplementosDesde(INICIO_HISTORICO)
      setVentas(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

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
  }
}
