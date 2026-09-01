import type { Pool } from 'pg'
import { AppError } from '../lib/errors'
import { ALERT_RESOLVE_THRESHOLD, REPORT_HIDE_THRESHOLD } from '../lib/communityModeration'
import type { TrailElevation } from '../lib/elevation'

export type TrailSummary = {
  id: string
  codigo: number
  nome: string
  descricao: string | null
  cidade: string | null
  estado: string | null
  ativo: boolean
  createdAt: string
  updatedAt: string
  autor: {
    id: string
    nome: string
    email: string
  }
  comprimentoKm: number | null
  pontos: number
  fotos: number
  denunciasPendentes: number
  notaMedia: number | null
  avaliacoes: number
  conclusoes: number
}

export type TrailPoint = {
  id: string
  codigo: number
  tipo: string
  nome: string
  descricao: string | null
  lat: number | null
  lng: number | null
  fotoUrl: string | null
  ativo?: boolean
  createdAt: string
}

export type TrailAlert = {
  id: string
  tipo: string
  descricao: string | null
  lat: number | null
  lng: number | null
  ativo?: boolean
  status: 'ATIVO' | 'RESOLVIDO'
  confirmacoes: number
  createdAt: string
  resolvidoEm: string | null
  autor: {
    id: string
    nome: string
  }
  resolvidoPor: {
    id: string
    nome: string
  } | null
  fotoUrl: string | null
}

export type TrailPhoto = {
  id: string
  codigo: number
  url: string
  descricao: string | null
  ativo: boolean
  createdAt: string
}

export type TrailGeometry = {
  type: 'LineString' | 'MultiLineString'
  coordinates: number[][] | number[][][]
}

export type TrailReview = {
  id: string
  nota: number
  comentario: string | null
  createdAt: string
  autor: { nome: string }
  minha?: boolean
}

export type TrailDetail = TrailSummary & {
  inicio: { lat: number; lng: number } | null
  fim: { lat: number; lng: number } | null
  trajeto: TrailGeometry | null
  pontosDetalhe: TrailPoint[]
  fotografias: TrailPhoto[]
  avisos: TrailAlert[]
  avaliacoesRecentes?: TrailReview[]
  elevacao?: TrailElevation | null
}

export type CreateTrailReviewInput = {
  trilhaId: string
  usuarioId: string
  nota: number
  comentario?: string | null
}

export type ListTrailsFilters = {
  q?: string
  ativo?: boolean
}

export type UpdateTrailInput = {
  nome?: string
  descricao?: string | null
  ativo?: boolean
}

export type TrailPhotoFile = {
  arquivo: Buffer
  contentType: string
}

export type CreateTrailInput = {
  usuarioId: string
  nome: string
  descricao?: string | null
  coordinates: number[][]
  ativo?: boolean
}

export type CreateTrailPointInput = {
  tipo: string
  nome: string
  descricao?: string | null
  lat: number
  lng: number
}

export type CreateTrailPhotoInput = {
  usuarioId: string
  descricao?: string | null
  contentType: string
  arquivo: Buffer
  pontosTrilhaId?: string | null
}

export type CreateTrailAlertInput = {
  usuarioId: string
  tipo: string
  descricao?: string | null
  lat: number
  lng: number
  arquivo?: Buffer | null
  contentType?: string | null
}

export type CreateTrailReportInput = {
  usuarioId: string
  trilhaId: string
  alvo: 'TRILHA' | 'PONTO' | 'FOTO' | 'AVISO'
  motivo: string
  descricao: string
  pontoId?: string | null
  fotoId?: string | null
  avisoId?: string | null
}

export type UserAlert = {
  id: string
  tipo: string
  descricao: string | null
  ativo: boolean
  status: 'ATIVO' | 'RESOLVIDO'
  confirmacoes: number
  createdAt: string
  fotoUrl: string | null
  trilha: { id: string; nome: string; ativo: boolean }
}

export type UserReport = {
  id: string
  alvo: 'TRILHA' | 'PONTO' | 'FOTO' | 'AVISO'
  alvoNome: string | null
  motivo: string
  descricao: string
  status: string
  createdAt: string
  trilha: { id: string; nome: string; ativo: boolean }
}

export type UserCompletedTrail = {
  id: string
  nome: string
  descricao: string | null
  cidade: string | null
  estado: string | null
  ativo: boolean
  comprimentoKm: number | null
  pontos: number
  fotos: number
  completedAt: string
}

export interface TrailRepository {
  list(filters: ListTrailsFilters): Promise<TrailSummary[]>
  listByUser(usuarioId: string): Promise<TrailSummary[]>
  listAlertsByUser(usuarioId: string): Promise<UserAlert[]>
  listReportsByUser(usuarioId: string): Promise<UserReport[]>
  listCompletionsByUser(usuarioId: string): Promise<UserCompletedTrail[]>
  listExplore(): Promise<TrailDetail[]>
  findById(id: string): Promise<TrailDetail | null>
  findPhoto(trailId: string, photoId: string): Promise<TrailPhotoFile | null>
  findExplorePhoto(trailId: string, photoId: string): Promise<TrailPhotoFile | null>
  findAlertPhoto(trailId: string, alertId: string): Promise<TrailPhotoFile | null>
  findExploreAlertPhoto(trailId: string, alertId: string): Promise<TrailPhotoFile | null>
  update(id: string, input: UpdateTrailInput): Promise<TrailDetail | null>
  create(input: CreateTrailInput): Promise<TrailDetail | null>
  addPoint(trailId: string, input: CreateTrailPointInput): Promise<TrailDetail | null>
  addPhoto(trailId: string, input: CreateTrailPhotoInput): Promise<TrailDetail | null>
  addAlert(trailId: string, input: CreateTrailAlertInput): Promise<TrailDetail | null>
  resolveAlert(trailId: string, alertId: string, usuarioId: string): Promise<TrailDetail | null>
  createReport(input: CreateTrailReportInput): Promise<{ id: string }>
  complete(trilhaId: string, usuarioId: string): Promise<{ conclusoes: number; nova: boolean } | null>
  listReviews(trilhaId: string, usuarioId?: string): Promise<{
    notaMedia: number | null
    avaliacoes: number
    reviews: TrailReview[]
  } | null>
  upsertReview(input: CreateTrailReviewInput): Promise<{
    notaMedia: number | null
    avaliacoes: number
    review: TrailReview
    reviews: TrailReview[]
  } | null>
}

type TrailRow = {
  id: string
  codigo: number
  nome: string
  descricao: string | null
  ativo: boolean
  data_cadastro: Date | string
  data_modificacao: Date | string
  autor_id: string
  autor_nome: string
  autor_email: string
  autor_cidade?: string | null
  autor_estado?: string | null
  comprimento_m: string | number | null
  pontos: string | number
  fotos: string | number
  denuncias_pendentes: string | number
  nota_media: string | number | null
  avaliacoes?: string | number
  conclusoes?: string | number
  inicio_lat?: string | number | null
  inicio_lng?: string | number | null
  fim_lat?: string | number | null
  fim_lng?: string | number | null
  trajeto?: TrailGeometry | string | null
}

type PointRow = {
  id: string
  trilha_id?: string
  codigo: number
  tipo: string
  nome: string
  descricao: string | null
  lat: string | number | null
  lng: string | number | null
  ativo?: boolean
  data_cadastro: Date | string
}

type PhotoRow = {
  id: string
  codigo: number
  url: string | null
  tem_arquivo: boolean
  descricao: string | null
  ativo: boolean
  pontos_trilha_id: string | null
  data_cadastro: Date | string
}

type ExplorePhotoRow = PhotoRow & {
  trilha_id: string
}

type AlertRow = {
  id: string
  trilha_id: string
  tipo: string
  descricao: string | null
  ativo: boolean
  status: string | null
  confirmacoes: string | number | null
  lat: string | number | null
  lng: string | number | null
  data_cadastro: Date | string
  data_resolucao: Date | string | null
  autor_id: string
  autor_nome: string
  resolvido_por_id: string | null
  resolvido_por_nome: string | null
  tem_arquivo: boolean
}

function mapAlert(row: AlertRow, app: boolean): TrailAlert {
  const coords = pointLatLng(row.lat, row.lng)
  return {
    id: row.id,
    tipo: row.tipo,
    descricao: row.descricao,
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
    ativo: row.ativo !== false,
    status: row.status === 'RESOLVIDO' ? 'RESOLVIDO' : 'ATIVO',
    confirmacoes: Number(row.confirmacoes ?? 0),
    createdAt: toIso(row.data_cadastro),
    resolvidoEm: row.data_resolucao ? toIso(row.data_resolucao) : null,
    autor: {
      id: row.autor_id,
      nome: row.autor_nome,
    },
    resolvidoPor: row.resolvido_por_id
      ? { id: row.resolvido_por_id, nome: row.resolvido_por_nome || 'Comunidade' }
      : null,
    fotoUrl: row.tem_arquivo
      ? `${app ? '/trails' : '/admin/trails'}/${row.trilha_id}/alerts/${row.id}/photo`
      : null,
  }
}

function mapPhoto(trailId: string, photo: PhotoRow, app: boolean): TrailPhoto {
  const url = photo.tem_arquivo
    ? `${app ? '/trails' : '/admin/trails'}/${trailId}/photos/${photo.id}`
    : photo.url ?? ''
  return {
    id: photo.id,
    codigo: Number(photo.codigo),
    url,
    descricao: photo.descricao,
    ativo: photo.ativo,
    createdAt: toIso(photo.data_cadastro),
  }
}

function bindPointPhotos(trailId: string, points: TrailPoint[], photos: PhotoRow[], app: boolean) {
  const fotoPorPonto = new Map<string, string>()
  const fotografias = photos.map((photo) => {
    const mapped = mapPhoto(trailId, photo, app)
    if (photo.pontos_trilha_id && mapped.url && !fotoPorPonto.has(photo.pontos_trilha_id)) {
      fotoPorPonto.set(photo.pontos_trilha_id, mapped.url)
    }
    return mapped
  })
  const leftover = fotografias.filter((_, index) => !photos[index]?.pontos_trilha_id && Boolean(fotografias[index]?.url))
  let leftoverAt = 0
  const pontosDetalhe = points.map((point) => {
    const linked = fotoPorPonto.get(point.id)
    if (linked) return { ...point, fotoUrl: linked }
    if (leftoverAt < leftover.length && /^foto\b/i.test(point.nome)) {
      const url = leftover[leftoverAt]?.url ?? null
      leftoverAt += 1
      return { ...point, fotoUrl: url }
    }
    return { ...point, fotoUrl: point.fotoUrl ?? null }
  })
  return { pontosDetalhe, fotografias }
}

function toIso(value: Date | string) {
  return new Date(value).toISOString()
}

function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function mapSummary(row: TrailRow): TrailSummary {
  const meters = toNumber(row.comprimento_m)
  const rating = toNumber(row.nota_media)

  return {
    id: row.id,
    codigo: Number(row.codigo),
    nome: row.nome,
    descricao: row.descricao,
    cidade: row.autor_cidade || null,
    estado: row.autor_estado || null,
    ativo: row.ativo,
    createdAt: toIso(row.data_cadastro),
    updatedAt: toIso(row.data_modificacao),
    autor: {
      id: row.autor_id ?? '',
      nome: row.autor_nome ?? 'Comunidade',
      email: row.autor_email ?? '',
    },
    comprimentoKm: meters === null ? null : Math.round((meters / 1000) * 100) / 100,
    pontos: Number(row.pontos ?? 0),
    fotos: Number(row.fotos ?? 0),
    denunciasPendentes: Number(row.denuncias_pendentes ?? 0),
    notaMedia: rating === null ? null : Math.round(rating * 10) / 10,
    avaliacoes: Number(row.avaliacoes ?? 0),
    conclusoes: Number(row.conclusoes ?? 0),
  }
}

type ReviewRow = {
  id: string
  nota: string | number
  comentario: string | null
  data_cadastro: Date | string
  autor_nome: string
  autor_id?: string
}

function mapReview(row: ReviewRow, usuarioId?: string): TrailReview {
  return {
    id: row.id,
    nota: Number(row.nota),
    comentario: row.comentario,
    createdAt: toIso(row.data_cadastro),
    autor: { nome: row.autor_nome || 'Comunidade' },
    minha: usuarioId ? row.autor_id === usuarioId : undefined,
  }
}

async function ratingSummary(pool: Pool, trilhaId: string) {
  const result = await pool.query<{ media: string | number | null; total: string | number }>(
    `SELECT AVG(nota) AS media, COUNT(*)::int AS total
     FROM avaliacao
     WHERE trilha_id = $1 AND COALESCE(oculto, FALSE) = FALSE`,
    [trilhaId],
  )
  const media = toNumber(result.rows[0]?.media)
  return {
    notaMedia: media === null ? null : Math.round(media * 10) / 10,
    avaliacoes: Number(result.rows[0]?.total ?? 0),
  }
}

async function listVisibleReviews(pool: Pool, trilhaId: string, usuarioId?: string, limit = 50) {
  const result = await pool.query<ReviewRow>(
    `SELECT a.id, a.nota, a.comentario, a.data_cadastro, u.nome AS autor_nome, u.id AS autor_id
     FROM avaliacao a
     INNER JOIN usuario u ON u.id = a.usuario_id
     WHERE a.trilha_id = $1 AND COALESCE(a.oculto, FALSE) = FALSE
     ORDER BY a.data_cadastro DESC
     LIMIT $2`,
    [trilhaId, limit],
  )
  return result.rows.map((row) => mapReview(row, usuarioId))
}

function parseTrajeto(value: TrailGeometry | string | null | undefined): TrailGeometry | null {
  if (!value) return null

  try {
    const geometry = typeof value === 'string' ? (JSON.parse(value) as TrailGeometry) : value
    if (geometry.type !== 'LineString' && geometry.type !== 'MultiLineString') return null
    return geometry
  } catch {
    return null
  }
}

function pointLatLng(lat: string | number | null | undefined, lng: string | number | null | undefined) {
  const parsedLat = toNumber(lat)
  const parsedLng = toNumber(lng)
  if (parsedLat === null || parsedLng === null) return null
  return { lat: parsedLat, lng: parsedLng }
}

async function listAlerts(pool: Pool, trailIds: string[], onlyActive: boolean, app: boolean) {
  if (!trailIds.length) return new Map<string, TrailAlert[]>()

  const result = await pool.query<AlertRow>(
    `SELECT
        a.id, a.trilha_id, a.tipo, a.descricao, a.ativo, a.data_cadastro, a.data_resolucao,
        COALESCE(a.status, 'ATIVO') AS status,
        (a.arquivo IS NOT NULL) AS tem_arquivo,
        ST_Y(a.localizacao::geometry) AS lat,
        ST_X(a.localizacao::geometry) AS lng,
        u.id AS autor_id,
        u.nome AS autor_nome,
        r.id AS resolvido_por_id,
        r.nome AS resolvido_por_nome,
        (
          SELECT COUNT(*) FROM aviso_resolucao ar WHERE ar.aviso_trilha_id = a.id
        ) AS confirmacoes
     FROM aviso_trilha a
     INNER JOIN usuario u ON u.id = a.usuario_id
     LEFT JOIN usuario r ON r.id = a.resolvido_por_id
     WHERE a.trilha_id = ANY($1::uuid[])
       AND ($2::boolean IS FALSE OR a.ativo = TRUE)
     ORDER BY CASE WHEN COALESCE(a.status, 'ATIVO') = 'ATIVO' THEN 0 ELSE 1 END, a.data_cadastro DESC`,
    [trailIds, onlyActive],
  )

  const byTrail = new Map<string, TrailAlert[]>()
  for (const row of result.rows) {
    const list = byTrail.get(row.trilha_id) ?? []
    list.push(mapAlert(row, app))
    byTrail.set(row.trilha_id, list)
  }
  return byTrail
}

async function hideIfReportThreshold(
  pool: Pool,
  input: {
    trilhaId: string
    alvo: CreateTrailReportInput['alvo']
    pontoId?: string | null
    fotoId?: string | null
    avisoId?: string | null
  },
) {
  let countSql = ''
  let countParams: unknown[] = []

  if (input.alvo === 'PONTO' && input.pontoId) {
    countSql = `SELECT COUNT(DISTINCT usuario_id)::int AS total
                FROM denuncias
                WHERE alvo = 'PONTO' AND pontos_trilha_id = $1 AND status <> 'REJEITADA'`
    countParams = [input.pontoId]
  } else if (input.alvo === 'FOTO' && input.fotoId) {
    countSql = `SELECT COUNT(DISTINCT usuario_id)::int AS total
                FROM denuncias
                WHERE alvo = 'FOTO' AND fotografia_id = $1 AND status <> 'REJEITADA'`
    countParams = [input.fotoId]
  } else if (input.alvo === 'AVISO' && input.avisoId) {
    countSql = `SELECT COUNT(DISTINCT usuario_id)::int AS total
                FROM denuncias
                WHERE alvo = 'AVISO' AND aviso_trilha_id = $1 AND status <> 'REJEITADA'`
    countParams = [input.avisoId]
  } else {
    countSql = `SELECT COUNT(DISTINCT usuario_id)::int AS total
                FROM denuncias
                WHERE alvo = 'TRILHA' AND trilha_id = $1 AND status <> 'REJEITADA'`
    countParams = [input.trilhaId]
  }

  const counted = await pool.query<{ total: number }>(countSql, countParams)
  if (Number(counted.rows[0]?.total ?? 0) < REPORT_HIDE_THRESHOLD) return

  if (input.alvo === 'FOTO' && input.fotoId) {
    await pool.query(`UPDATE fotografia SET ativo = FALSE WHERE id = $1`, [input.fotoId])
  } else if (input.alvo === 'PONTO' && input.pontoId) {
    await pool.query(`UPDATE pontos_trilha SET ativo = FALSE WHERE id = $1`, [input.pontoId])
  } else if (input.alvo === 'AVISO' && input.avisoId) {
    await pool.query(`UPDATE aviso_trilha SET ativo = FALSE WHERE id = $1`, [input.avisoId])
  } else {
    await pool.query(
      `UPDATE trilha SET ativo = FALSE, data_modificacao = CURRENT_TIMESTAMP WHERE id = $1`,
      [input.trilhaId],
    )
  }
}

const trailSelect = `
  SELECT
    t.id,
    t.codigo,
    t.nome,
    t.descricao,
    t.ativo,
    t.data_cadastro,
    t.data_modificacao,
    u.id AS autor_id,
    u.nome AS autor_nome,
    u.email AS autor_email,
    u.cidade AS autor_cidade,
    u.estado AS autor_estado,
    ST_Length(t.trajeto) AS comprimento_m,
    (SELECT COUNT(*) FROM pontos_trilha p WHERE p.trilha_id = t.id) AS pontos,
    (SELECT COUNT(*) FROM fotografia f WHERE f.trilha_id = t.id) AS fotos,
    (
      SELECT COUNT(*)
      FROM denuncias d
      WHERE d.trilha_id = t.id AND d.status = 'PENDENTE'
    ) AS denuncias_pendentes,
    (SELECT AVG(a.nota) FROM avaliacao a WHERE a.trilha_id = t.id AND COALESCE(a.oculto, FALSE) = FALSE) AS nota_media,
    (
      SELECT COUNT(*)::int
      FROM avaliacao a
      WHERE a.trilha_id = t.id AND COALESCE(a.oculto, FALSE) = FALSE
    ) AS avaliacoes,
    (
      SELECT COUNT(*)::int
      FROM trilha_conclusao c
      WHERE c.trilha_id = t.id
    ) AS conclusoes
`

export function createPostgresTrailRepository(pool: Pool): TrailRepository {
  return {
    async list(filters) {
      const result = await pool.query<TrailRow>(
        `${trailSelect}
         FROM trilha t
         INNER JOIN usuario u ON u.id = t.usuario_id
         WHERE ($1::text IS NULL OR t.nome ILIKE '%' || $1 || '%'
            OR u.nome ILIKE '%' || $1 || '%'
            OR CAST(t.codigo AS TEXT) ILIKE '%' || $1 || '%')
           AND ($2::boolean IS NULL OR t.ativo = $2)
         ORDER BY t.data_cadastro DESC`,
        [filters.q || null, filters.ativo ?? null],
      )

      return result.rows.map(mapSummary)
    },

    async listByUser(usuarioId) {
      const result = await pool.query<TrailRow>(
        `${trailSelect}
         FROM trilha t
         INNER JOIN usuario u ON u.id = t.usuario_id
         WHERE t.usuario_id = $1
         ORDER BY t.data_cadastro DESC`,
        [usuarioId],
      )
      return result.rows.map(mapSummary)
    },

    async listAlertsByUser(usuarioId) {
      const result = await pool.query<{
        id: string
        tipo: string
        descricao: string | null
        ativo: boolean
        status: string | null
        confirmacoes: string | number | null
        data_cadastro: Date | string
        tem_arquivo: boolean
        trilha_id: string
        trilha_nome: string
        trilha_ativa: boolean
      }>(
        `SELECT
            a.id, a.tipo, a.descricao, a.ativo, a.data_cadastro,
            COALESCE(a.status, 'ATIVO') AS status,
            (a.arquivo IS NOT NULL) AS tem_arquivo,
            (
              SELECT COUNT(*) FROM aviso_resolucao ar WHERE ar.aviso_trilha_id = a.id
            ) AS confirmacoes,
            t.id AS trilha_id,
            t.nome AS trilha_nome,
            t.ativo AS trilha_ativa
         FROM aviso_trilha a
         INNER JOIN trilha t ON t.id = a.trilha_id
         WHERE a.usuario_id = $1
         ORDER BY a.data_cadastro DESC`,
        [usuarioId],
      )

      return result.rows.map((row) => ({
        id: row.id,
        tipo: row.tipo,
        descricao: row.descricao,
        ativo: row.ativo !== false,
        status: row.status === 'RESOLVIDO' ? ('RESOLVIDO' as const) : ('ATIVO' as const),
        confirmacoes: Number(row.confirmacoes ?? 0),
        createdAt: toIso(row.data_cadastro),
        fotoUrl: row.tem_arquivo ? `/trails/${row.trilha_id}/alerts/${row.id}/photo` : null,
        trilha: { id: row.trilha_id, nome: row.trilha_nome, ativo: row.trilha_ativa },
      }))
    },

    async listReportsByUser(usuarioId) {
      const result = await pool.query<{
        id: string
        motivo: string
        descricao: string
        status: string
        data_criacao: Date | string
        alvo: string
        ponto_nome: string | null
        foto_codigo: number | null
        aviso_tipo: string | null
        trilha_id: string
        trilha_nome: string
        trilha_ativa: boolean
      }>(
        `SELECT d.id, d.motivo, d.descricao, d.status, d.data_criacao,
                COALESCE(d.alvo, 'TRILHA') AS alvo,
                p.nome AS ponto_nome,
                f.codigo AS foto_codigo,
                av.tipo AS aviso_tipo,
                t.id AS trilha_id, t.nome AS trilha_nome, t.ativo AS trilha_ativa
         FROM denuncias d
         INNER JOIN trilha t ON t.id = d.trilha_id
         LEFT JOIN pontos_trilha p ON p.id = d.pontos_trilha_id
         LEFT JOIN fotografia f ON f.id = d.fotografia_id
         LEFT JOIN aviso_trilha av ON av.id = d.aviso_trilha_id
         WHERE d.usuario_id = $1
         ORDER BY d.data_criacao DESC`,
        [usuarioId],
      )

      return result.rows.map((row) => {
        const alvo = (
          row.alvo === 'PONTO' || row.alvo === 'FOTO' || row.alvo === 'AVISO' ? row.alvo : 'TRILHA'
        ) as UserReport['alvo']
        return {
          id: row.id,
          alvo,
          alvoNome:
            alvo === 'PONTO'
              ? row.ponto_nome
              : alvo === 'FOTO'
                ? row.foto_codigo != null
                  ? `Foto ${row.foto_codigo}`
                  : 'Foto'
                : alvo === 'AVISO'
                  ? row.aviso_tipo
                  : null,
          motivo: row.motivo,
          descricao: row.descricao,
          status: row.status,
          createdAt: toIso(row.data_criacao),
          trilha: { id: row.trilha_id, nome: row.trilha_nome, ativo: row.trilha_ativa },
        }
      })
    },

    async listCompletionsByUser(usuarioId) {
      const result = await pool.query<{
        id: string
        nome: string
        descricao: string | null
        ativo: boolean
        autor_cidade: string | null
        autor_estado: string | null
        comprimento_m: string | number | null
        pontos: string | number
        fotos: string | number
        concluido_em: Date | string
      }>(
        `SELECT
            t.id,
            t.nome,
            t.descricao,
            t.ativo,
            u.cidade AS autor_cidade,
            u.estado AS autor_estado,
            ST_Length(t.trajeto) AS comprimento_m,
            (SELECT COUNT(*) FROM pontos_trilha p WHERE p.trilha_id = t.id) AS pontos,
            (SELECT COUNT(*) FROM fotografia f WHERE f.trilha_id = t.id) AS fotos,
            c.data_fim AS concluido_em
         FROM trilha_conclusao c
         INNER JOIN trilha t ON t.id = c.trilha_id
         INNER JOIN usuario u ON u.id = t.usuario_id
         WHERE c.usuario_id = $1
         ORDER BY c.data_fim DESC`,
        [usuarioId],
      )

      return result.rows.map((row) => {
        const meters = toNumber(row.comprimento_m)
        return {
          id: row.id,
          nome: row.nome,
          descricao: row.descricao,
          cidade: row.autor_cidade || null,
          estado: row.autor_estado || null,
          ativo: row.ativo,
          comprimentoKm: meters === null ? null : Math.round((meters / 1000) * 100) / 100,
          pontos: Number(row.pontos ?? 0),
          fotos: Number(row.fotos ?? 0),
          completedAt: toIso(row.concluido_em),
        }
      })
    },

    async listExplore() {
      const result = await pool.query<TrailRow>(
        `${trailSelect},
            ST_Y(ST_StartPoint(ST_LineMerge(t.trajeto::geometry))) AS inicio_lat,
            ST_X(ST_StartPoint(ST_LineMerge(t.trajeto::geometry))) AS inicio_lng,
            ST_Y(ST_EndPoint(ST_LineMerge(t.trajeto::geometry))) AS fim_lat,
            ST_X(ST_EndPoint(ST_LineMerge(t.trajeto::geometry))) AS fim_lng,
            ST_AsGeoJSON(t.trajeto::geometry)::json AS trajeto
         FROM trilha t
         LEFT JOIN usuario u ON u.id = t.usuario_id
         WHERE t.ativo = TRUE
         ORDER BY t.data_cadastro DESC`,
      )

      const ids = result.rows.map((row) => row.id)
      const points = ids.length
        ? await pool.query<PointRow>(
            `SELECT
                id, trilha_id, codigo, tipo, nome, descricao, data_cadastro,
                ST_Y(localizacao::geometry) AS lat,
                ST_X(localizacao::geometry) AS lng
             FROM pontos_trilha
             WHERE trilha_id = ANY($1::uuid[])
               AND COALESCE(ativo, TRUE) = TRUE
             ORDER BY codigo ASC`,
            [ids],
          )
        : { rows: [] as PointRow[] }

      const pointsByTrail = new Map<string, TrailPoint[]>()
      for (const point of points.rows) {
        const trailId = point.trilha_id
        if (!trailId) continue
        const list = pointsByTrail.get(trailId) ?? []
        list.push({
          id: point.id,
          codigo: Number(point.codigo),
          tipo: point.tipo,
          nome: point.nome,
          descricao: point.descricao,
          lat: toNumber(point.lat),
          lng: toNumber(point.lng),
          fotoUrl: null,
          createdAt: toIso(point.data_cadastro),
        })
        pointsByTrail.set(trailId, list)
      }

      const photos = ids.length
        ? await pool.query<ExplorePhotoRow>(
            `SELECT id, trilha_id, codigo, url, descricao, ativo, data_cadastro, pontos_trilha_id,
                    (arquivo IS NOT NULL) AS tem_arquivo
             FROM fotografia
             WHERE trilha_id = ANY($1::uuid[])
               AND ativo = TRUE
             ORDER BY trilha_id, codigo ASC`,
            [ids],
          )
        : { rows: [] as ExplorePhotoRow[] }

      const photosByTrail = new Map<string, ExplorePhotoRow[]>()
      for (const photo of photos.rows) {
        const list = photosByTrail.get(photo.trilha_id) ?? []
        list.push(photo)
        photosByTrail.set(photo.trilha_id, list)
      }

      const alertsByTrail = await listAlerts(pool, ids, true, true)

      return result.rows.map((row) => {
        const bound = bindPointPhotos(
          row.id,
          pointsByTrail.get(row.id) ?? [],
          photosByTrail.get(row.id) ?? [],
          true,
        )
        return {
          ...mapSummary(row),
          inicio: pointLatLng(row.inicio_lat ?? null, row.inicio_lng ?? null),
          fim: pointLatLng(row.fim_lat ?? null, row.fim_lng ?? null),
          trajeto: parseTrajeto(row.trajeto),
          pontosDetalhe: bound.pontosDetalhe,
          fotografias: bound.fotografias.slice(0, 8),
          avisos: alertsByTrail.get(row.id) ?? [],
        }
      })
    },

    async findById(id) {
      const result = await pool.query<TrailRow>(
        `${trailSelect},
            ST_Y(ST_StartPoint(t.trajeto::geometry)) AS inicio_lat,
            ST_X(ST_StartPoint(t.trajeto::geometry)) AS inicio_lng,
            ST_Y(ST_EndPoint(t.trajeto::geometry)) AS fim_lat,
            ST_X(ST_EndPoint(t.trajeto::geometry)) AS fim_lng,
            ST_AsGeoJSON(t.trajeto::geometry)::json AS trajeto
         FROM trilha t
         INNER JOIN usuario u ON u.id = t.usuario_id
         WHERE t.id = $1
         LIMIT 1`,
        [id],
      )

      const row = result.rows[0]
      if (!row) return null

      const [points, photos, alertsByTrail, reviews] = await Promise.all([
        pool.query<PointRow>(
          `SELECT
              id, codigo, tipo, nome, descricao, data_cadastro,
              COALESCE(ativo, TRUE) AS ativo,
              ST_Y(localizacao::geometry) AS lat,
              ST_X(localizacao::geometry) AS lng
           FROM pontos_trilha
           WHERE trilha_id = $1
           ORDER BY codigo ASC`,
          [id],
        ),
        pool.query<PhotoRow>(
          `SELECT id, codigo, url, descricao, ativo, data_cadastro, pontos_trilha_id,
                  (arquivo IS NOT NULL) AS tem_arquivo
           FROM fotografia
           WHERE trilha_id = $1
           ORDER BY codigo ASC`,
          [id],
        ),
        listAlerts(pool, [id], false, false),
        listVisibleReviews(pool, id, undefined, 12),
      ])

      const bound = bindPointPhotos(
        id,
        points.rows.map((point) => ({
          id: point.id,
          codigo: Number(point.codigo),
          tipo: point.tipo,
          nome: point.nome,
          descricao: point.descricao,
          lat: toNumber(point.lat),
          lng: toNumber(point.lng),
          fotoUrl: null,
          ativo: point.ativo !== false,
          createdAt: toIso(point.data_cadastro),
        })),
        photos.rows,
        false,
      )

      return {
        ...mapSummary(row),
        inicio: pointLatLng(row.inicio_lat ?? null, row.inicio_lng ?? null),
        fim: pointLatLng(row.fim_lat ?? null, row.fim_lng ?? null),
        trajeto: parseTrajeto(row.trajeto),
        pontosDetalhe: bound.pontosDetalhe,
        fotografias: bound.fotografias,
        avisos: alertsByTrail.get(id) ?? [],
        avaliacoesRecentes: reviews,
      }
    },

    async update(id, input) {
      const assignments: string[] = ['data_modificacao = CURRENT_TIMESTAMP']
      const values: unknown[] = []

      if (input.nome !== undefined) {
        values.push(input.nome)
        assignments.push(`nome = $${values.length}`)
      }

      if (input.descricao !== undefined) {
        values.push(input.descricao)
        assignments.push(`descricao = $${values.length}`)
      }

      if (input.ativo !== undefined) {
        values.push(input.ativo)
        assignments.push(`ativo = $${values.length}`)
      }

      if (values.length === 0) {
        return this.findById(id)
      }

      values.push(id)
      const result = await pool.query(
        `UPDATE trilha
         SET ${assignments.join(', ')}
         WHERE id = $${values.length}
         RETURNING id`,
        values,
      )

      if (!result.rowCount) return null
      return this.findById(id)
    },

    async create(input) {
      const line = input.coordinates.map(([lng, lat]) => `${lng} ${lat}`).join(', ')
      const codigoResult = await pool.query<{ next: string }>(
        'SELECT COALESCE(MAX(codigo), 0) + 1 AS next FROM trilha',
      )
      const inserted = await pool.query<{ id: string }>(
        `INSERT INTO trilha (usuario_id, codigo, nome, descricao, trajeto, ativo)
         VALUES ($1, $2, $3, $4, ST_GeogFromText($5), $6)
         RETURNING id`,
        [
          input.usuarioId,
          Number(codigoResult.rows[0]?.next ?? 1),
          input.nome,
          input.descricao ?? null,
          `SRID=4326;LINESTRING(${line})`,
          input.ativo ?? true,
        ],
      )
      const id = inserted.rows[0]?.id
      return id ? this.findById(id) : null
    },

    async addPoint(trailId, input) {
      const exists = await pool.query('SELECT 1 FROM trilha WHERE id = $1 LIMIT 1', [trailId])
      if (!exists.rowCount) return null

      const codigoResult = await pool.query<{ next: string }>(
        'SELECT COALESCE(MAX(codigo), 0) + 1 AS next FROM pontos_trilha WHERE trilha_id = $1',
        [trailId],
      )
      await pool.query(
        `INSERT INTO pontos_trilha (trilha_id, codigo, tipo, nome, descricao, localizacao)
         VALUES ($1, $2, $3, $4, $5, ST_GeogFromText($6))`,
        [
          trailId,
          Number(codigoResult.rows[0]?.next ?? 1),
          input.tipo,
          input.nome,
          input.descricao ?? null,
          `SRID=4326;POINT(${input.lng} ${input.lat})`,
        ],
      )
      return this.findById(trailId)
    },

    async addPhoto(trailId, input) {
      const exists = await pool.query('SELECT 1 FROM trilha WHERE id = $1 LIMIT 1', [trailId])
      if (!exists.rowCount) return null

      const codigoResult = await pool.query<{ next: string }>(
        'SELECT COALESCE(MAX(codigo), 0) + 1 AS next FROM fotografia WHERE trilha_id = $1',
        [trailId],
      )
      await pool.query(
        `INSERT INTO fotografia (usuario_id, trilha_id, codigo, url, arquivo, content_type, descricao, ativo, pontos_trilha_id)
         VALUES ($1, $2, $3, NULL, $4, $5, $6, TRUE, $7)`,
        [
          input.usuarioId,
          trailId,
          Number(codigoResult.rows[0]?.next ?? 1),
          input.arquivo,
          input.contentType,
          input.descricao ?? null,
          input.pontosTrilhaId ?? null,
        ],
      )
      return this.findById(trailId)
    },

    async addAlert(trailId, input) {
      const exists = await pool.query('SELECT 1 FROM trilha WHERE id = $1 AND ativo = TRUE LIMIT 1', [trailId])
      if (!exists.rowCount) return null

      await pool.query(
        `INSERT INTO aviso_trilha (trilha_id, usuario_id, tipo, descricao, localizacao, ativo, arquivo, content_type)
         VALUES ($1, $2, $3, $4, ST_GeogFromText($5), TRUE, $6, $7)`,
        [
          trailId,
          input.usuarioId,
          input.tipo,
          input.descricao ?? null,
          `SRID=4326;POINT(${input.lng} ${input.lat})`,
          input.arquivo ?? null,
          input.arquivo ? input.contentType || 'image/jpeg' : null,
        ],
      )
      return this.findById(trailId)
    },

    async resolveAlert(trailId, alertId, usuarioId) {
      const trail = await pool.query('SELECT id FROM trilha WHERE id = $1 AND ativo = TRUE LIMIT 1', [trailId])
      if (!trail.rowCount) return null

      const alert = await pool.query<{ id: string; ativo: boolean; status: string | null }>(
        `SELECT id, ativo, COALESCE(status, 'ATIVO') AS status
         FROM aviso_trilha
         WHERE id = $1 AND trilha_id = $2
         LIMIT 1`,
        [alertId, trailId],
      )
      const row = alert.rows[0]
      if (!row || row.ativo === false) {
        throw new AppError(404, 'Aviso não encontrado nesta trilha.')
      }
      if (row.status === 'RESOLVIDO') {
        throw new AppError(409, 'Este aviso já foi marcado como resolvido.')
      }

      try {
        await pool.query(
          `INSERT INTO aviso_resolucao (aviso_trilha_id, usuario_id)
           VALUES ($1, $2)`,
          [alertId, usuarioId],
        )
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
          throw new AppError(409, 'Você já registrou que este aviso passou.')
        }
        throw error
      }

      const counted = await pool.query<{ total: number }>(
        `SELECT COUNT(*)::int AS total FROM aviso_resolucao WHERE aviso_trilha_id = $1`,
        [alertId],
      )
      if (Number(counted.rows[0]?.total ?? 0) >= ALERT_RESOLVE_THRESHOLD) {
        await pool.query(
          `UPDATE aviso_trilha
           SET status = 'RESOLVIDO',
               data_resolucao = CURRENT_TIMESTAMP,
               resolvido_por_id = $2
           WHERE id = $1
             AND COALESCE(status, 'ATIVO') <> 'RESOLVIDO'`,
          [alertId, usuarioId],
        )
      }

      return this.findById(trailId)
    },

    async findPhoto(trailId, photoId) {
      const result = await pool.query<{ arquivo: Buffer; content_type: string | null }>(
        `SELECT arquivo, content_type
         FROM fotografia
         WHERE id = $1
           AND trilha_id = $2
           AND arquivo IS NOT NULL
         LIMIT 1`,
        [photoId, trailId],
      )

      const row = result.rows[0]
      if (!row?.arquivo) return null

      return {
        arquivo: row.arquivo,
        contentType: row.content_type || 'image/jpeg',
      }
    },

    async findExplorePhoto(trailId, photoId) {
      const result = await pool.query<{ arquivo: Buffer; content_type: string | null }>(
        `SELECT f.arquivo, f.content_type
         FROM fotografia f
         INNER JOIN trilha t ON t.id = f.trilha_id
         WHERE f.id = $1
           AND f.trilha_id = $2
           AND f.arquivo IS NOT NULL
           AND f.ativo = TRUE
           AND t.ativo = TRUE
         LIMIT 1`,
        [photoId, trailId],
      )

      const row = result.rows[0]
      if (!row?.arquivo) return null

      return {
        arquivo: row.arquivo,
        contentType: row.content_type || 'image/jpeg',
      }
    },

    async findAlertPhoto(trailId, alertId) {
      const result = await pool.query<{ arquivo: Buffer; content_type: string | null }>(
        `SELECT arquivo, content_type
         FROM aviso_trilha
         WHERE id = $1
           AND trilha_id = $2
           AND arquivo IS NOT NULL
         LIMIT 1`,
        [alertId, trailId],
      )
      const row = result.rows[0]
      if (!row?.arquivo) return null
      return {
        arquivo: row.arquivo,
        contentType: row.content_type || 'image/jpeg',
      }
    },

    async findExploreAlertPhoto(trailId, alertId) {
      const result = await pool.query<{ arquivo: Buffer; content_type: string | null }>(
        `SELECT a.arquivo, a.content_type
         FROM aviso_trilha a
         INNER JOIN trilha t ON t.id = a.trilha_id
         WHERE a.id = $1
           AND a.trilha_id = $2
           AND a.arquivo IS NOT NULL
           AND a.ativo = TRUE
           AND t.ativo = TRUE
         LIMIT 1`,
        [alertId, trailId],
      )
      const row = result.rows[0]
      if (!row?.arquivo) return null
      return {
        arquivo: row.arquivo,
        contentType: row.content_type || 'image/jpeg',
      }
    },

    async createReport(input) {
      const trail = await pool.query('SELECT id FROM trilha WHERE id = $1 AND ativo = TRUE LIMIT 1', [input.trilhaId])
      if (!trail.rowCount) {
        throw new AppError(404, 'Trilha não encontrada.')
      }

      if (input.alvo === 'PONTO') {
        const point = await pool.query(
          'SELECT id FROM pontos_trilha WHERE id = $1 AND trilha_id = $2 LIMIT 1',
          [input.pontoId, input.trilhaId],
        )
        if (!point.rowCount) {
          throw new AppError(404, 'Ponto não encontrado nesta trilha.')
        }
      }

      if (input.alvo === 'FOTO') {
        const photo = await pool.query(
          'SELECT id FROM fotografia WHERE id = $1 AND trilha_id = $2 LIMIT 1',
          [input.fotoId, input.trilhaId],
        )
        if (!photo.rowCount) {
          throw new AppError(404, 'Foto não encontrada nesta trilha.')
        }
      }

      if (input.alvo === 'AVISO') {
        const alert = await pool.query(
          'SELECT id FROM aviso_trilha WHERE id = $1 AND trilha_id = $2 AND ativo = TRUE AND COALESCE(status, \'ATIVO\') = \'ATIVO\' LIMIT 1',
          [input.avisoId, input.trilhaId],
        )
        if (!alert.rowCount) {
          throw new AppError(404, 'Aviso não encontrado nesta trilha.')
        }
      }

      try {
        const inserted = await pool.query<{ id: string }>(
          `INSERT INTO denuncias (usuario_id, trilha_id, alvo, motivo, descricao, status, pontos_trilha_id, fotografia_id, aviso_trilha_id)
           VALUES ($1, $2, $3, $4, $5, 'PENDENTE', $6, $7, $8)
           RETURNING id`,
          [
            input.usuarioId,
            input.trilhaId,
            input.alvo,
            input.motivo,
            input.descricao,
            input.alvo === 'PONTO' ? input.pontoId : null,
            input.alvo === 'FOTO' ? input.fotoId : null,
            input.alvo === 'AVISO' ? input.avisoId : null,
          ],
        )
        const row = inserted.rows[0]
        if (!row) {
          throw new AppError(500, 'Não foi possível registrar a denúncia.')
        }
        await hideIfReportThreshold(pool, {
          trilhaId: input.trilhaId,
          alvo: input.alvo,
          pontoId: input.pontoId,
          fotoId: input.fotoId,
          avisoId: input.avisoId,
        })
        return { id: row.id }
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
          throw new AppError(409, 'Você já denunciou este conteúdo.')
        }
        throw error
      }
    },

    async complete(trilhaId, usuarioId) {
      const trail = await pool.query('SELECT id FROM trilha WHERE id = $1 AND ativo = TRUE LIMIT 1', [trilhaId])
      if (!trail.rowCount) return null
      const inserted = await pool.query(
        `INSERT INTO trilha_conclusao (trilha_id, usuario_id, data_inicio, data_fim)
         VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (usuario_id, trilha_id) DO NOTHING
         RETURNING id`,
        [trilhaId, usuarioId],
      )
      const counted = await pool.query<{ total: string | number }>(
        `SELECT COUNT(*)::int AS total FROM trilha_conclusao WHERE trilha_id = $1`,
        [trilhaId],
      )
      return {
        conclusoes: Number(counted.rows[0]?.total ?? 0),
        nova: Boolean(inserted.rowCount),
      }
    },

    async listReviews(trilhaId, usuarioId) {
      const trail = await pool.query('SELECT id FROM trilha WHERE id = $1 AND ativo = TRUE LIMIT 1', [trilhaId])
      if (!trail.rowCount) return null
      const [summary, reviews] = await Promise.all([
        ratingSummary(pool, trilhaId),
        listVisibleReviews(pool, trilhaId, usuarioId, 50),
      ])
      return { ...summary, reviews }
    },

    async upsertReview(input) {
      const trail = await pool.query('SELECT id FROM trilha WHERE id = $1 AND ativo = TRUE LIMIT 1', [input.trilhaId])
      if (!trail.rowCount) return null
      const comentario = input.comentario?.trim() || null
      const saved = await pool.query<{ id: string }>(
        `INSERT INTO avaliacao (usuario_id, trilha_id, nota, comentario)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (usuario_id, trilha_id)
         DO UPDATE SET nota = EXCLUDED.nota, comentario = EXCLUDED.comentario
         RETURNING id`,
        [input.usuarioId, input.trilhaId, input.nota, comentario],
      )
      const savedId = saved.rows[0]?.id
      if (!savedId) return null
      const [summary, reviews] = await Promise.all([
        ratingSummary(pool, input.trilhaId),
        listVisibleReviews(pool, input.trilhaId, input.usuarioId, 50),
      ])
      const review = reviews.find((item) => item.id === savedId)
      if (!review) return null
      return { ...summary, review, reviews }
    },
  }
}
