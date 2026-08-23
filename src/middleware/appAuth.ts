import type { NextFunction, Request, Response } from 'express'
import type { Env } from '../config/env'
import { AppError } from '../lib/errors'
import { verifyAccessToken } from '../lib/jwt'
import {
  toPublicUser,
  type AdminUserRepository,
} from '../repositories/adminUser.repository'
import type { SessionRepository } from '../repositories/session.repository'

export function createAppAuthMiddleware(
  env: Env,
  adminUsers: AdminUserRepository,
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

      if (!record || record.ativo === false) {
        throw new AppError(401, 'Sessão inválida.')
      }

      req.appUser = toPublicUser(record)
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
