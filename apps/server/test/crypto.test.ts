import { describe, expect, it } from 'vitest'
import { encrypt, decrypt, generateKey } from '../src/crypto/encryption'

describe('encryption primitive', () => {
  it('encrypts and decrypts text successfully with a valid key', () => {
    const key = generateKey()
    const text = 'secret message 123!'

    const encrypted = encrypt(text, key)
    expect(encrypted).toContain(':')
    expect(encrypted.split(':').length).toBe(3)

    const decrypted = decrypt(encrypted, key)
    expect(decrypted).toBe(text)
  })

  it('fails decryption with wrong key', () => {
    const key1 = generateKey()
    const key2 = generateKey()
    const text = 'another secret'

    const encrypted = encrypt(text, key1)
    expect(() => decrypt(encrypted, key2)).toThrow()
  })

  it('throws on invalid key length', () => {
    const badKey = 'short-key'
    expect(() => encrypt('test', badKey)).toThrow()
    expect(() => decrypt('a:b:c', badKey)).toThrow()
  })

  it('throws on invalid encrypted format', () => {
    const key = generateKey()
    expect(() => decrypt('not-colon-delimited', key)).toThrow()
    expect(() => decrypt('a:b', key)).toThrow()
    expect(() => decrypt('::', key)).toThrow()
  })
})
