import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import type { Env } from './config/env'
import { errorHandler } from './middleware/errorHandler'
import { notFound } from './middleware/notFound'
import { createAdminAuthGuard } from './middleware/adminAuthGuard'
import { createAppAuthGuard } from './middleware/appAuthGuard'
import { createAuthMiddleware } from './middleware/auth'
import { createAppAuthMiddleware } from './middleware/appAuth'
import { createAuthController } from './modules/auth/auth.controller'
import { createAuthRouter } from './modules/auth/auth.routes'
import { createAppAuthRouter } from './modules/auth/appAuth.routes'
import { createAuthService } from './modules/auth/auth.service'
import { createDashboardController } from './modules/dashboard/dashboard.controller'
import { createDashboardRouter } from './modules/dashboard/dashboard.routes'
import { setupSwagger } from './docs/swagger'
import { createHealthRouter } from './modules/health/health.routes'
import { createLogsRouter } from './modules/logs/logs.routes'
import { createUsersController } from './modules/users/users.controller'
import { createUsersRouter } from './modules/users/users.routes'
import { createUsersService } from './modules/users/users.service'
import { createAccessController } from './modules/access/access.controller'
import { createAccessRouter } from './modules/access/access.routes'
import { createAccessService } from './modules/access/access.service'
import { createTrailsController } from './modules/trails/trails.controller'
import { createTrailsRouter } from './modules/trails/trails.routes'
import { createAppTrailsRouter } from './modules/trails/appTrails.routes'
import { createTrailsService } from './modules/trails/trails.service'
import { createModerationController } from './modules/moderation/moderation.controller'
import { createReportsRouter, createReviewsRouter } from './modules/moderation/moderation.routes'
import { createModerationService } from './modules/moderation/moderation.service'
import { requestLogger } from './middleware/requestLogger'
import { createPostgresAdminAccessRepository } from './repositories/adminAccess.repository'
import { createPostgresSessionRepository } from './repositories/session.repository'
import { createPostgresTrailRepository } from './repositories/trail.repository'
import { createModerationRepository } from './repositories/moderation.repository'
import type { AdminUserRepository } from './repositories/adminUser.repository'
import type { DashboardService } from './modules/dashboard/dashboard.service'
import type { Pool } from 'pg'

export function createApp(
  env: Env,
  adminUsers: AdminUserRepository,
  dashboardService: DashboardService,
  pool: Pool,
) {
  const app = express()
  app.set('trust proxy', true)
  app.set('etag', false)
  const accessEmails = createPostgresAdminAccessRepository(pool)
  const sessions = createPostgresSessionRepository(pool)
  const requireAuth = createAdminAuthGuard(
    createAuthMiddleware(env, adminUsers, accessEmails, sessions),
  )
  const requireAppAuth = createAppAuthGuard(
    createAppAuthMiddleware(env, adminUsers, sessions),
  )

  const authController = createAuthController(
    createAuthService(env, adminUsers, accessEmails, sessions),
  )
  const dashboardController = createDashboardController(dashboardService)
  const usersController = createUsersController(createUsersService(adminUsers, accessEmails))
  const accessController = createAccessController(createAccessService(accessEmails))
  const trailsController = createTrailsController(
    createTrailsService(createPostgresTrailRepository(pool)),
  )
  const moderationController = createModerationController(
    createModerationService(createModerationRepository(pool)),
  )

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
          workerSrc: ["'self'", 'blob:'],
          connectSrc: ["'self'"],
          frameAncestors: ["'self'", env.CORS_ORIGIN],
          upgradeInsecureRequests: null,
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      frameguard: false,
    }),
  )
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || env.NODE_ENV !== 'production' || origin === env.CORS_ORIGIN) {
          callback(null, true)
          return
        }
        callback(null, false)
      },
      credentials: true,
    }),
  )
  app.use(express.json({ limit: '16mb' }))
  app.use((req, res, next) => {
    if (!req.path.includes('/photos/') && !req.path.endsWith('/me/photo')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
      res.setHeader('Pragma', 'no-cache')
    }
    next()
  })
  app.use(requestLogger)

  setupSwagger(app, env)
  app.use('/health', createHealthRouter(pool))
  app.use('/auth', requireAppAuth)
  app.use('/auth', createAppAuthRouter(authController))
  app.use('/trails', requireAppAuth)
  app.use('/trails', createAppTrailsRouter(trailsController))
  app.use('/admin', requireAuth)
  app.use('/admin/auth', createAuthRouter(authController))
  app.use('/admin/dashboard', createDashboardRouter(dashboardController))
  app.use('/admin/users', createUsersRouter(usersController))
  app.use('/admin/trails', createTrailsRouter(trailsController))
  app.use('/admin/reports', createReportsRouter(moderationController))
  app.use('/admin/reviews', createReviewsRouter(moderationController))
  app.use('/admin/access', createAccessRouter(accessController))
  app.use('/admin/logs', createLogsRouter())

  app.use(notFound)
  app.use(errorHandler)

  return app
}
