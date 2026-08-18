import type { Pool } from 'pg'
import type { DashboardStats } from '../modules/dashboard/dashboard.service'

async function countOrZero(pool: Pool, sql: string) {
  try {
    const result = await pool.query<{ count: string }>(sql)
    return Number(result.rows[0]?.count ?? 0)
  } catch {
    return 0
  }
}

export function createDashboardRepository(pool: Pool) {
  return {
    async getStats(): Promise<DashboardStats> {
      const [trails, pendingModeration, recentContributions, appUsers, authFailures] = await Promise.all([
        countOrZero(pool, 'SELECT COUNT(*)::text AS count FROM trilha WHERE ativo = TRUE'),
        countOrZero(pool, `SELECT COUNT(*)::text AS count FROM denuncias WHERE status = 'PENDENTE'`),
        countOrZero(
          pool,
          `SELECT COUNT(*)::text AS count
           FROM avaliacao
           WHERE data_cadastro >= NOW() - INTERVAL '7 days'`,
        ),
        countOrZero(pool, `SELECT COUNT(*)::text AS count FROM usuario WHERE role = 'USER'`),
        countOrZero(
          pool,
          `SELECT COUNT(*)::text AS count
           FROM auditoria
           WHERE status = 401
             AND data_cadastro >= NOW() - INTERVAL '7 days'`,
        ),
      ])

      const recentTrails = await pool
        .query<{ id: string; nome: string; data_cadastro: Date | string; autor: string }>(
          `SELECT t.id, t.nome, t.data_cadastro, u.nome AS autor
           FROM trilha t
           INNER JOIN usuario u ON u.id = t.usuario_id
           ORDER BY t.data_cadastro DESC
           LIMIT 5`,
        )
        .then((result) =>
          result.rows.map((row) => ({
            id: row.id,
            nome: row.nome,
            autor: row.autor,
            createdAt: new Date(row.data_cadastro).toISOString(),
          })),
        )
        .catch(() => [])

      const recentReports = await pool
        .query<{
          id: string
          motivo: string
          status: string
          data_criacao: Date | string
          trilha: string
        }>(
          `SELECT d.id, d.motivo, d.status, d.data_criacao, t.nome AS trilha
           FROM denuncias d
           INNER JOIN trilha t ON t.id = d.trilha_id
           ORDER BY d.data_criacao DESC
           LIMIT 5`,
        )
        .then((result) =>
          result.rows.map((row) => ({
            id: row.id,
            motivo: row.motivo,
            status: row.status,
            trilha: row.trilha,
            createdAt: new Date(row.data_criacao).toISOString(),
          })),
        )
        .catch(() => [])

      const failuresByDay = await pool
        .query<{ dia: string; total: string }>(
          `SELECT to_char(data_cadastro AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS dia,
                  COUNT(*)::text AS total
           FROM auditoria
           WHERE status = 401
             AND data_cadastro >= NOW() - INTERVAL '7 days'
           GROUP BY 1
           ORDER BY 1 ASC`,
        )
        .then((result) => result.rows.map((row) => ({ day: row.dia, count: Number(row.total) })))
        .catch(() => [])

      return {
        trails,
        pendingModeration,
        recentContributions,
        appUsers,
        authFailures,
        recentTrails,
        recentReports,
        failuresByDay,
      }
    },
  }
}

export type DashboardRepository = ReturnType<typeof createDashboardRepository>
