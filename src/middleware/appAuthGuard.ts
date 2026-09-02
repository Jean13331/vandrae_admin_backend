import type { NextFunction, Request, Response } from 'express'
import type { RequestHandler } from 'express'

const PUBLIC_POST_PATHS = new Set([
  '/auth/login',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/register',
  '/auth/google',
  '/auth/google/complete',
  '/auth/refresh',
  '/auth/logout',
])

const PUBLIC_GET_PATHS = new Set(['/auth/reset-password'])

function requestPath(req: Request) {
  return req.originalUrl.split('?')[0]
}

export function createAppAuthGuard(requireAuth: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (
      req.method === 'OPTIONS' ||
      (req.method === 'POST' && PUBLIC_POST_PATHS.has(requestPath(req))) ||
      (req.method === 'GET' && PUBLIC_GET_PATHS.has(requestPath(req)))
    ) {
      next()
      return
    }

    void requireAuth(req, res, next)
  }
}
