import { Phone, Calendar, CheckCircle, XCircle } from 'lucide-react'

export default function RecordatorioModal({ llamada, onAccion, onCerrar }) {
  if (!llamada) return null

  const acciones = [
    { key: 'iniciar',   label: 'Iniciar gestión',      icon: Phone,       color: '#4e8fff', bg: 'rgba(78,143,255,0.15)', border: 'rgba(78,143,255,0.3)' },
    { key: 'realizada', label: 'Marcar como realizada', icon: CheckCircle, color: '#2dd4a0', bg: 'rgba(45,212,160,0.1)',  border: 'rgba(45,212,160,0.25)' },
    { key: 'no_contacto',label: 'No contactado',        icon: XCircle,     color: '#f07070', bg: 'rgba(240,92,92,0.1)',  border: 'rgba(240,92,92,0.25)'  },
    { key: 'reprogramar',label: 'Reprogramar',          icon: Calendar,    color: '#f5b93a', bg: 'rgba(245,166,35,0.1)', border: 'rgba(245,166,35,0.25)' },
  ]

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'var(--bg-card)', border:'2px solid rgba(78,143,255,0.4)', borderRadius:16, width:'100%', maxWidth:400, boxShadow:'0 20px 60px rgba(0,0,0,0.7)', overflow:'hidden' }}>

        {/* Header animado */}
        <div style={{ background:'linear-gradient(135deg, rgba(78,143,255,0.2), rgba(124,58,237,0.2))', padding:'20px 24px', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:'rgba(78,143,255,0.25)', border:'2px solid rgba(78,143,255,0.5)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Phone size={20} style={{ color:'#7ab3ff' }} />
            </div>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:'#7ab3ff', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:2 }}>📞 Llamada programada</div>
              <div style={{ fontSize:16, fontWeight:700, color:'var(--text-primary)' }}>{llamada.alumno?.nombre || '—'}</div>
            </div>
          </div>
        </div>

        {/* Info */}
        <div style={{ padding:'16px 24px', borderBottom:'1px solid var(--border-default)' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[
              { label:'Programa',  value: llamada.alumno?.programa || '—' },
              { label:'Semana',    value: llamada.alumno?.semana_actual ? `Sem. ${llamada.alumno.semana_actual}` : '—' },
              { label:'Programada',value: llamada.hora?.slice(0,5) || '—' },
              { label:'Motivo',    value: llamada.motivo || 'Sin especificar' },
            ].map(({ label, value }) => (
              <div key={label} style={{ background:'rgba(255,255,255,0.04)', borderRadius:8, padding:'8px 10px' }}>
                <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:2 }}>{label}</div>
                <div style={{ fontSize:12, color:'var(--text-primary)', fontWeight:500 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Acciones */}
        <div style={{ padding:'16px 24px', display:'flex', flexDirection:'column', gap:8 }}>
          <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>¿Qué deseas hacer?</div>
          {acciones.map(({ key, label, icon: Icon, color, bg, border }) => (
            <button key={key} onClick={() => onAccion(llamada.id, key)}
              style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:10, cursor:'pointer',
                background:bg, border:`1px solid ${border}`, color, fontSize:13, fontWeight:600, transition:'all 0.15s', textAlign:'left' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        <div style={{ padding:'0 24px 16px', textAlign:'center' }}>
          <button onClick={onCerrar} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:12 }}>
            Ignorar por ahora
          </button>
        </div>
      </div>
    </div>
  )
}
