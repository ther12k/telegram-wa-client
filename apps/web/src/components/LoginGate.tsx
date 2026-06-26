import { useState } from 'react'
import { Lock } from 'lucide-react'
import { useAuthToken } from '../contexts/AuthToken'

export function LoginGate({ children }: { children: React.ReactNode }) {
  const { token, setToken, isAuthenticated } = useAuthToken()
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  if (isAuthenticated) {
    return <>{children}</>
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!inputValue.trim()) {
      setError('Token is required')
      return
    }

    setIsLoading(true)

    try {
      // Verify token by calling a protected endpoint
      const response = await fetch('/api/dialogs', {
        headers: {
          Authorization: 'Bearer ' + inputValue.trim(),
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        setToken(inputValue.trim())
      } else {
        const body = await response.json().catch(() => ({ error: { message: 'Invalid token' } }))
        setError(body.error?.message || 'Authentication failed (' + response.status + ')')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-100 dark:bg-zinc-900 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="p-3 bg-brand-100 dark:bg-brand-900 rounded-full">
              <Lock className="w-8 h-8 text-brand-600 dark:text-brand-400" />
            </div>
          </div>

          <h1 className="text-2xl font-semibold text-center mb-2 text-zinc-900 dark:text-zinc-100">
            Authentication Required
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center mb-6">
            Enter your bearer token to access the application
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="token"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
              >
                Bearer Token
              </label>
              <input
                id="token"
                type="password"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Enter your auth token..."
                className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400"
                disabled={isLoading}
                autoFocus
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="w-full px-4 py-3 bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Verifying...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Token is stored in your browser session. You'll need to sign in again when the session
              expires.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
