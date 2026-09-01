import { Router } from 'express'
import type { TrailsController } from './trails.controller'

export function createAppTrailsRouter(controller: TrailsController) {
  const router = Router()
  router.get('/', controller.explore)
  router.post('/', controller.createApp)
  router.get('/mine', controller.listMine)
  router.get('/mine/alerts', controller.listMyAlerts)
  router.get('/mine/reports', controller.listMyReports)
  router.get('/mine/completions', controller.listMyCompletions)
  router.post('/:id/reports', controller.reportApp)
  router.post('/:id/complete', controller.completeApp)
  router.get('/:id/reviews', controller.listReviewsApp)
  router.post('/:id/reviews', controller.upsertReviewApp)
  router.post('/:id/alerts/:alertId/resolve', controller.resolveAlertApp)
  router.get('/:id/alerts/:alertId/photo', controller.getExploreAlertPhoto)
  router.post('/:id/alerts', controller.createAlertApp)
  router.get('/:id/photos/:photoId', controller.getExplorePhoto)
  router.get('/:id', controller.exploreById)
  return router
}
