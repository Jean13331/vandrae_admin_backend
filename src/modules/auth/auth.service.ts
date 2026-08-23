import type { Env } from '../../config/env'
import { durationFromNow } from '../../lib/duration'
import { AppError } from '../../lib/errors'
import { logger } from '../../lib/logger'
import { signAccessToken, signGoogleProfileToken, verifyGoogleProfileToken } from '../../lib/jwt'
import { verifyGoogleIdToken, exchangeGoogleAuthorizationCode } from '../../lib/googleIdToken'
import { verifyPassword, hashPassword } from '../../lib/password'
import {
  createAccessTokenJti,
  createRefreshToken,
  hashRefreshToken,
} from '../../lib/refreshToken'
import type { AdminAccessRepository } from '../../repositories/adminAccess.repository'
import {
  toPublicAdminUser,
  toPublicUser,
  type AdminUser,
  type AdminUserRecord,
  type AdminUserRepository,
} from '../../repositories/adminUser.repository'
import type { SessionRepository } from '../../repositories/session.repository'
import type { GoogleCompleteInput, GoogleIdTokenInput, LoginInput, RegisterInput } from './auth.schema'

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

  async function issueAppSession(user: AdminUserRecord, meta: SessionMeta = {}): Promise<AuthSession> {
    const publicUser = toPublicUser(user)
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
        role: publicUser.role,
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

      if (!user.passwordHash) {
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

    async loginApp(input: LoginInput, meta: SessionMeta = {}): Promise<AuthSession> {
      const user = await adminUsers.findByEmail(input.email)

      if (!user || user.ativo === false) {
        logger.audit(`[auth] login do app recusado: ${input.email}`, {
          ip: meta.ip,
          status: 401,
          actor: input.email,
        })
        throw new AppError(401, 'E-mail ou senha inválidos.')
      }

      if (!user.passwordHash) {
        throw new AppError(401, 'Esta conta entra com o Google.')
      }

      const passwordMatches = await verifyPassword(input.password, user.passwordHash)

      if (!passwordMatches) {
        logger.audit(`[auth] login do app recusado (senha inválida): ${input.email}`, {
          ip: meta.ip,
          status: 401,
          actor: input.email,
        })
        throw new AppError(401, 'E-mail ou senha inválidos.')
      }

      const session = await issueAppSession(user, meta)
      logger.audit(`[auth] login do app bem-sucedido: ${session.user.email}`, {
        ip: meta.ip,
        status: 200,
        actor: session.user.email,
      })
      return session
    },

    async registerApp(input: RegisterInput, meta: SessionMeta = {}): Promise<AuthSession> {
      const existing = await adminUsers.findByEmail(input.email)
      if (existing) {
        throw new AppError(409, 'Este e-mail já está cadastrado.')
      }

      let user: AdminUserRecord
      try {
        user = await adminUsers.createCommunity({
          nome: input.name,
          email: input.email,
          passwordHash: await hashPassword(input.password),
          dataNascimento: input.birthDate,
          cidade: input.city,
          estado: input.state,
        })
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new AppError(409, 'Este e-mail já está cadastrado.')
        }
        throw error
      }

      const session = await issueAppSession(user, meta)
      logger.audit(`[auth] cadastro do app: ${session.user.email}`, {
        ip: meta.ip,
        status: 201,
        actor: session.user.email,
      })
      return session
    },

    async googleLogin(input: GoogleIdTokenInput, meta: SessionMeta = {}) {
      const idToken =
        input.idToken ??
        (await exchangeGoogleAuthorizationCode({
          code: input.code ?? '',
          redirectUri: input.redirectUri ?? '',
          codeVerifier: input.codeVerifier,
          clientIds: env.GOOGLE_CLIENT_IDS,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
        }))
      const googleUser = await verifyGoogleIdToken(idToken, env.GOOGLE_CLIENT_IDS)
      const byGoogle = await adminUsers.findByGoogleSub(googleUser.googleSub)
      const byEmail = await adminUsers.findByEmail(googleUser.email)

      if (byGoogle) {
        if (byGoogle.ativo === false) throw new AppError(401, 'Esta conta está desativada.')
        if (byEmail && byEmail.id !== byGoogle.id) {
          throw new AppError(409, 'Esta conta Google já está vinculada a outro usuário.')
        }
        const session = await issueAppSession(byGoogle, meta)
        logger.audit(`[auth] login Google: ${session.user.email}`, {
          ip: meta.ip,
          status: 200,
          actor: session.user.email,
        })
        return session
      }

      if (byEmail) {
        if (byEmail.ativo === false) throw new AppError(401, 'Esta conta está desativada.')
        const linked = (await adminUsers.linkGoogleSub(byEmail.id, googleUser.googleSub)) ?? byEmail
        const session = await issueAppSession(linked, meta)
        logger.audit(`[auth] login Google vinculado: ${session.user.email}`, {
          ip: meta.ip,
          status: 200,
          actor: session.user.email,
        })
        return session
      }

      return {
        needsProfile: true as const,
        profileToken: signGoogleProfileToken(
          {
            googleSub: googleUser.googleSub,
            email: googleUser.email,
            name: googleUser.name,
          },
          env,
        ),
        name: googleUser.name,
        email: googleUser.email,
      }
    },

    async completeGoogleProfile(input: GoogleCompleteInput, meta: SessionMeta = {}) {
      let profile
      try {
        profile = verifyGoogleProfileToken(input.profileToken, env)
      } catch {
        throw new AppError(401, 'Sessão do Google expirada. Entre de novo.')
      }

      const already = await adminUsers.findByGoogleSub(profile.googleSub)
      if (already) {
        if (already.ativo === false) throw new AppError(401, 'Esta conta está desativada.')
        return issueAppSession(already, meta)
      }

      const emailTaken = await adminUsers.findByEmail(profile.email)
      if (emailTaken) {
        throw new AppError(409, 'Este e-mail já está cadastrado. Entre com e-mail e senha.')
      }

      let user: AdminUserRecord
      try {
        user = await adminUsers.createCommunity({
          nome: profile.name,
          email: profile.email,
          passwordHash: null,
          dataNascimento: input.birthDate,
          cidade: input.city,
          estado: input.state,
          authProvider: 'google',
          googleSub: profile.googleSub,
        })
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new AppError(409, 'Este e-mail já está cadastrado.')
        }
        throw error
      }

      const session = await issueAppSession(user, meta)
      logger.audit(`[auth] cadastro Google: ${session.user.email}`, {
        ip: meta.ip,
        status: 201,
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

    async refreshApp(refreshToken: string, meta: SessionMeta = {}): Promise<AuthSession> {
      const stored = await sessions.findByRefreshHash(hashRefreshToken(refreshToken))

      if (!stored) {
        throw new AppError(401, 'Refresh token inválido.')
      }

      if (stored.revokedAt) {
        await sessions.revokeAllForUser(stored.usuarioId)
        throw new AppError(401, 'Refresh token inválido.')
      }

      if (stored.expiresAt.getTime() <= Date.now()) {
        await sessions.revokeById(stored.id)
        throw new AppError(401, 'Refresh token expirado.')
      }

      const user = await adminUsers.findById(stored.usuarioId)

      if (!user || user.ativo === false) {
        await sessions.revokeById(stored.id)
        throw new AppError(401, 'Sessão inválida.')
      }

      const publicUser = toPublicUser(user)
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
          role: publicUser.role,
          jti: accessJti,
        },
        env,
      )

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

function isUniqueViolation(error: unknown) {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === '23505',
  )
}
