import { describe, expect, it } from 'vitest'
import { MtcuteTelegramAdapter, sanitizeMtcuteError } from '../src/adapters/mtcute-telegram'

describe('MtcuteTelegramAdapter constructor validation', () => {
  const validHash = 'a'.repeat(32)
  it('throws when apiId is missing (0)', () => {
    expect(() => new MtcuteTelegramAdapter({ apiId: 0, apiHash: validHash })).toThrow(
      /invalid TELEGRAM_API_ID/,
    )
  })

  it('throws when apiId is negative', () => {
    expect(() => new MtcuteTelegramAdapter({ apiId: -1, apiHash: validHash })).toThrow(
      /invalid TELEGRAM_API_ID/,
    )
  })

  it('throws when apiId is not an integer', () => {
    expect(() => new MtcuteTelegramAdapter({ apiId: 1.5, apiHash: validHash })).toThrow(
      /invalid TELEGRAM_API_ID/,
    )
  })

  it('throws when apiId has too many digits', () => {
    expect(() => new MtcuteTelegramAdapter({ apiId: 12345678901, apiHash: validHash })).toThrow(
      /invalid TELEGRAM_API_ID/,
    )
  })

  it('throws when apiHash is empty', () => {
    expect(() => new MtcuteTelegramAdapter({ apiId: 12345, apiHash: '' })).toThrow(
      /invalid TELEGRAM_API_HASH/,
    )
  })

  it('throws when apiHash is too short', () => {
    expect(() => new MtcuteTelegramAdapter({ apiId: 12345, apiHash: 'short' })).toThrow(
      /invalid TELEGRAM_API_HASH/,
    )
  })

  it('throws when apiHash has non-hex chars', () => {
    expect(() => new MtcuteTelegramAdapter({ apiId: 12345, apiHash: 'z'.repeat(32) })).toThrow(
      /invalid TELEGRAM_API_HASH/,
    )
  })

  it('accepts a valid apiId and apiHash', () => {
    expect(() => new MtcuteTelegramAdapter({ apiId: 12345678, apiHash: validHash })).not.toThrow()
  })
})

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
