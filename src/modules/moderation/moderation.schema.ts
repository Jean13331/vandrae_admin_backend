import { z } from 'zod'

export const reportStatusSchema = z.enum(['PENDENTE', 'EM_ANALISE', 'ACEITA', 'REJEITADA'])

export const listReportsQuerySchema = z.object({
  status: reportStatusSchema.optional(),
})

export const reportIdParamSchema = z.object({
  id: z.string().uuid('Informe um identificador válido.'),
})

export const updateReportSchema = z.object({
  status: reportStatusSchema,
})

export const listReviewsQuerySchema = z.object({
  q: z.string().trim().optional(),
  oculto: z.enum(['true', 'false', 'all']).optional().default('all'),
})

export const reviewIdParamSchema = z.object({
  id: z.string().uuid('Informe um identificador válido.'),
})

export const updateReviewSchema = z.object({
  oculto: z.boolean(),
})
