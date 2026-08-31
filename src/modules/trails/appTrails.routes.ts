import { Router } from 'express'
import type { TrailsController } from './trails.controller'

export function createAppTrailsRouter(controller: TrailsController) {
  const router = Router()
  router.get('/', controller.explore)
  router.post('/', controller.createApp)
  router.get('/mine', controller.listMine)
  router.get('/:id/photos/:photoId', controller.getExplorePhoto)
  router.get('/:id', controller.exploreById)
  return router
}
