import { Hono } from 'hono'
import type { DialogProvider } from '../adapters/dialogs'
import type { MessageProvider } from '../adapters/messages'
import { dialogSchema, messageSchema } from '@telewa/contracts'
import { z } from 'zod'
import { ok, fail } from './response'

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
    if (!(await isAuthenticated())) return fail(c, 'AUTH_REQUIRED', 'Sign in to search.', 401)

    const q = c.req.query('q') || ''
    const cleanQ = q.toLowerCase().trim()

    if (!cleanQ) return ok(c, { dialogs: [], messages: [] })

    const dialogList = await dialogs.listDialogs()
    const matchedDialogs = dialogList.dialogs.filter(
      (d) =>
        d.peer.title.toLowerCase().includes(cleanQ) ||
        (d.peer.about && d.peer.about.toLowerCase().includes(cleanQ)) ||
        d.peer.initials.toLowerCase().includes(cleanQ),
    )

    const matchedMessages = await messages.searchMessages(cleanQ)
    const validated = searchResultSchema.parse({
      dialogs: matchedDialogs,
      messages: matchedMessages,
    })

    return ok(c, validated)
  })

  return router
}
