import { createContext, useContext, useState } from 'react'
import { fetchUserByDniPin } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('crm_user') || 'null') } catch { return null }
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const login = async (dni, pin) => {
    setLoading(true); setError('')
    try {
      const userData = await fetchUserByDniPin(dni.trim(), pin.trim())
      if (!userData) { setError('DNI o PIN incorrecto'); setLoading(false); return false }
      setUser(userData)
      sessionStorage.setItem('crm_user', JSON.stringify(userData))
      setLoading(false)
      return true
    } catch {
      setError('Error al iniciar sesión')
      setLoading(false)
      return false
    }
  }

  const logout = () => {
    setUser(null)
    sessionStorage.removeItem('crm_user')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, error }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
