import { describe, expect, it, vi } from 'vitest'
import {
  type MtcuteClientSurface,
  type MtcuteMessage,
  MtcuteMessageProvider,
  type MtcuteUser,
} from '../src/adapters/mtcute-messages'

/* ------------------------------------------------------------------ */
/* Fake client                                                         */
/* ------------------------------------------------------------------ */

class FakeMtcuteClient implements MtcuteClientSurface {
  history: Record<string, MtcuteMessage[]> = {}
  sentText: Array<{ peer: number; text: string; replyTo?: number }> = []
  reads: number[] = []
  searchResults: MtcuteMessage[] = []

  async getMe(): Promise<MtcuteUser> {
    throw new Error('not used')
  }
  async *iterDialogs() {
    /* no-op */
  }
  async getHistory(
    chatId: number,
    _params?: { limit?: number; offsetId?: number },
  ): Promise<MtcuteMessage[]> {
    return this.history[String(chatId)] ?? []
  }
  async sendText(
    peer: number,
    text: string,
    params?: { replyTo?: number },
  ): Promise<MtcuteMessage> {
    this.sentText.push({ peer, text, ...(params?.replyTo ? { replyTo: params.replyTo } : {}) })
    return {
      id: 1001,
      date: new Date('2026-06-22T06:00:00Z'),
      isOutgoing: true,
      text,
      sender: { id: 999 },
      chatId: peer,
    }
  }
  async readHistory(peer: number): Promise<void> {
    this.reads.push(peer)
  }
  async searchGlobal(params: { q: string; limit?: number }): Promise<MtcuteMessage[]> {
    return this.searchResults.filter((m) => m.text.toLowerCase().includes(params.q.toLowerCase()))
  }
  async searchMessages(): Promise<MtcuteMessage[]> {
    return []
  }
  async deleteHistory(): Promise<void> {
    /* no-op */
  }
  async archiveChats(): Promise<void> {
    /* no-op */
  }
  async markChatUnread(): Promise<void> {
    /* no-op */
  }
  async resolvePeer(peer: number): Promise<{ _: 'inputPeerUser'; user_id: number }> {
    return { _: 'inputPeerUser', user_id: peer }
  }
  async call<T = unknown>(_method: string, _params: Record<string, unknown>): Promise<T> {
    return undefined as T
  }
}

function msg(over: Partial<MtcuteMessage>): MtcuteMessage {
  return {
    id: 1,
    date: new Date('2026-06-22T05:00:00Z'),
    isOutgoing: false,
    text: 'hello',
    sender: { id: 50 },
    chatId: 100,
    ...over,
  }
}

/* ------------------------------------------------------------------ */
/* Tests                                                               */
/* ------------------------------------------------------------------ */

describe('MtcuteMessageProvider', () => {
  describe('getHistory', () => {
    it('returns empty for non-numeric chatId', async () => {
      const client = new FakeMtcuteClient()
      const p = new MtcuteMessageProvider(() => client)
      const result = await p.getHistory('not-a-number')
      expect(result).toEqual({ messages: [], cursor: null, hasMore: false })
    })

    it('maps history messages to the Message schema', async () => {
      const client = new FakeMtcuteClient()
      client.history['100'] = [
        msg({ id: 11, text: 'hi there', sender: { id: 50 }, isOutgoing: false, chatId: 100 }),
        msg({ id: 12, text: 'you there?', sender: { id: 50 }, isOutgoing: true, chatId: 100 }),
      ]
      const p = new MtcuteMessageProvider(() => client)
      const result = await p.getHistory('100', { limit: 50 })
      expect(result.messages).toHaveLength(2)
      expect(result.messages[0]).toMatchObject({
        id: '11',
        chatId: '100',
        senderId: '50',
        outbox: false,
        text: 'hi there',
        kind: 'text',
        status: 'delivered',
      })
      expect(result.messages[1]?.status).toBe('sent')
    })

    it('filters out empty-text messages', async () => {
      const client = new FakeMtcuteClient()
      client.history['100'] = [msg({ id: 1, text: 'visible' }), msg({ id: 2, text: '' })]
      const p = new MtcuteMessageProvider(() => client)
      const result = await p.getHistory('100')
      expect(result.messages).toHaveLength(1)
      expect(result.messages[0]?.text).toBe('visible')
    })

    it('passes cursor as offsetId when present', async () => {
      const client = new FakeMtcuteClient()
      const spy = vi.spyOn(client, 'getHistory')
      const p = new MtcuteMessageProvider(() => client)
      await p.getHistory('100', { cursor: '500' })
      expect(spy).toHaveBeenCalledWith(100, { limit: 50, offsetId: 500 })
    })

    it('returns hasMore=true when result is at limit', async () => {
      const client = new FakeMtcuteClient()
      client.history['100'] = Array.from({ length: 50 }, (_, i) =>
        msg({ id: i + 1, text: `m${i}` }),
      )
      const p = new MtcuteMessageProvider(() => client)
      const result = await p.getHistory('100', { limit: 50 })
      expect(result.hasMore).toBe(true)
      expect(result.cursor).toBe('50')
    })

    it('returns hasMore=false when result is under limit', async () => {
      const client = new FakeMtcuteClient()
      client.history['100'] = [msg({ id: 1, text: 'only one' })]
      const p = new MtcuteMessageProvider(() => client)
      const result = await p.getHistory('100', { limit: 50 })
      expect(result.hasMore).toBe(false)
      expect(result.cursor).toBeNull()
    })
  })

  describe('sendMessage', () => {
    it('sends text via client.sendText', async () => {
      const client = new FakeMtcuteClient()
      const spy = vi.spyOn(client, 'sendText')
      const p = new MtcuteMessageProvider(() => client)
      const result = await p.sendMessage({
        chatId: '100',
        text: 'hello world',
        clientOperationId: 'op-12345678',
      })
      expect(spy).toHaveBeenCalledWith(100, 'hello world', {})
      expect(result.text).toBe('hello world')
      expect(result.outbox).toBe(true)
      expect(result.senderId).toBe('999')
    })

    it('passes replyTo when provided', async () => {
      const client = new FakeMtcuteClient()
      const p = new MtcuteMessageProvider(() => client)
      await p.sendMessage({
        chatId: '100',
        text: 'reply',
        clientOperationId: 'op-12345678',
        replyTo: '500',
      })
      expect(client.sentText[0]?.replyTo).toBe(500)
    })

    it('throws INVALID_CHAT_ID for non-numeric chatId', async () => {
      const client = new FakeMtcuteClient()
      const p = new MtcuteMessageProvider(() => client)
      await expect(
        p.sendMessage({
          chatId: 'oops',
          text: 'hi',
          clientOperationId: 'op-12345678',
        }),
      ).rejects.toMatchObject({ code: 'INVALID_CHAT_ID' })
    })
  })

  describe('markRead', () => {
    it('calls readHistory for valid numeric chatId', async () => {
      const client = new FakeMtcuteClient()
      const spy = vi.spyOn(client, 'readHistory')
      const p = new MtcuteMessageProvider(() => client)
      await p.markRead('100')
      expect(spy).toHaveBeenCalledWith(100)
    })

    it('is a no-op for non-numeric chatId', async () => {
      const client = new FakeMtcuteClient()
      const spy = vi.spyOn(client, 'readHistory')
      const p = new MtcuteMessageProvider(() => client)
      await p.markRead('oops')
      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe('searchMessages', () => {
    it('returns empty for empty query', async () => {
      const client = new FakeMtcuteClient()
      const p = new MtcuteMessageProvider(() => client)
      expect(await p.searchMessages('   ')).toEqual([])
    })

    it('filters case-insensitive on text content', async () => {
      const client = new FakeMtcuteClient()
      client.searchResults = [
        msg({ id: 1, text: 'Hello world' }),
        msg({ id: 2, text: 'goodbye' }),
        msg({ id: 3, text: 'say HELLO again' }),
      ]
      const p = new MtcuteMessageProvider(() => client)
      const results = await p.searchMessages('hello')
      expect(results).toHaveLength(2)
      expect(results.map((r) => r.id).sort()).toEqual(['1', '3'])
    })

    it('calls searchGlobal with trimmed query', async () => {
      const client = new FakeMtcuteClient()
      const spy = vi.spyOn(client, 'searchGlobal')
      const p = new MtcuteMessageProvider(() => client)
      await p.searchMessages('  pizza party  ')
      expect(spy).toHaveBeenCalledWith({ q: 'pizza party', limit: 50 })
    })
  })
})
