import type { Pool } from 'pg'
import type { TrailElevation } from '../lib/elevation'

export type TrailSummary = {
  id: string
  codigo: number
  nome: string
  descricao: string | null
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
  createdAt: string
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

export type TrailDetail = TrailSummary & {
  inicio: { lat: number; lng: number } | null
  fim: { lat: number; lng: number } | null
  trajeto: TrailGeometry | null
  pontosDetalhe: TrailPoint[]
  fotografias: TrailPhoto[]
  elevacao?: TrailElevation | null
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

export interface TrailRepository {
  list(filters: ListTrailsFilters): Promise<TrailSummary[]>
  findById(id: string): Promise<TrailDetail | null>
  findPhoto(trailId: string, photoId: string): Promise<TrailPhotoFile | null>
  update(id: string, input: UpdateTrailInput): Promise<TrailDetail | null>
  create(input: CreateTrailInput): Promise<TrailDetail | null>
  addPoint(trailId: string, input: CreateTrailPointInput): Promise<TrailDetail | null>
  addPhoto(trailId: string, input: CreateTrailPhotoInput): Promise<TrailDetail | null>
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
  comprimento_m: string | number | null
  pontos: string | number
  fotos: string | number
  denuncias_pendentes: string | number
  nota_media: string | number | null
  inicio_lat?: string | number | null
  inicio_lng?: string | number | null
  fim_lat?: string | number | null
  fim_lng?: string | number | null
  trajeto?: TrailGeometry | string | null
}

type PointRow = {
  id: string
  codigo: number
  tipo: string
  nome: string
  descricao: string | null
  lat: string | number | null
  lng: string | number | null
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
    ativo: row.ativo,
    createdAt: toIso(row.data_cadastro),
    updatedAt: toIso(row.data_modificacao),
    autor: {
      id: row.autor_id,
      nome: row.autor_nome,
      email: row.autor_email,
    },
    comprimentoKm: meters === null ? null : Math.round((meters / 1000) * 100) / 100,
    pontos: Number(row.pontos ?? 0),
    fotos: Number(row.fotos ?? 0),
    denunciasPendentes: Number(row.denuncias_pendentes ?? 0),
    notaMedia: rating === null ? null : Math.round(rating * 10) / 10,
  }
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
    ST_Length(t.trajeto) AS comprimento_m,
    (SELECT COUNT(*) FROM pontos_trilha p WHERE p.trilha_id = t.id) AS pontos,
    (SELECT COUNT(*) FROM fotografia f WHERE f.trilha_id = t.id) AS fotos,
    (
      SELECT COUNT(*)
      FROM denuncias d
      WHERE d.trilha_id = t.id AND d.status = 'PENDENTE'
    ) AS denuncias_pendentes,
    (SELECT AVG(a.nota) FROM avaliacao a WHERE a.trilha_id = t.id) AS nota_media
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

      const [points, photos] = await Promise.all([
        pool.query<PointRow>(
          `SELECT
              id, codigo, tipo, nome, descricao, data_cadastro,
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
      ])

      const fotoPorPonto = new Map<string, string>()
      const fotografias = photos.rows.map((photo) => {
        const url = photo.tem_arquivo ? `/admin/trails/${id}/photos/${photo.id}` : photo.url ?? ''
        if (photo.pontos_trilha_id && url && !fotoPorPonto.has(photo.pontos_trilha_id)) {
          fotoPorPonto.set(photo.pontos_trilha_id, url)
        }
        return {
          id: photo.id,
          codigo: Number(photo.codigo),
          url,
          descricao: photo.descricao,
          ativo: photo.ativo,
          createdAt: toIso(photo.data_cadastro),
        }
      })

      return {
        ...mapSummary(row),
        inicio: pointLatLng(row.inicio_lat ?? null, row.inicio_lng ?? null),
        fim: pointLatLng(row.fim_lat ?? null, row.fim_lng ?? null),
        trajeto: parseTrajeto(row.trajeto),
        pontosDetalhe: points.rows.map((point) => ({
          id: point.id,
          codigo: Number(point.codigo),
          tipo: point.tipo,
          nome: point.nome,
          descricao: point.descricao,
          lat: toNumber(point.lat),
          lng: toNumber(point.lng),
          fotoUrl: fotoPorPonto.get(point.id) ?? null,
          createdAt: toIso(point.data_cadastro),
        })),
        fotografias,
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
         VALUES ($1, $2, $3, $4, ST_GeogFromText($5), TRUE)
         RETURNING id`,
        [
          input.usuarioId,
          Number(codigoResult.rows[0]?.next ?? 1),
          input.nome,
          input.descricao ?? null,
          `SRID=4326;LINESTRING(${line})`,
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
  }
}
