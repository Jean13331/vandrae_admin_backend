import type { Request, Response } from 'express'
import { asyncHandler } from '../../lib/asyncHandler'
import {
  createAdminUserSchema,
  listUsersQuerySchema,
  updateUserSchema,
  userIdParamSchema,
} from './users.schema'
import type { UsersService } from './users.service'

export function createUsersController(usersService: UsersService) {
  return {
    list: asyncHandler(async (req: Request, res: Response) => {
      const query = listUsersQuerySchema.parse(req.query)
      const users = await usersService.list({
        q: query.q,
        role: query.role === 'all' ? undefined : query.role,
      })
      res.json({ users })
    }),

    getById: asyncHandler(async (req: Request, res: Response) => {
      const params = userIdParamSchema.parse(req.params)
      const user = await usersService.getById(params.id)
      res.json({ user })
    }),

    update: asyncHandler(async (req: Request, res: Response) => {
      const params = userIdParamSchema.parse(req.params)
      const input = updateUserSchema.parse(req.body)
      const user = await usersService.setAtivo(params.id, input.ativo, req.adminUser, input.notify)
      res.json(user)
    }),

    create: asyncHandler(async (req: Request, res: Response) => {
      const input = createAdminUserSchema.parse(req.body)
      const user = await usersService.create(input, req.adminUser?.email)
      res.status(201).json({ user })
    }),
  }
}

export type UsersController = ReturnType<typeof createUsersController>
