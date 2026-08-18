import type { PoolConfig } from 'pg'
import type { Env } from '../config/env'

function isLocalHost(host: string) {
  return host === 'localhost' || host === '127.0.0.1' || host === '::1'
}

function normalizeDatabaseUrl(url: string) {
  return url.replace(/^jdbc:/i, '')
}

export function shouldUseSsl(env: Env) {
  if (env.DB_SSL) return true

  const host = env.DB_HOST ?? ''
  if (host && !isLocalHost(host)) return true

  const databaseUrl = env.DATABASE_URL ?? ''
  return Boolean(databaseUrl) && !/localhost|127\.0\.0\.1/i.test(databaseUrl)
}

export function createPoolConfig(env: Env): PoolConfig {
  const ssl = shouldUseSsl(env) ? { rejectUnauthorized: false } : false

  if (env.DB_HOST && env.DB_USER && env.DB_NAME) {
    return {
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      ssl,
      max: 10,
      connectionTimeoutMillis: 8000,
    }
  }

  return {
    connectionString: env.DATABASE_URL ? normalizeDatabaseUrl(env.DATABASE_URL) : undefined,
    ssl,
    max: 10,
    connectionTimeoutMillis: 8000,
  }
}

export function describeDatabaseTarget(env: Env) {
  if (env.DB_HOST && env.DB_NAME) {
    return `${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`
  }

  if (!env.DATABASE_URL) {
    return 'PostgreSQL'
  }

  try {
    const normalized = normalizeDatabaseUrl(env.DATABASE_URL)
    const withProtocol = /:\/\//.test(normalized)
      ? normalized
      : `postgresql://${normalized}`
    const url = new URL(withProtocol.replace(/^postgresql:/, 'http:').replace(/^postgres:/, 'http:'))
    return `${url.hostname}${url.port ? `:${url.port}` : ''}${url.pathname}`
  } catch {
    return 'DATABASE_URL'
  }
}
