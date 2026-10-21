import { z } from 'zod'

export const apoioQuerySchema = z.object({
  q: z.string().trim().max(120).optional().default(''),
})

export const trailActivitySchema = z.object({
  tipo: z.enum(['BUSCA', 'DOWNLOAD']),
  trilhaId: z.string().uuid().optional(),
  trilhaIds: z.array(z.string().uuid()).max(40).optional(),
  termo: z.string().trim().max(255).optional().nullable(),
})
