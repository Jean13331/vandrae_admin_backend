import type { Request, Response } from 'express'
import { asyncHandler } from '../../lib/asyncHandler'
import { authorizedEmailSchema } from './access.schema'
import type { AccessService } from './access.service'

export function createAccessController(accessService: AccessService) {
  return {
    list: asyncHandler(async (_req: Request, res: Response) => {
      const emails = await accessService.list()
      res.json({ emails })
    }),

    create: asyncHandler(async (req: Request, res: Response) => {
      const input = authorizedEmailSchema.parse(req.body)
      const item = await accessService.add(input.email, req.adminUser?.email)
      res.status(201).json({ email: item })
    }),

    remove: asyncHandler(async (req: Request, res: Response) => {
      const input = authorizedEmailSchema.parse({ email: req.query.email })
      await accessService.remove(input.email, req.adminUser?.email ?? '')
      res.status(204).send()
    }),
  }
}

export type AccessController = ReturnType<typeof createAccessController>
