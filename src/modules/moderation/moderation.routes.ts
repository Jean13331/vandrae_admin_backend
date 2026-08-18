import { Router } from 'express'
import type { ModerationController } from './moderation.controller'

export function createReportsRouter(controller: ModerationController) {
  const router = Router()
  router.get('/', controller.listReports)
  router.patch('/:id', controller.updateReport)
  return router
}

export function createReviewsRouter(controller: ModerationController) {
  const router = Router()
  router.get('/', controller.listReviews)
  router.patch('/:id', controller.updateReview)
  return router
}
