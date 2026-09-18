import dns from 'node:dns'
import type { PoolConfig } from 'pg'
import type { Env } from '../config/env'

function isLocalHost(host: string) {
  return host === 'localhost' || host === '127.0.0.1' || host === '::1'
}

function normalizeDatabaseUrl(url: string) {
  return url.replace(/^jdbc:/i, '')
}

function lookupIPv4(
  hostname: string,
  _options: unknown,
  callback: (err: NodeJS.ErrnoException | null, address: string, family: number) => void,
) {
  dns.lookup(hostname, { family: 4 }, callback)
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
  const ipv4 = { lookup: lookupIPv4 }

  if (env.DATABASE_URL) {
    return {
      connectionString: normalizeDatabaseUrl(env.DATABASE_URL),
      ssl,
      max: 10,
      connectionTimeoutMillis: 8000,
      ...ipv4,
    }
  }

  return {
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    ssl,
    max: 10,
    connectionTimeoutMillis: 8000,
    ...ipv4,
  }
}

export function describeDatabaseTarget(env: Env) {
  if (env.DATABASE_URL) {
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

  if (env.DB_HOST && env.DB_NAME) {
    return `${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`
  }

  return 'PostgreSQL'
}
