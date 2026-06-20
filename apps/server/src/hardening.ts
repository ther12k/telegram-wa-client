import { secureHeaders } from 'hono/secure-headers'
import type { MiddlewareHandler } from 'hono'

// 1. Structured JSON Logger Middleware
export const structuredLogger = (): MiddlewareHandler => {
  return async (c, next) => {
    const start = performance.now()
    const requestId = c.get('requestId') || crypto.randomUUID()
    const ip =
      c.req.header('x-forwarded-for')?.split(',')[0] || c.req.header('x-real-ip') || '127.0.0.1'

    await next()

    const duration = performance.now() - start
    const logPayload = {
      timestamp: new Date().toISOString(),
      requestId,
      method: c.req.method,
      url: c.req.url,
      status: c.res.status,
      durationMs: parseFloat(duration.toFixed(2)),
      ip,
    }

    // In Bun, console.log outputs directly to stdout. Under Docker, this goes to structured runtime logs.
    console.log(JSON.stringify(logPayload))
  }
}

// 2. Simple In-Memory Sliding Window Rate Limiter
interface RateLimitBucket {
  timestamps: number[]
}

export const rateLimiter = (options: {
  windowMs: number
  maxRequests: number
}): MiddlewareHandler => {
  const store = new Map<string, RateLimitBucket>()

  // Cleanup map periodically to prevent memory leaks
  setInterval(() => {
    const now = Date.now()
    store.forEach((bucket, ip) => {
      bucket.timestamps = bucket.timestamps.filter((t) => now - t < options.windowMs)
      if (bucket.timestamps.length === 0) {
        store.delete(ip)
      }
    })
  }, 60000).unref?.() // Use unref so it doesn't block process exit in tests

  return async (c, next) => {
    // Preserving SSR friendliness: skip rate limiting if forward flags are missing (optional but good practice)
    const ip =
      c.req.header('x-forwarded-for')?.split(',')[0] || c.req.header('x-real-ip') || '127.0.0.1'
    const now = Date.now()

    let bucket = store.get(ip)
    if (!bucket) {
      bucket = { timestamps: [] }
      store.set(ip, bucket)
    }

    // Filter out old timestamps
    bucket.timestamps = bucket.timestamps.filter((t) => now - t < options.windowMs)

    if (bucket.timestamps.length >= options.maxRequests) {
      c.header('Retry-After', Math.ceil(options.windowMs / 1000).toString())
      return c.json(
        {
          success: false as const,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
            retryable: true,
          },
          meta: { requestId: c.get('requestId') },
        },
        429,
      )
    }

    bucket.timestamps.push(now)
    await next()
  }
}

// 3. Secure Headers Wrapper
export const securityHeaders = () =>
  secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      connectSrc: ["'self'", 'ws:', 'wss:', 'https:'],
      mediaSrc: ["'self'", 'blob:', 'https:', 'data:'],
    },
    crossOriginEmbedderPolicy: false,
  })
