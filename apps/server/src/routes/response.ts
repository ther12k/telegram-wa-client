import type { Context } from 'hono'

export type Bindings = { Variables: { requestId: string } }

export function ok<T>(c: Context<Bindings>, data: T, status: 200 | 201 = 200) {
  return c.json({ success: true as const, data, meta: { requestId: c.get('requestId') } }, status)
}

export function fail(
  c: Context<Bindings>,
  code: string,
  message: string,
  status: 400 | 401 | 404 | 422 | 429 | 500 = 400,
  retryable: boolean = false,
) {
  return c.json(
    {
      success: false as const,
      error: { code, message, retryable },
      meta: { requestId: c.get('requestId') },
    },
    status,
  )
}

export function validationError(c: Context<Bindings>, message: string = 'Invalid input.') {
  return fail(c, 'VALIDATION_ERROR', message, 422)
}

/**
 * Safely parse a JSON request body. Returns null on parse error.
 * Routes should check for null and return 400 before proceeding.
 */
export async function parseJsonBody(c: Context<Bindings>): Promise<unknown> {
  try {
    return await c.req.json()
  } catch {
    return null
  }
}
