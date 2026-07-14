// Corre el mismo ciclo diario que el cron programado, pero disparado a mano
// desde el botón "Forzar envío pendiente ahora" del panel del supervisor —
// útil si una tanda diaria se cortó a medias (por el límite de tiempo de
// una función serverless) y no quieren esperar a la corrida de mañana.
import { createClient } from '@supabase/supabase-js'
import { ejecutarCicloDiario } from './_lib/reactivateCronCore.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' })

  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const baseUrl = process.env.PUBLIC_APP_URL
  if (!baseUrl) return res.status(500).json({ error: 'Falta configurar PUBLIC_APP_URL en las variables de entorno' })

  try {
    const resultado = await ejecutarCicloDiario({ supabase, baseUrl })
    return res.status(200).json(resultado)
  } catch (err) {
    console.error('reactivate-forzar-envio:', err)
    return res.status(500).json({ error: err.message || 'Error interno' })
  }
}
