import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().trim().email('Informe um e-mail válido.'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
})

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Informe o refresh token.'),
})

export const logoutSchema = z.object({
  refreshToken: z.string().min(1, 'Informe o refresh token.'),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RefreshInput = z.infer<typeof refreshSchema>
export type LogoutInput = z.infer<typeof logoutSchema>
