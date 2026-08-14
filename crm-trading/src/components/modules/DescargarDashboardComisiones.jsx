import { useState } from 'react'
import { Download, Loader2, FileDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { calcularComisionesEquipoMes } from '../../lib/comisionesEquipo'
import { generarHTMLDashboardComisiones } from '../../lib/dashboardComisionesHTML'

function mesActualStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Solo supervisor: genera y descarga un HTML autocontenido (estilo
// dashboard/reporte) con las comisiones del equipo del mes elegido — tanto
// por cumplimiento de objetivos (Bono de Incentivos) como por venta de
// complementos — listo para compartir con gerencia o imprimir a PDF al
// solicitar el pago.
export default function DescargarDashboardComisiones() {
  const { user } = useAuth()
  const [mes, setMes] = useState(mesActualStr)
  const [generando, setGenerando] = useState(false)

  const descargar = async () => {
    setGenerando(true)
    try {
      const data = await calcularComisionesEquipoMes(mes)
      const mesLabel = new Date(mes + '-01T00:00:00').toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })
      const html = generarHTMLDashboardComisiones(data, {
        mesLabel,
        generadoPor: user?.nombre || 'Supervisor',
        fechaGeneracion: new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      })

      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Comisiones-Equipo-${mes}.html`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Dashboard descargado ✓')
    } catch (err) {
      console.error(err)
      toast.error('Error al generar el dashboard: ' + err.message)
    } finally {
      setGenerando(false)
    }
  }

  return (
    <div className="crm-card" style={{ padding: 24, maxWidth: 400 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <FileDown size={16} style={{ color: 'var(--accent)' }} />
        <h3 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, color: 'var(--text-primary)', fontSize: 15, margin: 0 }}>
          Dashboard de comisiones del equipo
        </h3>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 0, marginBottom: 16 }}>
        Descarga un reporte en HTML con las comisiones del equipo del mes elegido — por cumplimiento de objetivos y por venta de complementos — listo para gerencia.
      </p>

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Mes</label>
        <select value={mes} onChange={e => setMes(e.target.value)} className="crm-input" style={{ cursor: 'pointer' }}>
          {Array.from({ length: 12 }, (_, i) => {
            const dt = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1)
            const val = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
            return <option key={val} value={val}>{dt.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })}</option>
          })}
        </select>
      </div>

      <button onClick={descargar} disabled={generando} className="crm-btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
        {generando ? <><Loader2 size={14} className="animate-spin" /> Generando...</> : <><Download size={14} /> Descargar dashboard HTML</>}
      </button>
    </div>
  )
}
