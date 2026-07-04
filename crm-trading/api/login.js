// Vercel Serverless Function — Login por DNI+PIN, emite un JWT propio para Supabase
// Corre en el servidor con la service_role key (nunca expuesta al cliente)

import jwt from 'jsonwebtoken'
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

  const { dni, pin } = req.body

  if (!dni || !pin) {
    return res.status(400).json({ error: 'Faltan datos requeridos' })
  }

  const supabaseUrl  = process.env.VITE_SUPABASE_URL
  const serviceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY
  const jwtSecret    = process.env.SUPABASE_JWT_SECRET

  if (!supabaseUrl || !serviceKey || !jwtSecret) {
    return res.status(500).json({ error: 'Configuración de autenticación incompleta en el servidor' })
  }

  try {
    const supabaseAdmin = createClient(supabaseUrl, serviceKey)

    const { data: user, error } = await supabaseAdmin
      .from('users_config')
      .select('id, dni, nombre, rol, asesora_id, activo')
      .eq('dni', dni.trim())
      .eq('pin', pin.trim())
      .eq('activo', true)
      .single()

    if (error || !user) {
      return res.status(401).json({ error: 'DNI o PIN incorrecto' })
    }

    const token = jwt.sign(
      {
        role: 'authenticated',
        aud: 'authenticated',
        sub: user.id,
        app_role: user.rol,
        asesora_id: user.asesora_id,
      },
      jwtSecret,
      { expiresIn: '12h' }
    )

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        dni: user.dni,
        nombre: user.nombre,
        rol: user.rol,
        asesora_id: user.asesora_id,
      },
    })
  } catch (err) {
    console.error('Error en login:', err)
    return res.status(500).json({ error: err.message || 'Error interno del servidor' })
  }
}
