import { Hono } from 'hono'
import { sendCodeSchema, submitCodeSchema, submitPasswordSchema } from '@telewa/contracts'
import type { TelegramAdapter } from '../adapters/telegram'

export function createAuthRouter(adapter: TelegramAdapter) {
  const router = new Hono<{ Variables: { requestId: string } }>()

  router.get('/state', async (c) => {
    const state = await adapter.getAuthState()
    return c.json({ success: true as const, data: state, meta: { requestId: c.get('requestId') } })
  })

  router.post('/phone/start', async (c) => {
    const parsed = sendCodeSchema.safeParse(await c.req.json().catch(() => null))
    if (!parsed.success) {
      return c.json(
        {
          success: false as const,
          error: {
            code: 'VALIDATION_PHONE_INVALID',
            message: 'A valid phone number is required.',
            retryable: false,
          },
          meta: { requestId: c.get('requestId') },
        },
        422,
      )
    }

    const state = await adapter.sendCode(parsed.data.phone)
    if (state.error) {
      return c.json(
        {
          success: false as const,
          error: { code: 'AUTH_PHONE_FAILED', message: state.error, retryable: false },
          meta: { requestId: c.get('requestId') },
        },
        400,
      )
    }

    return c.json({ success: true as const, data: state, meta: { requestId: c.get('requestId') } })
  })

  router.post('/code/submit', async (c) => {
    const parsed = submitCodeSchema.safeParse(await c.req.json().catch(() => null))
    if (!parsed.success) {
      return c.json(
        {
          success: false as const,
          error: {
            code: 'VALIDATION_CODE_INVALID',
            message: 'Verification code must be 4-10 digits.',
            retryable: false,
          },
          meta: { requestId: c.get('requestId') },
        },
        422,
      )
    }

    const state = await adapter.submitCode(parsed.data.code)
    if (state.error) {
      return c.json(
        {
          success: false as const,
          error: { code: 'AUTH_CODE_FAILED', message: state.error, retryable: false },
          meta: { requestId: c.get('requestId') },
        },
        400,
      )
    }

    return c.json({ success: true as const, data: state, meta: { requestId: c.get('requestId') } })
  })

  router.post('/password/submit', async (c) => {
    const parsed = submitPasswordSchema.safeParse(await c.req.json().catch(() => null))
    if (!parsed.success) {
      return c.json(
        {
          success: false as const,
          error: {
            code: 'VALIDATION_PASSWORD_INVALID',
            message: 'Password is required.',
            retryable: false,
          },
          meta: { requestId: c.get('requestId') },
        },
        422,
      )
    }

    const state = await adapter.submitPassword(parsed.data.password)
    if (state.error) {
      return c.json(
        {
          success: false as const,
          error: { code: 'AUTH_PASSWORD_FAILED', message: state.error, retryable: false },
          meta: { requestId: c.get('requestId') },
        },
        400,
      )
    }

    return c.json({ success: true as const, data: state, meta: { requestId: c.get('requestId') } })
  })

  router.post('/qr/start', async (c) => {
    const state = await adapter.startQrLogin()
    return c.json({ success: true as const, data: state, meta: { requestId: c.get('requestId') } })
  })

  router.post('/logout', async (c) => {
    await adapter.logout()
    return c.json({
      success: true as const,
      data: { status: 'unauthenticated' },
      meta: { requestId: c.get('requestId') },
    })
  })

  return router
}
