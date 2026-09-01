import { Router } from 'express'
import type { TrailsController } from './trails.controller'

export function createTrailsRouter(controller: TrailsController) {
  const router = Router()

  router.get('/', controller.list)
  router.post('/', controller.create)
  router.get('/:id/photos/:photoId', controller.getPhoto)
  router.get('/:id/alerts/:alertId/photo', controller.getAlertPhoto)
  router.post('/:id/photos', controller.addPhoto)
  router.post('/:id/points', controller.addPoint)
  router.get('/:id', controller.getById)
  router.patch('/:id', controller.update)

  return router
}
