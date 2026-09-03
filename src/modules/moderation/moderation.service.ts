import { AppError } from '../../lib/errors'
import { logger } from '../../lib/logger'
import { sendRemovalNoticeEmail } from '../../lib/mailer'
import type { Env } from '../../config/env'
import type { ModerationRepository, ReportStatus } from '../../repositories/moderation.repository'

export function createModerationService(moderation: ModerationRepository, env: Env) {
  return {
    listReports(status?: ReportStatus) {
      return moderation.listReports(status)
    },

    async updateReport(
      id: string,
      status: ReportStatus,
      actorEmail?: string,
      notify?: { subject: string; body: string },
    ) {
      const report = await moderation.updateReport(id, status)
      if (!report) {
        throw new AppError(404, 'Denúncia não encontrada.')
      }

      let emailSent = false
      let emailError = ''
      if (status === 'ACEITA' && notify) {
        const owner = report.responsavel
        if (!owner?.email) {
          emailError = 'Não foi possível identificar o e-mail do responsável.'
        } else {
          try {
            await sendRemovalNoticeEmail(env, {
              to: owner.email,
              name: owner.nome,
              subject: notify.subject,
              body: notify.body,
            })
            emailSent = true
          } catch (error) {
            emailError = error instanceof Error ? error.message : 'Não foi possível enviar o e-mail.'
            logger.error(`[moderation] denúncia ${id} aceita, mas o e-mail não saiu: ${emailError}`)
          }
        }
      }

      logger.audit(`[moderation] denúncia ${id} marcada como ${status}`, {
        actor: actorEmail,
        status: 200,
      })
      return { report, emailSent, emailError }
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
