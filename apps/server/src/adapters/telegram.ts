import type { AuthState } from '@telewa/contracts'

export interface TelegramAdapter {
  /**
   * Returns current auth state (e.g. requires code, requires password, QR url, or authenticated).
   */
  getAuthState(): Promise<AuthState>

  /**
   * Initiates authentication with a phone number.
   * Sends code via Telegram / SMS.
   */
  sendCode(phoneNumber: string): Promise<AuthState>

  /**
   * Submits the received 5-6 digit code.
   */
  submitCode(code: string): Promise<AuthState>

  /**
   * Submits the 2-step verification password if required.
   */
  submitPassword(password: string): Promise<AuthState>

  /**
   * Triggers or requests QR code login. Returns authentication state with QrUrl.
   */
  startQrLogin(): Promise<AuthState>

  /**
   * Logs out from Telegram, destroying current session on the server.
   */
  logout(): Promise<void>
}
