import type { Pool } from 'pg'
import { schemaStatements } from './schema'

export async function ensureSchema(pool: Pool) {
  for (const statement of schemaStatements) {
    await pool.query(statement)
  }
}
