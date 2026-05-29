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
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all
              ${asesoraPanel === null
                ? 'bg-brand/15 border-brand/35 text-brand'
                : 'bg-bg-3 border-line2 text-sub hover:text-white'}`}
          >
            Todas
          </button>
          {asesoras.map(a => (
            <button
              key={a.id}
              onClick={() => setAsesoraPanel(a.nombre === asesoraPanel ? null : a.nombre)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all
                ${asesoraPanel === a.nombre
                  ? 'bg-brand/15 border-brand/35 text-brand'
                  : 'bg-bg-3 border-line2 text-sub hover:text-white'}`}
            >
              {a.nombre.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2 p-3 border-b border-line">
        <StatMini icon={Phone}        label="Llamadas"     value={stats.total}        color="blue" />
        <StatMini icon={TrendingUp}   label="Respondieron" value={stats.respondieron}  color="green" />
        <StatMini icon={PhoneMissed}  label="Sin respuesta" value={sinRespuesta.length} color="red" />
        <StatMini icon={TrendingUp}   label="Efectividad"  value={`${stats.efectividad}%`} color="amber" />
      </div>

      {/* Lista sin respuesta */}
      <div className="px-4 py-2.5 border-b border-line">
        <div className="text-[10px] font-semibold text-muted uppercase tracking-widest flex items-center gap-1.5">
          <PhoneMissed size={10} />
          Sin respuesta hoy
          {sinRespuesta.length > 0 && (
            <span className="ml-auto bg-danger/15 text-danger text-[10px] px-1.5 py-0.5 rounded-full font-bold">
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
  const colors = {
    blue:  'text-brand border-brand/20 bg-brand/5',
    green: 'text-success border-success/20 bg-success/5',
    red:   'text-danger border-danger/20 bg-danger/5',
    amber: 'text-warn border-warn/20 bg-warn/5',
  }
  return (
    <div className={`rounded-xl border p-2.5 ${colors[color]}`}>
      <div className="text-[10px] font-semibold opacity-70 mb-1 uppercase tracking-wider">{label}</div>
      <div className="text-xl font-display font-bold leading-none">{value}</div>
    </div>
  )
}
