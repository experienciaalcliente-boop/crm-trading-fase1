import { Users, TrendingUp, PhoneMissed, Phone } from 'lucide-react'

export default function PanelDerecho({
  asesoras, registrosHoy, stats,
  asesoraPanel, setAsesoraPanel,
}) {
  const sinRespuesta = stats.sinRespuesta || []

  return (
    <aside className="w-[280px] flex-shrink-0 border-l border-line bg-bg-2 flex flex-col overflow-y-auto">

      {/* Título */}
      <div className="px-4 py-4 border-b border-line">
        <div className="text-xs font-semibold text-white">Panel del día</div>
        <div className="text-[10px] text-muted mt-0.5">Actualización en tiempo real</div>
      </div>

      {/* Tabs asesoras */}
      <div className="px-3 py-3 border-b border-line">
        <div className="text-[10px] text-muted uppercase tracking-widest mb-2 px-1">Filtrar por asesora</div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setAsesoraPanel(null)}
            style={asesoraPanel === null ? { backgroundColor:'rgba(78,143,255,0.15)', borderColor:'rgba(78,143,255,0.35)', color:'#4e8fff' } : {}}
            className="px-2.5 py-1 rounded-full text-[11px] font-medium border border-line2 bg-bg-3 text-sub hover:text-white transition-all"
          >
            Todas
          </button>
          {asesoras.map(a => (
            <button
              key={a.id}
              onClick={() => setAsesoraPanel(a.nombre === asesoraPanel ? null : a.nombre)}
              style={asesoraPanel === a.nombre ? { backgroundColor:'rgba(78,143,255,0.15)', borderColor:'rgba(78,143,255,0.35)', color:'#4e8fff' } : {}}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium border border-line2 bg-bg-3 text-sub hover:text-white transition-all"
            >
              {a.nombre.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2 p-3 border-b border-line">
        <StatMini icon={Phone}        label="Llamadas"      value={stats.total}            color="blue" />
        <StatMini icon={TrendingUp}   label="Respondieron"  value={stats.respondieron}     color="green" />
        <StatMini icon={PhoneMissed}  label="Sin respuesta" value={sinRespuesta.length}    color="red" />
        <StatMini icon={TrendingUp}   label="Efectividad"   value={`${stats.efectividad}%`} color="amber" />
      </div>

      {/* Lista sin respuesta */}
      <div className="px-4 py-2.5 border-b border-line">
        <div className="text-[10px] font-semibold text-muted uppercase tracking-widest flex items-center gap-1.5">
          <PhoneMissed size={10} />
          Sin respuesta hoy
          {sinRespuesta.length > 0 && (
            <span style={{ backgroundColor:'rgba(240,92,92,0.15)', color:'#f05c5c' }} className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {sinRespuesta.length}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!sinRespuesta.length ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted gap-1.5">
            <div className="text-2xl">✓</div>
            <p className="text-xs">¡Todos respondieron!</p>
          </div>
        ) : (
          sinRespuesta.map(r => (
            <div key={r.id} className="px-4 py-3 border-b border-line hover:bg-bg-3 transition-colors">
              <div className="text-[13px] font-medium text-white truncate">
                {r.alumno?.nombre || '—'}
              </div>
              <div className="text-[11px] text-muted mt-0.5 flex items-center gap-1.5">
                <span className="truncate">{r.alumno?.programa || ''}</span>
                {r.alumno?.semana_actual && (
                  <><span>·</span><span>Sem. {r.alumno.semana_actual}</span></>
                )}
              </div>
              <div className="text-[10px] text-muted/70 mt-0.5">{r.asesora?.nombre || ''}</div>
            </div>
          ))
        )}
      </div>

      {/* Footer total */}
      <div className="p-3 border-t border-line">
        <div className="text-[10px] text-muted flex justify-between">
          <span>Total registros hoy</span>
          <span className="text-sub font-medium">{registrosHoy.length}</span>
        </div>
      </div>
    </aside>
  )
}

function StatMini({ icon: Icon, label, value, color }) {
  const styles = {
    blue:  { color:'#4e8fff',  borderColor:'rgba(78,143,255,0.2)',  backgroundColor:'rgba(78,143,255,0.05)' },
    green: { color:'#2dd4a0',  borderColor:'rgba(45,212,160,0.2)',  backgroundColor:'rgba(45,212,160,0.05)' },
    red:   { color:'#f05c5c',  borderColor:'rgba(240,92,92,0.2)',   backgroundColor:'rgba(240,92,92,0.05)'  },
    amber: { color:'#f5a623',  borderColor:'rgba(245,166,35,0.2)',  backgroundColor:'rgba(245,166,35,0.05)' },
  }
  return (
    <div style={{ ...styles[color], border:'1px solid' }} className="rounded-xl p-2.5">
      <div className="text-[10px] font-semibold opacity-70 mb-1 uppercase tracking-wider">{label}</div>
      <div style={{ color: styles[color].color }} className="text-xl font-display font-bold leading-none">{value}</div>
    </div>
  )
}
