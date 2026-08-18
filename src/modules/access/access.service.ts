import { AppError } from '../../lib/errors'
import { logger } from '../../lib/logger'
import type { AdminAccessRepository } from '../../repositories/adminAccess.repository'

function isUniqueViolation(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23505'
  )
}

export function createAccessService(access: AdminAccessRepository) {
  return {
    list() {
      return access.list()
    },

    async add(email: string, actorEmail?: string) {
      const exists = await access.has(email)
      if (exists) {
        throw new AppError(409, 'Este e-mail já está autorizado.')
      }

      try {
        const item = await access.add(email)
        logger.audit(`[access] e-mail autorizado: ${item.email}`, {
          actor: actorEmail,
          status: 201,
        })
        return item
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new AppError(409, 'Este e-mail já está autorizado.')
        }
        throw error
      }
    },

    async remove(email: string, actorEmail: string) {
      if (email.toLowerCase() === actorEmail.toLowerCase()) {
        throw new AppError(400, 'Você não pode remover o próprio e-mail da lista.')
      }

      if ((await access.count()) <= 1) {
        throw new AppError(400, 'É preciso manter pelo menos um e-mail autorizado.')
      }

      const removed = await access.remove(email)
      if (!removed) {
        throw new AppError(404, 'E-mail não encontrado na lista.')
      }

      logger.audit(`[access] e-mail removido da lista: ${email}`, {
        actor: actorEmail,
        status: 204,
      })
    },
  }
}

export type AccessService = ReturnType<typeof createAccessService>
