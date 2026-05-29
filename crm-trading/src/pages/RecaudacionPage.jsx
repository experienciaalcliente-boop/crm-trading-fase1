import React, { useState } from 'react'
import { useRecaudacion } from '../hooks/useRecaudacion'
import ModalPago from '../components/modules/ModalPago'
import { Loader2, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const ESTADOS = ['Todos','No iniciada','Pago parcial','Prórroga','Reserva académica','Pagada','Retirado']
const DIAS_PAGO = ['Todos los días', 'Día 5', 'Día 15']

const ESTADO_STYLE = {
  'Pagada':             { bg: 'rgba(34,201,142,0.12)', color: '#2dd4a0', border: 'rgba(34,201,142,0.25)' },
  'Pago parcial':       { bg: 'rgba(245,166,35,0.12)', color: '#f5b93a', border: 'rgba(245,166,35,0.25)' },
  'No iniciada':        { bg: 'rgba(255,255,255,0.06)', color: '#7a8aaa', border: 'rgba(255,255,255,0.1)' },
  'Prórroga':           { bg: 'rgba(167,139,250,0.12)', color: '#b89eff', border: 'rgba(167,139,250,0.25)' },
  'Reserva académica':  { bg: 'rgba(78,143,255,0.12)', color: '#7ab3ff', border: 'rgba(78,143,255,0.25)' },
  'Retirado':           { bg: 'rgba(240,92,92,0.12)',  color: '#f07070', border: 'rgba(240,92,92,0.25)' },
}

function EstadoBadge({ estado }) {
  const s = ESTADO_STYLE[estado] || ESTADO_STYLE['No iniciada']
  return (
    <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
      {estado}
    </span>
  )
}

function isVencida(fecha) {
  return fecha < new Date().toISOString().split('T')[0]
}

export default function RecaudacionPage() {
  const r = useRecaudacion()

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#e2e8f4', fontSize: 20 }}>Recaudación</h1>
          <p style={{ fontSize: 13, color: '#506080', marginTop: 3 }}>Gestión de cuotas y pagos</p>
        </div>
        <button className="crm-btn crm-btn-sm" onClick={r.cargar}>
          <RefreshCw size={13} /> Actualizar
        </button>
      </div>

      {/* Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Total cuotas',  value: r.stats.total,      color: '#7ab3ff' },
          { label: 'Pagadas',       value: r.stats.pagadas,    color: '#2dd4a0' },
          { label: 'Parciales',     value: r.stats.parciales,  color: '#f5b93a' },
          { label: 'Pendientes',    value: r.stats.pendientes, color: '#7a8aaa' },
          { label: 'Vencidas',      value: r.stats.vencidas,   color: '#f07070' },
          { label: 'Prórrogas',     value: r.stats.prorrogas,  color: '#b89eff' },
        ].map(({ label, value, color }) => (
          <div key={label} className="crm-card" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#506080', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color, fontFamily: 'Syne, sans-serif', lineHeight: 1 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Estado */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {ESTADOS.map(e => (
            <button key={e} onClick={() => r.setFiltroEstado(e)}
              style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                cursor: 'pointer', transition: 'all 0.15s',
                background: r.filtroEstado === e ? '#4e8fff' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${r.filtroEstado === e ? '#4e8fff' : 'rgba(255,255,255,0.1)'}`,
                color: r.filtroEstado === e ? '#fff' : '#7a8aaa',
              }}>
              {e}
            </button>
          ))}
        </div>

        {/* Día de pago */}
        <div style={{ display: 'flex', gap: 6 }}>
          {DIAS_PAGO.map(d => (
            <button key={d} onClick={() => setFiltroDia(d)}
              style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                cursor: 'pointer', transition: 'all 0.15s',
                background: filtroDia === d ? '#9b71f5' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${filtroDia === d ? '#9b71f5' : 'rgba(255,255,255,0.1)'}`,
                color: filtroDia === d ? '#fff' : '#7a8aaa',
              }}>
              {d}
            </button>
          ))}
        </div>

        {/* Programa */}
        <select
          value={r.filtroPrograma}
          onChange={e => r.setFiltroPrograma(e.target.value)}
          style={{ padding: '6px 12px', background: '#1e2840', border: '1.5px solid #2e3d5c', borderRadius: 8, color: '#e2e8f4', fontSize: 13, marginLeft: 'auto' }}>
          <option value="Todos">Todos los programas</option>
          {r.programas.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div className="crm-card">
        {r.loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 10, color: '#506080' }}>
            <Loader2 size={18} className="animate-spin" /><span style={{ fontSize: 13 }}>Cargando cuotas...</span>
          </div>
        ) : !cuotasFiltradas.length ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#3d5070' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>💳</div>
            <p style={{ fontSize: 13 }}>No hay cuotas con ese filtro</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Alumno</th>
                  <th>Programa</th>
                  <th>Cuota</th>
                  <th>Vence</th>
                  <th>Monto</th>
                  <th>Pagado</th>
                  <th>Estado</th>
                  <th>Gestionar</th>
                </tr>
              </thead>
              <tbody>
                {cuotasFiltradas.map(cuota => {
                  const vencida = isVencida(cuota.fecha_vence) && cuota.estado !== 'Pagada'
                  return (
                    <tr key={cuota.id}>
                      <td style={{ fontWeight: 600, color: '#e2e8f4' }}>
                        {vencida && <span style={{ color: '#f07070', marginRight: 5 }}>⚠</span>}
                        {cuota.alumno?.nombre || '—'}
                      </td>
                      <td style={{ fontSize: 12 }}>{cuota.alumno?.programa || '—'}</td>
                      <td style={{ fontSize: 12 }}>#{cuota.numero_cuota}</td>
                      <td style={{ fontSize: 12, color: vencida ? '#f07070' : '#9aaccb', whiteSpace: 'nowrap' }}>
                        {format(new Date(cuota.fecha_vence + 'T00:00:00'), 'dd MMM yyyy', { locale: es })}
                      </td>
                      <td style={{ fontWeight: 600, color: '#e2e8f4' }}>
                        {cuota.moneda} {Number(cuota.monto).toFixed(2)}
                      </td>
                      <td style={{ color: cuota.monto_pagado > 0 ? '#f5b93a' : '#3d5070' }}>
                        {cuota.monto_pagado > 0 ? `${cuota.moneda} ${Number(cuota.monto_pagado).toFixed(2)}` : '—'}
                      </td>
                      <td><EstadoBadge estado={cuota.estado} /></td>
                      <td>
                        {cuota.estado !== 'Pagada' && cuota.estado !== 'Retirado' && (
                          <button className="crm-btn crm-btn-sm"
                            style={{ fontSize: 11 }}
                            onClick={() => r.abrirModal(cuota)}>
                            Registrar gestión
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {r.modalData && (
        <ModalPago
          cuota={r.modalData.cuota}
          form={r.modalData.form}
          cuotasAlumno={r.cuotasAlumno}
          setField={r.setFormField}
          onGuardar={r.guardarPago}
          onCerrar={r.cerrarModal}
          saving={r.saving}
        />
      )}
    </div>
  )
}
