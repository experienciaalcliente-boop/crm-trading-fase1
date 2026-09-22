import { Loader2, MessageCircle, CheckCircle2 } from 'lucide-react'
import { useImpulsoEnvios } from '../hooks/useImpulsoEnvios'

export default function ImpulsoEnviosPage() {
  const { loading, pendientes, marcarHecho, esSupervisor } = useImpulsoEnvios()

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, color: 'var(--text-muted)' }}>
      <Loader2 size={18} className="animate-spin" /><span style={{ fontSize: 13 }}>Cargando tus envíos de Impulso...</span>
    </div>
  )

  return (
    <div style={{ padding: 24, maxWidth: 760, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, color: 'var(--text-primary)', fontSize: 20 }}>Envíos de Impulso BURS</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
          {esSupervisor ? 'Vista completa (todas las asesoras).' : 'Tus toques pendientes — un clic abre WhatsApp con el mensaje ya listo.'}
        </p>
      </div>

      <div className="crm-card" style={{ padding: 14, marginBottom: 18, fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
        Cada mensaje varía entre 2 versiones según el alumno, para no mandar el mismo texto muchas veces seguidas. Igual conviene espaciar los envíos a lo largo del día en vez de mandarlos todos de corrido — reduce el riesgo de que WhatsApp marque el número como spam.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {pendientes.map(t => (
          <div key={t.id} className="crm-card" style={{ padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>{t.alumno?.nombre || '—'}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>toque {t.touch_numero}/5 · {t.cohorte_egreso}</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: t.dias !== null && t.dias < 0 ? '#f07070' : t.dias === 0 ? '#f5b93a' : 'var(--text-muted)' }}>
                {t.dias === 0 ? 'hoy' : t.dias < 0 ? `${Math.abs(t.dias)}d atrasado` : `en ${t.dias}d`}
              </span>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', background: 'var(--bg-input)', borderRadius: 8, padding: '8px 10px', lineHeight: 1.4, marginBottom: 10 }}>
              {t.mensaje}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              {t.waHref
                ? <a href={t.waHref} target="_blank" rel="noreferrer" className="crm-btn crm-btn-sm crm-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, textDecoration: 'none' }}>
                    <MessageCircle size={13} /> Enviar por WhatsApp
                  </a>
                : <span style={{ fontSize: 11, color: '#f07070', alignSelf: 'center' }}>Sin teléfono cargado</span>}
              <button className="crm-btn crm-btn-sm" onClick={() => marcarHecho(t)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <CheckCircle2 size={13} /> Marcar hecho
              </button>
            </div>
          </div>
        ))}
        {pendientes.length === 0 && (
          <div className="crm-card" style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No tienes toques de Impulso pendientes por ahora.
          </div>
        )}
      </div>
    </div>
  )
}
