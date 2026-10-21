import { pingDatabase } from '../../database'
import type { Pool } from 'pg'
import type { HealthCheckRepository } from '../../repositories/healthCheck.repository'
import { logger } from '../../lib/logger'

export function createHealthChecksService(pool: Pool, repo: HealthCheckRepository) {
  return {
    async runPing() {
      const started = Date.now()
      let statusHttp = 500
      try {
        const ok = await pingDatabase(pool)
        statusHttp = ok ? 200 : 500
      } catch {
        statusHttp = 500
      }
      const duracaoMs = Math.max(0, Date.now() - started)

      try {
        const saved = await repo.insert(statusHttp, duracaoMs)
        logger.info(`[health-check] ping ${statusHttp} em ${duracaoMs}ms`)
        return saved
      } catch (error) {
        logger.error('[health-check] falha ao gravar ping', error)
        return {
          id: '',
          momentoPing: new Date().toISOString(),
          statusHttp,
          duracaoMs,
        }
      }
    },

    list(limit?: number) {
      return repo.list(limit)
    },

    summary(hours?: number) {
      return repo.summary(hours)
    },
  }
}

export type HealthChecksService = ReturnType<typeof createHealthChecksService>
