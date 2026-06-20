import { demoSendSchema } from '@telewa/contracts'
import { Hono } from 'hono'
import type { Context } from 'hono'
import { cors } from 'hono/cors'
import { FakeTelegramAdapter } from './adapters/fake-telegram'
import { FixtureDialogProvider } from './adapters/dialogs'
import { InMemoryMessageProvider } from './adapters/messages'
import { createAuthRouter } from './routes/auth'
import { createDialogRouter } from './routes/dialogs'
import { createMessagesRouter } from './routes/messages'
import { createMediaRouter, InMemoryMediaStore } from './routes/media'
import { RealtimeBus } from './realtime/bus'
import { createRealtimeRouter } from './routes/realtime'

export type Bindings = { Variables: { requestId: string } }
export const app = new Hono<Bindings>()

export const telegramAdapter = new FakeTelegramAdapter()
export const dialogProvider = new FixtureDialogProvider()
export const messageProvider = new InMemoryMessageProvider()
export const mediaStore = new InMemoryMediaStore()
export const realtimeBus = new RealtimeBus()

const isAuthenticated = async () =>
  (await telegramAdapter.getAuthState()).status === 'authenticated'

// Keep providers in sync with the auth state so messaging requires sign-in.
telegramAdapter.subscribe((state) => {
  dialogProvider.setAuthState(state.status)
  messageProvider.setAuthenticated(state.status === 'authenticated')
})

// Broadcast every new message to realtime subscribers.
messageProvider.setMessageListener((message) => {
  realtimeBus.publish({ type: 'message.new', chatId: message.chatId, message })
})

app.use('*', async (c, next) => {
  const requestId = c.req.header('x-request-id')?.slice(0, 128) || crypto.randomUUID()
  c.set('requestId', requestId)
  c.header('x-request-id', requestId)
  await next()
})
app.use('/api/*', cors({ origin: ['http://localhost:5173'], credentials: true }))

app.route('/api/auth', createAuthRouter(telegramAdapter))
app.route('/api/dialogs', createDialogRouter(dialogProvider, isAuthenticated))
app.route('/api/messages', createMessagesRouter(messageProvider, isAuthenticated))
app.route('/api/media', createMediaRouter(mediaStore, isAuthenticated))
app.route('/api/realtime', createRealtimeRouter(realtimeBus, isAuthenticated))

const ok = <T>(c: Context<Bindings>, data: T, status: 200 | 201 = 200) =>
  c.json({ success: true as const, data, meta: { requestId: c.get('requestId') } }, status)

app.get('/health/live', (c) => ok(c, { status: 'live', timestamp: new Date().toISOString() }))
app.get('/health/ready', (c) =>
  ok(c, {
    status: 'ready',
    database: 'phase-1-pending',
    telegram: 'not-configured',
    ui: 'integrated',
    demoMode: true,
  }),
)
app.get('/api/version', (c) =>
  ok(c, {
    name: 'telegram-wa-web',
    version: '0.2.0',
    phase: 'Phase 0 — UI integrated foundation',
    demoMode: true,
    uiIntegration: 'uploaded-whatsapp-inspired-design' as const,
  }),
)
app.get('/api/project-state', (c) =>
  ok(c, {
    activePhase: 'Phase 0 — UI integrated foundation',
    status: 'validated starter with uploaded UI/UX integrated',
    uiStatus: 'The uploaded onboarding and messenger design is now the primary frontend.',
    implemented: [
      'Uploaded UI/UX moved into apps/web',
      'Hono API and health foundation',
      'Shared runtime contracts',
      'Frontend API client and server connectivity indicator',
      'Server-acknowledged demo message send',
      'CI, Docker, PRD, AGENT.md, project state',
    ],
    mocked: [
      'Telegram authentication',
      'Telegram dialogs/messages/media',
      'SQLite encrypted session persistence',
      'Telegram-native read and delivery states',
    ],
    nextTask:
      'Implement Phase 1 auth state machine and encrypted SQLite session storage behind the existing onboarding UI.',
  }),
)
app.post('/api/demo/messages', async (c) => {
  const parsed = demoSendSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) {
    return c.json(
      {
        success: false as const,
        error: {
          code: 'VALIDATION_MESSAGE_INVALID',
          message: 'A valid message is required.',
          retryable: false,
        },
        meta: { requestId: c.get('requestId') },
      },
      422,
    )
  }
  return c.json(
    {
      success: true as const,
      data: {
        id: `demo-${crypto.randomUUID()}`,
        chatId: parsed.data.chatId,
        clientOperationId: parsed.data.clientOperationId,
        acceptedAt: new Date().toISOString(),
        status: 'sent' as const,
      },
      meta: { requestId: c.get('requestId') },
    },
    201,
  )
})

app.onError((_error, c) =>
  c.json(
    {
      success: false as const,
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.', retryable: false },
      meta: { requestId: c.get('requestId') },
    },
    500,
  ),
)

export default app
