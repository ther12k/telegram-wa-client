import type { AuthState } from '@telewa/contracts'
import { TelegramClient } from '@mtcute/node'
import { SqliteStorage } from '@mtcute/sqlite'
import type { TelegramAdapter } from './telegram'

/**
 * Sanitize error messages before they leave this module.
 * Strips phone numbers, hex hashes, session file paths, and any api_hash.
 * Returns a short, single-line message safe to return to HTTP clients and to log.
 */
export function sanitizeMtcuteError(err: unknown): string {
  let raw: string
  if (err instanceof Error) {
    raw = err.message
  } else if (typeof err === 'string') {
    raw = err
  } else if (err && typeof err === 'object' && 'message' in err) {
    raw = String((err as { message: unknown }).message)
  } else {
    raw = String(err)
  }
  return raw
    .replace(/[a-f0-9]{32,}/gi, '[hash]') // api_hash, code_hash, auth_key (must run before phone, so hex+digits blocks aren't split)
    .replace(/\+?\d[\d\s-]{6,}\d/g, '[phone]') // any 8+ digit run after hash is masked
    .replace(/\B\/[^\s]*\.(db|sqlite|session)\b/gi, '/[session]') // session paths
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 400)
}

interface MtcuteAdapterOptions {
  apiId: number
  apiHash: string
  sessionDbPath?: string
}

/**
 * Real Telegram (MTProto) adapter built on @mtcute/node + @mtcute/sqlite.
 *
 * Auth flow:
 *   1. sendCode(phone)        → triggers client.start({phone, code, password}) in the background
 *   2. submitCode(code)       → resolves the deferred promise mtcute is waiting on
 *   3. submitPassword(pw)     → only if mtcute's start() asked for the 2FA password callback
 *   4. logout()               → calls client.logOut() and nulls the client so the next
 *                                sendCode() rebuilds the connection
 *
 * The session is persisted in a SQLite file (default: ./telewa-session/session.db).
 * Restart the container and the user is still signed in.
 */
export class MtcuteTelegramAdapter implements TelegramAdapter {
  private client: TelegramClient | null = null
  private status: AuthState['status'] = 'unauthenticated'
  private phoneNumber?: string
  private listeners = new Set<(state: AuthState) => void>()

  private startPromise?: Promise<unknown>
  private pendingCode?: { resolve: (code: string) => void; reject: (err: Error) => void }
  private pendingPassword?: {
    resolve: (password: string) => void
    reject: (err: Error) => void
  }

  constructor(private readonly options: MtcuteAdapterOptions) {
    if (!options.apiId || !options.apiId.toString().match(/^\d{1,10}$/)) {
      throw new Error('MtcuteTelegramAdapter: invalid TELEGRAM_API_ID (must be a positive integer)')
    }
    if (!options.apiHash || !options.apiHash.match(/^[a-f0-9]{32}$/i)) {
      throw new Error(
        'MtcuteTelegramAdapter: invalid TELEGRAM_API_HASH (must be 32-char hex string)',
      )
    }
  }

  private ensureClient(): TelegramClient {
    if (!this.client) {
      this.client = new TelegramClient({
        apiId: this.options.apiId,
        apiHash: this.options.apiHash,
        storage: new SqliteStorage(this.options.sessionDbPath ?? './telewa-session/session.db'),
      })
    }
    return this.client
  }

  private async emit(): Promise<void> {
    const state = await this.getAuthState()
    for (const fn of this.listeners) fn(state)
  }

  subscribe(fn: (state: AuthState) => void): () => void {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  async getAuthState(): Promise<AuthState> {
    return { status: this.status, phoneNumber: this.phoneNumber }
  }

  async sendCode(phoneNumber: string): Promise<AuthState> {
    if (!phoneNumber.startsWith('+')) {
      return { status: this.status, error: 'Phone number must start with + and country code' }
    }
    // Reset state for a new attempt
    this.rejectPending(new Error('New code request superseded previous one'))
    this.phoneNumber = phoneNumber
    this.status = 'requires_code'

    const client = this.ensureClient()
    this.startPromise = client
      .start({
        phone: phoneNumber,
        code: () =>
          new Promise<string>((resolve, reject) => {
            this.pendingCode = { resolve, reject }
          }),
        password: () =>
          new Promise<string>((resolve, reject) => {
            this.status = 'requires_password'
            this.pendingPassword = { resolve, reject }
            // Fire and forget — the route handler returns immediately with the new state
            void this.emit()
          }),
      })
      .then((user) => {
        this.status = 'authenticated'
        void this.emit()
        return user
      })
      .catch((err: unknown) => {
        this.status = 'unauthenticated'
        void this.emit()
        // Surface a sanitized message; full error never leaves this module
        const msg = sanitizeMtcuteError(err)
        throw new Error(`Telegram auth failed: ${msg}`)
      })

    await this.emit()
    return this.getAuthState()
  }

  async submitCode(code: string): Promise<AuthState> {
    if (this.status !== 'requires_code' || !this.pendingCode) {
      return { status: this.status, error: 'No active code request found' }
    }
    if (!/^\d{5,6}$/.test(code)) {
      return { status: this.status, error: 'Verification code must be 5-6 digits' }
    }
    const pending = this.pendingCode
    this.pendingCode = undefined
    pending.resolve(code)

    // mtcute processes the code async; give it a tick to update our state
    await new Promise((r) => setTimeout(r, 100))
    return this.getAuthState()
  }

  async submitPassword(password: string): Promise<AuthState> {
    if (this.status !== 'requires_password' || !this.pendingPassword) {
      return { status: this.status, error: 'No active password challenge found' }
    }
    if (password.length < 1) {
      return { status: this.status, error: 'Password is required' }
    }
    const pending = this.pendingPassword
    this.pendingPassword = undefined
    pending.resolve(password)

    await new Promise((r) => setTimeout(r, 100))
    return this.getAuthState()
  }

  async startQrLogin(): Promise<AuthState> {
    // QR login for user accounts is supported by mtcute via a separate flow
    // (client.exportLoginToken / client.acceptLoginToken). Implementing it
    // requires storing an in-memory token, polling for scan confirmation,
    // and rendering the tg://login URI. Deferred until needed; the auth UI
    // currently exposes the phone-code path only.
    return {
      status: 'unauthenticated',
      error: 'QR login not yet implemented in MtcuteTelegramAdapter',
    }
  }

  async logout(): Promise<void> {
    this.rejectPending(new Error('logout called'))
    if (this.client) {
      try {
        // 0.8.0 API: client.close() shuts down the network connection.
        // The SQLite session DB remains on disk; the next sendCode() with the
        // same phone will resume from it. For a "forget me" flow, also
        // unlink the DB file via fs.unlink() on the sessionDbPath.
        await this.client.close()
      } catch (err) {
        console.warn('mtcute close error (sanitized):', sanitizeMtcuteError(err))
      }
    }
    this.client = null
    this.status = 'unauthenticated'
    this.phoneNumber = undefined
    this.startPromise = undefined
    await this.emit()
  }

  private rejectPending(reason: Error): void {
    if (this.pendingCode) {
      this.pendingCode.reject(reason)
      this.pendingCode = undefined
    }
    if (this.pendingPassword) {
      this.pendingPassword.reject(reason)
      this.pendingPassword = undefined
    }
  }
}
