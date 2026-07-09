import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format, addDays, subDays } from 'date-fns'
import { hoyLima } from '../../lib/api'

const hoyStr = hoyLima

// Visor de comentarios de encuesta filtrado a un día específico, navegable
// con flechas prev/next (más rápido que solo el calendario) — mismo patrón
// que ya usa el orientador para moverse día a día en su propia agenda.
export default function ComentariosPorDia({ fecha, setFecha, comentarios, titulo='Comentarios del día' }) {
  return (
    <div className="crm-card" style={{ padding:18 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:10 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{titulo}</div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button className="crm-btn crm-btn-sm" onClick={() => setFecha(format(subDays(new Date(fecha + 'T00:00:00'), 1), 'yyyy-MM-dd'))}>
            <ChevronLeft size={14} />
          </button>
          <input type="date" className="crm-input" style={{ width:150 }} max={hoyStr()}
            value={fecha} onChange={e => setFecha(e.target.value)} />
          <button className="crm-btn crm-btn-sm" onClick={() => setFecha(format(addDays(new Date(fecha + 'T00:00:00'), 1), 'yyyy-MM-dd'))} disabled={fecha === hoyStr()}>
            <ChevronRight size={14} />
          </button>
          {fecha !== hoyStr() && (
            <button className="crm-btn crm-btn-sm" onClick={() => setFecha(hoyStr())}>Hoy</button>
          )}
        </div>
      </div>
      {comentarios.length === 0 ? (
        <div style={{ fontSize:13, color:'var(--text-muted)', padding:'10px 0' }}>Sin comentarios ese día</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10, maxHeight:280, overflowY:'auto' }}>
          {comentarios.map((c, i) => (
            <div key={i} style={{ padding:'10px 12px', background:'rgba(255,255,255,0.03)', borderRadius:8, borderLeft:'3px solid #f5b93a' }}>
              <div style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.4 }}>"{c.comentario}"</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:6 }}>
                {c.extra ? `${c.extra} · ` : ''}{c.programa || 'Sin programa'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
