// Vercel Serverless Function — Cambio de PIN propio (auto-servicio)
// Corre en el servidor con la service_role key (nunca expuesta al cliente)

import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const { dni, pinActual, pinNuevo } = req.body

  if (!dni || !pinActual || !pinNuevo) {
    return res.status(400).json({ error: 'Faltan datos requeridos' })
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Configuración de autenticación incompleta en el servidor' })
  }

  try {
    const supabaseAdmin = createClient(supabaseUrl, serviceKey)

    const { data: user, error: findError } = await supabaseAdmin
      .from('users_config')
      .select('id')
      .eq('dni', dni.trim())
      .eq('pin', pinActual.trim())
      .eq('activo', true)
      .single()

    if (findError || !user) {
      return res.status(401).json({ error: 'PIN actual incorrecto' })
    }

    const { error: updateError } = await supabaseAdmin
      .from('users_config')
      .update({ pin: pinNuevo.trim() })
      .eq('id', user.id)

    if (updateError) {
      return res.status(500).json({ error: 'Error al actualizar PIN' })
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('Error en change-pin:', err)
    return res.status(500).json({ error: err.message || 'Error interno del servidor' })
  }
}
