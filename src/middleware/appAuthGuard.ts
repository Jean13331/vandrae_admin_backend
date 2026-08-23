import type { NextFunction, Request, Response } from 'express'
import type { RequestHandler } from 'express'

const PUBLIC_POST_PATHS = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/google',
  '/auth/google/complete',
  '/auth/refresh',
  '/auth/logout',
])

function requestPath(req: Request) {
  return req.originalUrl.split('?')[0]
}

export function createAppAuthGuard(requireAuth: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'POST' && PUBLIC_POST_PATHS.has(requestPath(req))) {
      next()
      return
    }

    void requireAuth(req, res, next)
  }
}
