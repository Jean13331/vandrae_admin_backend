import type { Pool } from 'pg'

export type ReportStatus = 'PENDENTE' | 'EM_ANALISE' | 'ACEITA' | 'REJEITADA'

export type Report = {
  id: string
  motivo: string
  descricao: string
  status: ReportStatus
  createdAt: string
  autor: { id: string; nome: string; email: string }
  trilha: { id: string; nome: string; ativo: boolean }
}

export type Review = {
  id: string
  nota: number
  comentario: string | null
  oculto: boolean
  createdAt: string
  autor: { id: string; nome: string; email: string }
  trilha: { id: string; nome: string }
}

function toIso(value: Date | string) {
  return new Date(value).toISOString()
}

export function createModerationRepository(pool: Pool) {
  return {
    async listReports(status?: ReportStatus) {
      const result = await pool.query(
        `SELECT d.id, d.motivo, d.descricao, d.status, d.data_criacao,
                u.id AS autor_id, u.nome AS autor_nome, u.email AS autor_email,
                t.id AS trilha_id, t.nome AS trilha_nome, t.ativo AS trilha_ativa
         FROM denuncias d
         INNER JOIN usuario u ON u.id = d.usuario_id
         INNER JOIN trilha t ON t.id = d.trilha_id
         WHERE ($1::text IS NULL OR d.status = $1)
         ORDER BY d.data_criacao DESC
         LIMIT 200`,
        [status ?? null],
      )

      return result.rows.map((row) => ({
        id: row.id,
        motivo: row.motivo,
        descricao: row.descricao,
        status: row.status,
        createdAt: toIso(row.data_criacao),
        autor: { id: row.autor_id, nome: row.autor_nome, email: row.autor_email },
        trilha: { id: row.trilha_id, nome: row.trilha_nome, ativo: row.trilha_ativa },
      })) as Report[]
    },

    async updateReport(id: string, status: ReportStatus) {
      const updated = await pool.query(
        `UPDATE denuncias SET status = $2 WHERE id = $1
         RETURNING id, trilha_id`,
        [id, status],
      )
      const row = updated.rows[0]
      if (!row) return null

      if (status === 'ACEITA') {
        await pool.query(
          `UPDATE trilha SET ativo = FALSE, data_modificacao = CURRENT_TIMESTAMP WHERE id = $1`,
          [row.trilha_id],
        )
      }

      const [report] = (await this.listReports()).filter((item) => item.id === id)
      return report ?? null
    },

    async listReviews(filters: { q?: string; oculto?: boolean }) {
      const result = await pool.query(
        `SELECT a.id, a.nota, a.comentario, COALESCE(a.oculto, FALSE) AS oculto, a.data_cadastro,
                u.id AS autor_id, u.nome AS autor_nome, u.email AS autor_email,
                t.id AS trilha_id, t.nome AS trilha_nome
         FROM avaliacao a
         INNER JOIN usuario u ON u.id = a.usuario_id
         INNER JOIN trilha t ON t.id = a.trilha_id
         WHERE ($1::text IS NULL
            OR t.nome ILIKE '%' || $1 || '%'
            OR u.nome ILIKE '%' || $1 || '%'
            OR COALESCE(a.comentario, '') ILIKE '%' || $1 || '%')
           AND ($2::boolean IS NULL OR COALESCE(a.oculto, FALSE) = $2)
         ORDER BY a.data_cadastro DESC
         LIMIT 200`,
        [filters.q || null, filters.oculto ?? null],
      )

      return result.rows.map((row) => ({
        id: row.id,
        nota: Number(row.nota),
        comentario: row.comentario,
        oculto: Boolean(row.oculto),
        createdAt: toIso(row.data_cadastro),
        autor: { id: row.autor_id, nome: row.autor_nome, email: row.autor_email },
        trilha: { id: row.trilha_id, nome: row.trilha_nome },
      })) as Review[]
    },

    async setReviewHidden(id: string, oculto: boolean) {
      const result = await pool.query(
        `UPDATE avaliacao SET oculto = $2 WHERE id = $1 RETURNING id`,
        [id, oculto],
      )
      return Boolean(result.rowCount)
    },
  }
}

export type ModerationRepository = ReturnType<typeof createModerationRepository>
