import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import app from '../src/app'

describe('HTTP auth middleware (Story 5b)', () => {
  beforeAll(() => {
    // Set a test token for the middleware to validate against
    process.env.AUTH_TOKEN = 'test-token-32chars-or-more'
  })

  afterAll(() => {
    // Clean up env var so it doesn't leak into other test suites in the same process
    delete process.env.AUTH_TOKEN
  })

  it('returns 401 when AUTH_TOKEN is set but no Authorization header', async () => {
    const response = await app.request('/api/dialogs')
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('UNAUTHORIZED')
    expect(body.error.message).toBe('Missing auth token')
  })

  it('returns 401 when Authorization header is malformed', async () => {
    const response = await app.request('/api/dialogs', {
      headers: {
        Authorization: 'InvalidFormat',
      },
    })
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('UNAUTHORIZED')
    expect(body.error.message).toBe('Missing auth token')
  })

  it('returns 401 when bearer token does not match AUTH_TOKEN', async () => {
    const response = await app.request('/api/dialogs', {
      headers: {
        Authorization: 'Bearer wrong-token',
      },
    })
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('UNAUTHORIZED')
    expect(body.error.message).toBe('Invalid auth token')
  })

  it('returns 401 when ?token= query param does not match (for /events)', async () => {
    const response = await app.request('/events?token=wrong-token')
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('UNAUTHORIZED')
    expect(body.error.message).toBe('Invalid auth token')
  })

  it('allows request when bearer token matches AUTH_TOKEN', async () => {
    const response = await app.request('/api/dialogs', {
      headers: {
        Authorization: 'Bearer test-token-32chars-or-more',
      },
    })
    // The endpoint itself may return 401 if not authenticated, but that's a
    // different layer (isAuthenticated). Here we're checking that the auth
    // middleware doesn't block the request.
    // For now, just verify it's not the middleware's 401
    if (response.status === 401) {
      const body = await response.json()
      // Should be the isAuthenticated 401, not the middleware's
      expect(body.error.code).not.toBe('UNAUTHORIZED')
    }
  })

  it('allows request when ?token= matches AUTH_TOKEN (for /events)', async () => {
    const response = await app.request('/events?token=test-token-32chars-or-more')
    // Same as above — verify middleware doesn't block
    if (response.status === 401) {
      const body = await response.json()
      expect(body.error.code).not.toBe('UNAUTHORIZED')
    }
  })

  it('allows public /health routes without auth', async () => {
    const response = await app.request('/health/live')
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.success).toBe(true)
  })

  it('allows public /health/ready without auth', async () => {
    const response = await app.request('/health/ready')
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.success).toBe(true)
  })
})
