import type { AuthState } from '@telewa/contracts'
import type { TelegramAdapter } from './telegram'

export class FakeTelegramAdapter implements TelegramAdapter {
  private status: AuthState['status'] = 'unauthenticated'
  private phoneNumber?: string
  private isQrActive = false
  private listeners = new Set<(state: AuthState) => void>()

  private async emit() {
    const state = await this.getAuthState()
    for (const fn of this.listeners) fn(state)
  }

  subscribe(fn: (state: AuthState) => void): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  async getAuthState(): Promise<AuthState> {
    if (this.isQrActive) {
      return {
        status: 'requires_qr',
        qrCodeUrl: 'tg://login?token=fake-token-12345',
      }
    }
    return {
      status: this.status,
      phoneNumber: this.phoneNumber,
    }
  }

  async sendCode(phoneNumber: string): Promise<AuthState> {
    // Reset QR status
    this.isQrActive = false

    // Simulate formatting check
    if (!phoneNumber.startsWith('+')) {
      return {
        status: 'unauthenticated',
        error: 'Phone number must start with + followed by country code',
      }
    }

    this.phoneNumber = phoneNumber
    this.status = 'requires_code'
    await this.emit()
    return this.getAuthState()
  }

  async submitCode(code: string): Promise<AuthState> {
    if (this.status !== 'requires_code') {
      return {
        status: this.status,
        error: 'No active code request found',
      }
    }

    if (code === '00000') {
      // Simulate 2FA requirements for code 00000
      this.status = 'requires_password'
    } else if (code === '11111') {
      // Correct verification code, authenticate directly
      this.status = 'authenticated'
    } else {
      return {
        status: 'requires_code',
        phoneNumber: this.phoneNumber,
        error: 'Invalid verification code',
      }
    }
    await this.emit()
    return this.getAuthState()
  }

  async submitPassword(password: string): Promise<AuthState> {
    if (this.status !== 'requires_password') {
      return {
        status: this.status,
        error: 'No active password challenge found',
      }
    }

    if (password === 'correct-password') {
      this.status = 'authenticated'
    } else {
      return {
        status: 'requires_password',
        phoneNumber: this.phoneNumber,
        error: 'Incorrect 2FA password',
      }
    }
    await this.emit()
    return this.getAuthState()
  }

  async startQrLogin(): Promise<AuthState> {
    this.isQrActive = true
    this.phoneNumber = undefined
    this.status = 'requires_qr'
    await this.emit()
    return this.getAuthState()
  }

  async logout(): Promise<void> {
    this.status = 'unauthenticated'
    this.phoneNumber = undefined
    this.isQrActive = false
    await this.emit()
  }

  // Helper to force mock states during tests
  setMockStatus(status: AuthState['status']) {
    this.status = status
  }
}
