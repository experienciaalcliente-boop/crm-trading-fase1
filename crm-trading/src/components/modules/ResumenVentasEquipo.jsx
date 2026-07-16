import { Loader2, Pencil } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'
import { useVentasEquipo } from '../../hooks/useVentasEquipo'
import ModalEditarVenta from './ModalEditarVenta'

const fmt = n => Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const MESES_CORTOS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
function formatMesCorto(mesStr) {
  const [y, m] = mesStr.split('-').map(Number)
  return `${MESES_CORTOS[m - 1]} ${String(y).slice(-2)}`
}

const tooltipCantidad = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'var(--bg-input)', border:'1px solid var(--border-default)', borderRadius:8, padding:'8px 12px', fontSize:12 }}>
      <div style={{ color:'var(--text-primary)', fontWeight:600, marginBottom:2 }}>{label}</div>
      <div style={{ color:'var(--accent)' }}>{payload[0].value} complementos</div>
    </div>
  )
}
const tooltipMonto = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'var(--bg-input)', border:'1px solid var(--border-default)', borderRadius:8, padding:'8px 12px', fontSize:12 }}>
      <div style={{ color:'var(--text-primary)', fontWeight:600, marginBottom:2 }}>{label}</div>
      <div style={{ color:'#2dd4a0' }}>S/ {fmt(payload[0].value)}</div>
    </div>
  )
}

function KPICard({ label, value, color }) {
  return (
    <div className="crm-card" style={{ padding:16 }}>
      <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:700, color: color || 'var(--text-primary)', fontFamily:'Syne,sans-serif', lineHeight:1.2 }}>{value}</div>
    </div>
  )
}

export default function ResumenVentasEquipo() {
  const e = useVentasEquipo()

  if (e.loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300, gap:10, color:'var(--text-muted)' }}>
      <Loader2 size={18} className="animate-spin" /><span style={{ fontSize:13 }}>Cargando...</span>
    </div>
  )

  const dataMensual = e.evolucionMensual.map(m => ({ ...m, mesLabel: formatMesCorto(m.mes) }))

  return (
    <div>
      <div style={{ marginBottom:16 }}>
        <h1 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, color:'var(--text-primary)', fontSize:20 }}>Ventas de complementos — Equipo</h1>
        <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:3 }}>Resumen del mes actual y evolución desde junio 2026, todas las asesoras</p>
      </div>

      {/* Resumen del mes */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:20 }}>
        <KPICard label="Ventas este mes" value={e.totalVentasMes} />
        <KPICard label="Complemento más vendido" value={e.complementoMasVendido || '—'} />
        <KPICard label="Monto total (S/)" value={`S/ ${fmt(e.montoTotalMes)}`} color="#2dd4a0" />
      </div>

      {/* Por asesora / Por complemento */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
        <div className="crm-card" style={{ padding:18 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>Monto por asesora (mes)</div>
          {e.porAsesora.length === 0 ? (
            <div style={{ color:'var(--text-muted)', fontSize:13 }}>Sin ventas este mes</div>
          ) : e.porAsesora.map(a => (
            <div key={a.nombre} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize:12, color:'var(--text-secondary)' }}>{a.nombre} <span style={{ color:'var(--text-muted)' }}>({a.cantidad})</span></span>
              <span style={{ fontSize:13, fontWeight:700, color:'#2dd4a0' }}>S/ {fmt(a.monto)}</span>
            </div>
          ))}
        </div>
        <div className="crm-card" style={{ padding:18 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>Monto por complemento (mes)</div>
          {e.porComplemento.length === 0 ? (
            <div style={{ color:'var(--text-muted)', fontSize:13 }}>Sin ventas este mes</div>
          ) : e.porComplemento.map(c => (
            <div key={c.complemento} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize:12, color:'var(--text-secondary)' }}>{c.complemento} <span style={{ color:'var(--text-muted)' }}>({c.cantidad})</span></span>
              <span style={{ fontSize:13, fontWeight:700, color:'#2dd4a0' }}>S/ {fmt(c.monto)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Evolución mensual — dos gráficos separados: cantidad y monto no
          comparten escala, así que no van en un solo eje (ver skill dataviz). */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
        <div className="crm-card" style={{ padding:18 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>Cantidad vendida por mes</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dataMensual} margin={{ top:10, right:10, left:0, bottom:0 }}>
              <XAxis dataKey="mesLabel" tick={{ fill:'#6f9c9a', fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill:'#6f9c9a', fontSize:11 }} axisLine={false} tickLine={false} />
              <Tooltip content={tooltipCantidad} />
              <Bar dataKey="cantidad" fill="var(--accent)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="crm-card" style={{ padding:18 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>Monto en soles por mes</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dataMensual} margin={{ top:10, right:10, left:0, bottom:0 }}>
              <XAxis dataKey="mesLabel" tick={{ fill:'#6f9c9a', fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:'#6f9c9a', fontSize:11 }} axisLine={false} tickLine={false} />
              <Tooltip content={tooltipMonto} />
              <Bar dataKey="monto" fill="#2dd4a0" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Historial de ventas */}
      <div className="crm-card" style={{ overflowX:'auto' }}>
        <table className="crm-table">
          <thead>
            <tr>
              <th>Fecha</th><th>Asesora</th><th>Alumno</th><th>Programa</th>
              <th>Complemento</th><th>Valor</th><th>Comisión</th><th>N° Operación</th><th>Corregir</th>
            </tr>
          </thead>
          <tbody>
            {e.ventas.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign:'center', color:'var(--text-muted)', padding:20 }}>Sin ventas registradas</td></tr>
            ) : e.ventas.map(ve => (
              <tr key={ve.id}>
                <td>{format(new Date(ve.fecha_registro + 'T00:00:00'), 'dd/MM/yyyy')}</td>
                <td style={{ fontSize:12, color: ve.asesora?.nombre ? 'var(--text-secondary)' : '#f5b93a' }}>{ve.asesora?.nombre || 'Sin asignar'}</td>
                <td style={{ fontWeight:500 }}>{ve.alumno?.nombre || '—'}</td>
                <td>{ve.alumno?.programa || '—'}</td>
                <td>{ve.complemento}</td>
                <td>$ {ve.valor_producto}</td>
                <td style={{ color:'#2dd4a0' }}>S/ {ve.valor_comision}</td>
                <td style={{ fontSize:11, color:'var(--text-muted)' }}>{ve.nro_operacion}</td>
                <td>
                  <button className="crm-btn crm-btn-sm" style={{ fontSize:11 }} onClick={() => e.abrirEdicion(ve)}>
                    <Pencil size={11} /> Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ModalEditarVenta
        editando={e.editando}
        alumnos={e.alumnos}
        asesoras={e.asesoras}
        onCampo={e.setCampoEdicion}
        onGuardar={e.guardarEdicion}
        onCerrar={e.cerrarEdicion}
        guardando={e.guardando}
      />
    </div>
  )
}
