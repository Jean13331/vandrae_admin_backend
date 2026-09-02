import type { Pool } from 'pg'

export async function ensurePasswordResetColumns(pool: Pool) {
  await pool.query(`
    ALTER TABLE usuario
      ADD COLUMN IF NOT EXISTS senha_reset_hash VARCHAR(64),
      ADD COLUMN IF NOT EXISTS senha_reset_expira TIMESTAMPTZ
  `)
  await pool.query(`
    CREATE INDEX IF NOT EXISTS usuario_senha_reset_hash_idx
      ON usuario (senha_reset_hash)
      WHERE senha_reset_hash IS NOT NULL
  `)
}
