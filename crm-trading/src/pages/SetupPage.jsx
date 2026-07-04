import { useState } from 'react'
import { CheckCircle2, Circle, ExternalLink, Copy, Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const SQL_SETUP = `-- Ejecuta este SQL en Supabase > SQL Editor > New query
-- (El archivo completo está en supabase-schema.sql)`

export default function SetupPage() {
  const [copied,   setCopied]   = useState(false)
  const [testing,  setTesting]  = useState(false)
  const [ok,       setOk]       = useState(false)
  const navigate = useNavigate()

  async function testConexion() {
    setTesting(true)
    try {
      const { error } = await supabase.from('asesoras').select('id').limit(1)
      if (error) throw error
      setOk(true)
      toast.success('¡Conexión exitosa! Todo está listo.')
    } catch (err) {
      toast.error('Error de conexión: ' + err.message)
    } finally {
      setTesting(false)
    }
  }

  function copiar() {
    navigator.clipboard.writeText(SQL_SETUP)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Copiado al portapapeles')
  }

  const steps = [
    {
      n: 1, title: 'Crea tu cuenta en Supabase',
      body: 'Es gratis. Ve a supabase.com → "Start for free" → Crea un proyecto.',
      link: 'https://supabase.com', linkLabel: 'Ir a Supabase →',
    },
    {
      n: 2, title: 'Ejecuta el SQL de configuración',
      body: 'En Supabase, ve a SQL Editor → New query → Pega el contenido del archivo supabase-schema.sql → Run.',
    },
    {
      n: 3, title: 'Obtén tus credenciales',
      body: 'En Supabase → Settings → API → copia "Project URL" y "anon public key".',
    },
    {
      n: 4, title: 'Configura las variables en Vercel',
      body: (
        <div>
          <p className="mb-2">En Vercel → tu proyecto → Settings → Environment Variables, agrega:</p>
          <pre className="rounded-lg p-3 text-xs font-mono leading-relaxed overflow-x-auto" style={{ background:'var(--bg-input)', color:'var(--accent)' }}>
{`VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...`}
          </pre>
        </div>
      ),
    },
    {
      n: 5, title: 'Prueba la conexión',
      body: 'Haz clic en el botón para verificar que todo funciona.',
      action: (
        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={testConexion}
            disabled={testing || ok}
            className={ok ? 'crm-btn crm-btn-sm' : 'crm-btn-primary crm-btn-sm'}
            style={ok ? { color:'#2dd4a0', borderColor:'rgba(45,212,160,0.3)' } : {}}
          >
            {testing ? 'Probando...' : ok ? '✓ Conexión OK' : 'Probar conexión'}
          </button>
          {ok && (
            <button onClick={() => navigate('/llamadas')} className="crm-btn-success crm-btn-sm">
              Ir al CRM →
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-brand mx-auto flex items-center justify-center font-display font-bold text-white text-xl mb-4">A</div>
          <h1 className="font-display font-bold text-white text-2xl">Configuración inicial</h1>
          <p className="text-sub text-sm mt-2">Sigue estos pasos una sola vez para conectar tu base de datos</p>
        </div>

        <div className="space-y-3">
          {steps.map((step) => (
            <div key={step.n} className="crm-card p-5 flex gap-4">
              <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor:'rgba(101,167,166,0.15)', border:'1px solid rgba(101,167,166,0.3)', color:'var(--accent)' }}>
                {step.n}
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-white mb-1">{step.title}</div>
                {typeof step.body === 'string'
                  ? <p className="text-xs text-sub leading-relaxed">{step.body}</p>
                  : <div className="text-xs text-sub leading-relaxed">{step.body}</div>
                }
                {step.link && (
                  <a href={step.link} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-brand mt-2 hover:underline">
                    {step.linkLabel} <ExternalLink size={10} />
                  </a>
                )}
                {step.action}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
