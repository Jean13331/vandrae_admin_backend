import type { Pool } from 'pg'

export type ReportStatus = 'PENDENTE' | 'EM_ANALISE' | 'ACEITA' | 'REJEITADA'

export type ReportPerson = { id: string; nome: string; email: string }

export type Report = {
  id: string
  motivo: string
  descricao: string
  status: ReportStatus
  createdAt: string
  alvo: 'TRILHA' | 'PONTO' | 'FOTO' | 'AVISO'
  alvoNome: string | null
  fotoUrl: string | null
  denunciante: ReportPerson
  responsavel: ReportPerson | null
  responsavelPapel: string
  autor: ReportPerson
  trilha: { id: string; nome: string; ativo: boolean; autor: ReportPerson | null }
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

function person(id: string, nome: string, email: string): ReportPerson {
  return { id, nome, email }
}

function alvoNome(
  alvo: Report['alvo'],
  row: { ponto_nome: string | null; foto_codigo: string | number | null; aviso_tipo: string | null },
) {
  if (alvo === 'PONTO') return row.ponto_nome
  if (alvo === 'FOTO') return row.foto_codigo != null ? `Foto ${row.foto_codigo}` : 'Foto'
  if (alvo === 'AVISO') return row.aviso_tipo
  return null
}

function mapReport(row: {
  id: string
  motivo: string
  descricao: string
  status: ReportStatus
  data_criacao: Date | string
  alvo: string
  fotografia_id: string | null
  aviso_trilha_id: string | null
  ponto_nome: string | null
  foto_codigo: string | number | null
  foto_url: string | null
  foto_tem_arquivo: boolean
  aviso_tipo: string | null
  aviso_tem_arquivo: boolean
  denunciante_id: string
  denunciante_nome: string
  denunciante_email: string
  trilha_id: string
  trilha_nome: string
  trilha_ativa: boolean
  trilha_autor_id: string | null
  trilha_autor_nome: string | null
  trilha_autor_email: string | null
  foto_autor_id: string | null
  foto_autor_nome: string | null
  foto_autor_email: string | null
  aviso_autor_id: string | null
  aviso_autor_nome: string | null
  aviso_autor_email: string | null
}): Report {
  const alvo = (
    row.alvo === 'PONTO' || row.alvo === 'FOTO' || row.alvo === 'AVISO' ? row.alvo : 'TRILHA'
  ) as Report['alvo']
  const trilhaAutor =
    row.trilha_autor_id && row.trilha_autor_nome && row.trilha_autor_email
      ? person(row.trilha_autor_id, row.trilha_autor_nome, row.trilha_autor_email)
      : null
  const denunciante = person(row.denunciante_id, row.denunciante_nome, row.denunciante_email)
  const fotoAutor =
    row.foto_autor_id && row.foto_autor_nome && row.foto_autor_email
      ? person(row.foto_autor_id, row.foto_autor_nome, row.foto_autor_email)
      : null
  const avisoAutor =
    row.aviso_autor_id && row.aviso_autor_nome && row.aviso_autor_email
      ? person(row.aviso_autor_id, row.aviso_autor_nome, row.aviso_autor_email)
      : null

  let responsavel = trilhaAutor
  let responsavelPapel = 'Criou a trilha'
  if (alvo === 'FOTO') {
    responsavel = fotoAutor ?? trilhaAutor
    responsavelPapel = 'Subiu a foto'
  } else if (alvo === 'AVISO') {
    responsavel = avisoAutor ?? trilhaAutor
    responsavelPapel = 'Registrou o aviso'
  } else if (alvo === 'PONTO') {
    responsavelPapel = 'Criou a trilha (ponto)'
  }

  if (!responsavel) {
    responsavelPapel = 'Responsável não identificado'
  }

  let fotoUrl: string | null = null
  if (alvo === 'FOTO' && row.fotografia_id && Boolean(row.foto_tem_arquivo)) {
    fotoUrl = `/admin/trails/${row.trilha_id}/photos/${row.fotografia_id}`
  } else if (alvo === 'FOTO' && row.foto_url) {
    fotoUrl = row.foto_url
  } else if (alvo === 'AVISO' && row.aviso_trilha_id && Boolean(row.aviso_tem_arquivo)) {
    fotoUrl = `/admin/trails/${row.trilha_id}/alerts/${row.aviso_trilha_id}/photo`
  }

  return {
    id: row.id,
    motivo: row.motivo,
    descricao: row.descricao,
    status: row.status,
    createdAt: toIso(row.data_criacao),
    alvo,
    alvoNome: alvoNome(alvo, row),
    fotoUrl,
    denunciante,
    responsavel,
    responsavelPapel,
    autor: denunciante,
    trilha: {
      id: row.trilha_id,
      nome: row.trilha_nome,
      ativo: row.trilha_ativa,
      autor: trilhaAutor,
    },
  }
}

export function createModerationRepository(pool: Pool) {
  return {
    async listReports(status?: ReportStatus) {
      const result = await pool.query(
        `SELECT d.id, d.motivo, d.descricao, d.status, d.data_criacao,
                COALESCE(d.alvo, 'TRILHA') AS alvo,
                d.fotografia_id, d.aviso_trilha_id,
                p.nome AS ponto_nome,
                f.codigo AS foto_codigo,
                f.url AS foto_url,
                (f.arquivo IS NOT NULL) AS foto_tem_arquivo,
                av.tipo AS aviso_tipo,
                (av.arquivo IS NOT NULL) AS aviso_tem_arquivo,
                den.id AS denunciante_id, den.nome AS denunciante_nome, den.email AS denunciante_email,
                t.id AS trilha_id, t.nome AS trilha_nome, t.ativo AS trilha_ativa,
                tu.id AS trilha_autor_id, tu.nome AS trilha_autor_nome, tu.email AS trilha_autor_email,
                fu.id AS foto_autor_id, fu.nome AS foto_autor_nome, fu.email AS foto_autor_email,
                au.id AS aviso_autor_id, au.nome AS aviso_autor_nome, au.email AS aviso_autor_email
         FROM denuncias d
         INNER JOIN usuario den ON den.id = d.usuario_id
         INNER JOIN trilha t ON t.id = d.trilha_id
         LEFT JOIN usuario tu ON tu.id = t.usuario_id
         LEFT JOIN pontos_trilha p ON p.id = d.pontos_trilha_id
         LEFT JOIN fotografia f ON f.id = d.fotografia_id
         LEFT JOIN usuario fu ON fu.id = f.usuario_id
         LEFT JOIN aviso_trilha av ON av.id = d.aviso_trilha_id
         LEFT JOIN usuario au ON au.id = av.usuario_id
         WHERE ($1::text IS NULL OR d.status = $1)
         ORDER BY d.data_criacao DESC
         LIMIT 200`,
        [status ?? null],
      )

      return result.rows.map(mapReport)
    },

    async updateReport(id: string, status: ReportStatus) {
      const updated = await pool.query<{
        id: string
        trilha_id: string
        alvo: string | null
        pontos_trilha_id: string | null
        fotografia_id: string | null
        aviso_trilha_id: string | null
      }>(
        `UPDATE denuncias SET status = $2 WHERE id = $1
         RETURNING id, trilha_id, alvo, pontos_trilha_id, fotografia_id, aviso_trilha_id`,
        [id, status],
      )
      const row = updated.rows[0]
      if (!row) return null

      if (status === 'ACEITA') {
        const alvo = row.alvo || 'TRILHA'
        if (alvo === 'FOTO' && row.fotografia_id) {
          await pool.query(`UPDATE fotografia SET ativo = FALSE WHERE id = $1`, [row.fotografia_id])
        } else if (alvo === 'PONTO' && row.pontos_trilha_id) {
          await pool.query(`UPDATE pontos_trilha SET ativo = FALSE WHERE id = $1`, [row.pontos_trilha_id])
        } else if (alvo === 'AVISO' && row.aviso_trilha_id) {
          await pool.query(`UPDATE aviso_trilha SET ativo = FALSE WHERE id = $1`, [row.aviso_trilha_id])
        } else {
          await pool.query(
            `UPDATE trilha SET ativo = FALSE, data_modificacao = CURRENT_TIMESTAMP WHERE id = $1`,
            [row.trilha_id],
          )
        }
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
