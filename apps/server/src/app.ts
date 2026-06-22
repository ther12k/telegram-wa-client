import { demoSendSchema } from '@telewa/contracts'
import { Hono } from 'hono'
import type { Context } from 'hono'
import { cors } from 'hono/cors'
import { FakeTelegramAdapter } from './adapters/fake-telegram'
import { MtcuteTelegramAdapter, sanitizeMtcuteError } from './adapters/mtcute-telegram'
import {
  MtcuteDialogProvider,
  asMtcuteSurface,
  type MtcuteClientSurface,
} from './adapters/mtcute-dialogs'
import { MtcuteMessageProvider } from './adapters/mtcute-messages'
import { FixtureDialogProvider } from './adapters/dialogs'
import { InMemoryMessageProvider } from './adapters/messages'
import { createAuthRouter } from './routes/auth'
import { createDialogRouter } from './routes/dialogs'
import { createMessagesRouter } from './routes/messages'
import { createMediaRouter, InMemoryMediaStore } from './routes/media'
import { createSearchRouter } from './routes/search'
import { RealtimeBus } from './realtime/bus'
import { createRealtimeRouter } from './routes/realtime'
import { rateLimiter, securityHeaders, structuredLogger } from './hardening'

export type Bindings = { Variables: { requestId: string } }
export const app = new Hono<Bindings>()

// Adapter selection: real Telegram if creds are present, fake otherwise.
// Production must have either real creds OR DEMO_MODE=true (explicit opt-in).
const rawApiId = process.env.TELEGRAM_API_ID?.trim() ?? ''
const rawApiHash = process.env.TELEGRAM_API_HASH?.trim() ?? ''
const apiId = Number(rawApiId)
const apiHash = rawApiHash
const hasRealCreds = Number.isFinite(apiId) && apiId > 0 && /^[a-f0-9]{32}$/i.test(apiHash)
const isProduction = process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'production'
const demoMode = process.env.DEMO_MODE === 'true'

// Ops signal: if TELEGRAM_API_ID is set but non-numeric, the validator above
// falls through to fake mode silently. Surface that as a distinct error so
// the misconfiguration doesn't ship to prod unnoticed.
if (rawApiId !== '' && !Number.isFinite(apiId)) {
  console.error(
    `CONFIG ERROR: TELEGRAM_API_ID is set to "${sanitizeMtcuteError(rawApiId)}" but is not a valid positive integer. ` +
      'Falling back to FakeTelegramAdapter. Fix the env var to enable the real adapter.',
  )
}
if (rawApiHash !== '' && !/^[a-f0-9]{32}$/i.test(apiHash)) {
  console.error(
    'CONFIG ERROR: TELEGRAM_API_HASH is set but is not a 32-char hex string. ' +
      'Falling back to FakeTelegramAdapter. Fix the env var to enable the real adapter.',
  )
}

if (isProduction && !hasRealCreds && !demoMode) {
  console.error(
    'FATAL: production startup with no TELEGRAM_API_ID/HASH and no DEMO_MODE. ' +
      'Refusing to run with FakeTelegramAdapter in production. Set DEMO_MODE=true to override.',
  )
  process.exit(1)
}

if (hasRealCreds) {
  console.info(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      event: 'telegram.adapter.selected',
      adapter: 'mtcute',
      apiIdPresent: true,
      apiHashPresent: true,
    }),
  )
} else {
  console.warn(
    'WARNING: RUNNING WITH FAKE TELEGRAM ADAPTER. ' +
      'Any code 11111 logs in as the demo user. ' +
      'Set TELEGRAM_API_ID and TELEGRAM_API_HASH to connect a real account.',
  )
  console.info(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'warn',
      event: 'telegram.adapter.selected',
      adapter: 'fake',
      reason: !hasRealCreds ? 'missing TELEGRAM_API_ID or TELEGRAM_API_HASH' : 'unknown',
    }),
  )
}

export const telegramAdapter = hasRealCreds
  ? (() => {
      try {
        return new MtcuteTelegramAdapter({
          apiId,
          apiHash,
          sessionDbPath: process.env.SESSION_DB_PATH ?? './telewa-session/session.db',
        })
      } catch (err) {
        // If creds are malformed, we already exited above. Reaching here means
        // the validator passed but mtcute failed to initialize. Log and fall back.
        console.error('mtcute adapter init failed (sanitized):', sanitizeMtcuteError(err))
        return new FakeTelegramAdapter()
      }
    })()
  : new FakeTelegramAdapter()
// Provider selection: real Telegram if creds are present, fake otherwise.
// Production must have either real creds OR DEMO_MODE=true (explicit opt-in).
// Mtcute providers take a thunk over telegramAdapter.getClient() so the
// adapter's lazy client lifecycle is transparent (Story 3, round 9 plan).
//
// `telegramAdapter` is typed as the union `MtcuteTelegramAdapter |
// FakeTelegramAdapter` because the hasRealCreds branch falls back to
// FakeTelegramAdapter in the try/catch around construction. We narrow
// with `instanceof` so the call to `getClient()` is type-safe.
const getMtcuteSurface = (): MtcuteClientSurface => {
  if (!(telegramAdapter instanceof MtcuteTelegramAdapter)) {
    throw new Error('getMtcuteSurface called without real credentials — app.ts wiring bug')
  }
  return asMtcuteSurface(telegramAdapter.getClient())
}
export const dialogProvider = hasRealCreds
  ? new MtcuteDialogProvider(getMtcuteSurface)
  : new FixtureDialogProvider()
export const messageProvider = hasRealCreds
  ? new MtcuteMessageProvider(getMtcuteSurface)
  : new InMemoryMessageProvider()
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
app.use('*', securityHeaders())
app.use('*', structuredLogger())
app.use('/api/*', rateLimiter({ windowMs: 60000, maxRequests: 200 }))
app.use('/api/*', cors({ origin: ['http://localhost:5173'], credentials: true }))

app.route('/api/auth', createAuthRouter(telegramAdapter))
app.route('/api/dialogs', createDialogRouter(dialogProvider, isAuthenticated))
app.route('/api/messages', createMessagesRouter(messageProvider, isAuthenticated))
app.route('/api/media', createMediaRouter(mediaStore, isAuthenticated))
app.route('/api/search', createSearchRouter(dialogProvider, messageProvider, isAuthenticated))
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
