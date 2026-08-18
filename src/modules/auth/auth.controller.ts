import type { Request, Response } from 'express'
import { asyncHandler } from '../../lib/asyncHandler'
import { clientIp } from '../../middleware/requestLogger'
import { loginSchema, logoutSchema, refreshSchema } from './auth.schema'
import type { AuthService } from './auth.service'

function sessionMeta(req: Request) {
  return {
    ip: clientIp(req),
    userAgent: req.header('user-agent') ?? undefined,
  }
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
  }
}

export type AuthController = ReturnType<typeof createAuthController>
