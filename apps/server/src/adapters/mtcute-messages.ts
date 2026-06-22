import type { Message, SendMessageInput } from '@telewa/contracts'
import type { MtcuteClientSurface, MtcuteMessage } from './mtcute-dialogs'

export type { MtcuteClientSurface, MtcuteMessage, MtcuteUser } from './mtcute-dialogs'

/**
 * Real-Telegram message provider backed by mtcute.
 *
 * Adapter for the routes layer's MessageProvider contract. Maps
 * mtcute's rich Message objects onto the project's zod-derived
 * schema (`@telewa/contracts`).
 *
 * Auth state is owned by the surrounding `MtcuteTelegramAdapter`; this
 * provider is only invoked when the user is authenticated (the routes
 * gate on it).
 */
export class MtcuteMessageProvider {
  constructor(private readonly client: MtcuteClientSurface) {}

  // MessageProvider contract surface:
  //   setAuthenticated, setMessageListener — the surrounding wiring
  //   pushes auth state and pushes new-message events. This provider
  //   doesn't subscribe to mtcute's update handler (that's Story 7).
  // For now these are no-ops; Story 7 will wire them.

  setAuthenticated(_value: boolean): void {
    /* no-op — routes gate on auth; Story 7 will subscribe to updates */
  }

  setMessageListener(_fn: (msg: Message) => void): void {
    /* no-op — Story 7 (UpdateHandler → RealtimeRouter) */
  }

  async getHistory(
    chatId: string,
    options?: { limit?: number; cursor?: string | null },
  ): Promise<{ messages: Message[]; cursor: string | null; hasMore: boolean }> {
    const peer = parseChatId(chatId)
    if (peer === null) return { messages: [], cursor: null, hasMore: false }

    const limit = options?.limit ?? 50
    const offsetId = options?.cursor ? Number(options.cursor) : undefined

    const fetched = await this.client.getHistory(peer, {
      limit,
      ...(offsetId && Number.isFinite(offsetId) ? { offsetId } : {}),
    })

    const messages = fetched.map(mapMessage).filter(isMessage)
    const last = messages[messages.length - 1]
    // Telegram's API returns messages newest-first when offsetId is used.
    // We return what Telegram gave us (newest-first); the cursor points at
    // the oldest returned ID so the next page loads messages before it.
    const cursor = messages.length === limit && last ? last.id : null
    const hasMore = messages.length === limit
    return { messages, cursor, hasMore }
  }

  async sendMessage(input: SendMessageInput): Promise<Message> {
    const peer = parseChatId(input.chatId)
    if (peer === null) {
      const err = new Error(`Invalid chatId: ${input.chatId}`)
      ;(err as Error & { code?: string }).code = 'INVALID_CHAT_ID'
      throw err
    }

    const mt = await this.client.sendText(peer, input.text, {
      ...(input.replyTo ? { replyTo: Number(input.replyTo) } : {}),
    })
    const mapped = mapMessage(mt)
    if (!mapped) {
      const err = new Error('sendMessage returned an empty message')
      ;(err as Error & { code?: string }).code = 'SEND_FAILED'
      throw err
    }
    return mapped
  }

  async markRead(chatId: string): Promise<void> {
    const peer = parseChatId(chatId)
    if (peer === null) return
    await this.client.readHistory(peer)
  }

  async searchMessages(query: string): Promise<Message[]> {
    const cleanQ = query.trim()
    if (!cleanQ) return []
    const found = await this.client.searchGlobal({ q: cleanQ, limit: 50 })
    return found.map(mapMessage).filter(isMessage)
  }
}

/* ------------------------------------------------------------------ */
/* Mapping helpers                                                     */
/* ------------------------------------------------------------------ */

function mapMessage(mt: MtcuteMessage): Message | null {
  const text = mt.text?.trim() ?? ''
  if (!text) return null
  const kind: Message['kind'] = 'text'
  const status: Message['status'] = mt.isOutgoing ? 'sent' : 'delivered'
  const msg: Message = {
    id: String(mt.id),
    chatId: String(mt.chatId),
    senderId: String(mt.sender.id),
    outbox: mt.isOutgoing,
    text,
    sentAt: mt.date.toISOString(),
    status,
    kind,
  }
  return msg
}

function isMessage(m: Message | null): m is Message {
  return m !== null
}

function parseChatId(chatId: string): number | null {
  const n = Number(chatId)
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}
