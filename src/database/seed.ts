import type { Pool } from 'pg'
import type { Env } from '../config/env'
import { hashPassword } from '../lib/password'

export async function seedAdminUser(pool: Pool, env: Env) {
  if (!env.ADMIN_SEED_EMAIL || !env.ADMIN_SEED_PASSWORD) {
    return
  }

  const existing = await pool.query('SELECT 1 FROM usuario WHERE lower(email) = lower($1) LIMIT 1', [
    env.ADMIN_SEED_EMAIL,
  ])

  if (existing.rowCount) {
    return
  }

  const passwordHash = await hashPassword(env.ADMIN_SEED_PASSWORD)
  const codigoResult = await pool.query<{ next: string }>(
    'SELECT COALESCE(MAX(codigo), 0) + 1 AS next FROM usuario',
  )

  await pool.query(
    `INSERT INTO usuario (
        codigo, nome, email, senha, data_nascimento, cidade, estado, role, ativo
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'ADMIN', TRUE)`,
    [
      Number(codigoResult.rows[0]?.next ?? 1),
      env.ADMIN_SEED_NAME,
      env.ADMIN_SEED_EMAIL.toLowerCase(),
      passwordHash,
      '1990-01-01',
      'Não informado',
      'SP',
    ],
  )
}

export async function seedAllowedEmails(pool: Pool, env: Env) {
  const emails = [
    ...new Set([
      ...(env.ADMIN_SEED_EMAIL ? [env.ADMIN_SEED_EMAIL.toLowerCase()] : []),
      ...env.ADMIN_ALLOWED_EMAILS,
    ]),
  ]

  for (const email of emails) {
    await pool.query(
      `INSERT INTO admin_email_autorizado (email)
       VALUES ($1)
       ON CONFLICT (email) DO NOTHING`,
      [email],
    )
  }
}
