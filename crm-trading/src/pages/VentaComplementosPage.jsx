import { useVentasComplementos } from '../hooks/useVentasComplementos'
import { Loader2, ShoppingBag, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Select from 'react-select'

const rsStyles = {
  control: (base, state) => ({ ...base, background: 'var(--bg-input)', border: `1.5px solid ${state.isFocused ? 'var(--accent)' : 'var(--border-input)'}`, borderRadius: 8, minHeight: 38, boxShadow: state.isFocused ? '0 0 0 3px rgba(101,167,166,0.15)' : 'none' }),
  menu: (base) => ({ ...base, background: 'var(--bg-input)', border: '1.5px solid var(--border-input)', borderRadius: 10, boxShadow: '0 8px 28px rgba(0,0,0,0.5)', zIndex: 9999 }),
  menuList: (base) => ({ ...base, background: 'var(--bg-input)', borderRadius: 10, padding: 4 }),
  option: (base, state) => ({ ...base, background: state.isSelected ? 'rgba(101,167,166,0.25)' : state.isFocused ? 'rgba(101,167,166,0.15)' : 'var(--bg-input)', color: state.isSelected ? 'var(--accent)' : state.isFocused ? 'var(--text-primary)' : 'var(--text-secondary)', borderRadius: 6, fontSize: 13, padding: '9px 12px' }),
  singleValue: (base) => ({ ...base, color: 'var(--text-primary)', fontWeight: 500 }),
  placeholder: (base) => ({ ...base, color: 'var(--text-muted)' }),
  input: (base) => ({ ...base, color: 'var(--text-primary)' }),
  indicatorSeparator: (base) => ({ ...base, background: 'var(--border-input)' }),
  dropdownIndicator: (base) => ({ ...base, color: 'var(--text-muted)' }),
  noOptionsMessage: (base) => ({ ...base, color: 'var(--text-muted)', background: 'var(--bg-input)' }),
}

function Field({ label, children }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:14 }}>
      <label style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em' }}>{label}</label>
      {children}
    </div>
  )
}

export default function VentaComplementosPage() {
  const v = useVentasComplementos()

  if (v.loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', gap:10, color:'var(--text-muted)' }}>
      <Loader2 size={18} className="animate-spin" /><span style={{ fontSize:13 }}>Cargando...</span>
    </div>
  )

  const tipo = v.complementoSeleccionado?.tipo

  return (
    <div style={{ padding:24, display:'flex', gap:24, alignItems:'flex-start' }}>

      {/* ── Formulario ── */}
      <div className="crm-card" style={{ padding:20, width:380, flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:18 }}>
          <ShoppingBag size={16} style={{ color:'var(--accent)' }} />
          <h2 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, color:'var(--text-primary)', fontSize:15, margin:0 }}>Registrar venta de complemento</h2>
        </div>

        <Field label="Fecha de registro">
          <input className="crm-input" disabled value={format(new Date(), "d 'de' MMMM, yyyy", { locale: es })} />
        </Field>

        <Field label="Filtrar por programa (opcional — incluye programas ya culminados)">
          <select className="crm-input" value={v.programaFiltro}
            onChange={e => { v.setProgramaFiltro(e.target.value); v.setField('alumno_id', '') }}>
            <option value="">— Todos los programas —</option>
            {v.programasOpts.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>

        <Field label="Alumno">
          <Select styles={rsStyles} options={v.alumnosOpts} isClearable
            value={v.alumnosOpts.find(a => a.value === v.form.alumno_id) || null}
            onChange={opt => v.setField('alumno_id', opt?.value || '')}
            placeholder="Escribe para buscar un alumno..." noOptionsMessage={() => 'Sin coincidencias'} />
        </Field>

        {v.alumnoSeleccionado && (
          <Field label="Programa del alumno">
            <input className="crm-input" disabled value={v.alumnoSeleccionado.programa || '—'} />
          </Field>
        )}

        <Field label="Complemento vendido">
          <select className="crm-input" value={v.form.complemento} onChange={e => v.setField('complemento', e.target.value)}>
            <option value="">— Seleccionar complemento —</option>
            {v.CATALOGO_COMPLEMENTOS.map(c => <option key={c.key} value={c.key}>{c.key}</option>)}
          </select>
        </Field>

        {v.complementoSeleccionado && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
            <Field label="Valor del producto">
              <input className="crm-input" disabled value={`$ ${v.complementoSeleccionado.valorProducto}`} />
            </Field>
            <Field label="Valor de comisión">
              <input className="crm-input" disabled value={`S/ ${v.complementoSeleccionado.valorComision}`} />
            </Field>
          </div>
        )}

        {tipo === 'impulso' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Fecha de inicio">
              <input type="date" className="crm-input" value={v.form.fecha_inicio} onChange={e => v.setField('fecha_inicio', e.target.value)} />
            </Field>
            <Field label="Fecha de fin">
              <input type="date" className="crm-input" value={v.form.fecha_fin} onChange={e => v.setField('fecha_fin', e.target.value)} />
            </Field>
          </div>
        )}

        {tipo === 'mentoria' && (
          <Field label="Estado de la mentoría">
            <div style={{ display:'flex', gap:6 }}>
              {['Vigente','Finalizado'].map(op => (
                <button key={op} onClick={() => v.setField('estado_mentoria', op)}
                  style={{ flex:1, padding:'7px 0', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer',
                    background: v.form.estado_mentoria === op ? 'rgba(101,167,166,0.15)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${v.form.estado_mentoria === op ? 'rgba(101,167,166,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    color: v.form.estado_mentoria === op ? 'var(--accent)' : 'var(--text-secondary)' }}>
                  {op}
                </button>
              ))}
            </div>
          </Field>
        )}

        <Field label="N° de operación (comprobante de pago)">
          <input className="crm-input" value={v.form.nro_operacion} onChange={e => v.setField('nro_operacion', e.target.value)}
            placeholder="Ej: OP-00123456" />
        </Field>

        <button className="crm-btn-primary" style={{ width:'100%', justifyContent:'center', marginTop:4 }}
          onClick={v.guardar} disabled={v.saving}>
          {v.saving ? <><Loader2 size={14} className="animate-spin" /> Guardando...</> : '✓ Registrar venta'}
        </button>
      </div>

      {/* ── Ventas del mes ── */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ marginBottom:16 }}>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, color:'var(--text-primary)', fontSize:20 }}>Ventas del mes</h1>
          <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:3 }}>
            {v.totalVentasMes} complementos vendidos este mes
          </p>
        </div>

        <div className="crm-card" style={{ padding:16, marginBottom:16 }}>
          {v.faltanParaComision > 0 ? (
            <div style={{ fontSize:13, color:'#f5b93a' }}>
              Te faltan <b>{v.faltanParaComision}</b> complemento{v.faltanParaComision === 1 ? '' : 's'} más este mes para comisionar (mínimo {v.MINIMO_COMPLEMENTOS_COMISION}).
            </div>
          ) : (
            <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'#2dd4a0' }}>
              <CheckCircle2 size={16} /> Ya alcanzaste el mínimo de {v.MINIMO_COMPLEMENTOS_COMISION} complementos para comisionar este mes.
            </div>
          )}
          <div style={{ height:6, background:'rgba(255,255,255,0.06)', borderRadius:3, overflow:'hidden', marginTop:10 }}>
            <div style={{ height:'100%', width:`${Math.min(100, Math.round(v.totalVentasMes / v.MINIMO_COMPLEMENTOS_COMISION * 100))}%`, background:'var(--accent)', borderRadius:3 }} />
          </div>
        </div>

        <div className="crm-card" style={{ overflowX:'auto' }}>
          <table className="crm-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Alumno</th>
                <th>Programa</th>
                <th>Complemento</th>
                <th>Valor</th>
                <th>Comisión</th>
                <th>N° Operación</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {v.ventas.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign:'center', color:'var(--text-muted)', padding:20 }}>Sin ventas registradas este mes</td></tr>
              ) : v.ventas.map(ve => (
                <tr key={ve.id}>
                  <td>{format(new Date(ve.fecha_registro + 'T00:00:00'), 'dd/MM/yyyy')}</td>
                  <td style={{ fontWeight:500 }}>{ve.alumno?.nombre || '—'}</td>
                  <td>{ve.alumno?.programa || '—'}</td>
                  <td>{ve.complemento}</td>
                  <td>$ {ve.valor_producto}</td>
                  <td style={{ color:'#2dd4a0' }}>S/ {ve.valor_comision}</td>
                  <td style={{ fontSize:11, color:'var(--text-muted)' }}>{ve.nro_operacion}</td>
                  <td style={{ fontSize:11, color:'var(--text-muted)' }}>
                    {ve.estado_mentoria || (ve.fecha_inicio ? `${ve.fecha_inicio} → ${ve.fecha_fin}` : '—')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
