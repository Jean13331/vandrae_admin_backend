import type { Request, Response } from 'express'
import { asyncHandler } from '../../lib/asyncHandler'
import { AppError } from '../../lib/errors'
import { clientIp } from '../../middleware/requestLogger'
import { passwordResetFormHtml, passwordResetResultHtml } from '../../lib/passwordResetPage'
import { googleCompleteSchema, googleLoginSchema, loginSchema, logoutSchema, refreshSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema, updateProfilePhotoSchema } from './auth.schema'
import type { AuthService } from './auth.service'

function sessionMeta(req: Request) {
  return {
    ip: clientIp(req),
    userAgent: req.header('user-agent') ?? undefined,
  }
}

function wantsHtmlReset(req: Request) {
  const type = req.header('content-type') ?? ''
  const accept = req.header('accept') ?? ''
  return type.includes('application/x-www-form-urlencoded') || accept.includes('text/html')
}

export function createAuthController(authService: AuthService) {
  return {
    login: asyncHandler(async (req: Request, res: Response) => {
      const credentials = loginSchema.parse(req.body)
      const session = await authService.login(credentials, sessionMeta(req))
      res.json(session)
    }),

    refresh: asyncHandler(async (req: Request, res: Response) => {
      const input = refreshSchema.parse(req.body)
      const session = await authService.refresh(input.refreshToken, sessionMeta(req))
      res.json(session)
    }),

    logout: asyncHandler(async (req: Request, res: Response) => {
      const input = logoutSchema.parse(req.body)
      await authService.logout(input.refreshToken, sessionMeta(req))
      res.status(204).send()
    }),

    me: asyncHandler(async (req: Request, res: Response) => {
      res.json({ user: req.adminUser })
    }),

    loginApp: asyncHandler(async (req: Request, res: Response) => {
      const credentials = loginSchema.parse(req.body)
      const session = await authService.loginApp(credentials, sessionMeta(req))
      res.json(session)
    }),

    forgotPasswordApp: asyncHandler(async (req: Request, res: Response) => {
      const input = forgotPasswordSchema.parse(req.body)
      await authService.requestPasswordReset(input, sessionMeta(req))
      res.status(204).send()
    }),

    showResetPasswordPage: asyncHandler(async (req: Request, res: Response) => {
      const token = typeof req.query.token === 'string' ? req.query.token.trim() : ''
      if (!token) {
        res
          .status(400)
          .type('html')
          .send(passwordResetResultHtml(false, 'Link inválido. Peça um novo e-mail no app.'))
        return
      }
      res.type('html').send(passwordResetFormHtml({ token }))
    }),

    resetPasswordApp: asyncHandler(async (req: Request, res: Response) => {
      const html = wantsHtmlReset(req)
      const parsed = resetPasswordSchema.safeParse(req.body)
      if (!parsed.success) {
        const message = parsed.error.issues[0]?.message ?? 'Dados inválidos.'
        if (html) {
          const token = typeof req.body?.token === 'string' ? req.body.token : ''
          res.status(400).type('html').send(passwordResetFormHtml({ token, error: message }))
          return
        }
        throw parsed.error
      }

      if (html && req.body?.password !== req.body?.confirm) {
        res
          .status(400)
          .type('html')
          .send(passwordResetFormHtml({ token: parsed.data.token, error: 'As senhas não coincidem.' }))
        return
      }

      try {
        await authService.resetPasswordWithToken(parsed.data, sessionMeta(req))
      } catch (error) {
        if (html && error instanceof AppError) {
          res
            .status(error.statusCode)
            .type('html')
            .send(passwordResetFormHtml({ token: parsed.data.token, error: error.message }))
          return
        }
        throw error
      }

      if (html) {
        res
          .type('html')
          .send(
            passwordResetResultHtml(
              true,
              'Sua senha foi atualizada. Volte ao app e entre com o e-mail e a senha nova.',
            ),
          )
        return
      }

      res.status(204).send()
    }),

    registerApp: asyncHandler(async (req: Request, res: Response) => {
      const input = registerSchema.parse(req.body)
      const session = await authService.registerApp(input, sessionMeta(req))
      res.status(201).json(session)
    }),

    googleApp: asyncHandler(async (req: Request, res: Response) => {
      const input = googleLoginSchema.parse(req.body)
      const result = await authService.googleLogin(input, sessionMeta(req))
      res.json(result)
    }),

    googleCompleteApp: asyncHandler(async (req: Request, res: Response) => {
      const input = googleCompleteSchema.parse(req.body)
      const session = await authService.completeGoogleProfile(input, sessionMeta(req))
      res.status(201).json(session)
    }),

    refreshApp: asyncHandler(async (req: Request, res: Response) => {
      const input = refreshSchema.parse(req.body)
      const session = await authService.refreshApp(input.refreshToken, sessionMeta(req))
      res.json(session)
    }),

    meApp: asyncHandler(async (req: Request, res: Response) => {
      res.json({ user: req.appUser })
    }),

    getMyPhotoApp: asyncHandler(async (req: Request, res: Response) => {
      const usuarioId = req.appUser?.id
      if (!usuarioId) {
        throw new AppError(401, 'Sessão inválida.')
      }
      const photo = await authService.getProfilePhoto(usuarioId)
      res.setHeader('Content-Type', photo.contentType)
      res.setHeader('Cache-Control', 'private, no-cache')
      res.send(photo.arquivo)
    }),

    updateMyPhotoApp: asyncHandler(async (req: Request, res: Response) => {
      const usuarioId = req.appUser?.id
      if (!usuarioId) {
        throw new AppError(401, 'Sessão inválida.')
      }
      const input = updateProfilePhotoSchema.parse(req.body)
      const user = await authService.updateProfilePhoto(usuarioId, input, req.appUser?.email)
      res.json({ user })
    }),

    deleteMyPhotoApp: asyncHandler(async (req: Request, res: Response) => {
      const usuarioId = req.appUser?.id
      if (!usuarioId) {
        throw new AppError(401, 'Sessão inválida.')
      }
      const user = await authService.clearProfilePhoto(usuarioId, req.appUser?.email)
      res.json({ user })
    }),

    deleteMeApp: asyncHandler(async (req: Request, res: Response) => {
      const usuarioId = req.appUser?.id
      if (!usuarioId) {
        throw new AppError(401, 'Sessão inválida.')
      }
      await authService.deleteAccount(usuarioId, req.appUser?.email, sessionMeta(req))
      res.status(204).send()
    }),
  }
}

export type AuthController = ReturnType<typeof createAuthController>
