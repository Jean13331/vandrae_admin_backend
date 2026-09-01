import fs from 'node:fs'
import path from 'node:path'
import { generate } from 'selfsigned'
import type { Env } from '../config/env'

function certPaths(env: Env) {
  if (env.HTTPS_KEY && env.HTTPS_CERT) {
    return {
      keyPath: path.resolve(env.HTTPS_KEY),
      certPath: path.resolve(env.HTTPS_CERT),
    }
  }

  const certDir = path.resolve(process.cwd(), 'certs')
  return {
    keyPath: path.join(certDir, 'localhost-key.pem'),
    certPath: path.join(certDir, 'localhost-cert.pem'),
  }
}

export async function loadHttpsOptions(env: Env) {
  const { keyPath, certPath } = certPaths(env)

  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    return {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    }
  }

  fs.mkdirSync(path.dirname(keyPath), { recursive: true })

  const pems = await generate(
    [
      { name: 'commonName', value: 'localhost' },
      { name: 'organizationName', value: 'Vandrae' },
    ],
    {
      keySize: 2048,
      algorithm: 'sha256',
      extensions: [
        {
          name: 'subjectAltName',
          altNames: [
            { type: 2, value: 'localhost' },
            { type: 7, ip: '127.0.0.1' },
          ],
        },
      ],
    },
  )

  fs.writeFileSync(keyPath, pems.private)
  fs.writeFileSync(certPath, pems.cert)

  return {
    key: pems.private,
    cert: pems.cert,
  }
}

export function publicUrl(env: Env, host = 'localhost') {
  const explicit = env.PUBLIC_URL?.replace(/\/$/, '')
  if (explicit) return explicit

  const fromRender = process.env.RENDER_EXTERNAL_URL?.replace(/\/$/, '')
  if (fromRender) return fromRender

  const protocol = env.HTTPS ? 'https' : 'http'
  return `${protocol}://${host}:${env.PORT}`
}
