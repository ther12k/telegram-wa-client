import { serveStatic } from 'hono/bun'
import app from './app'

const port = Number(process.env.PORT || 3001)
// Treat NODE_ENV=production as the production gate; fall back to APP_ENV for
// projects that still set it. Both must be 'production' to enable static serving.
const environment =
  process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'production'
    ? 'production'
    : 'development'

if (environment === 'production') {
  // CWD in the Docker runtime is /app; the React dist lives at apps/web/dist.
  // Bun's serveStatic uses Node's path.join against this root, so an absolute
  // path avoids CWD-relative surprises when the binary is invoked from elsewhere.
  const webDistRoot = new URL('../../apps/web/dist/', import.meta.url).pathname
  app.use('/*', serveStatic({ root: webDistRoot }))
  app.get('*', serveStatic({ path: `${webDistRoot}index.html` }))
}

console.info(
  JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    event: 'server.start',
    port,
    environment,
  }),
)

export default { port, fetch: app.fetch }
