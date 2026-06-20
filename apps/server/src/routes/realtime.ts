import { Hono } from 'hono'
import type { RealtimeEvent } from '@telewa/contracts'
import type { RealtimeBus } from '../realtime/bus'

/**
 * SSE endpoint that streams every realtime event to authenticated clients.
 * Falls back to a plain ping/pong JSON envelope so clients can poll this
 * endpoint as a heartbeat even without an EventSource.
 */
export function createRealtimeRouter(bus: RealtimeBus, isAuthenticated: () => Promise<boolean>) {
  const router = new Hono<{ Variables: { requestId: string } }>()

  router.get('/events', async (c) => {
    if (!(await isAuthenticated())) {
      return c.json(
        {
          success: false as const,
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Sign in to subscribe to realtime events.',
            retryable: false,
          },
          meta: { requestId: c.get('requestId') },
        },
        401,
      )
    }

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder()
        const send = (event: RealtimeEvent) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
          } catch {
            // controller already closed; ignore
          }
        }
        const unsubscribe = bus.subscribe(send)
        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: 'ping', sentAt: new Date().toISOString() })}\n\n`,
              ),
            )
          } catch {
            // ignore
          }
        }, 25000)

        // Close cleanup hook
        const onClose = () => {
          unsubscribe()
          clearInterval(heartbeat)
          try {
            controller.close()
          } catch {
            /* already closed */
          }
        }

        // @ts-expect-error - Bun adds a close hook on the underlying socket
        controller._onClose = onClose
        c.req.raw.signal?.addEventListener('abort', onClose)
      },
    })

    return new Response(stream, {
      headers: {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache, no-transform',
        connection: 'keep-alive',
        'x-request-id': c.get('requestId'),
      },
    })
  })

  return router
}
