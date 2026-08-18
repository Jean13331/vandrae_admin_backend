import type { NextFunction, Request, Response } from 'express'
import type { Env } from '../config/env'
import { AppError } from '../lib/errors'
import { verifyAccessToken } from '../lib/jwt'
import type { AdminAccessRepository } from '../repositories/adminAccess.repository'
import {
  toPublicAdminUser,
  type AdminUserRepository,
} from '../repositories/adminUser.repository'
import type { SessionRepository } from '../repositories/session.repository'

export function createAuthMiddleware(
  env: Env,
  adminUsers: AdminUserRepository,
  accessEmails: AdminAccessRepository,
  sessions: SessionRepository,
) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const header = req.header('authorization')
      const [, token] = header?.split(' ') ?? []

      if (!header?.toLowerCase().startsWith('bearer ') || !token) {
        throw new AppError(401, 'Token de autenticação ausente.')
      }

      const payload = verifyAccessToken(token, env)
      const session = await sessions.findActiveByAccessJti(payload.jti)

      if (!session || session.usuarioId !== payload.sub) {
        throw new AppError(401, 'Sessão inválida.')
      }

      const record = await adminUsers.findById(payload.sub)

      if (!record || record.role !== 'admin' || record.ativo === false) {
        throw new AppError(401, 'Sessão inválida.')
      }

      if (!(await accessEmails.has(record.email))) {
        throw new AppError(403, 'Este e-mail não está autorizado a acessar o painel.')
      }

      req.adminUser = toPublicAdminUser(record)
      next()
    } catch (error) {
      if (error instanceof AppError) {
        next(error)
        return
      }

      next(new AppError(401, 'Token inválido ou expirado.'))
    }
  }
}
