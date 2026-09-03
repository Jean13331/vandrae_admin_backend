import { z } from 'zod'

export const listUsersQuerySchema = z.object({
  q: z.string().trim().optional(),
  role: z.enum(['admin', 'user', 'all']).optional().default('all'),
})

export const userIdParamSchema = z.object({
  id: z.string().uuid('Informe um identificador válido.'),
})

export const updateUserSchema = z
  .object({
    ativo: z.boolean(),
    notify: z
      .object({
        subject: z.string().trim().min(3, 'Informe o assunto do e-mail.').max(120),
        body: z.string().trim().min(10, 'Escreva o texto do e-mail.').max(4000),
      })
      .optional(),
  })
  .refine((value) => value.ativo === false || !value.notify, {
    message: 'O e-mail de aviso só pode ser enviado ao banir a conta.',
    path: ['notify'],
  })

export const createAdminUserSchema = z.object({
  nome: z.string().trim().min(2, 'Informe o nome.'),
  email: z.string().trim().email('Informe um e-mail válido.'),
  senha: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
  data_nascimento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe a data de nascimento no formato AAAA-MM-DD.'),
  cidade: z.string().trim().min(2, 'Informe a cidade.'),
  estado: z.string().trim().min(2, 'Informe o estado.'),
  acesso_painel: z.boolean().optional().default(true),
})

export type CreateAdminUserInput = z.infer<typeof createAdminUserSchema>
