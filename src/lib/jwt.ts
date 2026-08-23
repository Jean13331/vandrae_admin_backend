import jwt, { type SignOptions } from 'jsonwebtoken'
import type { Env } from '../config/env'

export type JwtPayload = {
  sub: string
  email: string
  role: 'admin' | 'user'
  jti: string
}

export type GoogleProfilePayload = {
  typ: 'google-profile'
  googleSub: string
  email: string
  name: string
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

export function signGoogleProfileToken(payload: Omit<GoogleProfilePayload, 'typ'>, env: Env) {
  return jwt.sign(
    {
      typ: 'google-profile',
      googleSub: payload.googleSub,
      email: payload.email,
      name: payload.name,
    },
    env.JWT_SECRET,
    { expiresIn: '20m' },
  )
}

export function verifyGoogleProfileToken(token: string, env: Env): GoogleProfilePayload {
  const decoded = jwt.verify(token, env.JWT_SECRET)
  if (typeof decoded === 'string') {
    throw new Error('Token inválido.')
  }
  const payload = decoded as jwt.JwtPayload & Partial<GoogleProfilePayload>
  if (
    payload.typ !== 'google-profile' ||
    typeof payload.googleSub !== 'string' ||
    typeof payload.email !== 'string' ||
    typeof payload.name !== 'string'
  ) {
    throw new Error('Token inválido.')
  }

  return {
    typ: 'google-profile',
    googleSub: payload.googleSub,
    email: payload.email,
    name: payload.name,
  }
}
