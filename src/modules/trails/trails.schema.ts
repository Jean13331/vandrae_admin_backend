import { z } from 'zod'

export const listTrailsQuerySchema = z.object({
  q: z.string().trim().optional(),
  ativo: z.enum(['true', 'false', 'all']).optional().default('all'),
})

export const trailIdParamSchema = z.object({
  id: z.string().uuid('Informe um identificador válido.'),
})

export const trailAlertParamSchema = trailIdParamSchema.extend({
  alertId: z.string().uuid('Informe um identificador de aviso válido.'),
})

export const trailPhotoParamSchema = trailIdParamSchema.extend({
  photoId: z.string().uuid('Informe um identificador de foto válido.'),
})

const coordinatePairSchema = z
  .tuple([z.number(), z.number()])
  .refine(([lng, lat]) => lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90, {
    message: 'Informe coordenadas no formato [longitude, latitude].',
  })

export const POINT_TYPES = [
  'CACHOEIRA',
  'MIRANTE',
  'ESTACIONAMENTO',
  'ENTRADA',
  'ACAMPAMENTO',
  'PERIGO',
  'PONTE',
  'BANHEIRO',
  'PONTO_DE_AGUA',
] as const

export const createTrailSchema = z.object({
  nome: z.string().trim().min(2, 'Informe o nome da trilha.'),
  descricao: z.string().trim().nullable().optional(),
  trajeto: z.array(coordinatePairSchema).min(2, 'Informe ao menos dois pontos do trajeto.'),
})

export const createTrailPointSchema = z.object({
  tipo: z.enum(POINT_TYPES),
  nome: z.string().trim().min(2, 'Informe o nome do ponto.'),
  descricao: z.string().trim().nullable().optional(),
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
})

export const createTrailPhotoSchema = z.object({
  descricao: z.string().trim().nullable().optional(),
  contentType: z.string().trim().min(3).default('image/jpeg'),
  arquivo: z.string().min(20, 'Informe a foto em base64.'),
  pontosTrilhaId: z.string().uuid().nullable().optional(),
  pontoIndex: z.number().int().min(0).optional(),
})

export const createAppTrailSchema = createTrailSchema.extend({
  pontos: z.array(createTrailPointSchema).max(30).optional().default([]),
  fotos: z.array(createTrailPhotoSchema).max(6).optional().default([]),
})

export const REPORT_MOTIVOS = [
  'Conteúdo impróprio',
  'Informação incorreta',
  'Local perigoso',
  'Spam',
  'Outro',
] as const

export const ALERT_TYPES = [
  'DESLIZAMENTO',
  'ARVORE_CAIDA',
  'RIO_CHEIO',
  'TRILHA_FECHADA',
  'PERIGO',
  'OUTRO',
] as const

export const createTrailReviewSchema = z.object({
  nota: z.number().int().min(1, 'Informe uma nota de 1 a 5.').max(5, 'Informe uma nota de 1 a 5.'),
  comentario: z.string().trim().max(400).nullable().optional(),
})

export const createTrailAlertSchema = z.object({
  tipo: z.enum(ALERT_TYPES),
  descricao: z.string().trim().max(500).nullable().optional(),
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
  arquivo: z.string().min(20).optional(),
  contentType: z.string().trim().min(3).optional(),
})

export const createTrailReportSchema = z
  .object({
    alvo: z.enum(['TRILHA', 'PONTO', 'FOTO', 'AVISO']),
    motivo: z.enum(REPORT_MOTIVOS),
    descricao: z.string().trim().max(500).optional(),
    pontoId: z.string().uuid().nullable().optional(),
    fotoId: z.string().uuid().nullable().optional(),
    avisoId: z.string().uuid().nullable().optional(),
  })
  .refine((value) => value.alvo !== 'PONTO' || Boolean(value.pontoId), {
    message: 'Informe o ponto denunciado.',
    path: ['pontoId'],
  })
  .refine((value) => value.alvo !== 'FOTO' || Boolean(value.fotoId), {
    message: 'Informe a foto denunciada.',
    path: ['fotoId'],
  })
  .refine((value) => value.alvo !== 'AVISO' || Boolean(value.avisoId), {
    message: 'Informe o aviso denunciado.',
    path: ['avisoId'],
  })

export const updateTrailSchema = z
  .object({
    nome: z.string().trim().min(2, 'Informe o nome da trilha.').optional(),
    descricao: z.string().trim().nullable().optional(),
    ativo: z.boolean().optional(),
  })
  .refine((value) => value.nome !== undefined || value.descricao !== undefined || value.ativo !== undefined, {
    message: 'Informe ao menos um campo para atualizar.',
  })

export type ListTrailsQuery = z.infer<typeof listTrailsQuerySchema>
export type UpdateTrailInput = z.infer<typeof updateTrailSchema>
