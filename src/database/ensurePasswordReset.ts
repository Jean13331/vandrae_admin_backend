import type { Pool } from 'pg'

export async function ensurePasswordResetColumns(pool: Pool) {
  await pool.query(`
    ALTER TABLE usuario
      ADD COLUMN IF NOT EXISTS senha_reset_hash VARCHAR(64),
      ADD COLUMN IF NOT EXISTS senha_reset_expira TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS reativacao_hash VARCHAR(64),
      ADD COLUMN IF NOT EXISTS reativacao_expira TIMESTAMPTZ
  `)
  await pool.query(`
    CREATE INDEX IF NOT EXISTS usuario_senha_reset_hash_idx
      ON usuario (senha_reset_hash)
      WHERE senha_reset_hash IS NOT NULL
  `)
  await pool.query(`
    CREATE INDEX IF NOT EXISTS usuario_reativacao_hash_idx
      ON usuario (reativacao_hash)
      WHERE reativacao_hash IS NOT NULL
  `)
}
