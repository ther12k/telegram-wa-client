import type { Message, SendMessageInput } from '@telewa/contracts'

export interface MessageProvider {
  /**
   * Returns recent messages for a chat, optionally paginating by cursor.
   */
  getHistory(
    chatId: string,
    options?: { limit?: number; cursor?: string | null },
  ): Promise<{
    messages: Message[]
    cursor: string | null
    hasMore: boolean
  }>

  /**
   * Sends a message and returns the persisted record.
   */
  sendMessage(input: SendMessageInput): Promise<Message>

  /**
   * Marks a chat as fully read.
   */
  markRead(chatId: string): Promise<void>

  /**
   * Search messages matching a query string.
   */
  searchMessages(query: string): Promise<Message[]>
}

const SAMPLE_REPLIES = [
  'Got it 👍',
  'Haha 😂',
  'Sounds great!',
  'Let me check and get back to you.',
  'Thanks for letting me know!',
  'On my way 🏃',
  'Perfect timing!',
  '🙌',
]

/**
 * In-memory fixture message store. Acts as a stand-in for the real Telegram history.
 */
export class InMemoryMessageProvider implements MessageProvider {
  private historyByChat = new Map<string, Message[]>()
  private pendingReplyTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private isAuthenticated = false
  private onNewMessage?: (msg: Message) => void

  setAuthenticated(value: boolean) {
    this.isAuthenticated = value
  }

  setMessageListener(fn: (msg: Message) => void) {
    this.onNewMessage = fn
  }

  private seedHistory(chatId: string): Message[] {
    if (this.historyByChat.has(chatId)) {
      return this.historyByChat.get(chatId)!
    }

    const now = Date.now()
    const base: Message[] = [
      {
        id: `${chatId}-m3`,
        chatId,
        senderId: chatId,
        outbox: false,
        text: 'Hey, did you see the latest mockups?',
        sentAt: new Date(now - 1000 * 60 * 60 * 5).toISOString(),
        status: 'read',
        kind: 'text',
      },
      {
        id: `${chatId}-m2`,
        chatId,
        senderId: 'me',
        outbox: true,
        text: 'Yes! Looking at them now.',
        sentAt: new Date(now - 1000 * 60 * 60 * 4.9).toISOString(),
        status: 'read',
        kind: 'text',
      },
      {
        id: `${chatId}-m1`,
        chatId,
        senderId: chatId,
        outbox: false,
        text: 'Let me know what you think 👀',
        sentAt: new Date(now - 1000 * 60 * 60 * 4.8).toISOString(),
        status: 'read',
        kind: 'text',
      },
    ]

    this.historyByChat.set(chatId, base)
    return base
  }

  async getHistory(chatId: string, options?: { limit?: number; cursor?: string | null }) {
    const all = [...this.seedHistory(chatId)]
    const limit = options?.limit ?? 50

    // Cursor is interpreted as the timestamp lower bound (older messages)
    let startIdx = 0
    if (options?.cursor) {
      const idx = all.findIndex((m) => m.sentAt === options.cursor)
      if (idx >= 0) startIdx = idx + 1
    }

    const slice = all.slice(startIdx, startIdx + limit)
    const hasMore = startIdx + limit < all.length
    const cursor = hasMore ? (all[startIdx + limit - 1]?.sentAt ?? null) : null

    return { messages: slice, cursor, hasMore }
  }

  async sendMessage(input: SendMessageInput): Promise<Message> {
    if (!this.isAuthenticated) {
      const err = new Error('Authentication required to send a message.')
      ;(err as Error & { code?: string }).code = 'AUTH_REQUIRED'
      throw err
    }

    const nowIso = new Date().toISOString()
    const kind: Message['kind'] = input.mediaId
      ? input.mediaMime?.startsWith('image/')
        ? 'image'
        : input.mediaMime?.startsWith('video/')
          ? 'video'
          : input.mediaMime?.startsWith('audio/')
            ? 'voice'
            : 'document'
      : input.replyTo
        ? 'reply'
        : 'text'
    const stored: Message = {
      id: `srv-${crypto.randomUUID()}`,
      chatId: input.chatId,
      senderId: 'me',
      outbox: true,
      text: input.text,
      sentAt: nowIso,
      status: 'sent',
      kind,
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
      clientOperationId: input.clientOperationId,
      ...(input.mediaId ? { mediaId: input.mediaId } : {}),
      ...(input.mediaMime ? { mediaMime: input.mediaMime } : {}),
      ...(input.mediaName ? { mediaName: input.mediaName } : {}),
      ...(input.mediaSize ? { mediaSize: input.mediaSize } : {}),
      ...(input.mediaDuration ? { mediaDuration: input.mediaDuration } : {}),
    }

    const history = this.seedHistory(input.chatId)
    history.push(stored)
    this.onNewMessage?.(stored)

    // Simulate peer reply after a short delay, only for private chats (no deterministic list to choose from)
    if (!this.pendingReplyTimers.has(input.chatId)) {
      const timer = setTimeout(
        () => {
          this.pendingReplyTimers.delete(input.chatId)
          const replyText =
            SAMPLE_REPLIES[Math.floor(Math.random() * SAMPLE_REPLIES.length)] ?? '👍'
          const reply: Message = {
            id: `${input.chatId}-auto-${Date.now()}`,
            chatId: input.chatId,
            senderId: input.chatId,
            outbox: false,
            text: replyText,
            sentAt: new Date().toISOString(),
            status: 'delivered',
            kind: 'text',
          }
          const list = this.seedHistory(input.chatId)
          list.push(reply)
          // Update the last-seen pointer of any pending reads
          const last = list[list.length - 1]
          if (last) {
            this.historyByChat.set(input.chatId, list)
          }
          this.onNewMessage?.(reply)
        },
        1500 + Math.random() * 1500,
      )
      this.pendingReplyTimers.set(input.chatId, timer)
    }

    return stored
  }

  async markRead(chatId: string) {
    const history = this.historyByChat.get(chatId)
    if (!history) return
    const updated = history.map((m) => (m.outbox ? m : { ...m, status: 'read' as const }))
    this.historyByChat.set(chatId, updated)
  }

  async searchMessages(query: string): Promise<Message[]> {
    // Seed history for standard users so search results can find standard items
    const seededChats = ['alice', 'priya', 'mom', 'design-team', 'teletalk-updates']
    for (const id of seededChats) {
      this.seedHistory(id)
    }

    const matches: Message[] = []
    const cleanQ = query.toLowerCase().trim()
    if (!cleanQ) return matches

    for (const [_, list] of this.historyByChat.entries()) {
      for (const m of list) {
        if (m.text && m.text.toLowerCase().includes(cleanQ)) {
          matches.push(m)
        }
      }
    }

    return matches.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
  }
}
