import path from 'node:path'
import express, { Router, type Express } from 'express'
import type { Env } from '../config/env'
import { createOpenApiSpec } from './openapi'

function swaggerAssetsPath() {
  return path.dirname(require.resolve('swagger-ui-dist/package.json'))
}

export function setupSwagger(app: Express, env: Env) {
  const spec = createOpenApiSpec(env)
  const docsRouter = Router()
  const openapiRouter = Router()

  openapiRouter.get('/', (_req, res) => {
    res.json(spec)
  })

  docsRouter.get('/', (_req, res) => {
    res.type('html').send(`<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>Vandrae API</title>
    <link rel="stylesheet" href="/docs-assets/swagger-ui.css" />
    <style>
      html { box-sizing: border-box; overflow-y: scroll; }
      *, *::before, *::after { box-sizing: inherit; }
      body { margin: 0; background: #fafafa; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="/docs-assets/swagger-ui-bundle.js"></script>
    <script>
      let ui
      ui = SwaggerUIBundle({
        url: '/openapi',
        dom_id: '#swagger-ui',
        persistAuthorization: true,
        responseInterceptor: (res) => {
          try {
            const isLogin = /\/auth\/login(?:\?|$)/.test(String(res.url || ''))
            if (isLogin && res.status === 200 && res.text) {
              const body = JSON.parse(res.text)
              if (body.token) {
                ui.authActions.authorize({
                  bearerAuth: {
                    name: 'bearerAuth',
                    schema: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
                    value: body.token,
                  },
                })
              }
            }
          } catch (error) {
            console.warn('[swagger] não foi possível aplicar o Bearer automaticamente', error)
          }
          return res
        },
      })
      window.ui = ui
    </script>
  </body>
</html>`)
  })

  app.use('/openapi', openapiRouter)
  app.use('/docs', docsRouter)
  app.use('/docs-assets', express.static(swaggerAssetsPath()))
}
