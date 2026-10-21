import type { Request, Response } from 'express'
import { asyncHandler } from '../../lib/asyncHandler'
import type { HealthChecksService } from './healthChecks.service'

export function createHealthChecksController(service: HealthChecksService) {
  return {
    list: asyncHandler(async (req: Request, res: Response) => {
      const limit = Number(req.query.limit) || 168
      const [items, summary] = await Promise.all([
        service.list(limit),
        service.summary(24),
      ])
      res.json({ items, summary })
    }),

    run: asyncHandler(async (_req: Request, res: Response) => {
      const item = await service.runPing()
      res.status(201).json(item)
    }),
  }
}

export type HealthChecksController = ReturnType<typeof createHealthChecksController>
