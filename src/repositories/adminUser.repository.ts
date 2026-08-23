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
  createdAt?: string
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
  findDetail(id: string): Promise<CommunityUserDetail | null>
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
    createdAt: new Date(row.data_cadastro).toISOString(),
  }
}

function mapUserRecord(row: UsuarioRow): AdminUserRecord {
  return {
    ...mapPublicUser(row),
    passwordHash: row.senha,
  }
}

const usuarioSelect = `
  SELECT id, codigo, nome, email, senha, data_nascimento, cidade, estado,
         data_cadastro, role, ativo
  FROM usuario
`

export function createPostgresAdminUserRepository(pool: Pool): AdminUserRepository {
  return {
    async findByEmail(email) {
      const result = await pool.query<UsuarioRow>(
        `${usuarioSelect}
         WHERE lower(email) = lower($1)
         LIMIT 1`,
        [email.trim()],
      )

      return result.rows[0] ? mapUserRecord(result.rows[0]) : null
    },
    async findById(id) {
      const result = await pool.query<UsuarioRow>(
        `${usuarioSelect}
         WHERE id = $1
         LIMIT 1`,
        [id],
      )

      return result.rows[0] ? mapUserRecord(result.rows[0]) : null
    },
    async findByGoogleSub(googleSub) {
      const result = await pool.query<UsuarioRow>(
        `${usuarioSelect}
         WHERE google_sub = $1
         LIMIT 1`,
        [googleSub],
      )

      return result.rows[0] ? mapUserRecord(result.rows[0]) : null
    },
    async list(filters = {}) {
      const result = await pool.query<UsuarioRow>(
        `${usuarioSelect}
         WHERE ($1::text IS NULL OR nome ILIKE '%' || $1 || '%' OR email ILIKE '%' || $1 || '%')
           AND ($2::text IS NULL OR role = $2)
         ORDER BY data_cadastro DESC`,
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
         RETURNING id, codigo, nome, email, senha, data_nascimento, cidade, estado,
                   data_cadastro, role, ativo`,
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
         RETURNING id, codigo, nome, email, senha, data_nascimento, cidade, estado,
                   data_cadastro, role, ativo`,
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
         RETURNING id, codigo, nome, email, senha, data_nascimento, cidade, estado,
                   data_cadastro, role, ativo`,
        [id, googleSub],
      )
      return result.rows[0] ? mapUserRecord(result.rows[0]) : null
    },
    async setAtivo(id, ativo) {
      const result = await pool.query<UsuarioRow>(
        `UPDATE usuario
         SET ativo = $2, data_modificacao = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING id, codigo, nome, email, senha, data_nascimento, cidade, estado,
                   data_cadastro, role, ativo`,
        [id, ativo],
      )
      return result.rows[0] ? mapPublicUser(result.rows[0]) : null
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
