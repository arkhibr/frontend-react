import { createApp } from './app.ts'
import { loadConfig } from './config.ts'

const config = loadConfig()
const app = createApp(config)

app.listen(config.port, () => {
  console.log(`Gateway ouvindo em http://localhost:${config.port}`)
})
