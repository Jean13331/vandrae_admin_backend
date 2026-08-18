import type { Request, Response } from 'express'
import { asyncHandler } from '../../lib/asyncHandler'
import type { DashboardService } from './dashboard.service'

export function createDashboardController(dashboardService: DashboardService) {
  return {
    stats: asyncHandler(async (_req: Request, res: Response) => {
      const stats = await dashboardService.getStats()
      res.json(stats)
    }),
  }
}

export type DashboardController = ReturnType<typeof createDashboardController>
