import { OAuth2Client } from 'google-auth-library'
import { AppError } from './errors'

const client = new OAuth2Client()

export async function exchangeGoogleAuthorizationCode(input: {
  code: string
  redirectUri: string
  codeVerifier?: string
  clientIds: string[]
  clientSecret?: string
}) {
  if (!input.clientIds.length) {
    throw new AppError(503, 'Login com Google ainda não foi configurado.')
  }
  if (!input.code || !input.redirectUri) {
    throw new AppError(400, 'Código do Google inválido.')
  }
  if (!input.redirectUri.startsWith('https://auth.expo.io/')) {
    throw new AppError(400, 'Redirect do Google inválido.')
  }
  if (!input.clientSecret) {
    throw new AppError(
      503,
      'Configure GOOGLE_CLIENT_SECRET no .env do backend (a chave secreta do Client tipo Web).',
    )
  }

  try {
    const oauth = new OAuth2Client(input.clientIds[0], input.clientSecret, input.redirectUri)
    const { tokens } = await oauth.getToken({
      code: input.code,
      redirect_uri: input.redirectUri,
      codeVerifier: input.codeVerifier,
    })
    if (!tokens.id_token) {
      throw new AppError(401, 'O Google não devolveu o token de identidade.')
    }
    return tokens.id_token
  } catch (error) {
    if (error instanceof AppError) throw error
    throw new AppError(401, 'Não foi possível concluir o login com o Google.')
  }
}

export async function verifyGoogleIdToken(idToken: string, audience: string[]) {
  if (!audience.length) {
    throw new AppError(503, 'Login com Google ainda não foi configurado.')
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience,
    })
    const payload = ticket.getPayload()
    if (!payload?.sub || !payload.email) {
      throw new AppError(401, 'Não foi possível validar a conta Google.')
    }
    if (payload.email_verified === false) {
      throw new AppError(401, 'Confirme o e-mail da conta Google antes de entrar.')
    }

    return {
      googleSub: payload.sub,
      email: payload.email.toLowerCase(),
      name: (payload.name || payload.email.split('@')[0]).trim(),
    }
  } catch (error) {
    if (error instanceof AppError) throw error
    throw new AppError(401, 'Token do Google inválido ou expirado.')
  }
}
