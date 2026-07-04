import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('⚠️  Faltan las variables de entorno de Supabase. Revisa tu archivo .env.local')
}

// El login usa un JWT propio (firmado en /api/login.js), no Supabase Auth
// real — no hay ninguna fila en auth.users. `supabase.auth.setSession()`
// intenta validar el token contra GoTrue (/auth/v1/user) y falla con 403 al
// no existir ese usuario, dejando la sesión sin establecer. Por eso el JWT
// se pasa directo como `accessToken` (el patrón que Supabase documenta para
// autenticación con JWT de terceros), sin pasar por el módulo de Auth.
let currentToken = null
export function setAuthToken(token) { currentToken = token }

export const supabase = createClient(supabaseUrl, supabaseKey, {
  accessToken: async () => currentToken,
  realtime: { params: { eventsPerSecond: 10 } },
})
