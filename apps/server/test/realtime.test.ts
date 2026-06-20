import { describe, expect, it, beforeEach } from 'vitest'
import app, { messageProvider, realtimeBus, telegramAdapter } from '../src/app'

async function signIn() {
  await telegramAdapter.sendCode('+141****0199')
  await telegramAdapter.submitCode('11111')
}

describe('realtime bus', () => {
  beforeEach(async () => {
    await telegramAdapter.logout()
  })

  it('subscribers receive message.new events when messages are sent', async () => {
    await signIn()
    const events: { type: string; chatId?: string }[] = []
    const unsub = realtimeBus.subscribe((e) => {
      if (e.type === 'message.new') events.push({ type: e.type, chatId: e.chatId })
    })

    await messageProvider.sendMessage({
      chatId: 'alice',
      text: 'Hi',
      clientOperationId: 'op-realtime-123',
    })

    expect(events.length).toBeGreaterThan(0)
    expect(events.some((e) => e.type === 'message.new' && e.chatId === 'alice')).toBe(true)

    unsub()
  })

  it('stops delivering events after unsubscribe', async () => {
    await signIn()
    const events: string[] = []
    const unsub = realtimeBus.subscribe((e) => events.push(e.type))

    await messageProvider.sendMessage({
      chatId: 'alice',
      text: 'first',
      clientOperationId: 'op-realtime-001',
    })
    expect(events.length).toBe(1)

    unsub()

    await messageProvider.sendMessage({
      chatId: 'alice',
      text: 'second',
      clientOperationId: 'op-realtime-002',
    })
    expect(events.length).toBe(1) // unchanged after unsubscribe
  })

  it('SSE endpoint requires auth and streams events', async () => {
    // Unauthenticated: 401
    const unauth = await app.request('/api/realtime/events')
    expect(unauth.status).toBe(401)

    // Authenticated: 200 with text/event-stream
    await signIn()
    const controller = new AbortController()
    const res = await app.request('/api/realtime/events', { signal: controller.signal })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/event-stream')

    // Tear down immediately
    controller.abort()
  })

  it('bus supports multiple concurrent subscribers', async () => {
    await signIn()
    let a = 0
    let b = 0
    const ua = realtimeBus.subscribe(() => a++)
    const ub = realtimeBus.subscribe(() => b++)

    await messageProvider.sendMessage({
      chatId: 'alice',
      text: 'broadcast',
      clientOperationId: 'op-realtime-999',
    })

    expect(a).toBeGreaterThanOrEqual(1)
    expect(b).toBeGreaterThanOrEqual(1)

    ua()
    ub()
  })
})
