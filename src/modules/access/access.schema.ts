import { z } from 'zod'

export const authorizedEmailSchema = z.object({
  email: z.string().trim().email('Informe um e-mail válido.').transform((value) => value.toLowerCase()),
})

export type AuthorizedEmailInput = z.infer<typeof authorizedEmailSchema>
