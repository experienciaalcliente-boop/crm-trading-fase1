import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

function readStoredSession() {
  try { return JSON.parse(sessionStorage.getItem('crm_session') || 'null') } catch { return null }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readStoredSession)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  // Rehidratar la sesión de Supabase (RLS) al cargar la app, no solo el estado de React
  useEffect(() => {
    if (session?.token) {
      supabase.auth.setSession({ access_token: session.token, refresh_token: session.token })
    }
  }, [])

  const login = async (dni, pin) => {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dni: dni.trim(), pin: pin.trim() }),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error || 'DNI o PIN incorrecto')
        setLoading(false)
        return false
      }
      const newSession = { user: body.user, token: body.token }
      await supabase.auth.setSession({ access_token: body.token, refresh_token: body.token })
      setSession(newSession)
      sessionStorage.setItem('crm_session', JSON.stringify(newSession))
      setLoading(false)
      return true
    } catch {
      setError('Error al iniciar sesión')
      setLoading(false)
      return false
    }
  }

  const logout = () => {
    setSession(null)
    sessionStorage.removeItem('crm_session')
    supabase.auth.setSession({ access_token: '', refresh_token: '' }).catch(() => {})
  }

  return (
    <AuthContext.Provider value={{ user: session?.user ?? null, token: session?.token ?? null, login, logout, loading, error }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
