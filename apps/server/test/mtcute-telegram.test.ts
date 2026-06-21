import { describe, expect, it } from 'vitest'
import { sanitizeMtcuteError } from '../src/adapters/mtcute-telegram'

describe('sanitizeMtcuteError', () => {
  it('replaces long phone-like digit runs with [phone]', () => {
    const raw = 'FLOOD_WAIT for phone +14155551234 retry after 30s'
    const sanitized = sanitizeMtcuteError(raw)
    expect(sanitized).not.toContain('14155551234')
    expect(sanitized).toContain('[phone]')
  })

  it('replaces 32+ char hex with [hash]', () => {
    const raw = 'signIn failed: invalid phone_code_hash a1b2c3d4e5f67890abcdef1234567890 expected'
    const sanitized = sanitizeMtcuteError(raw)
    expect(sanitized).not.toContain('a1b2c3d4e5f67890abcdef1234567890')
    expect(sanitized).toContain('[hash]')
  })

  it('replaces session file paths with [session]', () => {
    const raw = 'EACCES: permission denied, open /var/lib/telewa/sessions/main.session'
    const sanitized = sanitizeMtcuteError(raw)
    expect(sanitized).not.toContain('/var/lib/telewa/sessions/main.session')
    expect(sanitized).toContain('[session]')
  })

  it('handles non-Error values (string, number, object)', () => {
    expect(sanitizeMtcuteError('plain string')).toBe('plain string')
    expect(sanitizeMtcuteError(42)).toBe('42')
    const sanitized = sanitizeMtcuteError({ message: 'obj error +14155551234' })
    expect(sanitized).toContain('[phone]')
  })

  it('truncates to <= 400 chars', () => {
    const long = 'x'.repeat(1000)
    expect(sanitizeMtcuteError(long).length).toBeLessThanOrEqual(400)
  })

  it('collapses whitespace', () => {
    const raw = 'a\n\nb\tc   d'
    expect(sanitizeMtcuteError(raw)).toBe('a b c d')
  })
})
