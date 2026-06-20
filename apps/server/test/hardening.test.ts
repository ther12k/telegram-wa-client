import { describe, expect, it } from 'vitest'
import app from '../src/app'

describe('hardening middlewares', () => {
  it('includes security headers in responses', async () => {
    const res = await app.request('/health/live')
    expect(res.status).toBe(200)
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('x-frame-options')).toBe('SAMEORIGIN')
    expect(res.headers.get('content-security-policy')).toContain("default-src 'self'")
  })

  it('enforces rate limiting on /api/* routes', async () => {
    // Send multiple requests in quick succession to hit the limit (configured at max 200 in app, but let's test a local router with max 3)
    const Hono = (await import('hono')).Hono
    const rateLimiter = (await import('../src/hardening')).rateLimiter

    const testApp = new Hono()
    testApp.use('/api/*', rateLimiter({ windowMs: 10000, maxRequests: 3 }))
    testApp.get('/api/test', (c) => c.text('ok'))

    // Request 1, 2, 3 should succeed
    const res1 = await testApp.request('/api/test')
    expect(res1.status).toBe(200)

    const res2 = await testApp.request('/api/test')
    expect(res2.status).toBe(200)

    const res3 = await testApp.request('/api/test')
    expect(res3.status).toBe(200)

    // Request 4 should be rate-limited
    const res4 = await testApp.request('/api/test')
    expect(res4.status).toBe(429)
    const body = await res4.json()
    expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED')
    expect(res4.headers.get('Retry-After')).toBeDefined()
  })
})
