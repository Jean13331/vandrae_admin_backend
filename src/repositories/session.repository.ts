import type { Pool } from 'pg'

export type UserSession = {
  id: string
  usuarioId: string
  refreshTokenHash: string
  accessTokenJti: string | null
  expiresAt: Date
  revokedAt: Date | null
}

export type CreateSessionInput = {
  usuarioId: string
  refreshTokenHash: string
  accessTokenJti: string
  userAgent?: string
  ip?: string
  expiresAt: Date
}

export interface SessionRepository {
  create(input: CreateSessionInput): Promise<UserSession>
  findByRefreshHash(hash: string): Promise<UserSession | null>
  findActiveByAccessJti(jti: string): Promise<UserSession | null>
  touch(id: string, accessTokenJti: string, refreshTokenHash: string, expiresAt: Date): Promise<void>
  revokeById(id: string): Promise<void>
  revokeAllForUser(usuarioId: string): Promise<void>
}

type SessionRow = {
  id: string
  usuario_id: string
  refresh_token_hash: string
  access_token_jti: string | null
  data_expiracao: Date | string
  data_revogacao: Date | string | null
}

function toDate(value: Date | string | null) {
  if (!value) return null
  return value instanceof Date ? value : new Date(value)
}

function mapSession(row: SessionRow): UserSession {
  return {
    id: row.id,
    usuarioId: row.usuario_id,
    refreshTokenHash: row.refresh_token_hash,
    accessTokenJti: row.access_token_jti,
    expiresAt: toDate(row.data_expiracao) ?? new Date(0),
    revokedAt: toDate(row.data_revogacao),
  }
}

const sessionSelect = `
  SELECT id, usuario_id, refresh_token_hash, access_token_jti, data_expiracao, data_revogacao
  FROM sessao_usuario
`

export function createPostgresSessionRepository(pool: Pool): SessionRepository {
  return {
    async create(input) {
      const result = await pool.query<SessionRow>(
        `INSERT INTO sessao_usuario (
            usuario_id, refresh_token_hash, access_token_jti, user_agent, ip,
            data_expiracao, data_ultimo_uso
         )
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
         RETURNING id, usuario_id, refresh_token_hash, access_token_jti, data_expiracao, data_revogacao`,
        [
          input.usuarioId,
          input.refreshTokenHash,
          input.accessTokenJti,
          input.userAgent?.slice(0, 255) || null,
          input.ip?.slice(0, 45) || null,
          input.expiresAt,
        ],
      )

      return mapSession(result.rows[0])
    },
    async findByRefreshHash(hash) {
      const result = await pool.query<SessionRow>(
        `${sessionSelect}
         WHERE refresh_token_hash = $1
         LIMIT 1`,
        [hash],
      )
      return result.rows[0] ? mapSession(result.rows[0]) : null
    },
    async findActiveByAccessJti(jti) {
      const result = await pool.query<SessionRow>(
        `${sessionSelect}
         WHERE access_token_jti = $1
           AND data_revogacao IS NULL
           AND data_expiracao > CURRENT_TIMESTAMP
         LIMIT 1`,
        [jti],
      )
      return result.rows[0] ? mapSession(result.rows[0]) : null
    },
    async touch(id, accessTokenJti, refreshTokenHash, expiresAt) {
      await pool.query(
        `UPDATE sessao_usuario
         SET access_token_jti = $2,
             refresh_token_hash = $3,
             data_expiracao = $4,
             data_ultimo_uso = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [id, accessTokenJti, refreshTokenHash, expiresAt],
      )
    },
    async revokeById(id) {
      await pool.query(
        `UPDATE sessao_usuario
         SET data_revogacao = CURRENT_TIMESTAMP,
             access_token_jti = NULL
         WHERE id = $1
           AND data_revogacao IS NULL`,
        [id],
      )
    },
    async revokeAllForUser(usuarioId) {
      await pool.query(
        `UPDATE sessao_usuario
         SET data_revogacao = CURRENT_TIMESTAMP,
             access_token_jti = NULL
         WHERE usuario_id = $1
           AND data_revogacao IS NULL`,
        [usuarioId],
      )
    },
  }
}
