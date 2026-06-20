import { describe, expect, it, beforeEach } from 'vitest'
import app, { telegramAdapter } from '../src/app'

describe('authentication integration endpoints', () => {
  beforeEach(async () => {
    await telegramAdapter.logout()
  })

  it('gets initial unauthenticated state', async () => {
    const response = await app.request('/api/auth/state')
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body.data.status).toBe('unauthenticated')
  })

  it('handles standard authentication flow successfully', async () => {
    // Start phone code sending
    const phoneRes = await app.request('/api/auth/phone/start', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phone: '+14155550199' }),
    })
    const phoneBody = await phoneRes.json()
    expect(phoneRes.status).toBe(200)
    expect(phoneBody.data.status).toBe('requires_code')

    // Submit correct verification code
    const codeRes = await app.request('/api/auth/code/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: '11111' }),
    })
    const codeBody = await codeRes.json()
    expect(codeRes.status).toBe(200)
    expect(codeBody.data.status).toBe('authenticated')

    // Confirm state has updated globally
    const stateRes = await app.request('/api/auth/state')
    const stateBody = await stateRes.json()
    expect(stateBody.data.status).toBe('authenticated')
  })

  it('rejects invalid inputs with 422', async () => {
    const phoneRes = await app.request('/api/auth/phone/start', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phone: '1' }), // Too short
    })
    expect(phoneRes.status).toBe(422)
  })

  it('handles 2FA password steps', async () => {
    await app.request('/api/auth/phone/start', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phone: '+14155550199' }),
    })

    // Submit code requiring password
    const codeRes = await app.request('/api/auth/code/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: '00000' }),
    })
    expect(codeRes.status).toBe(200)
    expect((await codeRes.json()).data.status).toBe('requires_password')

    // Submit invalid password
    const badPwRes = await app.request('/api/auth/password/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: 'wrong' }),
    })
    expect(badPwRes.status).toBe(400)

    // Submit correct password
    const goodPwRes = await app.request('/api/auth/password/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: 'correct-password' }),
    })
    expect(goodPwRes.status).toBe(200)
    expect((await goodPwRes.json()).data.status).toBe('authenticated')
  })

  it('supports QR login initiation', async () => {
    const qrRes = await app.request('/api/auth/qr/start', { method: 'POST' })
    const qrBody = await qrRes.json()
    expect(qrRes.status).toBe(200)
    expect(qrBody.data.status).toBe('requires_qr')
    expect(qrBody.data.qrCodeUrl).toBeDefined()
  })
})
