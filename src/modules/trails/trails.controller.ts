import type { Request, Response } from 'express'
import { asyncHandler } from '../../lib/asyncHandler'
import { AppError } from '../../lib/errors'
import {
  createTrailPhotoSchema,
  createTrailPointSchema,
  createTrailSchema,
  listTrailsQuerySchema,
  trailIdParamSchema,
  trailPhotoParamSchema,
  updateTrailSchema,
} from './trails.schema'
import type { TrailsService } from './trails.service'

export function createTrailsController(trailsService: TrailsService) {
  return {
    list: asyncHandler(async (req: Request, res: Response) => {
      const query = listTrailsQuerySchema.parse(req.query)
      const trails = await trailsService.list({
        q: query.q,
        ativo: query.ativo === 'all' ? undefined : query.ativo === 'true',
      })
      res.json({ trails })
    }),

    explore: asyncHandler(async (_req: Request, res: Response) => {
      const trails = await trailsService.listExplore()
      res.json({ trails })
    }),

    exploreById: asyncHandler(async (req: Request, res: Response) => {
      const params = trailIdParamSchema.parse(req.params)
      const trail = await trailsService.getExploreById(params.id)
      res.json({ trail })
    }),

    getById: asyncHandler(async (req: Request, res: Response) => {
      const params = trailIdParamSchema.parse(req.params)
      const trail = await trailsService.getById(params.id)
      res.json({ trail })
    }),

    getPhoto: asyncHandler(async (req: Request, res: Response) => {
      const params = trailPhotoParamSchema.parse(req.params)
      const photo = await trailsService.getPhoto(params.id, params.photoId)
      res.setHeader('Content-Type', photo.contentType)
      res.setHeader('Cache-Control', 'private, max-age=3600')
      res.send(photo.arquivo)
    }),

    getExplorePhoto: asyncHandler(async (req: Request, res: Response) => {
      const params = trailPhotoParamSchema.parse(req.params)
      const photo = await trailsService.getExplorePhoto(params.id, params.photoId)
      res.setHeader('Content-Type', photo.contentType)
      res.setHeader('Cache-Control', 'private, max-age=3600')
      res.send(photo.arquivo)
    }),

    create: asyncHandler(async (req: Request, res: Response) => {
      const input = createTrailSchema.parse(req.body)
      const usuarioId = req.adminUser?.id
      if (!usuarioId) {
        throw new AppError(401, 'Sessão inválida.')
      }
      const trail = await trailsService.create(
        {
          nome: input.nome,
          descricao: input.descricao,
          coordinates: input.trajeto,
        },
        usuarioId,
        req.adminUser?.email,
      )
      res.status(201).json({ trail })
    }),

    addPoint: asyncHandler(async (req: Request, res: Response) => {
      const params = trailIdParamSchema.parse(req.params)
      const input = createTrailPointSchema.parse(req.body)
      const trail = await trailsService.addPoint(params.id, input, req.adminUser?.email)
      res.status(201).json({ trail })
    }),

    addPhoto: asyncHandler(async (req: Request, res: Response) => {
      const params = trailIdParamSchema.parse(req.params)
      const input = createTrailPhotoSchema.parse(req.body)
      const usuarioId = req.adminUser?.id
      if (!usuarioId) {
        throw new AppError(401, 'Sessão inválida.')
      }
      const trail = await trailsService.addPhoto(params.id, input, usuarioId, req.adminUser?.email)
      res.status(201).json({ trail })
    }),

    update: asyncHandler(async (req: Request, res: Response) => {
      const params = trailIdParamSchema.parse(req.params)
      const input = updateTrailSchema.parse(req.body)
      const trail = await trailsService.update(params.id, input)
      res.json({ trail })
    }),
  }
}

export type TrailsController = ReturnType<typeof createTrailsController>
