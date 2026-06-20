import { describe, expect, it } from 'vitest'
import { FakeTelegramAdapter } from '../src/adapters/fake-telegram'

describe('fake telegram adapter auth flow', () => {
  it('unauthenticated by default', async () => {
    const adapter = new FakeTelegramAdapter()
    const state = await adapter.getAuthState()
    expect(state.status).toBe('unauthenticated')
    expect(state.phoneNumber).toBeUndefined()
  })

  it('rejects invalid phone number structure', async () => {
    const adapter = new FakeTelegramAdapter()
    const state = await adapter.sendCode('12345')
    expect(state.status).toBe('unauthenticated')
    expect(state.error).toContain('must start with +')
  })

  it('transitions to requires_code on valid phone input', async () => {
    const adapter = new FakeTelegramAdapter()
    const state = await adapter.sendCode('+14155552671')
    expect(state.status).toBe('requires_code')
    expect(state.phoneNumber).toBe('+14155552671')
  })

  it('transitions to authenticated on code 11111', async () => {
    const adapter = new FakeTelegramAdapter()
    await adapter.sendCode('+14155552671')
    const state = await adapter.submitCode('11111')
    expect(state.status).toBe('authenticated')
  })

  it('transitions to requires_password on code 00000', async () => {
    const adapter = new FakeTelegramAdapter()
    await adapter.sendCode('+14155552671')
    const state = await adapter.submitCode('00000')
    expect(state.status).toBe('requires_password')
  })

  it('handles 2FA password verification', async () => {
    const adapter = new FakeTelegramAdapter()
    await adapter.sendCode('+14155552671')
    await adapter.submitCode('00000')

    const badState = await adapter.submitPassword('wrong')
    expect(badState.status).toBe('requires_password')
    expect(badState.error).toContain('Incorrect 2FA password')

    const goodState = await adapter.submitPassword('correct-password')
    expect(goodState.status).toBe('authenticated')
  })

  it('handles QR code setup', async () => {
    const adapter = new FakeTelegramAdapter()
    const state = await adapter.startQrLogin()
    expect(state.status).toBe('requires_qr')
    expect(state.qrCodeUrl).toBeDefined()
  })
})
