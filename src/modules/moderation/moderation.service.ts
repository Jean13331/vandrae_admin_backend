import { AppError } from '../../lib/errors'
import { logger } from '../../lib/logger'
import type { ModerationRepository, ReportStatus } from '../../repositories/moderation.repository'

export function createModerationService(moderation: ModerationRepository) {
  return {
    listReports(status?: ReportStatus) {
      return moderation.listReports(status)
    },

    async updateReport(id: string, status: ReportStatus, actorEmail?: string) {
      const report = await moderation.updateReport(id, status)
      if (!report) {
        throw new AppError(404, 'Denúncia não encontrada.')
      }

      logger.audit(`[moderation] denúncia ${id} marcada como ${status}`, {
        actor: actorEmail,
        status: 200,
      })
      return report
    },

    listReviews(filters: { q?: string; oculto?: boolean }) {
      return moderation.listReviews(filters)
    },

    async setReviewHidden(id: string, oculto: boolean, actorEmail?: string) {
      const updated = await moderation.setReviewHidden(id, oculto)
      if (!updated) {
        throw new AppError(404, 'Avaliação não encontrada.')
      }

      logger.audit(`[moderation] avaliação ${id} ${oculto ? 'ocultada' : 'exibida'}`, {
        actor: actorEmail,
        status: 200,
      })
    },
  }
}

export type ModerationService = ReturnType<typeof createModerationService>
