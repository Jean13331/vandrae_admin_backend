import { createHash, randomBytes } from 'node:crypto'

export function createRefreshToken() {
  return randomBytes(48).toString('base64url')
}

export function hashRefreshToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function createAccessTokenJti() {
  return randomBytes(16).toString('hex')
}
