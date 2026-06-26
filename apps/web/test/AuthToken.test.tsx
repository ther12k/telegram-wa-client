import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthTokenProvider, useAuthToken } from '../src/contexts/AuthToken'

// Test component that uses the hook
function TestConsumer() {
  const { token, setToken, isAuthenticated } = useAuthToken()
  return (
    <div>
      <span data-testid="token">{token ?? '(null)'}</span>
      <span data-testid="auth">{isAuthenticated ? 'yes' : 'no'}</span>
      <button data-testid="set-token" onClick={() => setToken('test-token')}>
        Set Token
      </button>
      <button data-testid="clear-token" onClick={() => setToken(null)}>
        Clear Token
      </button>
    </div>
  )
}

beforeEach(() => {
  if (typeof window !== 'undefined') {
    window.sessionStorage.clear()
  }
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('AuthTokenProvider', () => {
  it('provides null token and not authenticated by default', () => {
    render(
      <AuthTokenProvider>
        <TestConsumer />
      </AuthTokenProvider>,
    )
    expect(screen.getByTestId('token').textContent).toBe('(null)')
    expect(screen.getByTestId('auth').textContent).toBe('no')
  })

  it('restores token from sessionStorage on mount', () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('auth_token', 'saved-token')
    }
    render(
      <AuthTokenProvider>
        <TestConsumer />
      </AuthTokenProvider>,
    )
    expect(screen.getByTestId('token').textContent).toBe('saved-token')
    expect(screen.getByTestId('auth').textContent).toBe('yes')
  })

  it('sets token and persists to sessionStorage', async () => {
    render(
      <AuthTokenProvider>
        <TestConsumer />
      </AuthTokenProvider>,
    )
    await userEvent.click(screen.getByTestId('set-token'))
    expect(screen.getByTestId('token').textContent).toBe('test-token')
    expect(screen.getByTestId('auth').textContent).toBe('yes')
    if (typeof window !== 'undefined') {
      expect(window.sessionStorage.getItem('auth_token')).toBe('test-token')
    }
  })

  it('clears token and removes from sessionStorage', async () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('auth_token', 'test-token')
    }
    render(
      <AuthTokenProvider>
        <TestConsumer />
      </AuthTokenProvider>,
    )
    await userEvent.click(screen.getByTestId('clear-token'))
    expect(screen.getByTestId('token').textContent).toBe('(null)')
    expect(screen.getByTestId('auth').textContent).toBe('no')
    if (typeof window !== 'undefined') {
      expect(window.sessionStorage.getItem('auth_token')).toBeNull()
    }
  })
})

describe('useAuthToken', () => {
  it('throws when used outside provider', () => {
    const Test = () => {
      useAuthToken()
      return null
    }
    expect(() => render(<Test />)).toThrow('useAuthToken must be used within AuthTokenProvider')
  })

  it('handles empty token as not authenticated', () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('auth_token', '')
    }
    render(
      <AuthTokenProvider>
        <TestConsumer />
      </AuthTokenProvider>,
    )
    expect(screen.getByTestId('auth').textContent).toBe('no')
  })
})
