import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { AppError } from '../lib/errors'
import { logger } from '../lib/logger'

function isJsonParseError(error: unknown): error is SyntaxError & { status: number } {
  return error instanceof SyntaxError && 'status' in error && error.status === 400
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ message: error.message })
    return
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      message: 'Dados inválidos.',
      issues: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    })
    return
  }

  if (isJsonParseError(error)) {
    res.status(400).json({ message: 'JSON inválido.' })
    return
  }

  logger.error('[error]', error instanceof Error ? error.message : error)
  res.status(500).json({ message: 'Erro interno do servidor.' })
}
