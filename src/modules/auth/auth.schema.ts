import { z } from 'zod'

export const BRAZIL_STATES = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
] as const

export type BrazilState = (typeof BRAZIL_STATES)[number]

const birthDateSchema = z.string().trim().min(1, 'Informe a data de nascimento.').transform((value, ctx) => {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  const year = Number(iso?.[1] ?? br?.[3])
  const month = Number(iso?.[2] ?? br?.[2])
  const day = Number(iso?.[3] ?? br?.[1])

  if (!year || !month || !day) {
    ctx.addIssue({ code: 'custom', message: 'Use o formato DD/MM/AAAA.' })
    return z.NEVER
  }

  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    ctx.addIssue({ code: 'custom', message: 'Informe uma data de nascimento válida.' })
    return z.NEVER
  }

  const today = new Date()
  const age =
    today.getUTCFullYear() -
    year -
    (today.getUTCMonth() + 1 < month || (today.getUTCMonth() + 1 === month && today.getUTCDate() < day) ? 1 : 0)

  if (age < 13) {
    ctx.addIssue({ code: 'custom', message: 'É preciso ter pelo menos 13 anos para se cadastrar.' })
    return z.NEVER
  }

  if (age > 120) {
    ctx.addIssue({ code: 'custom', message: 'Informe uma data de nascimento válida.' })
    return z.NEVER
  }

  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
})

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

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome.').max(255),
  email: z
    .string()
    .trim()
    .email('Informe um e-mail válido.')
    .max(255)
    .transform((value) => value.toLowerCase()),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.').max(72),
  birthDate: birthDateSchema,
  city: z.string().trim().min(2, 'Informe a cidade.').max(255),
  state: z
    .string()
    .trim()
    .toUpperCase()
    .refine((value): value is BrazilState => BRAZIL_STATES.includes(value as BrazilState), {
      message: 'Informe um estado válido.',
    }),
})

export const googleLoginSchema = z
  .object({
    idToken: z.string().min(20, 'Token do Google inválido.').optional(),
    code: z.string().min(10, 'Código do Google inválido.').optional(),
    redirectUri: z.string().url('Redirect do Google inválido.').optional(),
    codeVerifier: z.string().min(20).optional(),
  })
  .refine((value) => Boolean(value.idToken || (value.code && value.redirectUri)), {
    message: 'Informe o token ou o código do Google.',
  })

export const googleIdTokenSchema = googleLoginSchema

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Informe um e-mail válido.')
    .max(255)
    .transform((value) => value.toLowerCase()),
})

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(20, 'Link de recuperação inválido ou expirado.').max(200),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.').max(72),
})

export const googleCompleteSchema = z.object({
  profileToken: z.string().min(20, 'Sessão do Google expirada. Entre de novo.'),
  birthDate: birthDateSchema,
  city: z.string().trim().min(2, 'Informe a cidade.').max(255),
  state: z
    .string()
    .trim()
    .toUpperCase()
    .refine((value): value is BrazilState => BRAZIL_STATES.includes(value as BrazilState), {
      message: 'Informe um estado válido.',
    }),
})

export const updateProfilePhotoSchema = z.object({
  arquivo: z.string().min(20, 'Informe a foto em base64.'),
  contentType: z.string().trim().min(3).optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RefreshInput = z.infer<typeof refreshSchema>
export type LogoutInput = z.infer<typeof logoutSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type GoogleIdTokenInput = z.infer<typeof googleLoginSchema>
export type GoogleCompleteInput = z.infer<typeof googleCompleteSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type UpdateProfilePhotoInput = z.infer<typeof updateProfilePhotoSchema>
