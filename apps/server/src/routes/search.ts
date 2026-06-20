import { Hono } from 'hono'
import type { DialogProvider } from '../adapters/dialogs'
import type { MessageProvider } from '../adapters/messages'
import { dialogSchema, messageSchema } from '@telewa/contracts'
import { z } from 'zod'

const searchResultSchema = z.object({
  dialogs: z.array(dialogSchema),
  messages: z.array(messageSchema),
})

export type SearchResult = z.infer<typeof searchResultSchema>

export function createSearchRouter(
  dialogs: DialogProvider,
  messages: MessageProvider,
  isAuthenticated: () => Promise<boolean>,
) {
  const router = new Hono<{ Variables: { requestId: string } }>()

  router.get('/', async (c) => {
    if (!(await isAuthenticated())) {
      return c.json(
        {
          success: false as const,
          error: { code: 'AUTH_REQUIRED', message: 'Sign in to search.', retryable: false },
          meta: { requestId: c.get('requestId') },
        },
        401,
      )
    }

    const q = c.req.query('q') || ''
    const cleanQ = q.toLowerCase().trim()

    if (!cleanQ) {
      return c.json({
        success: true as const,
        data: { dialogs: [], messages: [] },
        meta: { requestId: c.get('requestId') },
      })
    }

    // 1. Get all dialogs & filter by title, about, initials
    const dialogList = await dialogs.listDialogs()
    const matchedDialogs = dialogList.dialogs.filter((d) => {
      return (
        d.peer.title.toLowerCase().includes(cleanQ) ||
        (d.peer.about && d.peer.about.toLowerCase().includes(cleanQ)) ||
        d.peer.initials.toLowerCase().includes(cleanQ)
      )
    })

    // 2. Search message history
    const matchedMessages = await messages.searchMessages(cleanQ)

    const payload = {
      dialogs: matchedDialogs,
      messages: matchedMessages,
    }

    const validated = searchResultSchema.parse(payload)

    return c.json({
      success: true as const,
      data: validated,
      meta: { requestId: c.get('requestId') },
    })
  })

  return router
}
