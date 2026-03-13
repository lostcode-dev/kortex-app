import 'dotenv/config'
import app from './app.js'
import { env } from './config/index.js'
import { initializeLogger, logger } from './utils/index.js'
import { startScheduler, stopScheduler } from './jobs/index.js'

initializeLogger()

app.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT} [${env.NODE_ENV}]`)
  startScheduler()
})

function gracefulShutdown(signal: string): void {
  logger.info(`[server] ${signal} recebido, encerrando...`)
  stopScheduler()
  process.exit(0)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
