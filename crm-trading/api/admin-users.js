// Vercel Serverless Function — Gestión de usuarios (solo supervisor)
// GET  -> lista usuarios
// POST -> resetea el PIN de un usuario
// Corre en el servidor con la service_role key (nunca expuesta al cliente)

import jwt from 'jsonwebtoken'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const jwtSecret   = process.env.SUPABASE_JWT_SECRET
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!jwtSecret || !supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Configuración de autenticación incompleta en el servidor' })
  }

  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return res.status(401).json({ error: 'No autenticado' })
  }

  let claims
  try {
    claims = jwt.verify(token, jwtSecret)
  } catch {
    return res.status(401).json({ error: 'Sesión inválida o expirada' })
  }

  if (claims.app_role !== 'supervisor') {
    return res.status(403).json({ error: 'No autorizado' })
  }

  try {
    const supabaseAdmin = createClient(supabaseUrl, serviceKey)

    if (req.method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from('users_config')
        .select('id, dni, nombre, rol, activo, asesora:asesoras(nombre)')
        .order('nombre')
      if (error) throw error
      return res.status(200).json({ users: data || [] })
    }

    // POST -> resetear PIN
    const { userId, pinNuevo } = req.body
    if (!userId || !pinNuevo) {
      return res.status(400).json({ error: 'Faltan datos requeridos' })
    }

    const { error: updateError } = await supabaseAdmin
      .from('users_config')
      .update({ pin: pinNuevo })
      .eq('id', userId)

    if (updateError) throw updateError
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('Error en admin-users:', err)
    return res.status(500).json({ error: err.message || 'Error interno del servidor' })
  }
}
