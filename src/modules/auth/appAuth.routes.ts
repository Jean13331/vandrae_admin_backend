import { Router } from 'express'
import type { AuthController } from './auth.controller'

export function createAppAuthRouter(controller: AuthController) {
  const router = Router()

  router.post('/login', controller.loginApp)
  router.post('/forgot-password', controller.forgotPasswordApp)
  router.get('/reset-password', controller.showResetPasswordPage)
  router.post('/reset-password', controller.resetPasswordApp)
  router.post('/register', controller.registerApp)
  router.post('/google', controller.googleApp)
  router.post('/google/complete', controller.googleCompleteApp)
  router.post('/refresh', controller.refreshApp)
  router.post('/logout', controller.logout)
  router.get('/me/photo', controller.getMyPhotoApp)
  router.put('/me/photo', controller.updateMyPhotoApp)
  router.delete('/me/photo', controller.deleteMyPhotoApp)
  router.get('/me', controller.meApp)
  router.delete('/me', controller.deleteMeApp)

  return router
}
