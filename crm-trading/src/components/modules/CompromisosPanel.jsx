import { useState } from 'react'
import { CheckCircle, XCircle, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const ESTADO_COLORS = {
  Pendiente:   { color: '#f5b93a', bg: 'rgba(245,166,35,0.1)',  border: 'rgba(245,166,35,0.25)' },
  Cumplido:    { color: '#2dd4a0', bg: 'rgba(45,212,160,0.1)',  border: 'rgba(45,212,160,0.25)' },
  Incumplido:  { color: '#f07070', bg: 'rgba(240,92,92,0.1)',   border: 'rgba(240,92,92,0.25)'  },
  Cancelado:   { color: '#506080', bg: 'rgba(80,96,128,0.1)',   border: 'rgba(80,96,128,0.25)'  },
}

const RESP_COLORS = {
  alumno:  { color: '#7ab3ff', label: 'Alumno' },
  asesora: { color: '#b89eff', label: 'Asesora' },
}

export default function CompromisosPanel({ compromisos, vencidosSinCerrar, vencenHoy, proximos3, onCerrar, onNuevo, loading }) {
  const [tab, setTab] = useState('hoy') // hoy | vencidos | proximos

  const tabData = {
    hoy:      vencenHoy,
    vencidos: vencidosSinCerrar,
    proximos: proximos3,
  }

  const tabs = [
    { key: 'hoy',      label: 'Hoy',      count: vencenHoy.length,         color: '#f5b93a' },
    { key: 'vencidos', label: 'Vencidos', count: vencidosSinCerrar.length,  color: '#f07070' },
    { key: 'proximos', label: '3 días',   count: proximos3.length,          color: '#7ab3ff' },
  ]

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      {/* Header */}
      <div style={{ padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)', background:'rgba(255,255,255,0.02)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:'#e2e8f4' }}>Compromisos</div>
            <div style={{ fontSize:10, color:'#3d5070', marginTop:2 }}>Bandeja de seguimiento</div>
          </div>
          <button onClick={onNuevo}
            style={{ background:'rgba(78,143,255,0.15)', border:'1px solid rgba(78,143,255,0.3)', color:'#7ab3ff', padding:'5px 10px', borderRadius:8, cursor:'pointer', fontSize:11, fontWeight:600, display:'flex', alignItems:'center', gap:4 }}>
            <Plus size={11} /> Nuevo
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ flex:1, padding:'8px 4px', background:'none', border:'none', cursor:'pointer',
              borderBottom: tab === t.key ? `2px solid ${t.color}` : '2px solid transparent',
              color: tab === t.key ? t.color : '#506080', fontSize:11, fontWeight:600, transition:'all 0.15s' }}>
            {t.label}
            {t.count > 0 && (
              <span style={{ marginLeft:4, background: tab === t.key ? `${t.color}25` : 'rgba(255,255,255,0.08)',
                color: tab === t.key ? t.color : '#506080',
                padding:'1px 5px', borderRadius:20, fontSize:9 }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div style={{ flex:1, overflowY:'auto' }}>
        {loading ? (
          <div style={{ padding:24, textAlign:'center', color:'#3d5070', fontSize:12 }}>Cargando...</div>
        ) : tabData[tab].length === 0 ? (
          <div style={{ padding:24, textAlign:'center', color:'#3d5070' }}>
            <CheckCircle size={24} style={{ opacity:0.3, marginBottom:8 }} />
            <div style={{ fontSize:12 }}>Sin compromisos en esta categoría</div>
          </div>
        ) : tabData[tab].map(c => {
          const hoy = new Date().toISOString().split('T')[0]
          const vencido = c.fecha_limite < hoy
          const resp = RESP_COLORS[c.responsable] || RESP_COLORS.asesora
          return (
            <div key={c.id} style={{ padding:'11px 14px', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
              {/* Alumno + fecha */}
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:4 }}>
                <div style={{ fontSize:12, fontWeight:600, color:'#e2e8f4', flex:1, marginRight:6 }}>
                  {c.alumno?.nombre || '—'}
                </div>
                <span style={{ fontSize:10, fontWeight:600, color: vencido ? '#f07070' : '#f5b93a',
                  background: vencido ? 'rgba(240,92,92,0.1)' : 'rgba(245,166,35,0.1)',
                  border: `1px solid ${vencido ? 'rgba(240,92,92,0.25)' : 'rgba(245,166,35,0.25)'}`,
                  padding:'1px 6px', borderRadius:20, whiteSpace:'nowrap' }}>
                  {c.fecha_limite === new Date().toISOString().split('T')[0] ? 'Hoy' : format(new Date(c.fecha_limite + 'T00:00:00'), 'dd MMM', { locale: es })}
                </span>
              </div>

              {/* Descripción */}
              <div style={{ fontSize:11, color:'#9aaccb', marginBottom:6, lineHeight:1.4 }}>{c.descripcion}</div>

              {/* Meta + responsable */}
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                <span style={{ fontSize:10, color: resp.color, background:`${resp.color}15`,
                  border:`1px solid ${resp.color}30`, padding:'1px 6px', borderRadius:20 }}>
                  {resp.label}
                </span>
                <span style={{ fontSize:10, color:'#3d5070' }}>{c.alumno?.programa}</span>
              </div>

              {/* Acciones */}
              <div style={{ display:'flex', gap:5 }}>
                <button onClick={() => onCerrar(c.id, 'Cumplido')}
                  style={{ flex:1, padding:'4px 0', background:'rgba(45,212,160,0.1)', border:'1px solid rgba(45,212,160,0.25)',
                    color:'#2dd4a0', borderRadius:6, cursor:'pointer', fontSize:10, fontWeight:600,
                    display:'flex', alignItems:'center', justifyContent:'center', gap:3 }}>
                  <CheckCircle size={10} /> Cumplido
                </button>
                <button onClick={() => onCerrar(c.id, 'Incumplido')}
                  style={{ flex:1, padding:'4px 0', background:'rgba(240,92,92,0.08)', border:'1px solid rgba(240,92,92,0.2)',
                    color:'#f07070', borderRadius:6, cursor:'pointer', fontSize:10, fontWeight:600,
                    display:'flex', alignItems:'center', justifyContent:'center', gap:3 }}>
                  <XCircle size={10} /> Incumplido
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer stats */}
      <div style={{ padding:'8px 14px', borderTop:'1px solid rgba(255,255,255,0.07)', display:'flex', gap:12 }}>
        <span style={{ fontSize:11, color:'#f07070' }}>⚠ {vencidosSinCerrar.length} vencidos</span>
        <span style={{ fontSize:11, color:'#f5b93a' }}>· {vencenHoy.length} hoy</span>
        <span style={{ fontSize:11, color:'#7ab3ff' }}>· {proximos3.length} próximos</span>
      </div>
    </div>
  )
}
