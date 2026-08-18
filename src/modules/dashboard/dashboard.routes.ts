import { Router } from 'express'
import type { DashboardController } from './dashboard.controller'

export function createDashboardRouter(controller: DashboardController) {
  const router = Router()

  router.get('/stats', controller.stats)

  return router
}
