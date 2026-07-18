import { Loader2, RefreshCw, Download } from 'lucide-react'
import { useCuentasReales, TOTAL_SEMANAS } from '../hooks/useCuentasReales'

const ANCHO_NOMBRE = 200
const ANCHO_CAPITAL = 100
const ANCHO_COL = 64

const fmt = n => Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function CuentasRealesPage() {
  const {
    loading, cargar, alumnosReal, capitalTotal, totalPorSemana,
    asesoras, asesoraFiltro, setAsesoraFiltro,
    programasOpts, programaFiltro, setProgramaFiltro,
    exportarCSV,
  } = useCuentasReales()

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', gap:10, color:'var(--text-muted)' }}>
      <Loader2 size={18} className="animate-spin" /><span style={{ fontSize:13 }}>Cargando...</span>
    </div>
  )

  return (
    <div style={{ padding:24 }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, color:'var(--text-primary)', fontSize:20 }}>Cuentas Reales</h1>
          <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:3 }}>
            Alumnos con cuenta de trading en estado Real · {alumnosReal.length} alumno{alumnosReal.length === 1 ? '' : 's'} · Capital total: <span style={{ color:'#2dd4a0', fontWeight:700 }}>$ {fmt(capitalTotal)}</span>
          </p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
          <select value={asesoraFiltro} onChange={e => setAsesoraFiltro(e.target.value)}
            style={{ padding:'6px 10px', background:'var(--bg-input)', border:'1.5px solid var(--border-input)', borderRadius:8, color:'var(--text-primary)', fontSize:13, cursor:'pointer' }}>
            <option value="">— Todas las asesoras —</option>
            {asesoras.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
          <select value={programaFiltro} onChange={e => setProgramaFiltro(e.target.value)}
            style={{ padding:'6px 10px', background:'var(--bg-input)', border:'1.5px solid var(--border-input)', borderRadius:8, color:'var(--text-primary)', fontSize:13, cursor:'pointer' }}>
            <option value="">— Todos los programas —</option>
            {programasOpts.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <button className="crm-btn crm-btn-sm" onClick={exportarCSV} disabled={alumnosReal.length === 0}>
            <Download size={13} /> Descargar CSV
          </button>
          <button className="crm-btn crm-btn-sm" onClick={cargar}><RefreshCw size={13} /> Actualizar</button>
        </div>
      </div>

      <div className="crm-card" style={{ overflowX:'auto' }}>
        <table style={{ borderCollapse:'separate', borderSpacing:0, fontSize:12, whiteSpace:'nowrap' }}>
          <thead>
            <tr>
              <th style={{
                position:'sticky', left:0, zIndex:2, background:'var(--bg-card)',
                width:ANCHO_NOMBRE, minWidth:ANCHO_NOMBRE, textAlign:'left', padding:'8px 12px',
                fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase',
                letterSpacing:'0.06em', borderBottom:'1px solid var(--border-default)',
                borderRight:'1px solid var(--border-default)',
              }}>Alumno</th>
              <th style={{
                position:'sticky', left:ANCHO_NOMBRE, zIndex:2, background:'var(--bg-card)',
                width:ANCHO_CAPITAL, minWidth:ANCHO_CAPITAL, textAlign:'right', padding:'8px 12px',
                fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase',
                letterSpacing:'0.06em', borderBottom:'1px solid var(--border-default)',
                borderRight:'1px solid var(--border-default)',
              }}>Capital (USD)</th>
              {totalPorSemana.map(c => (
                <th key={c.semana} title={`Semana ${c.semana}: $ ${fmt(c.total)} en beneficios entre todos los alumnos filtrados`}
                  style={{
                    width:ANCHO_COL, minWidth:ANCHO_COL, textAlign:'center', padding:'6px 4px',
                    borderBottom:'1px solid var(--border-default)', verticalAlign:'bottom',
                  }}>
                  <div style={{ fontSize:9, fontWeight:700, color:'var(--text-muted)' }}>S{c.semana}</div>
                  <div style={{ fontSize:10, fontWeight:700, color: c.total > 0 ? '#2dd4a0' : 'var(--text-faint)', marginTop:2 }}>
                    {c.total > 0 ? `$${fmt(c.total)}` : '—'}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {alumnosReal.length === 0 ? (
              <tr><td colSpan={2 + TOTAL_SEMANAS} style={{ textAlign:'center', color:'var(--text-muted)', padding:'30px 0' }}>Sin alumnos con cuenta Real para este filtro</td></tr>
            ) : alumnosReal.map(al => (
              <tr key={al.id}>
                <td style={{
                  position:'sticky', left:0, zIndex:1, background:'var(--bg-card)',
                  width:ANCHO_NOMBRE, minWidth:ANCHO_NOMBRE, padding:'7px 12px', fontWeight:600,
                  color:'var(--text-primary)', borderBottom:'1px solid var(--border-default)',
                  borderRight:'1px solid var(--border-default)', overflow:'hidden', textOverflow:'ellipsis',
                }}>
                  {al.nombre}
                  <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:400 }}>{al.programa || '—'} · {al.asesoraNombre}</div>
                </td>
                <td style={{
                  position:'sticky', left:ANCHO_NOMBRE, zIndex:1, background:'var(--bg-card)',
                  width:ANCHO_CAPITAL, minWidth:ANCHO_CAPITAL, textAlign:'right', padding:'7px 12px',
                  color:'#2dd4a0', fontWeight:600, borderBottom:'1px solid var(--border-default)',
                  borderRight:'1px solid var(--border-default)',
                }}>
                  {al.capitalReal != null ? `$ ${fmt(al.capitalReal)}` : '—'}
                </td>
                {Array.from({ length: TOTAL_SEMANAS }, (_, i) => i + 1).map(semana => {
                  const reg = al.historialPorSemana[semana]
                  const yaLlego = al.semanaActual != null && al.semanaActual >= semana
                  return (
                    <td key={semana} style={{ textAlign:'center', padding:'7px 2px', borderBottom:'1px solid var(--border-default)', color:'var(--text-secondary)' }}>
                      {reg ? `$${fmt(reg.beneficio)}` : yaLlego ? <span style={{ color:'var(--text-faint)' }}>·</span> : <span style={{ color:'var(--text-faint)' }}>·</span>}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:10 }}>
        Solo alumnos En Curso/En Seguimiento cuyo último registro de llamada indica cuenta Real. El "Beneficio" mostrado es el que la asesora registró esa semana en su llamada de seguimiento. La semana es relativa a la fecha de inicio de cada alumno, no al calendario. El CSV descarga el detalle completo (una fila por alumno y semana con dato).
      </div>
    </div>
  )
}
