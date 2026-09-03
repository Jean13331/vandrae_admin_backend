import type { Pool } from 'pg'
import { hydrateLogs, setAuditPersist, type LogEntry, LOG_BUFFER_SIZE } from '../lib/logger'

type AuditRow = {
  id: string
  nivel: string
  mensagem: string
  ip: string | null
  status: number | null
  categoria: string | null
  ator: string | null
  data_cadastro: Date | string
}

function mapRow(row: AuditRow): LogEntry {
  return {
    id: row.id,
    timestamp: new Date(row.data_cadastro).toISOString(),
    level: (row.nivel as LogEntry['level']) || 'info',
    message: row.mensagem,
    ip: row.ip ?? undefined,
    status: row.status ?? undefined,
    category: row.categoria === 'audit' ? 'audit' : undefined,
    actor: row.ator ?? undefined,
  }
}

export function createAuditRepository(pool: Pool) {
  return {
    async insert(entry: LogEntry) {
      await pool.query(
        `INSERT INTO auditoria (id, nivel, mensagem, ip, status, categoria, ator, data_cadastro)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz)
         ON CONFLICT (id) DO NOTHING`,
        [
          entry.id,
          entry.level,
          entry.message,
          entry.ip ?? null,
          entry.status ?? null,
          entry.category ?? null,
          entry.actor ?? null,
          entry.timestamp,
        ],
      )
    },

    async list(limit = 200) {
      const result = await pool.query<AuditRow>(
        `SELECT id, nivel, mensagem, ip, status, categoria, ator, data_cadastro
         FROM auditoria
         ORDER BY data_cadastro DESC
         LIMIT $1`,
        [limit],
      )
      return result.rows.reverse().map(mapRow)
    },

    async failuresByDay(days = 7) {
      const result = await pool.query<{ dia: string; total: string }>(
        `SELECT to_char(data_cadastro AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS dia,
                COUNT(*)::text AS total
         FROM auditoria
         WHERE status = 401
           AND data_cadastro >= NOW() - ($1::text || ' days')::interval
         GROUP BY 1
         ORDER BY 1 ASC`,
        [String(days)],
      )
      return result.rows.map((row) => ({ day: row.dia, count: Number(row.total) }))
    },
  }
}

export type AuditRepository = ReturnType<typeof createAuditRepository>

export async function enableAuditPersistence(pool: Pool) {
  const audit = createAuditRepository(pool)
  const history = await audit.list(LOG_BUFFER_SIZE)
  hydrateLogs(history)
  setAuditPersist((entry) => audit.insert(entry))
  return audit
}
