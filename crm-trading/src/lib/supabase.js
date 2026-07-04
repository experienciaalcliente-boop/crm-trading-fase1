import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('⚠️  Faltan las variables de entorno de Supabase. Revisa tu archivo .env.local')
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  // La sesión no la persiste supabase-js: la app la maneja vía sessionStorage
  // (ver AuthContext) y no hay refresh token real, solo un JWT propio de corta duración.
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { params: { eventsPerSecond: 10 } },
})
