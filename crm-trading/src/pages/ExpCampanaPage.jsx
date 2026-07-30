import { useState } from 'react'
import { useExpCampana, ESTADOS_EXCAMPANA, nombreCorreo } from '../hooks/useExpCampana'
import ModalExpCampana from '../components/modules/ModalExpCampana'
import { Loader2, RefreshCw, Play, Pause, MousePointerClick, Send, Zap } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'

const ESTADO_STYLE = {
  'Pendiente':     { bg: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)',  border: 'rgba(255,255,255,0.1)' },
  'Interesado':    { bg: 'rgba(245,166,35,0.12)',  color: '#f5b93a',            border: 'rgba(245,166,35,0.25)' },
  'Contactado':    { bg: 'rgba(101,167,166,0.12)', color: 'var(--accent)',      border: 'rgba(101,167,166,0.25)' },
  'Negociación':   { bg: 'rgba(167,139,250,0.12)', color: '#b89eff',            border: 'rgba(167,139,250,0.25)' },
  'Reactivado':    { bg: 'rgba(34,201,142,0.12)',  color: '#2dd4a0',            border: 'rgba(34,201,142,0.25)' },
  'No interesado': { bg: 'rgba(240,92,92,0.12)',   color: '#f07070',            border: 'rgba(240,92,92,0.25)' },
  'Sin respuesta': { bg: 'rgba(240,92,92,0.08)',   color: '#c98080',            border: 'rgba(240,92,92,0.15)' },
  'Cierre enviado': { bg: 'rgba(136,150,180,0.12)', color: '#8896b4',           border: 'rgba(136,150,180,0.25)' },
}
function estiloEstado(estado) {
  return ESTADO_STYLE[estado] || { bg: 'rgba(255,255,255,0.04)', color: 'var(--text-faint)', border: 'rgba(255,255,255,0.08)' }
}

function EstadoBadge({ estado }) {
  const s = estiloEstado(estado)
  return (
    <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
      {estado}
    </span>
  )
}

export default function ExpCampanaPage() {
  const r = useExpCampana()
  const [emailPrueba, setEmailPrueba] = useState('')
  const [correoPrueba, setCorreoPrueba] = useState(0)
  const [asesoraPrueba, setAsesoraPrueba] = useState('')
  const [enviandoPrueba, setEnviandoPrueba] = useState(false)
  const [forzando, setForzando] = useState(false)
  const [enviandoCierre, setEnviandoCierre] = useState(false)
  const [enviandoAclaracion, setEnviandoAclaracion] = useState(false)

  const tasaClic = r.stats.correosEnviados > 0 ? Math.round((r.stats.conClic / r.stats.correosEnviados) * 100) : 0

  const forzarEnvioPendiente = async () => {
    setForzando(true)
    try {
      const res = await fetch('/api/reactivate-forzar-envio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campana: 'exalumnos' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al forzar el envío')
      if (data.saltado) { toast(data.saltado, { icon: '⏸️' }); return }
      toast.success(`Envío al día: ${data.enviados} correos enviados${data.errores ? `, ${data.errores} con error` : ''}`)
      await r.cargar()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setForzando(false)
    }
  }

  const enviarCierre = async () => {
    setEnviandoCierre(true)
    try {
      const res = await fetch('/api/reactivate-forzar-envio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campana: 'cierre' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al enviar el correo de cierre')
      toast.success(`Cierre: ${data.enviados} enviados${data.errores ? `, ${data.errores} con error` : ''}. Quedan ${data.pendientesRestantes} pendientes (cupo diario por asesora).`)
      await r.cargar()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setEnviandoCierre(false)
    }
  }

  const enviarAclaracion = async () => {
    setEnviandoAclaracion(true)
    try {
      const res = await fetch('/api/reactivate-forzar-envio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campana: 'aclaracion' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al enviar la fe de erratas')
      toast.success(`Fe de erratas: ${data.enviados} enviados${data.errores ? `, ${data.errores} con error` : ''}. Quedan ${data.pendientesRestantes} pendientes.`)
      await r.cargar()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setEnviandoAclaracion(false)
    }
  }

  const enviarPrueba = async () => {
    if (!emailPrueba.trim()) { toast.error('Ingresa un correo de destino'); return }
    const asesoraElegida = asesoraPrueba || r.asesoras[0]?.id
    if (!asesoraElegida) { toast.error('No hay asesoras cargadas todavía'); return }
    setEnviandoPrueba(true)
    try {
      const res = await fetch('/api/reactivate-test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destinatario: emailPrueba.trim(), campana: 'exalumnos', correoNumero: correoPrueba, asesoraId: asesoraElegida }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al enviar')
      toast.success(data.mensaje)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setEnviandoPrueba(false)
    }
  }

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: 'var(--text-primary)', fontSize: 20 }}>Plan Exalumnos</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
            {r.esSupervisor ? 'Campaña de reactivación repartida entre las 4 asesoras' : 'Tus leads asignados en la campaña de reactivación de exalumnos'}
          </p>
        </div>
        {r.esSupervisor && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="crm-btn crm-btn-sm" onClick={r.cargar}>
              <RefreshCw size={13} /> Actualizar
            </button>
            {r.config?.campana_activa && (
              <button
                onClick={forzarEnvioPendiente}
                disabled={forzando}
                className="crm-btn crm-btn-sm"
                title="Procesa ahora a quien le toque correo hoy, sin esperar a la corrida automática">
                {forzando ? <><Loader2 size={13} className="animate-spin" /> Enviando…</> : <><Zap size={13} /> Forzar envío pendiente</>}
              </button>
            )}
            {r.config && (
              <button
                onClick={r.toggleCampana}
                disabled={r.activando}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 8,
                  fontSize: 12, fontWeight: 700, cursor: r.activando ? 'default' : 'pointer', border: 'none',
                  background: r.activando ? 'var(--text-faint)' : r.config.campana_activa ? '#f07070' : '#25D366', color: '#fff',
                  opacity: r.activando ? 0.7 : 1,
                }}>
                {r.activando
                  ? <><Loader2 size={13} className="animate-spin" /> Enviando Aula Virtual…</>
                  : r.config.campana_activa ? <><Pause size={13} /> Pausar campaña</> : <><Play size={13} /> Activar campaña</>}
              </button>
            )}
            <button
              onClick={enviarCierre}
              disabled={enviandoCierre}
              title="Envía el correo de cierre a quien todavía no lo recibió (cupo diario por asesora — repite el clic mañana para completar al resto)"
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 8,
                fontSize: 12, fontWeight: 700, cursor: enviandoCierre ? 'default' : 'pointer', border: 'none',
                background: enviandoCierre ? 'var(--text-faint)' : '#e8963a', color: '#fff',
                opacity: enviandoCierre ? 0.7 : 1,
              }}>
              {enviandoCierre ? <><Loader2 size={13} className="animate-spin" /> Enviando cierre…</> : <><Zap size={13} /> Enviar correo de cierre</>}
            </button>
            <button
              onClick={enviarAclaracion}
              disabled={enviandoAclaracion}
              title="Corrige el correo de cierre enviado por error a quien no tiene saldo pendiente real"
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 8,
                fontSize: 12, fontWeight: 700, cursor: enviandoAclaracion ? 'default' : 'pointer', border: '1px solid rgba(240,92,92,0.35)',
                background: 'transparent', color: '#f07070',
                opacity: enviandoAclaracion ? 0.7 : 1,
              }}>
              {enviandoAclaracion ? <><Loader2 size={13} className="animate-spin" /> Enviando fe de erratas…</> : <>Enviar fe de erratas</>}
            </button>
          </div>
        )}
      </div>

      {r.esSupervisor && !r.config?.campana_activa && (
        <div style={{ background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 12, color: '#f5b93a' }}>
          La campaña está en pausa — no se enviará ningún correo automático hasta que la actives. Aprovecha para revisar la vista de cada asesora y probar los correos antes de activar.
        </div>
      )}

      {r.esSupervisor && (
        <div className="crm-card" style={{ padding: '14px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Enviar correo de prueba (no cuenta como envío de campaña):
          </div>
          <select value={correoPrueba} onChange={e => setCorreoPrueba(e.target.value === 'cierre' ? 'cierre' : Number(e.target.value))}
            style={{ padding: '6px 10px', background: 'var(--bg-input)', border: '1.5px solid var(--border-input)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13 }}>
            {Array.from({ length: 10 }, (_, i) => i).map(n => (
              <option key={n} value={n}>{nombreCorreo(n)}</option>
            ))}
            <option value="cierre">🔒 Correo de cierre (final)</option>
          </select>
          <select value={asesoraPrueba} onChange={e => setAsesoraPrueba(e.target.value)}
            title="El botón de WhatsApp del correo de prueba usará el wa.link real de esta asesora"
            style={{ padding: '6px 10px', background: 'var(--bg-input)', border: '1.5px solid var(--border-input)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13 }}>
            {r.asesoras.map(a => <option key={a.id} value={a.id}>wa.link de {a.nombre}</option>)}
          </select>
          <input
            type="email"
            placeholder="tu-correo@ejemplo.com"
            value={emailPrueba}
            onChange={(e) => setEmailPrueba(e.target.value)}
            style={{ padding: '6px 12px', background: 'var(--bg-input)', border: '1.5px solid var(--border-input)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, minWidth: 220 }}
          />
          <button className="crm-btn crm-btn-sm" disabled={enviandoPrueba} onClick={enviarPrueba}>
            <Send size={13} /> {enviandoPrueba ? 'Enviando…' : 'Enviar prueba'}
          </button>
        </div>
      )}

      {/* Resumen por asesora — solo supervisor */}
      {r.esSupervisor && r.porAsesora.length > 0 && (
        <div className="crm-card" style={{ padding: 18, marginBottom: 20, overflowX: 'auto' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Resumen por asesora</div>
          <table className="crm-table">
            <thead>
              <tr><th>Asesora</th><th>Leads</th><th>Correos env.</th><th>Interesados</th><th>Contactados</th><th>Reactivados</th><th>Sin respuesta</th></tr>
            </thead>
            <tbody>
              {r.porAsesora.map(a => (
                <tr key={a.asesoraId}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{a.nombre}</td>
                  <td style={{ textAlign: 'center' }}>{a.total}</td>
                  <td style={{ textAlign: 'center' }}>{a.correosEnviados}</td>
                  <td style={{ textAlign: 'center', color: '#f5b93a' }}>{a.interesados}</td>
                  <td style={{ textAlign: 'center', color: 'var(--accent)' }}>{a.contactados}</td>
                  <td style={{ textAlign: 'center', color: '#2dd4a0' }}>{a.reactivados}</td>
                  <td style={{ textAlign: 'center', color: '#c98080' }}>{a.sinRespuesta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* KPIs (del filtro actual) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'En campaña',     value: r.totalSinFiltrar,       color: 'var(--accent)' },
          { label: 'Correos env.',   value: r.stats.correosEnviados, color: 'var(--text-primary)' },
          { label: 'Clics (CTR)',    value: `${tasaClic}%`,           color: '#25D366' },
          { label: 'Calientes',      value: r.stats.calientes,        color: '#fb923c' },
          { label: 'Interesados',    value: r.stats.interesados,      color: '#f5b93a' },
          { label: 'Contactados',    value: r.stats.contactados,      color: 'var(--accent)' },
          { label: 'Reactivados',    value: r.stats.reactivados,      color: '#2dd4a0' },
          { label: 'Sin respuesta',  value: r.stats.sinRespuesta,     color: '#c98080' },
        ].map(({ label, value, color }) => (
          <div key={label} className="crm-card" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: 'Syne, sans-serif', lineHeight: 1 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['Todos', ...ESTADOS_EXCAMPANA].map((e) => (
            <button key={e} onClick={() => r.setFiltroEstado(e)}
              style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
                background: r.filtroEstado === e ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${r.filtroEstado === e ? 'var(--accent)' : 'rgba(255,255,255,0.1)'}`,
                color: r.filtroEstado === e ? '#fff' : 'var(--text-muted)',
              }}>
              {e}
            </button>
          ))}
        </div>
        {r.esSupervisor && (
          <select value={r.filtroAsesora} onChange={e => r.setFiltroAsesora(e.target.value)}
            style={{ padding: '6px 10px', background: 'var(--bg-input)', border: '1.5px solid var(--border-input)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer' }}>
            <option value="">— Todas las asesoras —</option>
            {r.asesoras.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        )}
        <button onClick={() => r.setSoloCalientes(v => !v)}
          title="Abrieron 2 o más correos y todavía no compran ni se marcan como resueltos — candidatos para el WhatsApp de seguimiento manual"
          style={{
            padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            background: r.soloCalientes ? '#fb923c' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${r.soloCalientes ? '#fb923c' : 'rgba(255,255,255,0.1)'}`,
            color: r.soloCalientes ? '#1c2b2e' : 'var(--text-muted)',
          }}>
          🔥 Calientes sin compra
        </button>
        <input
          type="text"
          placeholder="🔍 Buscar alumno..."
          value={r.buscar}
          onChange={(e) => r.setBuscar(e.target.value)}
          style={{ padding: '6px 12px', background: 'var(--bg-input)', border: '1.5px solid var(--border-input)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, width: 200, marginLeft: 'auto' }}
        />
      </div>

      {/* Tabla */}
      <div className="crm-card">
        {r.loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 10, color: 'var(--text-muted)' }}>
            <Loader2 size={18} className="animate-spin" /><span style={{ fontSize: 13 }}>Cargando leads...</span>
          </div>
        ) : !r.leads.length ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
            <p style={{ fontSize: 13 }}>No hay leads con ese filtro</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Alumno</th>
                  <th>Programa</th>
                  <th>Último correo</th>
                  <th>Estado</th>
                  <th>Clic WhatsApp</th>
                  <th>Ver</th>
                </tr>
              </thead>
              <tbody>
                {r.leads.map((l) => (
                  <tr key={l.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{l.nombre}</td>
                    <td style={{ fontSize: 12 }}>{l.programa_retirado || '—'}</td>
                    <td style={{ fontSize: 12 }}>
                      {l.ultimo_correo_enviado != null ? nombreCorreo(l.ultimo_correo_enviado) : '—'}
                      {l.fecha_ultimo_envio && (
                        <div style={{ color: 'var(--text-faint)', fontSize: 11 }}>{format(new Date(l.fecha_ultimo_envio), 'dd MMM yyyy', { locale: es })}</div>
                      )}
                    </td>
                    <td><EstadoBadge estado={l.estado_campana} /></td>
                    <td>
                      {l.primer_click_at ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#25D366', fontSize: 12 }}>
                          <MousePointerClick size={13} /> Sí
                        </span>
                      ) : <span style={{ color: 'var(--text-faint)', fontSize: 12 }}>—</span>}
                    </td>
                    <td>
                      <button className="crm-btn crm-btn-sm" style={{ fontSize: 11 }} onClick={() => r.abrirDetalle(l)}>
                        Ver / gestionar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ModalExpCampana detalle={r.detalle} onCerrar={r.cerrarDetalle} onRegistrarAvance={r.registrarAvance} />
    </div>
  )
}
