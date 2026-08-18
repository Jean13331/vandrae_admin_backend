import { AppError } from '../../lib/errors'
import { lookupTrailElevation } from '../../lib/elevation'
import { logger } from '../../lib/logger'
import type {
  CreateTrailInput,
  CreateTrailPhotoInput,
  CreateTrailPointInput,
  TrailDetail,
  TrailRepository,
  UpdateTrailInput,
} from '../../repositories/trail.repository'

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

    async getById(id: string) {
      const trail = await trails.findById(id)
      if (!trail) {
        throw new AppError(404, 'Trilha não encontrada.')
      }
      return withElevation(trail)
    },

    async getPhoto(trailId: string, photoId: string) {
      const photo = await trails.findPhoto(trailId, photoId)
      if (!photo) {
        throw new AppError(404, 'Foto não encontrada.')
      }
      return photo
    },

    async create(input: Omit<CreateTrailInput, 'usuarioId'>, usuarioId: string, actorEmail?: string) {
      const trail = await trails.create({ ...input, usuarioId })
      if (!trail) {
        throw new AppError(500, 'Não foi possível criar a trilha.')
      }
      logger.audit(`[trails] trilha ${trail.codigo} criada`, { actor: actorEmail, status: 201 })
      return withElevation(trail)
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

    async update(id: string, input: UpdateTrailInput) {
      const trail = await trails.update(id, input)
      if (!trail) {
        throw new AppError(404, 'Trilha não encontrada.')
      }

      logger.info(`[trails] trilha ${trail.codigo} atualizada`)
      return withElevation(trail)
    },
  }
}

export type TrailsService = ReturnType<typeof createTrailsService>
