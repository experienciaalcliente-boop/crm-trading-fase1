import { useState } from 'react'
import { CheckCircle2, Circle, ExternalLink, Copy, Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const SQL_SETUP = `-- ============================================
-- ACADEMIA CRM — Setup de base de datos
-- Ejecuta este SQL en Supabase > SQL Editor
-- ============================================

-- 1. Asesoras
CREATE TABLE IF NOT EXISTS asesoras (
  id      uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre  text NOT NULL UNIQUE,
  activo  boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 2. Alumnos
CREATE TABLE IF NOT EXISTS alumnos (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre        text NOT NULL,
  programa      text NOT NULL,
  semana_actual text,
  asesora       text,
  estado        text DEFAULT 'Activo',
  activo        boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  UNIQUE(nombre, programa)
);

-- 3. Registros de llamadas
CREATE TABLE IF NOT EXISTS registros_llamadas (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo       text NOT NULL UNIQUE,
  fecha        date NOT NULL DEFAULT CURRENT_DATE,
  alumno_id    uuid REFERENCES alumnos(id) ON DELETE SET NULL,
  asesora_id   uuid REFERENCES asesoras(id) ON DELETE SET NULL,
  semana       text,
  respondio    text CHECK (respondio IN ('Sí','No')),
  avance       numeric(5,2),
  mentoria     text CHECK (mentoria IN ('Sí','No')),
  cuenta       text CHECK (cuenta IN ('Demo','Real','Fondeo','No opera','Balance')),
  capital_real numeric(12,2),
  fase_fondeo  text CHECK (fase_fondeo IN ('Primera fase','Segunda fase','Aprobado')),
  beneficio    numeric(12,2),
  retiro       text CHECK (retiro IN ('Sí','No')),
  monto_retiro numeric(12,2),
  observaciones text,
  created_at   timestamptz DEFAULT now()
);

-- 4. Asesoras por defecto (personaliza estos nombres)
INSERT INTO asesoras (nombre) VALUES
  ('María García'),
  ('Ana López'),
  ('Carlos Soto')
ON CONFLICT (nombre) DO NOTHING;

-- 5. Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_llamadas_fecha     ON registros_llamadas(fecha);
CREATE INDEX IF NOT EXISTS idx_llamadas_alumno    ON registros_llamadas(alumno_id);
CREATE INDEX IF NOT EXISTS idx_llamadas_asesora   ON registros_llamadas(asesora_id);
CREATE INDEX IF NOT EXISTS idx_alumnos_programa   ON alumnos(programa);

-- 6. Row Level Security (habilitar acceso)
ALTER TABLE asesoras           ENABLE ROW LEVEL SECURITY;
ALTER TABLE alumnos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_llamadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acceso_publico_asesoras"  ON asesoras           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "acceso_publico_alumnos"   ON alumnos            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "acceso_publico_llamadas"  ON registros_llamadas FOR ALL USING (true) WITH CHECK (true);

-- 7. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE registros_llamadas;
`

export default function SetupPage() {
  const [copied,  setCopied]  = useState(false)
  const [testing, setTesting] = useState(false)
  const [ok,      setOk]      = useState(false)
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
    toast.success('SQL copiado al portapapeles')
  }

  const steps = [
    {
      n: 1, title: 'Crea tu cuenta en Supabase',
      body: 'Es gratis. Ve a supabase.com → "Start for free" → Crea un proyecto.',
      link: 'https://supabase.com', linkLabel: 'Ir a Supabase →',
    },
    {
      n: 2, title: 'Copia y ejecuta el SQL',
      body: 'En Supabase, ve a SQL Editor → New query → Pega el código → Run.',
      action: (
        <button onClick={copiar} className="crm-btn crm-btn-sm gap-2 mt-2">
          {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
          {copied ? 'Copiado!' : 'Copiar SQL de configuración'}
        </button>
      ),
    },
    {
      n: 3, title: 'Obtén tus credenciales',
      body: 'En Supabase → Settings → API → copia "Project URL" y "anon public key".',
    },
    {
      n: 4, title: 'Configura el archivo .env.local',
      body: (
        <div>
          <p className="mb-2">En la carpeta del proyecto, edita el archivo <code className="bg-bg-4 px-1.5 py-0.5 rounded text-xs font-mono text-brand">.env.local</code>:</p>
          <pre className="bg-bg-4 rounded-lg p-3 text-xs font-mono text-brand leading-relaxed overflow-x-auto">
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
            className={ok ? 'crm-btn crm-btn-sm text-success border-success/30' : 'crm-btn-primary crm-btn-sm'}
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
          {steps.map((step, i) => (
            <div key={step.n} className="crm-card p-5 flex gap-4">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-brand/15 border border-brand/30 flex items-center justify-center text-brand text-xs font-bold">
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

        <p className="text-center text-xs text-muted mt-6">
          ¿Necesitas ayuda? El botón "Probar conexión" te dirá exactamente qué falta.
        </p>
      </div>
    </div>
  )
}
