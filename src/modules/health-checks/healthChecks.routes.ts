import { Router } from 'express'
import type { HealthChecksController } from './healthChecks.controller'

export function createHealthChecksRouter(controller: HealthChecksController) {
  const router = Router()
  router.get('/', controller.list)
  router.post('/run', controller.run)
  return router
}
