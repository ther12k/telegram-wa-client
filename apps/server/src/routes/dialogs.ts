import { Hono } from 'hono'
import { dialogListSchema } from '@telewa/contracts'
import type { DialogProvider } from '../adapters/dialogs'
import { ok, fail } from './response'

export function createDialogRouter(
  provider: DialogProvider,
  isAuthenticated: () => Promise<boolean>,
) {
  const router = new Hono<{ Variables: { requestId: string } }>()

  router.get('/', async (c) => {
    if (!(await isAuthenticated()))
      return fail(c, 'AUTH_REQUIRED', 'Sign in to view your chats.', 401)

    const user = await provider.getCurrentUser()
    const list = await provider.listDialogs()

    const validated = dialogListSchema.safeParse(list)
    if (!validated.success)
      return fail(c, 'INTERNAL_ERROR', 'Dialog provider returned malformed data.', 500)

    return ok(c, { ...validated.data, currentUser: user })
  })

  router.patch('/:chatId', async (c) => {
    if (!(await isAuthenticated())) return fail(c, 'AUTH_REQUIRED', 'Sign in to update chats.', 401)

    const chatId = c.req.param('chatId')
    let body: Record<string, unknown>
    try {
      body = (await c.req.json()) as Record<string, unknown>
    } catch {
      return fail(c, 'INVALID_JSON', 'Request body must be valid JSON.', 400)
    }
    const updated = await provider.updateDialog(chatId, body)
    if (!updated) return fail(c, 'CHAT_NOT_FOUND', 'Chat not found.', 404)
    return ok(c, updated)
  })

  router.delete('/:chatId', async (c) => {
    if (!(await isAuthenticated())) return fail(c, 'AUTH_REQUIRED', 'Sign in to delete chats.', 401)

    const chatId = c.req.param('chatId')
    const success = await provider.deleteDialog(chatId)
    if (!success) return fail(c, 'CHAT_NOT_FOUND', 'Chat not found.', 404)
    return ok(c, { chatId, deleted: true })
  })

  return router
}
