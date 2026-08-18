import type { NextFunction, Request, Response } from 'express'
import { logger } from '../lib/logger'

function shouldSkip(path: string) {
  return (
    path.startsWith('/docs-assets') ||
    path.startsWith('/admin/logs') ||
    path === '/favicon.ico'
  )
}

export function clientIp(req: Request) {
  const forwarded = req.header('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'desconhecido'
  }

  const realIp = req.header('x-real-ip')?.trim()
  if (realIp) {
    return realIp
  }

  const ip = req.ip || req.socket.remoteAddress || 'desconhecido'
  return ip.replace(/^::ffff:/, '')
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startedAt = Date.now()
  const ip = clientIp(req)

  res.on('finish', () => {
    const path = req.originalUrl.split('?')[0]
    if (shouldSkip(path)) return

    const status = res.statusCode
    logger.http(`${req.method} ${path} ${Date.now() - startedAt}ms`, ip, status)
  })

  next()
}
