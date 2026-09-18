import { Router } from 'express'
import type { Env } from '../config/env'
import { createOpenApiSpec } from './openapi'

export function createOpenApiRouter(env: Env) {
  const router = Router()
  const spec = createOpenApiSpec(env)

  router.get('/openapi', (_req, res) => {
    res.json(spec)
  })

  return router
}
