const UNIT_MS = {
  ms: 1,
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
} as const

export function durationFromNow(value: string) {
  const match = /^(\d+)\s*(ms|s|m|h|d)$/i.exec(value.trim())

  if (!match) {
    throw new Error(`Duração inválida: ${value}. Use formatos como 15m, 8h ou 7d.`)
  }

  const amount = Number(match[1])
  const unit = match[2].toLowerCase() as keyof typeof UNIT_MS
  return new Date(Date.now() + amount * UNIT_MS[unit])
}
