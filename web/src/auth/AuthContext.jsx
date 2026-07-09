import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from 'react'
import { useNavigate } from 'react-router-dom'

const STORAGE_KEY = 'auth'

const AuthContext = createContext(null)

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(readStored)
  const navigate = useNavigate()

  const login = useCallback((data) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    setAuth(data)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setAuth(null)
    navigate('/login', { replace: true })
  }, [navigate])

  const value = useMemo(
    () => ({
      user: auth?.user ?? null,
      token: auth?.token ?? null,
      isAuthenticated: Boolean(auth?.token),
      login,
      logout,
    }),
    [auth, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (ctx === null) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
