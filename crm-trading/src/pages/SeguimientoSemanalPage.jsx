import { Loader2, RefreshCw, Check, X } from 'lucide-react'
import { useSeguimientoSemanal, TOTAL_SEMANAS } from '../hooks/useSeguimientoSemanal'

const ANCHO_NOMBRE = 200
const ANCHO_SEMANA_ACTUAL = 70
const ANCHO_COL = 42

function pctColor(pct) {
  if (pct == null) return 'var(--text-muted)'
  if (pct >= 70) return '#2dd4a0'
  if (pct >= 40) return '#f5b93a'
  return '#f07070'
}

export default function SeguimientoSemanalPage() {
  const {
    loading, cargar, filas,
    programasOpts, programaFiltro, setProgramaFiltro,
    semanaFiltro, setSemanaFiltro,
    contactabilidadPorSemana,
  } = useSeguimientoSemanal()

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', gap:10, color:'var(--text-muted)' }}>
      <Loader2 size={18} className="animate-spin" /><span style={{ fontSize:13 }}>Cargando...</span>
    </div>
  )

  return (
    <div style={{ padding:24 }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, color:'var(--text-primary)', fontSize:20 }}>Seguimiento Semanal</h1>
          <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:3 }}>
            Contactabilidad por semana de programa · {filas.length} alumno{filas.length === 1 ? '' : 's'} en curso o seguimiento
          </p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
          <select value={programaFiltro} onChange={e => setProgramaFiltro(e.target.value)}
            style={{ padding:'6px 10px', background:'var(--bg-input)', border:'1.5px solid var(--border-input)', borderRadius:8, color:'var(--text-primary)', fontSize:13, cursor:'pointer' }}>
            <option value="">— Todos los programas —</option>
            {programasOpts.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={semanaFiltro} onChange={e => setSemanaFiltro(e.target.value)}
            style={{ padding:'6px 10px', background:'var(--bg-input)', border:'1.5px solid var(--border-input)', borderRadius:8, color:'var(--text-primary)', fontSize:13, cursor:'pointer' }}>
            <option value="">— Todas las semanas —</option>
            {Array.from({ length: TOTAL_SEMANAS }, (_, i) => i + 1).map(n => (
              <option key={n} value={n}>Faltan por contactar: Semana {n}</option>
            ))}
          </select>
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
                width:ANCHO_SEMANA_ACTUAL, minWidth:ANCHO_SEMANA_ACTUAL, textAlign:'center', padding:'8px 6px',
                fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase',
                letterSpacing:'0.06em', borderBottom:'1px solid var(--border-default)',
                borderRight:'1px solid var(--border-default)',
              }}>Sem. actual</th>
              {contactabilidadPorSemana.map(c => (
                <th key={c.semana} title={`Semana ${c.semana}: ${c.pct != null ? `${c.pct}% contactados (${c.total} alumnos ya en esa semana)` : 'Nadie ha llegado aún a esta semana'}`}
                  style={{
                    width:ANCHO_COL, minWidth:ANCHO_COL, textAlign:'center', padding:'6px 2px',
                    borderBottom:'1px solid var(--border-default)', verticalAlign:'bottom',
                  }}>
                  <div style={{ fontSize:9, fontWeight:700, color:'var(--text-muted)' }}>S{c.semana}</div>
                  <div style={{ fontSize:11, fontWeight:700, color:pctColor(c.pct), marginTop:2 }}>{c.pct != null ? `${c.pct}%` : '—'}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 ? (
              <tr><td colSpan={2 + TOTAL_SEMANAS} style={{ textAlign:'center', color:'var(--text-muted)', padding:'30px 0' }}>Sin alumnos para mostrar</td></tr>
            ) : filas.map(f => (
              <tr key={f.id}>
                <td style={{
                  position:'sticky', left:0, zIndex:1, background:'var(--bg-card)',
                  width:ANCHO_NOMBRE, minWidth:ANCHO_NOMBRE, padding:'7px 12px', fontWeight:600,
                  color:'var(--text-primary)', borderBottom:'1px solid var(--border-default)',
                  borderRight:'1px solid var(--border-default)', overflow:'hidden', textOverflow:'ellipsis',
                }}>
                  {f.nombre}
                  <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:400 }}>{f.programa || '—'}</div>
                </td>
                <td style={{
                  position:'sticky', left:ANCHO_NOMBRE, zIndex:1, background:'var(--bg-card)',
                  width:ANCHO_SEMANA_ACTUAL, minWidth:ANCHO_SEMANA_ACTUAL, textAlign:'center',
                  color:'var(--text-secondary)', borderBottom:'1px solid var(--border-default)',
                  borderRight:'1px solid var(--border-default)',
                }}>
                  {f.semanaActual != null ? Math.min(f.semanaActual, TOTAL_SEMANAS) : '—'}
                </td>
                {Array.from({ length: TOTAL_SEMANAS }, (_, i) => i + 1).map(semana => {
                  const yaLlego = f.semanaActual != null && f.semanaActual >= semana
                  const contactado = f.contactadas.has(semana)
                  return (
                    <td key={semana} style={{ textAlign:'center', padding:'7px 2px', borderBottom:'1px solid var(--border-default)' }}>
                      {!yaLlego ? (
                        <span style={{ color:'var(--text-faint)' }}>·</span>
                      ) : contactado ? (
                        <Check size={14} style={{ color:'#2dd4a0' }} />
                      ) : (
                        <X size={13} style={{ color:'#f07070' }} />
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:10 }}>
        La semana es relativa a la fecha de inicio de cada alumno, no al calendario. ✓ = hubo al menos una llamada contestada esa semana. ✗ = ya le tocaba esa semana y aún no se logra contactar. El % de cada columna se calcula solo sobre los alumnos que ya llegaron a esa semana.
      </div>
    </div>
  )
}
