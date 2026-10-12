import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import api from '../api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('jmr_user') || 'null')
    } catch {
      return null
    }
  })

  useEffect(() => {
    const clearUser = () => setUser(null)
    window.addEventListener('jmr:unauthorized', clearUser)
    return () => window.removeEventListener('jmr:unauthorized', clearUser)
  }, [])

  const value = useMemo(() => ({
    user,
    async login(credentials) {
      const { data } = await api.post('/auth/login', credentials)
      localStorage.setItem('jmr_token', data.token)
      localStorage.setItem('jmr_user', JSON.stringify(data.user))
      setUser(data.user)
      return data.user
    },
    async logout() {
      try {
        await api.post('/auth/logout')
      } finally {
        localStorage.removeItem('jmr_token')
        localStorage.removeItem('jmr_user')
        setUser(null)
      }
    },
  }), [user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
