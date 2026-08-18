import 'dotenv/config'
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
import { logger } from './lib/logger'

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
  const url = publicUrl(env)

  if (env.HTTPS) {
    const httpsOptions = await loadHttpsOptions(env)
    https.createServer(httpsOptions, app).listen(env.PORT, () => {
      logger.info(`[server] Vandrae admin API em ${url}`)
    })
    return
  }

  app.listen(env.PORT, () => {
    logger.info(`[server] Vandrae admin API em ${url}`)
  })
}

bootstrap().catch((error) => {
  logger.error('[bootstrap]', error)
  process.exit(1)
})
