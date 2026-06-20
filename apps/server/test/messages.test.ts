import { describe, expect, it, beforeEach } from 'vitest'
import app, { dialogProvider, messageProvider, telegramAdapter } from '../src/app'

async function signIn() {
  await telegramAdapter.sendCode('+141****0199')
  await telegramAdapter.submitCode('11111')
}

describe('messages API', () => {
  beforeEach(async () => {
    await telegramAdapter.logout()
  })

  it('rejects history fetch when unauthenticated', async () => {
    const res = await app.request('/api/messages/alice')
    const body = await res.json()
    expect(res.status).toBe(401)
    expect(body.error.code).toBe('AUTH_REQUIRED')
  })

  it('returns seeded history after auth', async () => {
    await signIn()
    const res = await app.request('/api/messages/alice')
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.chatId).toBe('alice')
    expect(body.data.messages.length).toBeGreaterThan(0)
    expect(body.data.hasMore).toBe(false)
    const first = body.data.messages[0]
    expect(first.chatId).toBe('alice')
    expect(typeof first.text).toBe('string')
  })

  it('sends a message and returns the persisted record', async () => {
    await signIn()
    const res = await app.request('/api/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chatId: 'alice',
        text: 'Hello world',
        clientOperationId: 'op-test-12345',
      }),
    })
    const body = await res.json()
    expect(res.status).toBe(201)
    expect(body.data.text).toBe('Hello world')
    expect(body.data.outbox).toBe(true)
    expect(body.data.status).toBe('sent')
    expect(body.data.clientOperationId).toBe('op-test-12345')
  })

  it('sends a media message and persists the media metadata', async () => {
    await signIn()
    const res = await app.request('/api/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chatId: 'alice',
        text: '',
        clientOperationId: 'op-media-test-1',
        mediaId: '00000000-0000-0000-0000-000000000001',
        mediaMime: 'image/png',
        mediaName: 'avatar.png',
        mediaSize: 4096,
      }),
    })
    const body = await res.json()
    expect(res.status).toBe(201)
    expect(body.data.kind).toBe('image')
    expect(body.data.mediaId).toBe('00000000-0000-0000-0000-000000000001')
    expect(body.data.mediaMime).toBe('image/png')
    expect(body.data.mediaName).toBe('avatar.png')
    expect(body.data.mediaSize).toBe(4096)
  })

  it('rejects payload without text or mediaId', async () => {
    await signIn()
    const res = await app.request('/api/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chatId: 'alice',
        text: '   ',
        clientOperationId: 'op-blank-media',
      }),
    })
    expect(res.status).toBe(422)
  })

  it('rejects invalid send payloads with 422', async () => {
    await signIn()
    const res = await app.request('/api/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chatId: 'alice', text: '', clientOperationId: 'short' }),
    })
    expect(res.status).toBe(422)
  })

  it('blocks send when not authenticated', async () => {
    const res = await app.request('/api/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chatId: 'alice',
        text: 'no auth',
        clientOperationId: 'op-test-67890',
      }),
    })
    expect(res.status).toBe(401)
  })

  it('marks chat as read', async () => {
    await signIn()
    const res = await app.request('/api/messages/alice/read', { method: 'POST' })
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.marked).toBe(true)
    expect(body.data.chatId).toBe('alice')
  })

  it('keeps dialog provider auth state in sync', async () => {
    const userBefore = await dialogProvider.getCurrentUser()
    expect(userBefore).toBeNull()
    await signIn()
    // After signing in, getCurrentUser should return a real user
    const user = await dialogProvider.getCurrentUser()
    expect(user).toEqual({ id: 'me', title: 'You', initials: 'YO' })
  })

  it('exposes messageProvider authenticated state', () => {
    expect(messageProvider).toBeDefined()
  })
})
