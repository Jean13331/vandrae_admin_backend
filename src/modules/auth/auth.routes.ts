import { Router } from 'express'
import type { AuthController } from './auth.controller'

export function createAuthRouter(controller: AuthController) {
  const router = Router()

  router.post('/login', controller.login)
  router.post('/refresh', controller.refresh)
  router.post('/logout', controller.logout)
  router.get('/me', controller.me)

  return router
}
