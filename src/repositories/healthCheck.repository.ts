import type { Pool } from 'pg'

export type HealthCheckRow = {
  id: string
  momentoPing: string
  statusHttp: number
  duracaoMs: number
}

export type HealthCheckSummary = {
  total: number
  ok: number
  falhas: number
  taxaOk: number
  mediaMs: number
  ultimo: HealthCheckRow | null
}

export function createHealthCheckRepository(pool: Pool) {
  return {
    async insert(statusHttp: number, duracaoMs: number): Promise<HealthCheckRow> {
      const result = await pool.query<{
        id: string
        momento_ping: Date | string
        status_http: number
        duracao_ms: number
      }>(
        `INSERT INTO health_check (status_http, duracao_ms)
         VALUES ($1, $2)
         RETURNING id, momento_ping, status_http, duracao_ms`,
        [statusHttp, duracaoMs],
      )
      const row = result.rows[0]
      return {
        id: row.id,
        momentoPing: new Date(row.momento_ping).toISOString(),
        statusHttp: row.status_http,
        duracaoMs: row.duracao_ms,
      }
    },

    async list(limit = 168): Promise<HealthCheckRow[]> {
      const safeLimit = Math.min(Math.max(limit, 1), 500)
      const result = await pool.query<{
        id: string
        momento_ping: Date | string
        status_http: number
        duracao_ms: number
      }>(
        `SELECT id, momento_ping, status_http, duracao_ms
         FROM health_check
         ORDER BY momento_ping DESC
         LIMIT $1`,
        [safeLimit],
      )
      return result.rows.map((row) => ({
        id: row.id,
        momentoPing: new Date(row.momento_ping).toISOString(),
        statusHttp: row.status_http,
        duracaoMs: row.duracao_ms,
      }))
    },

    async summary(hours = 24): Promise<HealthCheckSummary> {
      const result = await pool.query<{
        total: string
        ok: string
        falhas: string
        media_ms: string | null
      }>(
        `SELECT
           COUNT(*)::text AS total,
           COUNT(*) FILTER (WHERE status_http = 200)::text AS ok,
           COUNT(*) FILTER (WHERE status_http = 500)::text AS falhas,
           ROUND(AVG(duracao_ms))::text AS media_ms
         FROM health_check
         WHERE momento_ping >= NOW() - ($1::int * INTERVAL '1 hour')`,
        [hours],
      )
      const row = result.rows[0]
      const total = Number(row?.total ?? 0)
      const ok = Number(row?.ok ?? 0)
      const falhas = Number(row?.falhas ?? 0)
      const ultimo = (await this.list(1))[0] ?? null
      return {
        total,
        ok,
        falhas,
        taxaOk: total === 0 ? 0 : Math.round((ok / total) * 1000) / 10,
        mediaMs: Number(row?.media_ms ?? 0),
        ultimo,
      }
    },
  }
}

export type HealthCheckRepository = ReturnType<typeof createHealthCheckRepository>
