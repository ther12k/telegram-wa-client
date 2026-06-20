import { describe, expect, it, beforeEach } from 'vitest'
import app, { dialogProvider, telegramAdapter } from '../src/app'

describe('dialogs API', () => {
  beforeEach(async () => {
    await telegramAdapter.logout()
    dialogProvider.setAuthState('unauthenticated')
  })

  it('rejects unauthenticated requests with 401', async () => {
    const response = await app.request('/api/dialogs')
    const body = await response.json()
    expect(response.status).toBe(401)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('AUTH_REQUIRED')
  })

  it('returns dialog list once authenticated', async () => {
    // Authenticate via the fake adapter
    await telegramAdapter.sendCode('+141****0199')
    await telegramAdapter.submitCode('11111')
    dialogProvider.setAuthState('authenticated')

    const response = await app.request('/api/dialogs')
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.dialogs.length).toBeGreaterThan(0)
    expect(body.data.total).toBe(body.data.dialogs.length)
    expect(body.data.currentUser).toEqual({ id: 'me', title: 'You', initials: 'YO' })

    const ids = body.data.dialogs.map((d: { id: string }) => d.id)
    expect(ids).toContain('alice')
    expect(ids).toContain('design-team')
    expect(ids).toContain('teletalk-updates')
  })

  it('dialogs contain last message + peer metadata', async () => {
    await telegramAdapter.sendCode('+141****0199')
    await telegramAdapter.submitCode('11111')
    dialogProvider.setAuthState('authenticated')

    const response = await app.request('/api/dialogs')
    const body = await response.json()
    const alice = body.data.dialogs.find((d: { id: string }) => d.id === 'alice')
    expect(alice).toBeDefined()
    expect(alice.peer.title).toBe('Alice Chen')
    expect(alice.peer.initials).toBe('AC')
    expect(alice.lastMessage.text).toContain('See you tomorrow')
    expect(alice.unread).toBe(2)
    expect(alice.pinned).toBe(true)
  })

  it('updates a dialog via PATCH', async () => {
    await telegramAdapter.sendCode('+141****0199')
    await telegramAdapter.submitCode('11111')
    dialogProvider.setAuthState('authenticated')

    const response = await app.request('/api/dialogs/alice', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pinned: false, unread: 0, archived: true }),
    })
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body.data.id).toBe('alice')
    expect(body.data.pinned).toBe(false)
    expect(body.data.unread).toBe(0)
    expect(body.data.archived).toBe(true)
  })

  it('deletes a dialog via DELETE', async () => {
    await telegramAdapter.sendCode('+141****0199')
    await telegramAdapter.submitCode('11111')
    dialogProvider.setAuthState('authenticated')

    const response = await app.request('/api/dialogs/alice', {
      method: 'DELETE',
    })
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body.data.deleted).toBe(true)

    // Verify it is no longer in list
    const check = await app.request('/api/dialogs')
    const checkBody = await check.json()
    const ids = checkBody.data.dialogs.map((d: { id: string }) => d.id)
    expect(ids).not.toContain('alice')
  })
})
