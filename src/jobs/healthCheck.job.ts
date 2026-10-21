import type { HealthChecksService } from '../modules/health-checks/healthChecks.service'
import { logger } from '../lib/logger'

const HOUR_MS = 60 * 60 * 1000

function msUntilNextHour() {
  const now = new Date()
  const next = new Date(now)
  next.setMinutes(0, 0, 0)
  next.setHours(next.getHours() + 1)
  return Math.max(1000, next.getTime() - now.getTime())
}

/** Roda um ping na subida e depois a cada hora cheia. */
export function startHealthCheckJob(service: HealthChecksService) {
  let hourlyTimer: ReturnType<typeof setInterval> | null = null

  void service.runPing().catch((error) => {
    logger.error('[health-check] ping inicial falhou', error)
  })

  const firstDelay = msUntilNextHour()
  logger.info(`[health-check] próximo ping agendado em ${Math.round(firstDelay / 60000)} min`)

  const firstTimer = setTimeout(() => {
    void service.runPing().catch((error) => {
      logger.error('[health-check] ping horário falhou', error)
    })
    hourlyTimer = setInterval(() => {
      void service.runPing().catch((error) => {
        logger.error('[health-check] ping horário falhou', error)
      })
    }, HOUR_MS)
  }, firstDelay)

  return () => {
    clearTimeout(firstTimer)
    if (hourlyTimer) clearInterval(hourlyTimer)
  }
}
