import { serveStatic } from 'hono/bun'
import app from './app'

const port = Number(process.env.PORT || 3001)
const environment = process.env.APP_ENV || 'development'

if (environment === 'production') {
  app.use('/*', serveStatic({ root: '../web/dist' }))
  app.get('*', serveStatic({ path: '../web/dist/index.html' }))
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
