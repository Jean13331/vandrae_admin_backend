import type { Env } from '../../config/env'
import { durationFromNow } from '../../lib/duration'
import { AppError } from '../../lib/errors'
import { logger } from '../../lib/logger'
import { signAccessToken } from '../../lib/jwt'
import { verifyPassword } from '../../lib/password'
import {
  createAccessTokenJti,
  createRefreshToken,
  hashRefreshToken,
} from '../../lib/refreshToken'
import type { AdminAccessRepository } from '../../repositories/adminAccess.repository'
import {
  toPublicAdminUser,
  type AdminUser,
  type AdminUserRecord,
  type AdminUserRepository,
} from '../../repositories/adminUser.repository'
import type { SessionRepository } from '../../repositories/session.repository'
import type { LoginInput } from './auth.schema'

export type AuthSession = {
  user: AdminUser
  token: string
  refreshToken: string
}

export type SessionMeta = {
  ip?: string
  userAgent?: string
}

export function createAuthService(
  env: Env,
  adminUsers: AdminUserRepository,
  accessEmails: AdminAccessRepository,
  sessions: SessionRepository,
) {
  async function assertPanelAccess(user: AdminUserRecord, meta: SessionMeta = {}) {
    if (user.role !== 'admin' || user.ativo === false) {
      logger.audit(`[auth] acesso admin recusado para ${user.email}`, {
        ip: meta.ip,
        status: 401,
        actor: user.email,
      })
      throw new AppError(401, 'Sessão inválida.')
    }

    if (!(await accessEmails.has(user.email))) {
      logger.audit(`[auth] e-mail não autorizado no painel: ${user.email}`, {
        ip: meta.ip,
        status: 403,
        actor: user.email,
      })
      throw new AppError(403, 'Este e-mail não está autorizado a acessar o painel.')
    }
  }

  async function issueSession(user: AdminUserRecord, meta: SessionMeta = {}): Promise<AuthSession> {
    const publicUser = toPublicAdminUser(user)
    const accessJti = createAccessTokenJti()
    const refreshToken = createRefreshToken()

    await sessions.create({
      usuarioId: publicUser.id,
      refreshTokenHash: hashRefreshToken(refreshToken),
      accessTokenJti: accessJti,
      userAgent: meta.userAgent,
      ip: meta.ip,
      expiresAt: durationFromNow(env.REFRESH_EXPIRES_IN),
    })

    const token = signAccessToken(
      {
        sub: publicUser.id,
        email: publicUser.email,
        role: 'admin',
        jti: accessJti,
      },
      env,
    )

    return {
      user: publicUser,
      token,
      refreshToken,
    }
  }

  return {
    async login(input: LoginInput, meta: SessionMeta = {}): Promise<AuthSession> {
      const user = await adminUsers.findByEmail(input.email)

      if (!user) {
        logger.audit(`[auth] login recusado (e-mail desconhecido): ${input.email}`, {
          ip: meta.ip,
          status: 401,
          actor: input.email,
        })
        throw new AppError(401, 'E-mail ou senha inválidos.')
      }

      if (user.role !== 'admin' || user.ativo === false) {
        logger.audit(`[auth] login recusado (sem perfil admin): ${input.email}`, {
          ip: meta.ip,
          status: 401,
          actor: input.email,
        })
        throw new AppError(401, 'E-mail ou senha inválidos.')
      }

      const passwordMatches = await verifyPassword(input.password, user.passwordHash)

      if (!passwordMatches) {
        logger.audit(`[auth] login recusado (senha inválida): ${input.email}`, {
          ip: meta.ip,
          status: 401,
          actor: input.email,
        })
        throw new AppError(401, 'E-mail ou senha inválidos.')
      }

      await assertPanelAccess(user, meta)

      const session = await issueSession(user, meta)
      logger.audit(`[auth] login bem-sucedido: ${session.user.email}`, {
        ip: meta.ip,
        status: 200,
        actor: session.user.email,
      })
      return session
    },

    async refresh(refreshToken: string, meta: SessionMeta = {}): Promise<AuthSession> {
      const stored = await sessions.findByRefreshHash(hashRefreshToken(refreshToken))

      if (!stored) {
        logger.audit('[auth] refresh recusado (token inválido)', {
          ip: meta.ip,
          status: 401,
        })
        throw new AppError(401, 'Refresh token inválido.')
      }

      if (stored.revokedAt) {
        await sessions.revokeAllForUser(stored.usuarioId)
        logger.audit(`[auth] refresh token reutilizado (possível sequestro de sessão) usuário ${stored.usuarioId}`, {
          ip: meta.ip,
          status: 401,
        })
        throw new AppError(401, 'Refresh token inválido.')
      }

      if (stored.expiresAt.getTime() <= Date.now()) {
        await sessions.revokeById(stored.id)
        logger.audit('[auth] refresh recusado (token expirado)', {
          ip: meta.ip,
          status: 401,
        })
        throw new AppError(401, 'Refresh token expirado.')
      }

      const user = await adminUsers.findById(stored.usuarioId)

      if (!user) {
        await sessions.revokeById(stored.id)
        throw new AppError(401, 'Sessão inválida.')
      }

      await assertPanelAccess(user, meta)

      const publicUser = toPublicAdminUser(user)
      const accessJti = createAccessTokenJti()
      const nextRefreshToken = createRefreshToken()

      await sessions.touch(
        stored.id,
        accessJti,
        hashRefreshToken(nextRefreshToken),
        durationFromNow(env.REFRESH_EXPIRES_IN),
      )

      const token = signAccessToken(
        {
          sub: publicUser.id,
          email: publicUser.email,
          role: 'admin',
          jti: accessJti,
        },
        env,
      )

      logger.audit(`[auth] sessão renovada: ${publicUser.email}`, {
        ip: meta.ip,
        status: 200,
        actor: publicUser.email,
      })

      return {
        user: publicUser,
        token,
        refreshToken: nextRefreshToken,
      }
    },

    async logout(refreshToken: string, meta: SessionMeta = {}) {
      const stored = await sessions.findByRefreshHash(hashRefreshToken(refreshToken))
      if (!stored || stored.revokedAt) {
        return
      }

      await sessions.revokeById(stored.id)
      logger.audit(`[auth] logout da sessão ${stored.id}`, {
        ip: meta.ip,
        status: 204,
      })
    },
  }
}

export type AuthService = ReturnType<typeof createAuthService>
