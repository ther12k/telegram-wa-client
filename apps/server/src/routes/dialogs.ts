import { Hono } from 'hono'
import { dialogListSchema } from '@telewa/contracts'
import type { DialogProvider } from '../adapters/dialogs'

export function createDialogRouter(
  provider: DialogProvider,
  isAuthenticated: () => Promise<boolean>,
) {
  const router = new Hono<{ Variables: { requestId: string } }>()

  // GET /api/dialogs — list chat list
  router.get('/', async (c) => {
    if (!(await isAuthenticated())) {
      return c.json(
        {
          success: false as const,
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Sign in to view your chats.',
            retryable: false,
          },
          meta: { requestId: c.get('requestId') },
        },
        401,
      )
    }

    const user = await provider.getCurrentUser()
    const list = await provider.listDialogs()

    // Always validate to enforce contract at the boundary
    const validated = dialogListSchema.safeParse(list)
    if (!validated.success) {
      return c.json(
        {
          success: false as const,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Dialog provider returned malformed data.',
            retryable: false,
          },
          meta: { requestId: c.get('requestId') },
        },
        500,
      )
    }

    return c.json({
      success: true as const,
      data: { ...validated.data, currentUser: user },
      meta: { requestId: c.get('requestId') },
    })
  })

  // PATCH /api/dialogs/:chatId — mutate dialog state (pin, archive, mute, read status)
  router.patch('/:chatId', async (c) => {
    if (!(await isAuthenticated())) {
      return c.json(
        {
          success: false as const,
          error: { code: 'AUTH_REQUIRED', message: 'Sign in to update chats.', retryable: false },
          meta: { requestId: c.get('requestId') },
        },
        401,
      )
    }

    const chatId = c.req.param('chatId')
    const body = await c.req.json().catch(() => ({}))
    const updated = await provider.updateDialog(chatId, body)

    if (!updated) {
      return c.json(
        {
          success: false as const,
          error: { code: 'CHAT_NOT_FOUND', message: 'Chat not found.', retryable: false },
          meta: { requestId: c.get('requestId') },
        },
        404,
      )
    }

    return c.json({
      success: true as const,
      data: updated,
      meta: { requestId: c.get('requestId') },
    })
  })

  // DELETE /api/dialogs/:chatId — delete/remove dialog
  router.delete('/:chatId', async (c) => {
    if (!(await isAuthenticated())) {
      return c.json(
        {
          success: false as const,
          error: { code: 'AUTH_REQUIRED', message: 'Sign in to delete chats.', retryable: false },
          meta: { requestId: c.get('requestId') },
        },
        401,
      )
    }

    const chatId = c.req.param('chatId')
    const success = await provider.deleteDialog(chatId)

    if (!success) {
      return c.json(
        {
          success: false as const,
          error: { code: 'CHAT_NOT_FOUND', message: 'Chat not found.', retryable: false },
          meta: { requestId: c.get('requestId') },
        },
        404,
      )
    }

    return c.json({
      success: true as const,
      data: { chatId, deleted: true },
      meta: { requestId: c.get('requestId') },
    })
  })

  return router
}
