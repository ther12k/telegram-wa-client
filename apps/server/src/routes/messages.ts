import { Hono } from 'hono'
import { messageHistorySchema, sendMessageSchema } from '@telewa/contracts'
import type { MessageProvider } from '../adapters/messages'

export function createMessagesRouter(
  provider: MessageProvider,
  isAuthenticated: () => Promise<boolean>,
) {
  const router = new Hono<{ Variables: { requestId: string } }>()

  // GET /api/messages/:chatId — fetch history
  router.get('/:chatId', async (c) => {
    if (!(await isAuthenticated())) {
      return c.json(
        {
          success: false as const,
          error: { code: 'AUTH_REQUIRED', message: 'Sign in to read messages.', retryable: false },
          meta: { requestId: c.get('requestId') },
        },
        401,
      )
    }

    const chatId = c.req.param('chatId')
    if (!chatId) {
      return c.json(
        {
          success: false as const,
          error: {
            code: 'VALIDATION_CHAT_REQUIRED',
            message: 'Chat id is required.',
            retryable: false,
          },
          meta: { requestId: c.get('requestId') },
        },
        422,
      )
    }

    const limitRaw = c.req.query('limit')
    const cursor = c.req.query('cursor')
    const limit = limitRaw ? Math.min(200, Math.max(1, Number(limitRaw) || 50)) : 50

    const result = await provider.getHistory(chatId, { limit, cursor: cursor ?? null })

    const validated = messageHistorySchema.safeParse({
      chatId,
      messages: result.messages,
      cursor: result.cursor,
      hasMore: result.hasMore,
    })
    if (!validated.success) {
      return c.json(
        {
          success: false as const,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Message provider returned malformed data.',
            retryable: false,
          },
          meta: { requestId: c.get('requestId') },
        },
        500,
      )
    }
    return c.json({
      success: true as const,
      data: validated.data,
      meta: { requestId: c.get('requestId') },
    })
  })

  // POST /api/messages — send a text message
  router.post('/', async (c) => {
    if (!(await isAuthenticated())) {
      return c.json(
        {
          success: false as const,
          error: { code: 'AUTH_REQUIRED', message: 'Sign in to send messages.', retryable: false },
          meta: { requestId: c.get('requestId') },
        },
        401,
      )
    }

    const parsed = sendMessageSchema.safeParse(await c.req.json().catch(() => null))
    if (!parsed.success) {
      return c.json(
        {
          success: false as const,
          error: {
            code: 'VALIDATION_MESSAGE_INVALID',
            message: 'A valid chatId, text, and clientOperationId are required.',
            retryable: false,
          },
          meta: { requestId: c.get('requestId') },
        },
        422,
      )
    }

    try {
      const stored = await provider.sendMessage(parsed.data)
      return c.json(
        { success: true as const, data: stored, meta: { requestId: c.get('requestId') } },
        201,
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send message.'
      const code = (err as Error & { code?: string }).code ?? 'SEND_FAILED'
      return c.json(
        {
          success: false as const,
          error: { code, message, retryable: false },
          meta: { requestId: c.get('requestId') },
        },
        500,
      )
    }
  })

  // POST /api/messages/:chatId/read — mark chat as read
  router.post('/:chatId/read', async (c) => {
    if (!(await isAuthenticated())) {
      return c.json(
        {
          success: false as const,
          error: { code: 'AUTH_REQUIRED', message: 'Sign in to mark read.', retryable: false },
          meta: { requestId: c.get('requestId') },
        },
        401,
      )
    }
    const chatId = c.req.param('chatId')
    if (!chatId) {
      return c.json(
        {
          success: false as const,
          error: {
            code: 'VALIDATION_CHAT_REQUIRED',
            message: 'Chat id is required.',
            retryable: false,
          },
          meta: { requestId: c.get('requestId') },
        },
        422,
      )
    }
    await provider.markRead(chatId)
    return c.json({
      success: true as const,
      data: { chatId, marked: true },
      meta: { requestId: c.get('requestId') },
    })
  })

  return router
}
