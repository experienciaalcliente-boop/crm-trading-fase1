import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { History } from 'lucide-react'

function BadgeRespondio({ val }) {
  if (!val) return <span className="badge badge-gray">—</span>
  return <span className={`badge ${val === 'Sí' ? 'badge-green' : 'badge-red'}`}>{val}</span>
}

function BadgeCuenta({ val }) {
  if (!val) return null
  const m = { Demo: 'badge-gray', Real: 'badge-green', Fondeo: 'badge-purple', 'No opera': 'badge-red', Balance: 'badge-blue' }
  return <span className={`badge ${m[val] || 'badge-gray'}`}>{val}</span>
}

export default function HistorialAlumno({ historial, alumno }) {
  return (
    <div className="crm-card animate-fadeUp">
      <div className="px-5 py-4 border-b border-line flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History size={14} className="text-muted" />
          <span className="text-sm font-semibold text-white">Historial del alumno</span>
        </div>
        <span className="text-xs text-muted">
          {alumno ? alumno.label : '— selecciona un alumno —'}
        </span>
      </div>

      {!alumno || !historial.length ? (
        <div className="flex flex-col items-center justify-center py-10 text-muted gap-2">
          <History size={28} strokeWidth={1} />
          <p className="text-sm">{alumno ? 'Sin registros previos' : 'Selecciona un alumno para ver su historial'}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Semana</th>
                <th>Respondió</th>
                <th>Avance</th>
                <th>Cuenta</th>
                <th>Beneficio</th>
                <th>Retiro</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              {historial.map(r => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap text-xs">
                    {format(new Date(r.fecha + 'T00:00:00'), 'dd MMM yyyy', { locale: es })}
                  </td>
                  <td>{r.semana || '—'}</td>
                  <td><BadgeRespondio val={r.respondio} /></td>
                  <td>{r.avance != null ? `${r.avance}%` : '—'}</td>
                  <td><BadgeCuenta val={r.cuenta} /></td>
                  <td>{r.beneficio != null ? `$${Number(r.beneficio).toFixed(2)}` : '—'}</td>
                  <td>
                    {r.retiro === 'Sí'
                      ? <span className="badge badge-amber">${Number(r.monto_retiro || 0).toFixed(2)}</span>
                      : r.retiro === 'No' ? <span className="badge badge-gray">No</span> : '—'}
                  </td>
                  <td className="max-w-[200px] truncate text-xs" title={r.observaciones || ''}>
                    {r.observaciones || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
