import type { Pool } from 'pg'

export type AdminRole = 'admin' | 'user'

export type AdminUser = {
  id: string
  name: string
  email: string
  role: AdminRole
  codigo?: number
  dataNascimento?: string
  cidade?: string
  estado?: string
  ativo?: boolean
  /** true se o uuid está em usuario_deletado — nunca reativar */
  excluido?: boolean
  excluidoEm?: string
  createdAt?: string
  photoUrl?: string | null
}

export type AdminUserRecord = AdminUser & {
  passwordHash: string | null
}

export type CreateUsuarioInput = {
  nome: string
  email: string
  passwordHash: string | null
  dataNascimento: string
  cidade: string
  estado: string
  authProvider?: 'password' | 'google'
  googleSub?: string | null
}

export interface AdminUserRepository {
  findByEmail(email: string): Promise<AdminUserRecord | null>
  findByGoogleSub(googleSub: string): Promise<AdminUserRecord | null>
  findById(id: string): Promise<AdminUserRecord | null>
  list(filters?: { q?: string; role?: 'admin' | 'user' }): Promise<AdminUser[]>
  create(input: CreateUsuarioInput): Promise<AdminUser>
  createCommunity(input: CreateUsuarioInput): Promise<AdminUserRecord>
  linkGoogleSub(id: string, googleSub: string): Promise<AdminUserRecord | null>
  setAtivo(id: string, ativo: boolean): Promise<AdminUser | null>
  isDeleted(id: string): Promise<boolean>
  /** Arquiva em usuario_deletado, anonimiza PII e inativa. Só use para a conta autenticada. */
  archiveAndDeleteOwn(id: string): Promise<{ id: string; name: string; email: string } | null>
  setPassword(id: string, passwordHash: string): Promise<AdminUserRecord | null>
  setPasswordReset(id: string, tokenHash: string, expiresAt: Date): Promise<void>
  findByPasswordResetHash(tokenHash: string): Promise<AdminUserRecord | null>
  clearPasswordReset(id: string): Promise<void>
  setReactivationCode(id: string, codeHash: string, expiresAt: Date): Promise<void>
  findByReactivationHash(codeHash: string): Promise<AdminUserRecord | null>
  clearReactivationCode(id: string): Promise<void>
  findDetail(id: string): Promise<CommunityUserDetail | null>
  findProfilePhoto(id: string): Promise<{ arquivo: Buffer; contentType: string } | null>
  setProfilePhoto(id: string, arquivo: Buffer, contentType: string): Promise<AdminUserRecord | null>
  clearProfilePhoto(id: string): Promise<AdminUserRecord | null>
}

export type CommunityUserDetail = AdminUser & {
  trilhas: number
  fotos: number
  denuncias: number
  avaliacoes: number
  trilhasRecentes: Array<{ id: string; nome: string; ativo: boolean }>
  denunciasRecentes: Array<{ id: string; motivo: string; status: string; createdAt: string }>
}

export function toPublicUser(record: AdminUserRecord): AdminUser {
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    role: record.role,
    photoUrl: record.photoUrl ?? null,
  }
}

export function toPublicAdminUser(record: AdminUserRecord): AdminUser {
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    role: 'admin',
  }
}

type UsuarioRow = {
  id: string
  codigo: number
  nome: string
  email: string
  senha: string | null
  data_nascimento: Date | string
  cidade: string
  estado: string
  data_cadastro: Date | string
  role: string
  ativo: boolean
  tem_foto?: boolean
  excluido?: boolean
  data_exclusao?: Date | string | null
}

function toDateOnly(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value)
  return date.toISOString().slice(0, 10)
}

function mapPublicUser(row: UsuarioRow): AdminUser {
  return {
    id: row.id,
    name: row.nome,
    email: row.email,
    role: row.role === 'ADMIN' ? 'admin' : 'user',
    codigo: row.codigo,
    dataNascimento: toDateOnly(row.data_nascimento),
    cidade: row.cidade,
    estado: row.estado,
    ativo: row.ativo,
    excluido: Boolean(row.excluido),
    excluidoEm: row.data_exclusao ? new Date(row.data_exclusao).toISOString() : undefined,
    createdAt: new Date(row.data_cadastro).toISOString(),
    photoUrl: row.tem_foto ? '/auth/me/photo' : null,
  }
}

function mapUserRecord(row: UsuarioRow): AdminUserRecord {
  return {
    ...mapPublicUser(row),
    passwordHash: row.senha,
  }
}

const usuarioSelect = `
  SELECT u.id, u.codigo, u.nome, u.email, u.senha, u.data_nascimento, u.cidade, u.estado,
         u.data_cadastro, u.role, u.ativo, (u.foto IS NOT NULL) AS tem_foto,
         (d.id IS NOT NULL) AS excluido, d.data_exclusao
  FROM usuario u
  LEFT JOIN usuario_deletado d ON d.id = u.id
`

const usuarioReturning = `
  id, codigo, nome, email, senha, data_nascimento, cidade, estado,
  data_cadastro, role, ativo, (foto IS NOT NULL) AS tem_foto,
  FALSE AS excluido, NULL::timestamptz AS data_exclusao
`

export function createPostgresAdminUserRepository(pool: Pool): AdminUserRepository {
  return {
    async findByEmail(email) {
      const result = await pool.query<UsuarioRow>(
        `${usuarioSelect}
         WHERE lower(u.email) = lower($1)
         LIMIT 1`,
        [email.trim()],
      )

      return result.rows[0] ? mapUserRecord(result.rows[0]) : null
    },
    async findById(id) {
      const result = await pool.query<UsuarioRow>(
        `${usuarioSelect}
         WHERE u.id = $1
         LIMIT 1`,
        [id],
      )

      return result.rows[0] ? mapUserRecord(result.rows[0]) : null
    },
    async findByGoogleSub(googleSub) {
      const result = await pool.query<UsuarioRow>(
        `${usuarioSelect}
         WHERE u.google_sub = $1
         LIMIT 1`,
        [googleSub],
      )

      return result.rows[0] ? mapUserRecord(result.rows[0]) : null
    },
    async list(filters = {}) {
      const result = await pool.query<UsuarioRow>(
        `${usuarioSelect}
         WHERE ($1::text IS NULL OR u.nome ILIKE '%' || $1 || '%' OR u.email ILIKE '%' || $1 || '%')
           AND ($2::text IS NULL OR u.role = $2)
         ORDER BY u.data_cadastro DESC`,
        [filters.q || null, filters.role === 'admin' ? 'ADMIN' : filters.role === 'user' ? 'USER' : null],
      )

      return result.rows.map(mapPublicUser)
    },
    async create(input) {
      const codigoResult = await pool.query<{ next: string }>(
        'SELECT COALESCE(MAX(codigo), 0) + 1 AS next FROM usuario',
      )
      const codigo = Number(codigoResult.rows[0]?.next ?? 1)

      const result = await pool.query<UsuarioRow>(
        `INSERT INTO usuario (
            codigo, nome, email, senha, data_nascimento, cidade, estado, role, ativo
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'ADMIN', TRUE)
         RETURNING ${usuarioReturning.trim()}`,
        [
          codigo,
          input.nome,
          input.email,
          input.passwordHash,
          input.dataNascimento,
          input.cidade,
          input.estado,
        ],
      )

      return mapPublicUser(result.rows[0])
    },
    async createCommunity(input) {
      const codigoResult = await pool.query<{ next: string }>(
        'SELECT COALESCE(MAX(codigo), 0) + 1 AS next FROM usuario',
      )
      const codigo = Number(codigoResult.rows[0]?.next ?? 1)

      const result = await pool.query<UsuarioRow>(
        `INSERT INTO usuario (
            codigo, nome, email, senha, data_nascimento, cidade, estado, role, ativo,
            auth_provider, google_sub
         )
         VALUES ($1, $2, $3, $4, $5::date, $6, $7, 'USER', TRUE, $8, $9)
         RETURNING ${usuarioReturning.trim()}`,
        [
          codigo,
          input.nome,
          input.email,
          input.passwordHash,
          input.dataNascimento,
          input.cidade,
          input.estado,
          input.authProvider ?? 'password',
          input.googleSub ?? null,
        ],
      )

      return mapUserRecord(result.rows[0])
    },
    async linkGoogleSub(id, googleSub) {
      const result = await pool.query<UsuarioRow>(
        `UPDATE usuario
         SET google_sub = $2, data_modificacao = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING ${usuarioReturning.trim()}`,
        [id, googleSub],
      )
      return result.rows[0] ? mapUserRecord(result.rows[0]) : null
    },
    async setAtivo(id, ativo) {
      if (ativo) {
        const deleted = await pool.query<{ exists: boolean }>(
          `SELECT EXISTS(SELECT 1 FROM usuario_deletado WHERE id = $1) AS exists`,
          [id],
        )
        if (deleted.rows[0]?.exists) {
          return null
        }
      }

      const result = await pool.query<UsuarioRow>(
        `UPDATE usuario
         SET ativo = $2, data_modificacao = CURRENT_TIMESTAMP
         WHERE id = $1
           AND NOT EXISTS (SELECT 1 FROM usuario_deletado d WHERE d.id = usuario.id)
         RETURNING ${usuarioReturning.trim()}`,
        [id, ativo],
      )
      return result.rows[0] ? mapPublicUser(result.rows[0]) : null
    },
    async isDeleted(id) {
      const result = await pool.query<{ exists: boolean }>(
        `SELECT EXISTS(SELECT 1 FROM usuario_deletado WHERE id = $1) AS exists`,
        [id],
      )
      return Boolean(result.rows[0]?.exists)
    },
    async archiveAndDeleteOwn(id) {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')

        const already = await client.query<{ exists: boolean }>(
          `SELECT EXISTS(SELECT 1 FROM usuario_deletado WHERE id = $1) AS exists`,
          [id],
        )
        if (already.rows[0]?.exists) {
          await client.query('ROLLBACK')
          return null
        }

        const current = await client.query<{ id: string; nome: string; email: string }>(
          `SELECT id, nome, email
           FROM usuario
           WHERE id = $1
           FOR UPDATE`,
          [id],
        )
        const row = current.rows[0]
        if (!row) {
          await client.query('ROLLBACK')
          return null
        }

        // Guarda o e-mail/nome originais ligados a ESTE uuid. Um cadastro novo com o mesmo
        // e-mail vira outro uuid e não conflita com este histórico.
        await client.query(
          `INSERT INTO usuario_deletado (id, nome, email, data_exclusao)
           VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
          [row.id, row.nome, row.email],
        )

        await client.query(
          `UPDATE usuario
           SET nome = 'Conta excluída',
               email = $2,
               senha = NULL,
               google_sub = NULL,
               auth_provider = 'password',
               foto = NULL,
               foto_content_type = NULL,
               senha_reset_hash = NULL,
               senha_reset_expira = NULL,
               reativacao_hash = NULL,
               reativacao_expira = NULL,
               ativo = FALSE,
               data_modificacao = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [row.id, `deleted+${row.id}@vandrae.invalid`],
        )

        await client.query(`DELETE FROM admin_email_autorizado WHERE lower(email) = lower($1)`, [
          row.email,
        ])

        await client.query('COMMIT')
        return { id: row.id, name: row.nome, email: row.email }
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
    },
    async setPassword(id, passwordHash) {
      const result = await pool.query<UsuarioRow>(
        `UPDATE usuario
         SET senha = $2,
             senha_reset_hash = NULL,
             senha_reset_expira = NULL,
             data_modificacao = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING ${usuarioReturning.trim()}`,
        [id, passwordHash],
      )
      return result.rows[0] ? mapUserRecord(result.rows[0]) : null
    },
    async setPasswordReset(id, tokenHash, expiresAt) {
      await pool.query(
        `UPDATE usuario
         SET senha_reset_hash = $2, senha_reset_expira = $3, data_modificacao = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [id, tokenHash, expiresAt],
      )
    },
    async findByPasswordResetHash(tokenHash) {
      const result = await pool.query<UsuarioRow>(
        `${usuarioSelect}
         WHERE u.senha_reset_hash = $1
           AND u.senha_reset_expira IS NOT NULL
           AND u.senha_reset_expira > CURRENT_TIMESTAMP
         LIMIT 1`,
        [tokenHash],
      )
      return result.rows[0] ? mapUserRecord(result.rows[0]) : null
    },
    async clearPasswordReset(id) {
      await pool.query(
        `UPDATE usuario
         SET senha_reset_hash = NULL, senha_reset_expira = NULL, data_modificacao = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [id],
      )
    },
    async setReactivationCode(id, codeHash, expiresAt) {
      await pool.query(
        `UPDATE usuario
         SET reativacao_hash = $2, reativacao_expira = $3, data_modificacao = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [id, codeHash, expiresAt],
      )
    },
    async findByReactivationHash(codeHash) {
      const result = await pool.query<UsuarioRow>(
        `${usuarioSelect}
         WHERE u.reativacao_hash = $1
           AND u.reativacao_expira IS NOT NULL
           AND u.reativacao_expira > CURRENT_TIMESTAMP
         LIMIT 1`,
        [codeHash],
      )
      return result.rows[0] ? mapUserRecord(result.rows[0]) : null
    },
    async clearReactivationCode(id) {
      await pool.query(
        `UPDATE usuario
         SET reativacao_hash = NULL, reativacao_expira = NULL, data_modificacao = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [id],
      )
    },
    async findProfilePhoto(id) {
      const result = await pool.query<{ arquivo: Buffer; content_type: string | null }>(
        `SELECT foto AS arquivo, COALESCE(foto_content_type, 'image/jpeg') AS content_type
         FROM usuario
         WHERE id = $1 AND foto IS NOT NULL
         LIMIT 1`,
        [id],
      )
      const row = result.rows[0]
      if (!row?.arquivo) return null
      return {
        arquivo: row.arquivo,
        contentType: row.content_type || 'image/jpeg',
      }
    },
    async setProfilePhoto(id, arquivo, contentType) {
      const result = await pool.query<UsuarioRow>(
        `UPDATE usuario
         SET foto = $2, foto_content_type = $3, data_modificacao = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING ${usuarioReturning.trim()}`,
        [id, arquivo, contentType],
      )
      return result.rows[0] ? mapUserRecord(result.rows[0]) : null
    },
    async clearProfilePhoto(id) {
      const result = await pool.query<UsuarioRow>(
        `UPDATE usuario
         SET foto = NULL, foto_content_type = NULL, data_modificacao = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING ${usuarioReturning.trim()}`,
        [id],
      )
      return result.rows[0] ? mapUserRecord(result.rows[0]) : null
    },
    async findDetail(id) {
      const user = await this.findById(id)
      if (!user) return null

      const [stats, trails, reports] = await Promise.all([
        pool.query<{ trilhas: string; fotos: string; denuncias: string; avaliacoes: string }>(
          `SELECT
              (SELECT COUNT(*) FROM trilha WHERE usuario_id = $1)::text AS trilhas,
              (SELECT COUNT(*) FROM fotografia WHERE usuario_id = $1)::text AS fotos,
              (SELECT COUNT(*) FROM denuncias WHERE usuario_id = $1)::text AS denuncias,
              (SELECT COUNT(*) FROM avaliacao WHERE usuario_id = $1)::text AS avaliacoes`,
          [id],
        ),
        pool.query<{ id: string; nome: string; ativo: boolean }>(
          `SELECT id, nome, ativo
           FROM trilha
           WHERE usuario_id = $1
           ORDER BY data_cadastro DESC
           LIMIT 8`,
          [id],
        ),
        pool.query<{ id: string; motivo: string; status: string; data_criacao: Date | string }>(
          `SELECT id, motivo, status, data_criacao
           FROM denuncias
           WHERE usuario_id = $1
           ORDER BY data_criacao DESC
           LIMIT 8`,
          [id],
        ),
      ])
      const row = stats.rows[0]
      const { passwordHash: _passwordHash, ...publicUser } = user
      return {
        ...publicUser,
        trilhas: Number(row?.trilhas ?? 0),
        fotos: Number(row?.fotos ?? 0),
        denuncias: Number(row?.denuncias ?? 0),
        avaliacoes: Number(row?.avaliacoes ?? 0),
        trilhasRecentes: trails.rows,
        denunciasRecentes: reports.rows.map((item) => ({
          id: item.id,
          motivo: item.motivo,
          status: item.status,
          createdAt: new Date(item.data_criacao).toISOString(),
        })),
      }
    },
  }
}
