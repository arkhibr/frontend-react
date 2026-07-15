import { serve } from '@hono/node-server'
import { createApp } from './app.ts'
import { loadConfig } from './config.ts'

const config = loadConfig()
const app = createApp(config)

serve({ fetch: app.fetch, port: config.port }, () => {
  console.log(`Gateway ouvindo em http://localhost:${config.port}`)
})
