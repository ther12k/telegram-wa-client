import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { api } from '../src/api'

const mockSuccess = (data: unknown, status = 200) =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve({ success: true, data, meta: { requestId: 'test-1' } }),
  } as Response)

const mockFailure = (code: string, message: string, status = 401) =>
  Promise.resolve({
    ok: false,
    status,
    json: () =>
      Promise.resolve({
        success: false,
        error: { code, message, retryable: false },
        meta: { requestId: 'test-1' },
      }),
  } as Response)

const mockAuthState = { status: 'unauthenticated' }

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockReset()
  // Clear session storage
  if (typeof window !== 'undefined') {
    window.sessionStorage.clear()
  }
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('api.request (internal)', () => {
  it('throws on non-ok response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(mockFailure('UNAUTHORIZED', 'Missing auth token'))
    await expect(api.getAuthState()).rejects.toThrow('Missing auth token')
    expect(fetch).toHaveBeenCalledWith('/api/auth/state', expect.objectContaining({}))
  })

  it('attaches auth token when set in sessionStorage', async () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('auth_token', 'test-token-32chars-or-more')
    }
    vi.mocked(fetch).mockResolvedValueOnce(mockSuccess(mockAuthState))
    await api.getAuthState()
    const callArgs = vi.mocked(fetch).mock.calls[0]
    expect(callArgs[1]?.headers).toEqual(
      expect.objectContaining({ Authorization: 'Bearer test-token-32chars-or-more' }),
    )
  })

  it('does not attach auth header when no token in sessionStorage', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(mockSuccess(mockAuthState))
    await api.getAuthState()
    const callArgs = vi.mocked(fetch).mock.calls[0]
    const headers = callArgs[1]?.headers as Record<string, string> | undefined
    expect(headers?.Authorization).toBeUndefined()
  })

  it('throws on network error', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network failure'))
    await expect(api.getAuthState()).rejects.toThrow('Network failure')
  })
})

describe('api methods', () => {
  it('version calls /api/version', async () => {
    const data = {
      name: 'telewa',
      version: '0.4.0',
      phase: 'Done',
      demoMode: false,
      uiIntegration: 'uploaded',
    }
    vi.mocked(fetch).mockResolvedValueOnce(mockSuccess(data))
    const result = await api.version()
    expect(result).toEqual(data)
    expect(fetch).toHaveBeenCalledWith('/api/version', expect.any(Object))
  })

  it('projectState calls /api/project-state', async () => {
    const data = {
      activePhase: 'Done',
      status: 'live',
      uiStatus: 'ready',
      implemented: [],
      mocked: [],
      nextTask: '',
    }
    vi.mocked(fetch).mockResolvedValueOnce(mockSuccess(data))
    await api.projectState()
    expect(fetch).toHaveBeenCalledWith('/api/project-state', expect.any(Object))
  })

  it('getAuthState calls /api/auth/state', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(mockSuccess(mockAuthState))
    const result = await api.getAuthState()
    expect(result).toEqual(mockAuthState)
  })

  it('sendCode posts to /api/auth/phone/start', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(mockSuccess(mockAuthState))
    const input = { phone: '+628123456789' }
    await api.sendCode(input)
    expect(fetch).toHaveBeenCalledWith(
      '/api/auth/phone/start',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(input),
      }),
    )
  })

  it('logout posts to /api/auth/logout', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(mockSuccess(mockAuthState))
    await api.logout()
    expect(fetch).toHaveBeenCalledWith(
      '/api/auth/logout',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('listDialogs calls /api/dialogs', async () => {
    const data = { dialogs: [], total: 0, currentUser: null }
    vi.mocked(fetch).mockResolvedValueOnce(mockSuccess(data))
    const result = await api.listDialogs()
    expect(result).toEqual(data)
  })

  it('getHistory builds cursor query string', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockSuccess({ messages: [], cursor: null, hasMore: false }),
    )
    await api.getHistory('chat-1', { limit: 50, cursor: 'abc' })
    expect(fetch).toHaveBeenCalledWith(
      '/api/messages/chat-1?limit=50&cursor=abc',
      expect.any(Object),
    )
  })

  it('getHistory omits query string when no params', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockSuccess({ messages: [], cursor: null, hasMore: false }),
    )
    await api.getHistory('chat-1')
    expect(fetch).toHaveBeenCalledWith('/api/messages/chat-1', expect.any(Object))
  })

  it('sendMessage posts to /api/messages', async () => {
    const msg = {
      id: 'm1',
      chatId: 'c1',
      senderId: 'me',
      outbox: true,
      text: 'hi',
      sentAt: new Date().toISOString(),
      status: 'sent' as const,
      kind: 'text' as const,
    }
    vi.mocked(fetch).mockResolvedValueOnce(mockSuccess(msg))
    const result = await api.sendMessage({ chatId: 'c1', text: 'hi' })
    expect(result).toEqual(msg)
    expect(fetch).toHaveBeenCalledWith('/api/messages', expect.objectContaining({ method: 'POST' }))
  })

  it('search calls /api/search with query', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(mockSuccess({ dialogs: [], messages: [] }))
    await api.search('hello')
    expect(fetch).toHaveBeenCalledWith('/api/search?q=hello', expect.any(Object))
  })

  it('uploadMedia sends FormData', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockSuccess({ id: 'med-1', mime: 'image/png', name: 'test.png', size: 100 }),
    )
    const file = new File(['test'], 'test.png', { type: 'image/png' })
    const result = await api.uploadMedia(file)
    expect(result.id).toBe('med-1')
    expect(fetch).toHaveBeenCalledWith(
      '/api/media',
      expect.objectContaining({
        method: 'POST',
        headers: {},
      }),
    )
  })
})
