// Vercel Cron (diario) — dispara el ciclo del Plan Reactivate Burs Y el del
// Plan Exalumnos. Van en el mismo cron a propósito: el plan Hobby de Vercel
// limita a 2 crons y ya había 2 registrados en vercel.json (este y
// sync-programas-encuestas), así que un 3er cron dedicado para Exalumnos
// no era viable — en cambio, ambas campañas comparten este único disparo
// diario, cada una con su propio "en pausa" independiente si no le toca.
import { createClient } from '@supabase/supabase-js'
import { ejecutarCicloDiario } from './_lib/reactivateCronCore.js'
import { ejecutarCicloDiarioExalumnos } from './_lib/expCampanaCronCore.js'
import { ejecutarCicloDiarioCoordinacion } from './_lib/coordinacionCronCore.js'
import { actualizarInformeMensual } from './_lib/coordinacionInforme.js'

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

  const resultado = { reactivateBurs: null, planExalumnos: null, coordinacion: null }
  try {
    resultado.reactivateBurs = await ejecutarCicloDiario({ supabase, baseUrl })
  } catch (err) {
    console.error('reactivate-cron (Reactivate Burs):', err)
    resultado.reactivateBurs = { ok: false, error: err.message || 'Error interno' }
  }

  try {
    resultado.planExalumnos = await ejecutarCicloDiarioExalumnos({ supabase, baseUrl })
  } catch (err) {
    console.error('reactivate-cron (Plan Exalumnos):', err)
    resultado.planExalumnos = { ok: false, error: err.message || 'Error interno' }
  }

  try {
    resultado.coordinacion = await ejecutarCicloDiarioCoordinacion({ supabase })
  } catch (err) {
    console.error('reactivate-cron (Panel de Coordinación):', err)
    resultado.coordinacion = { ok: false, error: err.message || 'Error interno' }
  }

  try {
    resultado.informeMensual = await actualizarInformeMensual({ supabase })
  } catch (err) {
    console.error('reactivate-cron (Informe mensual):', err)
    resultado.informeMensual = { ok: false, error: err.message || 'Error interno' }
  }

  return res.status(200).json(resultado)
}
