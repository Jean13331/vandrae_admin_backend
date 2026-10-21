import { Router } from 'express'
import type { ApoioController } from './apoio.controller'

export function createApoioAdminRouter(controller: ApoioController) {
  const router = Router()
  router.get('/', controller.list)
  return router
}

export function createApoioAppRouter(controller: ApoioController) {
  const router = Router()
  router.post('/activity', controller.recordActivity)
  return router
}
