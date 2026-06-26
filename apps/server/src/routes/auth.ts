import { Hono } from 'hono'
import { sendCodeSchema, submitCodeSchema, submitPasswordSchema } from '@telewa/contracts'
import type { TelegramAdapter } from '../adapters/telegram'
import { ok, fail, validationError } from './response'

export function createAuthRouter(adapter: TelegramAdapter) {
  const router = new Hono<{ Variables: { requestId: string } }>()

  router.get('/state', async (c) => {
    const state = await adapter.getAuthState()
    return ok(c, state)
  })

  router.post('/phone/start', async (c) => {
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return fail(c, 'INVALID_JSON', 'Request body must be valid JSON.', 400)
    }
    const parsed = sendCodeSchema.safeParse(body)
    if (!parsed.success) {
      return validationError(c, 'A valid phone number is required.')
    }
    const state = await adapter.sendCode(parsed.data.phone)
    if (state.error) return fail(c, 'AUTH_ERROR', state.error, 400, true)
    return ok(c, state)
  })

  router.post('/code/submit', async (c) => {
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return fail(c, 'INVALID_JSON', 'Request body must be valid JSON.', 400)
    }
    const parsed = submitCodeSchema.safeParse(body)
    if (!parsed.success) {
      return validationError(c, 'A valid verification code is required.')
    }
    const state = await adapter.submitCode(parsed.data.code)
    if (state.error) return fail(c, 'AUTH_ERROR', state.error, 400, true)
    return ok(c, state)
  })

  router.post('/password/submit', async (c) => {
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return fail(c, 'INVALID_JSON', 'Request body must be valid JSON.', 400)
    }
    const parsed = submitPasswordSchema.safeParse(body)
    if (!parsed.success) {
      return validationError(c, 'A valid password is required.')
    }
    const state = await adapter.submitPassword(parsed.data.password)
    if (state.error) return fail(c, 'AUTH_ERROR', state.error, 400, true)
    return ok(c, state)
  })

  router.post('/qr/start', async (c) => {
    const state = await adapter.startQrLogin()
    if (state.error) return fail(c, 'QR_ERROR', state.error, 400, true)
    return ok(c, state)
  })

  router.post('/logout', async (c) => {
    await adapter.logout()
    return ok(c, { status: 'unauthenticated' })
  })

  return router
}
