import { Pool } from 'pg'
import type { Env } from '../config/env'
import { createPoolConfig, describeDatabaseTarget } from './config'
import { ensureSchema } from './ensureSchema'
import { hashPlaintextPasswords } from '../lib/password'
import { logger } from '../lib/logger'

export async function connectDatabase(env: Env) {
  const pool = new Pool(createPoolConfig(env))

  try {
    await pool.query('SELECT 1')
  } catch (error) {
    await pool.end().catch(() => undefined)
    const reason =
      error instanceof Error && error.message
        ? error.message
        : 'erro desconhecido'
    throw new Error(
      `Não foi possível conectar ao PostgreSQL (${describeDatabaseTarget(env)}): ${reason}. Confira as credenciais no .env.`,
    )
  }

  await ensureSchema(pool)
  await hashPlaintextPasswords(pool)
  logger.info(`[database] conectado em ${describeDatabaseTarget(env)}`)
  return pool
}

export async function pingDatabase(pool: Pool) {
  try {
    await pool.query('SELECT 1')
    return true
  } catch {
    return false
  }
}
