import { Router } from 'express'
import type { AccessController } from './access.controller'

export function createAccessRouter(controller: AccessController) {
  const router = Router()

  router.get('/emails', controller.list)
  router.post('/emails', controller.create)
  router.delete('/emails', controller.remove)

  return router
}
