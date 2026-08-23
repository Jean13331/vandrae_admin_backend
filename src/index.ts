import 'dotenv/config'
import http from 'node:http'
import https from 'node:https'
import { loadEnv } from './config/env'
import { createApp } from './app'
import { connectDatabase } from './database'
import { seedAdminUser, seedAllowedEmails } from './database/seed'
import { seedDemoTrail } from './database/seedDemoTrail'
import { enableAuditPersistence } from './repositories/audit.repository'
import { createDashboardService } from './modules/dashboard/dashboard.service'
import { createPostgresAdminUserRepository } from './repositories/adminUser.repository'
import { createDashboardRepository } from './repositories/dashboard.repository'
import { loadHttpsOptions, publicUrl } from './lib/https'
import { lanIPv4 } from './lib/lan'
import { logger } from './lib/logger'

function listenOnAllInterfaces(server: http.Server | https.Server, port: number) {
  return new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => reject(error)
    server.once('error', onError)
    server.listen(port, '0.0.0.0', () => {
      server.off('error', onError)
      resolve()
    })
  })
}

async function bootstrap() {
  const env = loadEnv()
  const pool = await connectDatabase(env)
  await enableAuditPersistence(pool)
  await seedAdminUser(pool, env)
  await seedAllowedEmails(pool, env)
  await seedDemoTrail(pool)

  const adminUsers = createPostgresAdminUserRepository(pool)
  const dashboardService = createDashboardService(createDashboardRepository(pool))
  const app = createApp(env, adminUsers, dashboardService, pool)
  const lanHost = lanIPv4()

  if (env.HTTPS) {
    const httpsOptions = await loadHttpsOptions(env)
    await listenOnAllInterfaces(https.createServer(httpsOptions, app), env.PORT)
    logger.info(`[server] Vandrae admin API em ${publicUrl(env)}`)

    const mobilePort = env.MOBILE_HTTP_PORT ?? env.PORT + 1
    await listenOnAllInterfaces(http.createServer(app), mobilePort)
    const mobileHost = lanHost ?? 'SEU_IP'
    logger.info(`[server] App mobile (HTTP na rede): http://${mobileHost}:${mobilePort}`)
    return
  }

  await listenOnAllInterfaces(http.createServer(app), env.PORT)
  logger.info(`[server] Vandrae admin API em ${publicUrl(env)}`)
  if (lanHost) {
    logger.info(`[server] App mobile (HTTP na rede): http://${lanHost}:${env.PORT}`)
  }
}

bootstrap().catch((error) => {
  logger.error('[bootstrap]', error)
  process.exit(1)
})
