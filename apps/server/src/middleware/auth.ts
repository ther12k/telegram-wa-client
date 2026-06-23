import type { Context, Next } from 'hono'

/**
 * Bearer token auth middleware per ADR 0001.
 *
 * Reads `Authorization: Bearer ***` header, compares against AUTH_TOKEN env
 * var using constant-time equality, returns 401 on missing/invalid token.
 *
 * Public routes: `/health/*`, static SPA assets.
 * Protected routes: all `/api/*` and `/events`.
 *
 * Token delivery: SPA prompts on first load, stores in sessionStorage, sends
 * in `Authorization` header. For `/events` (EventSource API limitation), the
 * token is passed as a `?token=` query parameter and validated here.
 */
export function requireAuth() {
  return async (c: Context, next: Next) => {
    const token = c.env.AUTH_TOKEN ?? process.env.AUTH_TOKEN

    if (!token) {
      // If AUTH_TOKEN is not configured, the endpoint is public.
      // This allows local development without the env var set.
      // (To enforce auth in production, set the env var.)
      return next()
    }

    // Extract token from Authorization header or ?token= query param (for /events)
    const authHeader = c.req.header('Authorization')
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    const queryToken = c.req.query('token')
    const providedToken = bearerToken ?? queryToken ?? null

    if (!providedToken) {
      return c.json({ success: false as const, error: { code: 'UNAUTHORIZED', message: 'Missing auth token' } }, 401)
    }

    // Constant-time compare to prevent timing attacks
    if (!constantTimeEqual(providedToken, token)) {
      return c.json({ success: false as const, error: { code: 'UNAUTHORIZED', message: 'Invalid auth token' } }, 401)
    }

    return next()
  }
}

/**
 * Constant-time string comparison for tokens.
 * Prevents timing attacks on auth token validation.
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false

  let result = 0
  for (let i = 0; i < a.length; i++) {
    // eslint-disable-next-line no-bitwise
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return result === 0
}
