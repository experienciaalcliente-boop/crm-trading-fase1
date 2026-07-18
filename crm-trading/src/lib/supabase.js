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

// El JWT propio expira a las 12h (ver api/login.js). Si alguien deja el CRM
// abierto en la misma pestaña más tiempo que eso (muy común: una asesora que
// nunca cierra sesión), el token queda vencido y Supabase empieza a
// responder 401 en todas las consultas — pero cada hook atrapa ese error por
// su cuenta y muchos solo hacen console.warn, así que la pantalla se queda
// vacía sin ningún aviso, y ni siquiera un refresco lo arregla porque el
// token vencido sigue en sessionStorage. Se intercepta acá, en un solo
// lugar, para forzar el cierre de sesión apenas se detecta un 401 real.
let onSesionExpirada = null
export function setSesionExpiradaHandler(fn) { onSesionExpirada = fn }

async function fetchConDeteccionDeSesionExpirada(url, options) {
  const res = await fetch(url, options)
  if (res.status === 401 && currentToken && onSesionExpirada) onSesionExpirada()
  return res
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  accessToken: async () => currentToken,
  realtime: { params: { eventsPerSecond: 10 } },
  global: { fetch: fetchConDeteccionDeSesionExpirada },
})
