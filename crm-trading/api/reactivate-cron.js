// Vercel Cron (diario) — dispara el ciclo del Plan Reactivate Burs. Ver la
// lógica real en api/_lib/reactivateCronCore.js (compartida con el botón
// "Forzar envío pendiente ahora" del panel).
import { createClient } from '@supabase/supabase-js'
import { ejecutarCicloDiario } from './_lib/reactivateCronCore.js'

export default async function handler(req, res) {
  const auth = req.headers.authorization
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'No autorizado' })
  }

  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const baseUrl = process.env.PUBLIC_APP_URL
  if (!baseUrl) {
    return res.status(500).json({ error: 'Falta configurar PUBLIC_APP_URL en las variables de entorno' })
  }

  try {
    const resultado = await ejecutarCicloDiario({ supabase, baseUrl })
    return res.status(200).json(resultado)
  } catch (err) {
    console.error('reactivate-cron:', err)
    return res.status(500).json({ error: err.message || 'Error interno' })
  }
}
