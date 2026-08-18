import type { DashboardRepository } from '../../repositories/dashboard.repository'

export type DashboardRecentTrail = {
  id: string
  nome: string
  autor: string
  createdAt: string
}

export type DashboardRecentReport = {
  id: string
  motivo: string
  status: string
  trilha: string
  createdAt: string
}

export type DashboardFailureDay = {
  day: string
  count: number
}

export type DashboardStats = {
  trails: number
  pendingModeration: number
  recentContributions: number
  appUsers: number
  authFailures: number
  recentTrails: DashboardRecentTrail[]
  recentReports: DashboardRecentReport[]
  failuresByDay: DashboardFailureDay[]
}

function fillFailureDays(rows: DashboardFailureDay[], days = 7): DashboardFailureDay[] {
  const byDay = new Map(rows.map((row) => [row.day, row.count]))
  const result: DashboardFailureDay[] = []
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date()
    date.setUTCHours(0, 0, 0, 0)
    date.setUTCDate(date.getUTCDate() - offset)
    const day = date.toISOString().slice(0, 10)
    result.push({ day, count: byDay.get(day) ?? 0 })
  }
  return result
}

export function createDashboardService(dashboardRepository: DashboardRepository) {
  return {
    async getStats() {
      const stats = await dashboardRepository.getStats()
      return {
        ...stats,
        failuresByDay: fillFailureDays(stats.failuresByDay),
      }
    },
  }
}

export type DashboardService = ReturnType<typeof createDashboardService>
