import jwt, { type SignOptions } from 'jsonwebtoken'
import type { Env } from '../config/env'

export type JwtPayload = {
  sub: string
  email: string
  role: 'admin'
  jti: string
}

export function signAccessToken(payload: Omit<JwtPayload, 'jti'> & { jti: string }, env: Env) {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
    jwtid: payload.jti,
  }

  return jwt.sign(
    {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
    },
    env.JWT_SECRET,
    options,
  )
}

export function verifyAccessToken(token: string, env: Env) {
  const decoded = jwt.verify(token, env.JWT_SECRET)

  if (typeof decoded === 'string' || !decoded.sub || !decoded.email || !decoded.jti) {
    throw new Error('Token inválido.')
  }

  return decoded as JwtPayload
}
