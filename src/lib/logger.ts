export type LogLevel = 'info' | 'warn' | 'error' | 'http'

export type LogMeta = {
  ip?: string
  status?: number
  category?: 'audit'
  actor?: string
}

export type LogEntry = {
  id: string
  timestamp: string
  level: LogLevel
  message: string
  ip?: string
  status?: number
  category?: 'audit'
  actor?: string
}

const MAX_ENTRIES = 500
const entries: LogEntry[] = []
const listeners = new Set<(entry: LogEntry) => void>()

function serialize(value: unknown) {
  if (value instanceof Error) {
    return value.stack ?? value.message
  }

  if (typeof value === 'string') {
    return value
  }

  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export function appendLog(level: LogLevel, args: unknown[], meta: LogMeta = {}) {
  const entry: LogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    level,
    message: args.map(serialize).join(' '),
    ip: meta.ip,
    status: meta.status,
    category: meta.category,
    actor: meta.actor,
  }

  entries.push(entry)
  if (entries.length > MAX_ENTRIES) {
    entries.shift()
  }

  for (const listener of listeners) {
    listener(entry)
  }

  if (entry.category === 'audit' && persistAudit) {
    void persistAudit(entry).catch(() => undefined)
  }

  return entry
}

let persistAudit: ((entry: LogEntry) => Promise<void>) | undefined

export function setAuditPersist(writer: (entry: LogEntry) => Promise<void>) {
  persistAudit = writer
}

export function hydrateLogs(items: LogEntry[]) {
  entries.length = 0
  entries.push(...items.slice(-MAX_ENTRIES))
}

export function listLogs(limit = 200) {
  const size = Math.min(Math.max(limit, 1), MAX_ENTRIES)
  return entries.slice(-size)
}

export function subscribeLogs(listener: (entry: LogEntry) => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const logger = {
  info(...args: unknown[]) {
    console.log(...args)
    appendLog('info', args)
  },
  warn(...args: unknown[]) {
    console.warn(...args)
    appendLog('warn', args)
  },
  error(...args: unknown[]) {
    console.error(...args)
    appendLog('error', args)
  },
  http(message: string, ip?: string, status?: number) {
    const withStatus = status ? `${message} ${status}` : message
    console.log(ip ? `${withStatus} · ${ip}` : withStatus)
    appendLog('http', [message], {
      ip,
      status,
      category: status === 401 || status === 403 ? 'audit' : undefined,
    })
  },
  audit(message: string, meta: LogMeta = {}) {
    const level: LogLevel = meta.status && meta.status >= 400 ? 'warn' : 'info'
    const line = meta.ip ? `${message} · ${meta.ip}` : message
    if (level === 'warn') {
      console.warn(line)
    } else {
      console.log(line)
    }
    appendLog(level, [message], { ...meta, category: 'audit' })
  },
}
