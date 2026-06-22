import type { AuthState } from '@telewa/contracts'
import { TelegramClient } from '@mtcute/node'
import { SqliteStorage } from '@mtcute/sqlite'
import { unlink } from 'node:fs/promises'
import type { TelegramAdapter } from './telegram'

/**
 * Encode a Uint8Array as base64 (standard, no URL-safe variant).
 * Telegram expects the QR token in `tg://login?token=<base64>` where the
 * base64 is the standard RFC 4648 alphabet. Node Buffer.toString('base64')
 * is the cleanest path; falls back to a manual loop in environments without
 * Buffer (Bun has both).
 */
function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64')
  }
  // Manual base64 (kept tiny — Bun always has Buffer above, but the
  // fallback keeps the code portable).
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    // bytes[i] is `number | undefined` under noUncheckedIndexedAccess;
    // the loop bound guarantees it's defined.
    const b = bytes[i] as number
    binary += String.fromCharCode(b)
  }
  // btoa exists in Bun + Node 16+
  return btoa(binary)
}

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

  // QR login state (Story 3.2). Background polling loop waits for the user
  // to scan the qrCodeUrl with their phone and confirm. The raw token bytes
  // are kept here (NOT exposed via AuthState) so the poll can call
  // auth.acceptLoginToken with the same bytes that auth.exportLoginToken
  // returned. qrCodeUrl is base64-encoded and safe to expose.
  private qrToken?: { token: Uint8Array; expiresAt: number }
  private qrPollAbort?: AbortController

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

  /**
   * Returns the live TelegramClient. Throws if the client has not been
   * initialised yet (i.e. before the first sendCode() call).
   *
   * Accessor — not a public field — so the lifecycle stays inside the
   * adapter. The logout() → re-login flow nulls and re-creates `client`
   * transparently; callers using a thunk over this getter will pick up
   * the new instance without rewiring.
   *
   * Story 3 (round 9 plan): the MtcuteDialogProvider / MtcuteMessageProvider
   * take a `() => TelegramClient` thunk and call this on every request,
   * so callers never need to track the client lifecycle themselves.
   */
  getClient(): TelegramClient {
    if (!this.client) {
      throw new Error('MtcuteTelegramAdapter client not initialised — call sendCode first')
    }
    return this.client
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
    // Story 3.2 — real QR login via Telegram's official flow.
    //
    // Flow (https://corefork.telegram.org/api/qr-login):
    //   1. Call auth.exportLoginToken with our apiId/apiHash and an empty
    //      exceptIds list. Server returns a Uint8Array token + expires.
    //   2. Encode the token as base64 and expose it as
    //      `tg://login?token=<base64>` (this is the "deep link" the QR
    //      code encodes; phones with Telegram installed recognize the
    //      scheme and open the confirmation prompt).
    //   3. Poll auth.acceptLoginToken in the background. Returns one of:
    //         - loginTokenSuccess → user is authenticated, stop polling
    //         - loginToken (not yet scanned) → wait, then poll again
    //         - error → log + stop polling, surface to caller
    //   4. On token expiry (or any error), reset to unauthenticated so
    //      the user can re-trigger via the UI.
    //
    // DC migration (loginTokenMigrateTo response) is rare; we log and
    // surface as an error. Re-implementing across DCs is non-trivial and
    // not blocking v0.3.2 — tracked in Known sharp edges.

    // Cancel any in-flight QR poll from a previous attempt.
    this.cancelQrPoll()

    const client = this.ensureClient()

    let result: unknown
    try {
      // The mtcute client surface (see mtcute-dialogs.ts) types .call()
      // as `(method: string, params) => Promise<T>`. The raw TelegramClient
      // types it as an `RpcMethod` discriminator — strict, and a pain for
      // one-off TL calls like auth.exportLoginToken. Cast through `any`
      // for these auth.* primitives (same approach mtcute-dialogs uses
      // via the surface).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result = await (client as any).call('auth.exportLoginToken', {
        apiId: this.options.apiId,
        apiHash: this.options.apiHash,
        exceptIds: [],
      })
    } catch (err) {
      return {
        status: this.status,
        error: `Failed to export QR token: ${sanitizeMtcuteError(err)}`,
      }
    }

    // Type-narrow the result. mtcute's .call() returns `unknown`; we
    // shape-check on the discriminator field `_`.
    const tag = (result as { _: string } | null | undefined)?._
    if (tag === 'auth.loginTokenSuccess') {
      // Shouldn't happen on a fresh, unauthenticated client — but if it
      // does (e.g. session DB had a cached auth_key), surface success.
      this.status = 'authenticated'
      await this.emit()
      return { status: 'authenticated' }
    }
    if (tag === 'auth.loginTokenMigrateTo') {
      // DC migration needed — not implemented in v0.3.2.
      return {
        status: 'unauthenticated',
        error: 'QR login requires a DC migration which is not yet supported',
      }
    }
    if (tag !== 'auth.loginToken') {
      return {
        status: 'unauthenticated',
        error: `Unexpected auth.exportLoginToken response: ${tag}`,
      }
    }

    const token = (result as { token: Uint8Array }).token
    const expires = (result as { expires: number }).expires
    const expiresAtMs = expires * 1000

    // Persist for the background poll. The raw token bytes are never
    // exposed via AuthState — only the base64-encoded qrCodeUrl.
    this.qrToken = { token, expiresAt: expiresAtMs }

    // Convert to base64 in a Bun-friendly way. toBase64() works on
    // Uint8Array in Bun; falls back to btoa + fromCharCode in Node.
    const base64 = bytesToBase64(token)
    const qrCodeUrl = `tg://login?token=${base64}`

    this.status = 'requires_qr'
    const state: AuthState = { status: 'requires_qr', qrCodeUrl }
    await this.emit()

    // Start background polling. We don't await it — the caller wants
    // the QR URL immediately.
    this.startQrPoll(client).catch((err) => {
      console.warn('QR poll loop crashed (sanitized):', sanitizeMtcuteError(err))
    })

    return state
  }

  private async startQrPoll(client: TelegramClient): Promise<void> {
    if (!this.qrToken) return
    const pollIntervalMs = 2000
    this.qrPollAbort = new AbortController()
    const signal = this.qrPollAbort.signal

    while (this.qrToken && !signal.aborted) {
      // Check expiry before each poll. Telegram's QR tokens typically
      // live for ~30s; we don't poll past the server's deadline.
      if (Date.now() >= this.qrToken.expiresAt) {
        this.qrToken = undefined
        this.status = 'unauthenticated'
        await this.emit()
        return
      }

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (client as any).call('auth.acceptLoginToken', {
          token: this.qrToken.token,
        })
        const tag = (result as { _: string } | null | undefined)?._

        if (tag === 'auth.loginTokenSuccess') {
          // User scanned and confirmed — authenticated.
          this.qrToken = undefined
          this.status = 'authenticated'
          await this.emit()
          return
        }
        // auth.loginToken (not yet scanned) → wait and retry
        // auth.loginTokenMigrateTo → also rare; treat as wait
        // Any other tag → log and continue polling
      } catch (err) {
        // TRANSIENT errors (network blips, expired token mid-poll) are
        // logged + skipped. The expiry check at the top of the loop
        // handles true expiry. A persistent error will hit the same
        // exception every poll and get logged repeatedly; an operator
        // should restart the container.
        console.warn('auth.acceptLoginToken error (sanitized):', sanitizeMtcuteError(err))
      }

      // Wait between polls, but abort promptly on cancellation.
      if (signal.aborted) return
      await new Promise<void>((resolve) => {
        const t = setTimeout(resolve, pollIntervalMs)
        signal.addEventListener(
          'abort',
          () => {
            clearTimeout(t)
            resolve()
          },
          { once: true },
        )
      })
    }
  }

  private cancelQrPoll(): void {
    if (this.qrPollAbort) {
      this.qrPollAbort.abort()
      this.qrPollAbort = undefined
    }
    this.qrToken = undefined
  }

  async logout(): Promise<void> {
    this.rejectPending(new Error('logout called'))
    // Story 3.2: also cancel any in-flight QR poll so the next login
    // attempt doesn't race with the old loop.
    this.cancelQrPoll()
    if (this.client) {
      try {
        // 0.8.0 API: client.close() shuts down the network connection.
        await this.client.close()
      } catch (err) {
        console.warn('mtcute close error (sanitized):', sanitizeMtcuteError(err))
      }
    }
    this.client = null
    this.status = 'unauthenticated'
    this.phoneNumber = undefined
    this.startPromise = undefined

    // Destroy the persisted session so "logout" is a real logout, not a
    // resume-on-next-login. The SQLite session DB contains the MTProto
    // auth_key — leaving it on disk means the next sendCode(samePhone)
    // resumes silently without re-entering credentials.
    await this.destroySessionDb()

    await this.emit()
  }

  private async destroySessionDb(): Promise<void> {
    const path = this.options.sessionDbPath ?? './telewa-session/session.db'
    // SQLite WAL mode produces -wal and -shm sidecar files alongside the main DB.
    const paths = [path, `${path}-wal`, `${path}-shm`]
    for (const p of paths) {
      try {
        await unlink(p)
      } catch (err) {
        // ENOENT is fine — already gone. Anything else gets a sanitized warn.
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
          console.warn('session db unlink error (sanitized):', sanitizeMtcuteError(err))
        }
      }
    }
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
    // Story 3.2: starting a phone-code login while a QR poll is in flight
    // would leave two concurrent auth paths. Cancel QR so the user only
    // gets the phone flow.
    this.cancelQrPoll()
  }
}
