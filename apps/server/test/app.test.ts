import { describe, expect, it } from 'vitest'
import app from '../src/app'

describe('integrated foundation API', () => {
  it('reports UI integration', async () => {
    const response = await app.request('/api/project-state')
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body.data.uiStatus).toContain('primary frontend')
  })

  it('acknowledges a valid demo send', async () => {
    const response = await app.request('/api/demo/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chatId: 'alice',
        text: 'Hello',
        clientOperationId: 'operation-12345',
      }),
    })
    const body = await response.json()
    expect(response.status).toBe(201)
    expect(body.data.status).toBe('sent')
  })

  it('rejects blank demo messages', async () => {
    const response = await app.request('/api/demo/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chatId: 'alice', text: '   ', clientOperationId: 'operation-12345' }),
    })
    expect(response.status).toBe(422)
  })
})
