import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { History } from 'lucide-react'

export default function HistorialAlumno({ historial, alumno }) {
  return (
    <div className="crm-card" style={{ marginTop: 16 }}>
      <div style={{
        padding: '13px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(255,255,255,0.02)', borderRadius: '12px 12px 0 0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <History size={14} style={{ color: '#506080' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f4' }}>Historial del alumno</span>
        </div>
        {/* Nombre del alumno seleccionado — se actualiza automáticamente */}
        <span style={{ fontSize: 12, color: '#506080' }}>
          {alumno ? alumno.label : '— selecciona un alumno arriba —'}
        </span>
      </div>

      {!alumno ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px', color: '#3d5070', gap: 8 }}>
          <History size={28} strokeWidth={1} />
          <p style={{ fontSize: 13 }}>Selecciona un alumno en el formulario para ver su historial</p>
        </div>
      ) : !historial.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px', color: '#3d5070', gap: 8 }}>
          <History size={28} strokeWidth={1} />
          <p style={{ fontSize: 13 }}>Sin registros previos para <strong style={{ color: '#7ab3ff' }}>{alumno.label}</strong></p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
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
                  <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                    {format(new Date(r.fecha + 'T00:00:00'), 'dd MMM yyyy', { locale: es })}
                  </td>
                  <td>{r.semana || '—'}</td>
                  <td>
                    {r.respondio
                      ? <span className={`badge ${r.respondio === 'Sí' ? 'badge-green' : 'badge-red'}`}>{r.respondio}</span>
                      : '—'}
                  </td>
                  <td>{r.avance != null ? `${r.avance}%` : '—'}</td>
                  <td>{r.cuenta ? <span className="badge badge-blue">{r.cuenta}</span> : '—'}</td>
                  <td style={{ fontWeight: r.beneficio ? 600 : 400, color: r.beneficio ? '#2dd4a0' : '#3d5070' }}>
                    {r.beneficio != null ? `$${Number(r.beneficio).toFixed(2)}` : '—'}
                  </td>
                  <td>
                    {r.retiro === 'Sí'
                      ? <span className="badge badge-amber">${Number(r.monto_retiro || 0).toFixed(2)}</span>
                      : r.retiro === 'No' ? <span className="badge badge-gray">No</span> : '—'}
                  </td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}
                    title={r.observaciones || ''}>
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
