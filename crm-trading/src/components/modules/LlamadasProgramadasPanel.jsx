import { PhoneCall, Plus, Pencil, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function LlamadasProgramadasPanel({ llamadas, vencidas, onNuevo, onEditar, onEliminar, loading }) {
  const hoy = new Date().toISOString().split('T')[0]

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border-default)', background:'rgba(255,255,255,0.02)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--text-primary)' }}>Llamadas programadas</div>
            <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>Próximas llamadas de seguimiento</div>
          </div>
          <button onClick={onNuevo}
            style={{ background:'rgba(101,167,166,0.15)', border:'1px solid rgba(101,167,166,0.3)', color:'var(--accent)', padding:'5px 10px', borderRadius:8, cursor:'pointer', fontSize:11, fontWeight:600, display:'flex', alignItems:'center', gap:4 }}>
            <Plus size={11} /> Agendar
          </button>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto' }}>
        {loading ? (
          <div style={{ padding:24, textAlign:'center', color:'var(--text-muted)', fontSize:12 }}>Cargando...</div>
        ) : llamadas.length === 0 ? (
          <div style={{ padding:24, textAlign:'center', color:'var(--text-muted)' }}>
            <PhoneCall size={24} style={{ opacity:0.3, marginBottom:8 }} />
            <div style={{ fontSize:12 }}>No hay llamadas agendadas</div>
          </div>
        ) : llamadas.map(l => {
          const esVencida = vencidas.some(v => v.id === l.id)
          const esHoy = l.fecha === hoy
          return (
            <div key={l.id} style={{ padding:'11px 14px', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:4 }}>
                <div style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)', flex:1, marginRight:6 }}>
                  {l.alumno?.nombre || '—'}
                </div>
                <span style={{ fontSize:10, fontWeight:600, color: esVencida ? '#f07070' : esHoy ? '#f5b93a' : 'var(--accent)',
                  background: esVencida ? 'rgba(240,92,92,0.1)' : esHoy ? 'rgba(245,166,35,0.1)' : 'rgba(101,167,166,0.1)',
                  border: `1px solid ${esVencida ? 'rgba(240,92,92,0.25)' : esHoy ? 'rgba(245,166,35,0.25)' : 'rgba(101,167,166,0.25)'}`,
                  padding:'1px 6px', borderRadius:20, whiteSpace:'nowrap' }}>
                  {esHoy ? `Hoy ${l.hora?.slice(0,5)}` : `${format(new Date(l.fecha + 'T00:00:00'), 'dd MMM', { locale: es })} · ${l.hora?.slice(0,5)}`}
                </span>
              </div>
              {l.motivo && (
                <div style={{ fontSize:11, color:'var(--text-secondary)', marginBottom:4, lineHeight:1.4 }}>{l.motivo}</div>
              )}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:10, color:'var(--text-muted)' }}>{l.alumno?.programa}</span>
                <div style={{ display:'flex', gap:6 }}>
                  <button onClick={() => onEditar(l)} title="Editar"
                    style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', padding:2, display:'flex' }}>
                    <Pencil size={12} />
                  </button>
                  <button onClick={() => window.confirm(`¿Eliminar la llamada agendada con ${l.alumno?.nombre}?`) && onEliminar(l.id)} title="Eliminar"
                    style={{ background:'none', border:'none', color:'#f07070', cursor:'pointer', padding:2, display:'flex' }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ padding:'8px 14px', borderTop:'1px solid var(--border-default)', display:'flex', gap:12 }}>
        <span style={{ fontSize:11, color:'#f07070' }}>⚠ {vencidas.length} vencidas</span>
        <span style={{ fontSize:11, color:'var(--accent)' }}>· {llamadas.length} programadas</span>
      </div>
    </div>
  )
}
