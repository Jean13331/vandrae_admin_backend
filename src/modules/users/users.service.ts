import { AppError } from '../../lib/errors'
import { logger } from '../../lib/logger'
import { sendBanNoticeEmail } from '../../lib/mailer'
import { hashPassword } from '../../lib/password'
import type { Env } from '../../config/env'
import type { AdminAccessRepository } from '../../repositories/adminAccess.repository'
import type { AdminUserRepository } from '../../repositories/adminUser.repository'
import type { SessionRepository } from '../../repositories/session.repository'
import type { CreateAdminUserInput } from './users.schema'

function isUniqueViolation(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23505'
  )
}

export function createUsersService(
  adminUsers: AdminUserRepository,
  accessEmails: AdminAccessRepository,
  sessions: SessionRepository,
  env: Env,
) {
  return {
    list(filters?: { q?: string; role?: 'admin' | 'user' }) {
      return adminUsers.list(filters)
    },

    async getById(id: string) {
      const user = await adminUsers.findDetail(id)
      if (!user) {
        throw new AppError(404, 'Usuário não encontrado.')
      }
      return user
    },

    async setAtivo(
      id: string,
      ativo: boolean,
      actor?: { id: string; email?: string },
      notify?: { subject: string; body: string },
    ) {
      if (actor?.id === id) {
        throw new AppError(400, 'Não é possível banir a própria conta.')
      }

      const user = await adminUsers.setAtivo(id, ativo)
      if (!user) {
        throw new AppError(404, 'Usuário não encontrado.')
      }

      if (!ativo) {
        await sessions.revokeAllForUser(id)
      }

      let emailSent = false
      let emailError = ''
      if (!ativo && notify) {
        try {
          await sendBanNoticeEmail(env, {
            to: user.email,
            name: user.name,
            subject: notify.subject,
            body: notify.body,
          })
          emailSent = true
        } catch (error) {
          emailError = error instanceof Error ? error.message : 'Não foi possível enviar o e-mail.'
          logger.error(`[users] banido ${user.email}, mas o e-mail não saiu: ${emailError}`)
        }
      }

      logger.audit(`[users] ${user.email} ${ativo ? 'reativado' : 'banido'}`, {
        actor: actor?.email,
        status: 200,
      })
      return { user, emailSent, emailError }
    },

    async create(input: CreateAdminUserInput, actorEmail?: string) {
      const existing = await adminUsers.findByEmail(input.email)
      if (existing) {
        throw new AppError(409, 'Já existe um usuário com este e-mail.')
      }

      const passwordHash = await hashPassword(input.senha)

      try {
        const user = await adminUsers.create({
          nome: input.nome,
          email: input.email.toLowerCase(),
          passwordHash,
          dataNascimento: input.data_nascimento,
          cidade: input.cidade,
          estado: input.estado.toUpperCase(),
        })

        logger.audit(`[users] administrador criado: ${user.email}`, {
          actor: actorEmail,
          status: 201,
        })

        if (input.acesso_painel && !(await accessEmails.has(user.email))) {
          await accessEmails.add(user.email)
        }

        return user
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new AppError(409, 'Já existe um usuário com este e-mail ou código.')
        }
        throw error
      }
    },
  }
}

export type UsersService = ReturnType<typeof createUsersService>
