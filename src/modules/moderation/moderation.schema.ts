import { z } from 'zod'

export const reportStatusSchema = z.enum(['PENDENTE', 'EM_ANALISE', 'ACEITA', 'REJEITADA'])

export const listReportsQuerySchema = z.object({
  status: reportStatusSchema.optional(),
})

export const reportIdParamSchema = z.object({
  id: z.string().uuid('Informe um identificador válido.'),
})

export const updateReportSchema = z
  .object({
    status: reportStatusSchema,
    notify: z
      .object({
        subject: z.string().trim().min(3, 'Informe o assunto do e-mail.').max(120),
        body: z.string().trim().min(10, 'Escreva o texto do e-mail.').max(4000),
      })
      .optional(),
  })
  .refine((value) => value.status === 'ACEITA' || !value.notify, {
    message: 'O e-mail de aviso só pode ser enviado ao aceitar a denúncia.',
    path: ['notify'],
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
