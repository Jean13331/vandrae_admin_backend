import { AppError } from '../../lib/errors'
import type { ApoioRepository } from '../../repositories/apoio.repository'

export function createApoioService(apoio: ApoioRepository) {
  return {
    searchUsers(q: string) {
      return apoio.searchUsers(q)
    },

    async recordActivity(
      usuarioId: string,
      input: {
        tipo: 'BUSCA' | 'DOWNLOAD'
        trilhaId?: string
        trilhaIds?: string[]
        termo?: string | null
      },
    ) {
      if (input.tipo === 'DOWNLOAD') {
        if (!input.trilhaId) {
          throw new AppError(400, 'Informe a trilha baixada.')
        }
        await apoio.recordDownload(usuarioId, input.trilhaId)
        return
      }

      const ids = [
        ...(input.trilhaIds ?? []),
        ...(input.trilhaId ? [input.trilhaId] : []),
      ]
      if (!ids.length) {
        throw new AppError(400, 'Informe ao menos uma trilha da busca.')
      }
      await apoio.recordSearch(usuarioId, ids, input.termo)
    },
  }
}

export type ApoioService = ReturnType<typeof createApoioService>
