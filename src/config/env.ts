import { z } from 'zod'

const emptyToUndefined = (value: string | undefined) => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

const emailListSchema = z
  .string()
  .optional()
  .default('')
  .transform((value) => {
    const emails = value
      .split(/[,;\n]/)
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)

    return [...new Set(emails)]
  })
  .refine((emails) => emails.every((email) => z.string().email().safeParse(email).success), {
    message: 'ADMIN_ALLOWED_EMAILS deve listar e-mails válidos, separados por vírgula.',
  })

const envSchema = z
  .object({
    PORT: z.coerce.number().int().positive().default(3333),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    CORS_ORIGIN: z.string().min(1).default('https://localhost:5173'),
    JWT_SECRET: z.string().min(16),
    JWT_EXPIRES_IN: z.string().min(1).default('15m'),
    REFRESH_EXPIRES_IN: z.string().min(1).default('7d'),
    HTTPS: z
      .enum(['true', 'false', '1', '0'])
      .optional()
      .default('false')
      .transform((value) => value === 'true' || value === '1'),
    HTTPS_KEY: z.string().optional().transform(emptyToUndefined),
    HTTPS_CERT: z.string().optional().transform(emptyToUndefined),
    MOBILE_HTTP_PORT: z.coerce.number().int().positive().optional(),
    ADMIN_SEED_ID: z.string().min(1).default('admin-1'),
    ADMIN_SEED_NAME: z.string().min(1).default('Administrador'),
    ADMIN_SEED_EMAIL: z.string().optional().transform(emptyToUndefined),
    ADMIN_SEED_PASSWORD: z.string().optional().transform(emptyToUndefined),
    ADMIN_ALLOWED_EMAILS: emailListSchema,
    GOOGLE_CLIENT_IDS: z
      .string()
      .optional()
      .default('')
      .transform((value) =>
        [...new Set(value.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean))],
      ),
    GOOGLE_CLIENT_SECRET: z.string().optional().transform(emptyToUndefined),
    DATABASE_URL: z.string().optional().transform(emptyToUndefined),
    DB_HOST: z.string().optional().transform(emptyToUndefined),
    DB_PORT: z.coerce.number().int().positive().default(5432),
    DB_USER: z.string().optional().transform(emptyToUndefined),
    DB_PASSWORD: z.string().optional().default(''),
    DB_NAME: z.string().optional().transform(emptyToUndefined),
    DB_SSL: z
      .enum(['true', 'false', '1', '0'])
      .optional()
      .default('false')
      .transform((value) => value === 'true' || value === '1'),
  })
  .refine((env) => Boolean(env.DATABASE_URL || (env.DB_HOST && env.DB_USER && env.DB_NAME)), {
    message:
      'Preencha DATABASE_URL ou DB_HOST, DB_USER e DB_NAME com as credenciais do PostgreSQL.',
  })
  .refine((env) => !env.ADMIN_SEED_EMAIL || z.string().email().safeParse(env.ADMIN_SEED_EMAIL).success, {
    message: 'ADMIN_SEED_EMAIL deve ser um e-mail válido.',
    path: ['ADMIN_SEED_EMAIL'],
  })
  .refine((env) => !env.ADMIN_SEED_PASSWORD || env.ADMIN_SEED_PASSWORD.length >= 6, {
    message: 'ADMIN_SEED_PASSWORD deve ter pelo menos 6 caracteres.',
    path: ['ADMIN_SEED_PASSWORD'],
  })

export type Env = z.infer<typeof envSchema>

export function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env)

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'banco'}: ${issue.message}`)
      .join('; ')
    throw new Error(`Variáveis de ambiente inválidas: ${details}`)
  }

  return parsed.data
}
