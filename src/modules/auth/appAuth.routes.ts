import { Router } from 'express'
import type { AuthController } from './auth.controller'

export function createAppAuthRouter(controller: AuthController) {
  const router = Router()

  router.post('/login', controller.loginApp)
  router.post('/register', controller.registerApp)
  router.post('/google', controller.googleApp)
  router.post('/google/complete', controller.googleCompleteApp)
  router.post('/refresh', controller.refreshApp)
  router.post('/logout', controller.logout)
  router.get('/me', controller.meApp)

  return router
}
