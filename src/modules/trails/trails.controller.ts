import type { Request, Response } from 'express'
import { asyncHandler } from '../../lib/asyncHandler'
import { AppError } from '../../lib/errors'
import {
  createAppTrailSchema,
  createTrailAlertSchema,
  createTrailPhotoSchema,
  createTrailPointSchema,
  createTrailReportSchema,
  createTrailReviewSchema,
  createTrailSchema,
  listTrailsQuerySchema,
  trailAlertParamSchema,
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

    listMine: asyncHandler(async (req: Request, res: Response) => {
      const usuarioId = req.appUser?.id
      if (!usuarioId) {
        throw new AppError(401, 'Sessão inválida.')
      }
      const trails = await trailsService.listMine(usuarioId)
      res.json({ trails })
    }),

    listMyAlerts: asyncHandler(async (req: Request, res: Response) => {
      const usuarioId = req.appUser?.id
      if (!usuarioId) {
        throw new AppError(401, 'Sessão inválida.')
      }
      const alerts = await trailsService.listMyAlerts(usuarioId)
      res.json({ alerts })
    }),

    listMyReports: asyncHandler(async (req: Request, res: Response) => {
      const usuarioId = req.appUser?.id
      if (!usuarioId) {
        throw new AppError(401, 'Sessão inválida.')
      }
      const reports = await trailsService.listMyReports(usuarioId)
      res.json({ reports })
    }),

    listMyCompletions: asyncHandler(async (req: Request, res: Response) => {
      const usuarioId = req.appUser?.id
      if (!usuarioId) {
        throw new AppError(401, 'Sessão inválida.')
      }
      const trails = await trailsService.listMyCompletions(usuarioId)
      res.json({ trails })
    }),

    createApp: asyncHandler(async (req: Request, res: Response) => {
      const input = createAppTrailSchema.parse(req.body)
      const usuarioId = req.appUser?.id
      if (!usuarioId) {
        throw new AppError(401, 'Sessão inválida.')
      }
      const trail = await trailsService.createFromApp(
        {
          nome: input.nome,
          descricao: input.descricao,
          coordinates: input.trajeto,
          pontos: input.pontos,
          fotos: input.fotos,
        },
        usuarioId,
        req.appUser?.email,
      )
      res.status(201).json({ trail })
    }),

    exploreById: asyncHandler(async (req: Request, res: Response) => {
      const params = trailIdParamSchema.parse(req.params)
      const trail = await trailsService.getExploreById(params.id)
      res.json({ trail })
    }),

    reportApp: asyncHandler(async (req: Request, res: Response) => {
      const params = trailIdParamSchema.parse(req.params)
      const input = createTrailReportSchema.parse(req.body)
      const usuarioId = req.appUser?.id
      if (!usuarioId) {
        throw new AppError(401, 'Sessão inválida.')
      }
      const report = await trailsService.createReport(
        params.id,
        usuarioId,
        {
          alvo: input.alvo,
          motivo: input.motivo,
          descricao: input.descricao?.trim() || input.motivo,
          pontoId: input.pontoId,
          fotoId: input.fotoId,
          avisoId: input.avisoId,
        },
        req.appUser?.email,
      )
      res.status(201).json({ report })
    }),

    completeApp: asyncHandler(async (req: Request, res: Response) => {
      const params = trailIdParamSchema.parse(req.params)
      const usuarioId = req.appUser?.id
      if (!usuarioId) {
        throw new AppError(401, 'Sessão inválida.')
      }
      const result = await trailsService.complete(params.id, usuarioId, req.appUser?.email)
      res.status(result.nova ? 201 : 200).json(result)
    }),

    listReviewsApp: asyncHandler(async (req: Request, res: Response) => {
      const params = trailIdParamSchema.parse(req.params)
      const result = await trailsService.listReviews(params.id, req.appUser?.id)
      res.json(result)
    }),

    upsertReviewApp: asyncHandler(async (req: Request, res: Response) => {
      const params = trailIdParamSchema.parse(req.params)
      const input = createTrailReviewSchema.parse(req.body)
      const usuarioId = req.appUser?.id
      if (!usuarioId) {
        throw new AppError(401, 'Sessão inválida.')
      }
      const result = await trailsService.upsertReview(
        params.id,
        usuarioId,
        { nota: input.nota, comentario: input.comentario },
        req.appUser?.email,
      )
      res.status(201).json(result)
    }),

    createAlertApp: asyncHandler(async (req: Request, res: Response) => {
      const params = trailIdParamSchema.parse(req.params)
      const input = createTrailAlertSchema.parse(req.body)
      const usuarioId = req.appUser?.id
      if (!usuarioId) {
        throw new AppError(401, 'Sessão inválida.')
      }
      const trail = await trailsService.createAlert(
        params.id,
        usuarioId,
        {
          tipo: input.tipo,
          descricao: input.descricao,
          lat: input.lat,
          lng: input.lng,
          arquivo: input.arquivo,
          contentType: input.contentType,
        },
        req.appUser?.email,
      )
      res.status(201).json({ trail })
    }),

    resolveAlertApp: asyncHandler(async (req: Request, res: Response) => {
      const params = trailAlertParamSchema.parse(req.params)
      const usuarioId = req.appUser?.id
      if (!usuarioId) {
        throw new AppError(401, 'Sessão inválida.')
      }
      const trail = await trailsService.resolveAlert(params.id, params.alertId, usuarioId, req.appUser?.email)
      res.json({ trail })
    }),

    getAlertPhoto: asyncHandler(async (req: Request, res: Response) => {
      const params = trailAlertParamSchema.parse(req.params)
      const photo = await trailsService.getAlertPhoto(params.id, params.alertId)
      res.setHeader('Content-Type', photo.contentType)
      res.setHeader('Cache-Control', 'private, max-age=3600')
      res.send(photo.arquivo)
    }),

    getExploreAlertPhoto: asyncHandler(async (req: Request, res: Response) => {
      const params = trailAlertParamSchema.parse(req.params)
      const photo = await trailsService.getExploreAlertPhoto(params.id, params.alertId)
      res.setHeader('Content-Type', photo.contentType)
      res.setHeader('Cache-Control', 'private, max-age=3600')
      res.send(photo.arquivo)
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
