import { Router } from 'express'
import type { UsersController } from './users.controller'

export function createUsersRouter(controller: UsersController) {
  const router = Router()

  router.get('/', controller.list)
  router.post('/', controller.create)
  router.get('/:id', controller.getById)
  router.patch('/:id', controller.update)

  return router
}
