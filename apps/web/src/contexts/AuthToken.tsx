import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface AuthTokenContextValue {
  token: string | null
  setToken: (token: string | null) => void
  isAuthenticated: boolean
}

const AuthTokenContext = createContext<AuthTokenContextValue | null>(null)

export function AuthTokenProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      return sessionStorage.getItem('auth_token') ?? null
    } catch {
      return null
    }
  })

  const setToken = useCallback((newToken: string | null) => {
    setTokenState(newToken)
    if (typeof window !== 'undefined') {
      try {
        if (newToken) {
          sessionStorage.setItem('auth_token', newToken)
        } else {
          sessionStorage.removeItem('auth_token')
        }
      } catch {
        // Session storage might be disabled; ignore
      }
    }
  }, [])

  const value: AuthTokenContextValue = {
    token,
    setToken,
    isAuthenticated: token !== null && token.length > 0,
  }

  return <AuthTokenContext.Provider value={value}>{children}</AuthTokenContext.Provider>
}

export function useAuthToken() {
  const context = useContext(AuthTokenContext)
  if (!context) {
    throw new Error('useAuthToken must be used within AuthTokenProvider')
  }
  return context
}
