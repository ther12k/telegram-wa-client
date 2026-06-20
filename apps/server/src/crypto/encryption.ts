import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12

/**
 * Encrypts a string using AES-256-GCM.
 * The output is formatted as: iv_hex:ciphertext_hex:tag_hex
 */
export function encrypt(text: string, secretKeyHex: string): string {
  const key = Buffer.from(secretKeyHex, 'hex')
  if (key.length !== 32) {
    throw new Error('Encryption key must be a 32-byte hex string (64 characters)')
  }

  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const tag = cipher.getAuthTag().toString('hex')

  return `${iv.toString('hex')}:${encrypted}:${tag}`
}

/**
 * Decrypts an AES-256-GCM encrypted string formatted as iv_hex:ciphertext_hex:tag_hex.
 */
export function decrypt(encryptedText: string, secretKeyHex: string): string {
  const parts = encryptedText.split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted format. Expected iv:ciphertext:tag')
  }

  const [ivHex, ciphertextHex, tagHex] = parts
  if (!ivHex || !ciphertextHex || !tagHex) {
    throw new Error('Invalid encrypted format. Parts cannot be empty')
  }

  const key = Buffer.from(secretKeyHex, 'hex')
  if (key.length !== 32) {
    throw new Error('Encryption key must be a 32-byte hex string (64 characters)')
  }

  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

/**
 * Generates a random 32-byte key formatted as a hex string (64 characters).
 */
export function generateKey(): string {
  return randomBytes(32).toString('hex')
}
