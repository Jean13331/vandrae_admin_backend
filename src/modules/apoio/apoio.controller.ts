import type { Request, Response } from 'express'
import { asyncHandler } from '../../lib/asyncHandler'
import { AppError } from '../../lib/errors'
import { apoioQuerySchema, trailActivitySchema } from './apoio.schema'
import type { ApoioService } from './apoio.service'

export function createApoioController(service: ApoioService) {
  return {
    list: asyncHandler(async (req: Request, res: Response) => {
      const query = apoioQuerySchema.parse(req.query)
      const users = await service.searchUsers(query.q)
      res.json({ users })
    }),

    recordActivity: asyncHandler(async (req: Request, res: Response) => {
      const usuarioId = req.appUser?.id
      if (!usuarioId) {
        throw new AppError(401, 'Sessão inválida.')
      }
      const input = trailActivitySchema.parse(req.body)
      await service.recordActivity(usuarioId, input)
      res.status(204).end()
    }),
  }
}

export type ApoioController = ReturnType<typeof createApoioController>
