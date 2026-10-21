import type { Pool } from 'pg'

export type ApoioTrailActivity = {
  trilhaId: string
  trilhaNome: string
  trilhaAtiva: boolean
  buscou: boolean
  baixou: boolean
  ultimoTermo: string | null
  dataUltimaBusca: string | null
  dataDownload: string | null
}

export type ApoioUserSummary = {
  id: string
  nome: string
  email: string
  ativo: boolean
  cidade: string | null
  estado: string | null
  trilhas: ApoioTrailActivity[]
}

function toIso(value: Date | string | null | undefined) {
  if (!value) return null
  return new Date(value).toISOString()
}

export function createApoioRepository(pool: Pool) {
  return {
    async recordSearch(usuarioId: string, trilhaIds: string[], termo?: string | null) {
      const ids = [...new Set(trilhaIds.filter(Boolean))]
      if (!ids.length) return

      const term = termo?.trim() ? termo.trim().slice(0, 255) : null
      await pool.query(
        `INSERT INTO apoio_trilha_atividade (
            usuario_id, trilha_id, buscou, ultimo_termo,
            data_primeira_busca, data_ultima_busca, data_modificacao
         )
         SELECT $1::uuid, t.id, TRUE, $3,
                CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
         FROM trilha t
         WHERE t.id = ANY($2::uuid[])
         ON CONFLICT (usuario_id, trilha_id) DO UPDATE SET
           buscou = TRUE,
           ultimo_termo = COALESCE(EXCLUDED.ultimo_termo, apoio_trilha_atividade.ultimo_termo),
           data_primeira_busca = COALESCE(apoio_trilha_atividade.data_primeira_busca, CURRENT_TIMESTAMP),
           data_ultima_busca = CURRENT_TIMESTAMP,
           data_modificacao = CURRENT_TIMESTAMP`,
        [usuarioId, ids, term],
      )
    },

    async recordDownload(usuarioId: string, trilhaId: string) {
      await pool.query(
        `INSERT INTO apoio_trilha_atividade (
            usuario_id, trilha_id, buscou, baixou,
            data_primeira_busca, data_ultima_busca, data_download, data_modificacao
         )
         SELECT $1::uuid, t.id, TRUE, TRUE,
                CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
         FROM trilha t
         WHERE t.id = $2::uuid
         ON CONFLICT (usuario_id, trilha_id) DO UPDATE SET
           buscou = TRUE,
           baixou = TRUE,
           data_primeira_busca = COALESCE(apoio_trilha_atividade.data_primeira_busca, CURRENT_TIMESTAMP),
           data_ultima_busca = COALESCE(apoio_trilha_atividade.data_ultima_busca, CURRENT_TIMESTAMP),
           data_download = CURRENT_TIMESTAMP,
           data_modificacao = CURRENT_TIMESTAMP`,
        [usuarioId, trilhaId],
      )
    },

    async searchUsers(q: string): Promise<ApoioUserSummary[]> {
      const needle = q.trim()
      if (!needle) return []

      const users = await pool.query<{
        id: string
        nome: string
        email: string
        ativo: boolean
        cidade: string | null
        estado: string | null
      }>(
        `SELECT id, nome, email, ativo, cidade, estado
         FROM usuario
         WHERE role = 'USER'
           AND (
             nome ILIKE '%' || $1 || '%'
             OR email ILIKE '%' || $1 || '%'
           )
         ORDER BY nome ASC
         LIMIT 40`,
        [needle],
      )

      if (!users.rows.length) return []

      const userIds = users.rows.map((row) => row.id)
      const activities = await pool.query<{
        usuario_id: string
        trilha_id: string
        trilha_nome: string
        trilha_ativa: boolean
        buscou: boolean
        baixou: boolean
        ultimo_termo: string | null
        data_ultima_busca: Date | string | null
        data_download: Date | string | null
      }>(
        `SELECT
            a.usuario_id,
            a.trilha_id,
            t.nome AS trilha_nome,
            t.ativo AS trilha_ativa,
            a.buscou,
            a.baixou,
            a.ultimo_termo,
            a.data_ultima_busca,
            a.data_download
         FROM apoio_trilha_atividade a
         INNER JOIN trilha t ON t.id = a.trilha_id
         WHERE a.usuario_id = ANY($1::uuid[])
         ORDER BY
           COALESCE(a.data_download, a.data_ultima_busca, a.data_modificacao) DESC NULLS LAST,
           t.nome ASC`,
        [userIds],
      )

      const byUser = new Map<string, ApoioTrailActivity[]>()
      for (const row of activities.rows) {
        const list = byUser.get(row.usuario_id) ?? []
        list.push({
          trilhaId: row.trilha_id,
          trilhaNome: row.trilha_nome,
          trilhaAtiva: row.trilha_ativa !== false,
          buscou: row.buscou === true,
          baixou: row.baixou === true,
          ultimoTermo: row.ultimo_termo,
          dataUltimaBusca: toIso(row.data_ultima_busca),
          dataDownload: toIso(row.data_download),
        })
        byUser.set(row.usuario_id, list)
      }

      return users.rows.map((user) => ({
        id: user.id,
        nome: user.nome,
        email: user.email,
        ativo: user.ativo !== false,
        cidade: user.cidade,
        estado: user.estado,
        trilhas: byUser.get(user.id) ?? [],
      }))
    },
  }
}

export type ApoioRepository = ReturnType<typeof createApoioRepository>
