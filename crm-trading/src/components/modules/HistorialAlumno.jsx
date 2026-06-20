import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { History, Edit2, Check, X, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { updateBeneficio } from '../../lib/api'
import toast from 'react-hot-toast'

function BadgeRespondio({ val }) {
  if (!val) return <span className="badge badge-gray">—</span>
  return <span className={`badge ${val === 'Sí' ? 'badge-green' : 'badge-red'}`}>{val}</span>
}

function BadgeCuenta({ val }) {
  if (!val) return null
  const m = { Demo:'badge-gray', Real:'badge-green', Fondeo:'badge-purple', 'No opera':'badge-red', Balance:'badge-blue' }
  return <span className={`badge ${m[val]||'badge-gray'}`}>{val}</span>
}

function EditBeneficio({ registro, onUpdated }) {
  const [editing, setEditing] = useState(false)
  const [valor,   setValor]   = useState(registro.beneficio || '')
  const [saving,  setSaving]  = useState(false)

  async function guardar() {
    if (!valor && valor !== 0) { toast.error('Ingresa un valor'); return }
    setSaving(true)
    try {
      await updateBeneficio(registro.id, valor)
      toast.success('Beneficio actualizado ✓')
      setEditing(false)
      onUpdated()
    } catch (err) {
      toast.error('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!editing) return (
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      <span style={{ color: registro.beneficio ? '#2dd4a0' : '#3d5070', fontWeight: registro.beneficio ? 600 : 400 }}>
        {registro.beneficio != null ? `$${Number(registro.beneficio).toFixed(2)}` : '—'}
      </span>
      <button onClick={() => setEditing(true)}
        style={{ background:'none', border:'none', cursor:'pointer', color:'#506080', padding:'2px', display:'flex', alignItems:'center' }}
        title="Actualizar beneficio">
        <Edit2 size={11} />
      </button>
    </div>
  )

  return (
    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
      <input
        type="number" min="0" step="0.01"
        value={valor}
        onChange={e => setValor(e.target.value)}
        style={{ width:80, padding:'3px 6px', background:'#1e2840', border:'1.5px solid #4e8fff', borderRadius:6, color:'#fff', fontSize:12 }}
        autoFocus
        onKeyDown={e => { if (e.key === 'Enter') guardar(); if (e.key === 'Escape') setEditing(false) }}
      />
      <button onClick={guardar} disabled={saving}
        style={{ background:'rgba(45,212,160,0.15)', border:'1px solid rgba(45,212,160,0.3)', borderRadius:6, padding:'3px 6px', cursor:'pointer', color:'#2dd4a0', display:'flex' }}>
        <Check size={11} />
      </button>
      <button onClick={() => setEditing(false)}
        style={{ background:'rgba(240,92,92,0.1)', border:'1px solid rgba(240,92,92,0.2)', borderRadius:6, padding:'3px 6px', cursor:'pointer', color:'#f07070', display:'flex' }}>
        <X size={11} />
      </button>
    </div>
  )
}

export default function HistorialAlumno({ historial, alumno, onRefresh }) {
  const navigate = useNavigate()
  return (
    <div className="crm-card" style={{ marginTop:16 }}>
      <div style={{ padding:'13px 18px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(255,255,255,0.02)', borderRadius:'12px 12px 0 0' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <History size={14} style={{ color:'#506080' }} />
          <span style={{ fontSize:13, fontWeight:700, color:'#e2e8f4' }}>Historial del alumno</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:12, color:'#506080' }}>{alumno ? alumno.label : '— selecciona un alumno arriba —'}</span>
          {alumno && (
            <button onClick={() => navigate(`/alumno/${alumno.value}`)}
              style={{ background:'none', border:'none', cursor:'pointer', color:'#4e8fff', display:'flex', alignItems:'center', gap:3, fontSize:11 }}
              title="Ver ficha completa">
              <ExternalLink size={12} /> Ficha 360°
            </button>
          )}
        </div>
      </div>

      {!alumno ? (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'40px 20px', color:'#3d5070', gap:8 }}>
          <History size={28} strokeWidth={1} />
          <p style={{ fontSize:13 }}>Selecciona un alumno en el formulario para ver su historial</p>
        </div>
      ) : !historial.length ? (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'40px 20px', color:'#3d5070', gap:8 }}>
          <History size={28} strokeWidth={1} />
          <p style={{ fontSize:13 }}>Sin registros previos para <strong style={{ color:'#7ab3ff' }}>{alumno.label}</strong></p>
        </div>
      ) : (
        <div style={{ overflowX:'auto' }}>
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
                <th style={{ minWidth:250 }}>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              {historial.map(r => (
                <tr key={r.id}>
                  <td style={{ whiteSpace:'nowrap', fontSize:12 }}>
                    {format(new Date(r.fecha + 'T00:00:00'), 'dd MMM yyyy', { locale: es })}
                  </td>
                  <td>{r.semana || '—'}</td>
                  <td><BadgeRespondio val={r.respondio} /></td>
                  <td>{r.avance != null ? `${r.avance}%` : '—'}</td>
                  <td><BadgeCuenta val={r.cuenta} /></td>
                  <td>
                    <EditBeneficio registro={r} onUpdated={onRefresh} />
                  </td>
                  <td>
                    {r.retiro === 'Sí'
                      ? <span className="badge badge-amber">${Number(r.monto_retiro||0).toFixed(2)}</span>
                      : r.retiro === 'No' ? <span className="badge badge-gray">No</span> : '—'}
                  </td>
                  {/* Observaciones completas — sin truncar */}
                  <td style={{ fontSize:12, color:'#9aaccb', whiteSpace:'pre-wrap', wordBreak:'break-word', maxWidth:300, lineHeight:1.5 }}>
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
