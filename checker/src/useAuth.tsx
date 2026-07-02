import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import * as api from './api'
import type { User } from './types'

interface AuthContextValue {
  user: User | null
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
  clearError: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function restoreSession() {
      if (!api.getToken()) {
        setLoading(false)
        return
      }

      try {
        const { user: me } = await api.fetchMe()
        if (!cancelled) setUser(me)
      } catch {
        api.setToken(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void restoreSession()
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    setError(null)
    const { token, user: signedIn } = await api.login(email, password)
    api.setToken(token)
    setUser(signedIn)
  }, [])

  const register = useCallback(async (email: string, password: string) => {
    setError(null)
    const { token, user: signedUp } = await api.register(email, password)
    api.setToken(token)
    setUser(signedUp)
  }, [])

  const logout = useCallback(() => {
    api.setToken(null)
    setUser(null)
  }, [])

  const clearError = useCallback(() => setError(null), [])

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      login,
      register,
      logout,
      clearError,
    }),
    [user, loading, error, login, register, logout, clearError],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export async function runAuthAction(
  action: () => Promise<void>,
  setError: (msg: string | null) => void,
) {
  try {
    setError(null)
    await action()
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Something went wrong')
    throw err
  }
}
