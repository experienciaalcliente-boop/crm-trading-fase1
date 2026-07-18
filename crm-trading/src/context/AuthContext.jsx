import { createContext, useContext, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { setAuthToken, setSesionExpiradaHandler } from '../lib/supabase'

const AuthContext = createContext(null)

function readStoredSession() {
  try { return JSON.parse(sessionStorage.getItem('crm_session') || 'null') } catch { return null }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readStoredSession)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  // Rehidratar la sesión al cargar la app, no solo el estado de React
  useEffect(() => {
    setAuthToken(session?.token || null)
    setSesionExpiradaHandler(() => {
      setSession(null)
      sessionStorage.removeItem('crm_session')
      setAuthToken(null)
      toast.error('Tu sesión expiró — inicia sesión de nuevo')
    })
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
      setAuthToken(body.token)
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
    setAuthToken(null)
  }

  return (
    <AuthContext.Provider value={{ user: session?.user ?? null, token: session?.token ?? null, login, logout, loading, error }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
