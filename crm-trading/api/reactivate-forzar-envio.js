// Corre el ciclo diario a mano, sin esperar a la corrida automática —
// atiende ambas campañas (body.campana) con el mismo archivo, ver nota en
// api/reactivate-activar.js sobre el límite de funciones del plan Hobby.
import { createClient } from '@supabase/supabase-js'
import { ejecutarCicloDiario } from './_lib/reactivateCronCore.js'
import { ejecutarCicloDiarioExalumnos, ejecutarEnvioCierre, ejecutarEnvioAclaracion } from './_lib/expCampanaCronCore.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' })

  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const baseUrl = process.env.PUBLIC_APP_URL
  if (!baseUrl) return res.status(500).json({ error: 'Falta configurar PUBLIC_APP_URL en las variables de entorno' })

  const campanasValidas = ['exalumnos', 'cierre', 'aclaracion']
  const campana = campanasValidas.includes(req.body?.campana) ? req.body.campana : 'reactivate'

  try {
    const resultado = campana === 'cierre'
      ? await ejecutarEnvioCierre({ supabase, baseUrl })
      : campana === 'aclaracion'
        ? await ejecutarEnvioAclaracion({ supabase })
        : campana === 'exalumnos'
          ? await ejecutarCicloDiarioExalumnos({ supabase, baseUrl })
          : await ejecutarCicloDiario({ supabase, baseUrl })
    return res.status(200).json(resultado)
  } catch (err) {
    console.error('reactivate-forzar-envio:', err)
    return res.status(500).json({ error: err.message || 'Error interno' })
  }
}
