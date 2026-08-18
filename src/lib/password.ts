import bcrypt from 'bcryptjs'
import type { Pool } from 'pg'
import { logger } from './logger'

const BCRYPT_ROUNDS = 10

export function isBcryptHash(value: string) {
  return /^\$2[aby]\$/.test(value)
}

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS)
}

export function verifyPassword(plain: string, storedHash: string) {
  if (!isBcryptHash(storedHash)) {
    return Promise.resolve(false)
  }

  return bcrypt.compare(plain, storedHash)
}

export async function hashPlaintextPasswords(pool: Pool) {
  const result = await pool.query<{ id: string; senha: string }>(
    `SELECT id, senha
     FROM usuario
     WHERE senha IS NOT NULL
       AND senha !~ '^\\$2[aby]\\$'`,
  )

  if (!result.rowCount) {
    return
  }

  for (const row of result.rows) {
    const passwordHash = await hashPassword(row.senha)
    await pool.query('UPDATE usuario SET senha = $1, data_modificacao = CURRENT_TIMESTAMP WHERE id = $2', [
      passwordHash,
      row.id,
    ])
  }

  logger.info(`[database] ${result.rowCount} senha(s) convertida(s) para bcrypt`)
}
