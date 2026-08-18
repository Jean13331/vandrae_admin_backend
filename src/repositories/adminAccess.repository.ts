import type { Pool } from 'pg'

export type AuthorizedEmail = {
  email: string
  createdAt: string
}

export interface AdminAccessRepository {
  has(email: string): Promise<boolean>
  list(): Promise<AuthorizedEmail[]>
  add(email: string): Promise<AuthorizedEmail>
  remove(email: string): Promise<boolean>
  count(): Promise<number>
}

type AccessRow = {
  email: string
  data_cadastro: Date | string
}

function mapRow(row: AccessRow): AuthorizedEmail {
  return {
    email: row.email,
    createdAt: new Date(row.data_cadastro).toISOString(),
  }
}

export function createPostgresAdminAccessRepository(pool: Pool): AdminAccessRepository {
  return {
    async has(email) {
      const result = await pool.query(
        'SELECT 1 FROM admin_email_autorizado WHERE lower(email) = lower($1) LIMIT 1',
        [email.trim()],
      )
      return Boolean(result.rowCount)
    },
    async list() {
      const result = await pool.query<AccessRow>(
        `SELECT email, data_cadastro
         FROM admin_email_autorizado
         ORDER BY data_cadastro ASC`,
      )
      return result.rows.map(mapRow)
    },
    async add(email) {
      const result = await pool.query<AccessRow>(
        `INSERT INTO admin_email_autorizado (email)
         VALUES ($1)
         ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
         RETURNING email, data_cadastro`,
        [email],
      )
      return mapRow(result.rows[0])
    },
    async remove(email) {
      const result = await pool.query(
        'DELETE FROM admin_email_autorizado WHERE lower(email) = lower($1)',
        [email],
      )
      return Boolean(result.rowCount)
    },
    async count() {
      const result = await pool.query<{ total: string }>(
        'SELECT COUNT(*)::text AS total FROM admin_email_autorizado',
      )
      return Number(result.rows[0]?.total ?? 0)
    },
  }
}
