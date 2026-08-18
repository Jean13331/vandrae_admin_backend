import type { Request, Response } from 'express'
import { asyncHandler } from '../../lib/asyncHandler'
import {
  listReportsQuerySchema,
  listReviewsQuerySchema,
  reportIdParamSchema,
  reviewIdParamSchema,
  updateReportSchema,
  updateReviewSchema,
} from './moderation.schema'
import type { ModerationService } from './moderation.service'

export function createModerationController(moderationService: ModerationService) {
  return {
    listReports: asyncHandler(async (req: Request, res: Response) => {
      const query = listReportsQuerySchema.parse(req.query)
      const reports = await moderationService.listReports(query.status)
      res.json({ reports })
    }),

    updateReport: asyncHandler(async (req: Request, res: Response) => {
      const params = reportIdParamSchema.parse(req.params)
      const input = updateReportSchema.parse(req.body)
      const report = await moderationService.updateReport(
        params.id,
        input.status,
        req.adminUser?.email,
      )
      res.json({ report })
    }),

    listReviews: asyncHandler(async (req: Request, res: Response) => {
      const query = listReviewsQuerySchema.parse(req.query)
      const reviews = await moderationService.listReviews({
        q: query.q,
        oculto: query.oculto === 'all' ? undefined : query.oculto === 'true',
      })
      res.json({ reviews })
    }),

    updateReview: asyncHandler(async (req: Request, res: Response) => {
      const params = reviewIdParamSchema.parse(req.params)
      const input = updateReviewSchema.parse(req.body)
      await moderationService.setReviewHidden(params.id, input.oculto, req.adminUser?.email)
      res.status(204).send()
    }),
  }
}

export type ModerationController = ReturnType<typeof createModerationController>
