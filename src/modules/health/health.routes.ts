import { Router } from 'express'
import type { Pool } from 'pg'
import { asyncHandler } from '../../lib/asyncHandler'
import { pingDatabase } from '../../database'

export function createHealthRouter(pool: Pool) {
  const healthRouter = Router()

  healthRouter.get(
    '/',
    asyncHandler(async (_req, res) => {
      const databaseConnected = await pingDatabase(pool)

      res.status(databaseConnected ? 200 : 503).json({
        status: databaseConnected ? 'ok' : 'degraded',
        service: 'vandrae-admin-backend',
        database: databaseConnected ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
      })
    }),
  )

  return healthRouter
}
