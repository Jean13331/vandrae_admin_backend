import { AppError } from '../../lib/errors'
import { logger } from '../../lib/logger'
import { hashPassword } from '../../lib/password'
import type { AdminAccessRepository } from '../../repositories/adminAccess.repository'
import type { AdminUserRepository } from '../../repositories/adminUser.repository'
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

    async setAtivo(id: string, ativo: boolean, actor?: { id: string; email?: string }) {
      if (actor?.id === id) {
        throw new AppError(400, 'Não é possível alterar o status da própria conta.')
      }

      const user = await adminUsers.setAtivo(id, ativo)
      if (!user) {
        throw new AppError(404, 'Usuário não encontrado.')
      }

      logger.audit(`[users] ${user.email} ${ativo ? 'ativado' : 'desativado'}`, {
        actor: actor?.email,
        status: 200,
      })
      return user
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
