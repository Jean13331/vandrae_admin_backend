import { AppError } from '../../lib/errors'
import { lookupTrailElevation } from '../../lib/elevation'
import { logger } from '../../lib/logger'
import type {
  CreateTrailAlertInput,
  CreateTrailInput,
  CreateTrailPhotoInput,
  CreateTrailPointInput,
  CreateTrailReportInput,
  TrailDetail,
  TrailRepository,
  UpdateTrailInput,
} from '../../repositories/trail.repository'

function toAppPhotoUrls(trail: TrailDetail): TrailDetail {
  return {
    ...trail,
    fotografias: trail.fotografias.map((photo) => ({
      ...photo,
      url: photo.url.replace(/^\/admin\/trails\//, '/trails/'),
    })),
    pontosDetalhe: trail.pontosDetalhe.map((point) => ({
      ...point,
      fotoUrl: point.fotoUrl?.replace(/^\/admin\/trails\//, '/trails/') ?? null,
    })),
    avisos: (trail.avisos ?? []).map((alert) => ({
      ...alert,
      fotoUrl: alert.fotoUrl?.replace(/^\/admin\/trails\//, '/trails/') ?? null,
    })),
  }
}

function decodeBase64Image(value: string) {
  const match = value.trim().match(/^data:([^;]+);base64,(.+)$/s)
  const payload = match?.[2] ?? value.replace(/\s/g, '')
  const buffer = Buffer.from(payload, 'base64')
  if (!buffer.length) {
    throw new AppError(400, 'A foto enviada é inválida.')
  }
  return {
    buffer,
    contentType: match?.[1],
  }
}

export function createTrailsService(trails: TrailRepository) {
  async function withElevation(trail: TrailDetail) {
    const elevacao = await lookupTrailElevation(trail.trajeto)
    return { ...trail, elevacao }
  }

  return {
    list(filters: { q?: string; ativo?: boolean }) {
      return trails.list(filters)
    },

    listExplore() {
      return trails.listExplore()
    },

    async getById(id: string) {
      const trail = await trails.findById(id)
      if (!trail) {
        throw new AppError(404, 'Trilha não encontrada.')
      }
      return withElevation(trail)
    },

    async getExploreById(id: string) {
      const trail = await trails.findById(id)
      if (!trail || !trail.ativo) {
        throw new AppError(404, 'Trilha não encontrada.')
      }
      return withElevation(
        toAppPhotoUrls({
          ...trail,
          pontosDetalhe: trail.pontosDetalhe.filter((point) => point.ativo !== false),
          avisos: (trail.avisos ?? []).filter((alert) => alert.ativo !== false),
        }),
      )
    },

    async getPhoto(trailId: string, photoId: string) {
      const photo = await trails.findPhoto(trailId, photoId)
      if (!photo) {
        throw new AppError(404, 'Foto não encontrada.')
      }
      return photo
    },

    async getExplorePhoto(trailId: string, photoId: string) {
      const photo = await trails.findExplorePhoto(trailId, photoId)
      if (!photo) {
        throw new AppError(404, 'Foto não encontrada.')
      }
      return photo
    },

    async getAlertPhoto(trailId: string, alertId: string) {
      const photo = await trails.findAlertPhoto(trailId, alertId)
      if (!photo) {
        throw new AppError(404, 'Foto do aviso não encontrada.')
      }
      return photo
    },

    async getExploreAlertPhoto(trailId: string, alertId: string) {
      const photo = await trails.findExploreAlertPhoto(trailId, alertId)
      if (!photo) {
        throw new AppError(404, 'Foto do aviso não encontrada.')
      }
      return photo
    },

    async create(input: Omit<CreateTrailInput, 'usuarioId'>, usuarioId: string, actorEmail?: string) {
      const trail = await trails.create({ ...input, usuarioId, ativo: input.ativo ?? true })
      if (!trail) {
        throw new AppError(500, 'Não foi possível criar a trilha.')
      }
      logger.audit(`[trails] trilha ${trail.codigo} criada`, { actor: actorEmail, status: 201 })
      return withElevation(trail)
    },

    async createFromApp(
      input: Omit<CreateTrailInput, 'usuarioId' | 'ativo'> & {
        pontos?: CreateTrailPointInput[]
        fotos?: Array<{
          descricao?: string | null
          contentType?: string
          arquivo: string
          pontosTrilhaId?: string | null
          pontoIndex?: number
        }>
      },
      usuarioId: string,
      actorEmail?: string,
    ) {
      const trail = await trails.create({
        usuarioId,
        nome: input.nome,
        descricao: input.descricao,
        coordinates: input.coordinates,
        ativo: true,
      })
      if (!trail) {
        throw new AppError(500, 'Não foi possível criar a trilha.')
      }

      let current = trail
      for (const point of input.pontos ?? []) {
        const next = await trails.addPoint(current.id, point)
        if (next) current = next
      }
      for (const photo of input.fotos ?? []) {
        const decoded = decodeBase64Image(photo.arquivo)
        const pontoId =
          photo.pontosTrilhaId ||
          (photo.pontoIndex != null ? current.pontosDetalhe[photo.pontoIndex]?.id : null)
        const next = await trails.addPhoto(current.id, {
          usuarioId,
          descricao: photo.descricao,
          contentType: decoded.contentType || photo.contentType || 'image/jpeg',
          arquivo: decoded.buffer,
          pontosTrilhaId: pontoId,
        })
        if (next) current = next
      }

      logger.audit(`[trails] trilha ${current.codigo} publicada pela comunidade`, {
        actor: actorEmail,
        status: 201,
      })
      return withElevation(toAppPhotoUrls(current))
    },

    listMine(usuarioId: string) {
      return trails.listByUser(usuarioId)
    },

    listMyAlerts(usuarioId: string) {
      return trails.listAlertsByUser(usuarioId)
    },

    listMyReports(usuarioId: string) {
      return trails.listReportsByUser(usuarioId)
    },

    listMyCompletions(usuarioId: string) {
      return trails.listCompletionsByUser(usuarioId)
    },

    async addPoint(id: string, input: CreateTrailPointInput, actorEmail?: string) {
      const trail = await trails.addPoint(id, input)
      if (!trail) {
        throw new AppError(404, 'Trilha não encontrada.')
      }
      logger.audit(`[trails] ponto adicionado à trilha ${trail.codigo}`, {
        actor: actorEmail,
        status: 201,
      })
      return withElevation(trail)
    },

    async addPhoto(
      id: string,
      input: {
        descricao?: string | null
        contentType?: string
        arquivo: string
        pontosTrilhaId?: string | null
      },
      usuarioId: string,
      actorEmail?: string,
    ) {
      const decoded = decodeBase64Image(input.arquivo)
      const payload: CreateTrailPhotoInput = {
        usuarioId,
        descricao: input.descricao,
        contentType: decoded.contentType || input.contentType || 'image/jpeg',
        arquivo: decoded.buffer,
        pontosTrilhaId: input.pontosTrilhaId,
      }
      const trail = await trails.addPhoto(id, payload)
      if (!trail) {
        throw new AppError(404, 'Trilha não encontrada.')
      }
      logger.audit(`[trails] foto adicionada à trilha ${trail.codigo}`, {
        actor: actorEmail,
        status: 201,
      })
      return withElevation(trail)
    },

    async createAlert(
      id: string,
      usuarioId: string,
      input: Omit<CreateTrailAlertInput, 'usuarioId' | 'arquivo' | 'contentType'> & {
        arquivo?: string | null
        contentType?: string | null
      },
      actorEmail?: string,
    ) {
      let arquivo: Buffer | undefined
      let contentType: string | undefined
      if (input.arquivo) {
        const decoded = decodeBase64Image(input.arquivo)
        arquivo = decoded.buffer
        contentType = decoded.contentType || input.contentType || 'image/jpeg'
      }
      const trail = await trails.addAlert(id, {
        usuarioId,
        tipo: input.tipo,
        descricao: input.descricao,
        lat: input.lat,
        lng: input.lng,
        arquivo,
        contentType,
      })
      if (!trail) {
        throw new AppError(404, 'Trilha não encontrada.')
      }
      logger.audit(`[trails] aviso ${input.tipo} na trilha ${trail.codigo}`, {
        actor: actorEmail,
        status: 201,
      })
      return toAppPhotoUrls({
        ...trail,
        pontosDetalhe: trail.pontosDetalhe.filter((point) => point.ativo !== false),
        avisos: (trail.avisos ?? []).filter((alert) => alert.ativo !== false),
      })
    },

    async resolveAlert(id: string, alertId: string, usuarioId: string, actorEmail?: string) {
      const trail = await trails.resolveAlert(id, alertId, usuarioId)
      if (!trail) {
        throw new AppError(404, 'Trilha não encontrada.')
      }
      logger.audit(`[trails] aviso ${alertId} confirmado como resolvido na trilha ${trail.codigo}`, {
        actor: actorEmail,
        status: 200,
      })
      return toAppPhotoUrls({
        ...trail,
        pontosDetalhe: trail.pontosDetalhe.filter((point) => point.ativo !== false),
        avisos: (trail.avisos ?? []).filter((alert) => alert.ativo !== false),
      })
    },

    async update(id: string, input: UpdateTrailInput) {
      const trail = await trails.update(id, input)
      if (!trail) {
        throw new AppError(404, 'Trilha não encontrada.')
      }
      return withElevation(trail)
    },

    async complete(id: string, usuarioId: string, actorEmail?: string) {
      const result = await trails.complete(id, usuarioId)
      if (!result) {
        throw new AppError(404, 'Trilha não encontrada.')
      }
      if (result.nova) {
        logger.audit(`[trails] conclusão registrada na trilha`, {
          actor: actorEmail,
          status: 201,
        })
      }
      return result
    },

    async listReviews(id: string, usuarioId?: string) {
      const result = await trails.listReviews(id, usuarioId)
      if (!result) {
        throw new AppError(404, 'Trilha não encontrada.')
      }
      return result
    },

    async upsertReview(id: string, usuarioId: string, input: { nota: number; comentario?: string | null }, actorEmail?: string) {
      const result = await trails.upsertReview({
        trilhaId: id,
        usuarioId,
        nota: input.nota,
        comentario: input.comentario,
      })
      if (!result) {
        throw new AppError(404, 'Trilha não encontrada.')
      }
      logger.audit(`[trails] avaliação ${result.review.nota} na trilha`, {
        actor: actorEmail,
        status: 201,
      })
      return result
    },

    async createReport(trilhaId: string, usuarioId: string, input: Omit<CreateTrailReportInput, 'usuarioId' | 'trilhaId'>, actorEmail?: string) {
      const report = await trails.createReport({
        ...input,
        usuarioId,
        trilhaId,
      })
      logger.audit(`[trails] denúncia ${report.id} (${input.alvo})`, {
        actor: actorEmail,
        status: 201,
      })
      return report
    },
  }
}

export type TrailsService = ReturnType<typeof createTrailsService>
