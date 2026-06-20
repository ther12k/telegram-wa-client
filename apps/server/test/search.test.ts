import { describe, expect, it, beforeEach } from 'vitest'
import app, { telegramAdapter, messageProvider, dialogProvider } from '../src/app'

async function signIn() {
  await telegramAdapter.sendCode('+141****0199')
  await telegramAdapter.submitCode('11111')
  dialogProvider.setAuthState('authenticated')
  messageProvider.setAuthenticated(true)
}

describe('search API', () => {
  beforeEach(async () => {
    await telegramAdapter.logout()
  })

  it('rejects unauthenticated requests with 401', async () => {
    const res = await app.request('/api/search?q=hello')
    const body = await res.json()
    expect(res.status).toBe(401)
    expect(body.error.code).toBe('AUTH_REQUIRED')
  })

  it('returns empty lists for empty queries', async () => {
    await signIn()
    const res = await app.request('/api/search?q=')
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.dialogs).toEqual([])
    expect(body.data.messages).toEqual([])
  })

  it('searches matches in dialog peers (contacts)', async () => {
    await signIn()
    const res = await app.request('/api/search?q=alice')
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.dialogs.length).toBeGreaterThan(0)
    expect(body.data.dialogs[0].id).toBe('alice')
  })

  it('searches matches in message history', async () => {
    await signIn()
    // Seed a message to search for
    await app.request('/api/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chatId: 'alice',
        text: 'unique keyphrase search test payload',
        clientOperationId: 'op-search-test-seed',
      }),
    })

    const res = await app.request('/api/search?q=keyphrase')
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.messages.length).toBeGreaterThan(0)
    expect(body.data.messages[0].text).toContain('unique keyphrase')
  })
})
