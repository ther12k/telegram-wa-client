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

  return router
}
