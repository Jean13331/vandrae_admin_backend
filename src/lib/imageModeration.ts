import type { Env } from '../config/env'
import { AppError } from './errors'
import { logger } from './logger'

type Likelihood =
  | 'UNKNOWN'
  | 'VERY_UNLIKELY'
  | 'UNLIKELY'
  | 'POSSIBLE'
  | 'LIKELY'
  | 'VERY_LIKELY'

type SafeSearchAnnotation = {
  adult?: Likelihood
  spoof?: Likelihood
  medical?: Likelihood
  violence?: Likelihood
  racy?: Likelihood
}


const ADULT_BLOCK = new Set<Likelihood>(['LIKELY', 'VERY_LIKELY'])
const VIOLENCE_BLOCK = new Set<Likelihood>(['LIKELY', 'VERY_LIKELY'])

const USER_REJECT_MESSAGE =
  'Esta foto não pode ser publicada. Envie apenas imagens adequadas da trilha, sem nudez ou conteúdo explícito.'

function moderationEnabled(env: Env) {
  return env.IMAGE_MODERATION_ENABLED
}

function visionApiKey(env: Env) {
  return env.GOOGLE_VISION_API_KEY || env.GOOGLE_MAPS_API_KEY || ''
}

function isBlocked(annotation: SafeSearchAnnotation) {
  // Não bloqueia por `racy` (biquíni, sem camisa, roupa de trilha).
  // Bloqueia só nudez explícita (`adult`) e violência forte.
  return (
    ADULT_BLOCK.has(annotation.adult ?? 'UNKNOWN') ||
    VIOLENCE_BLOCK.has(annotation.violence ?? 'UNKNOWN')
  )
}

/**
 * Valida a imagem com Google Cloud Vision Safe Search.
 * Se a moderação estiver desligada ou sem chave, não bloqueia o upload.
 */
export async function assertImageIsSafe(buffer: Buffer, env: Env) {
  if (!moderationEnabled(env)) return

  const apiKey = visionApiKey(env)
  if (!apiKey) {
    logger.warn('[moderation] IMAGE_MODERATION_ENABLED sem chave Google — upload sem checagem')
    return
  }

  if (!buffer.length) {
    throw new AppError(400, 'A foto enviada é inválida.')
  }

  // Vision tem limite prático; fotos do app já vêm comprimidas.
  if (buffer.length > 8 * 1024 * 1024) {
    throw new AppError(400, 'A foto é grande demais para validação. Tire outra com menos detalhe.')
  }

  let response: Response
  try {
    response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            image: { content: buffer.toString('base64') },
            features: [{ type: 'SAFE_SEARCH_DETECTION', maxResults: 1 }],
          },
        ],
      }),
    })
  } catch (error) {
    logger.error('[moderation] falha de rede no Safe Search', error)
    throw new AppError(503, 'Não foi possível validar a foto agora. Tente de novo em instantes.')
  }

  const body = (await response.json().catch(() => null)) as
    | {
        error?: { message?: string }
        responses?: Array<{
          error?: { message?: string }
          safeSearchAnnotation?: SafeSearchAnnotation
        }>
      }
    | null

  if (!response.ok) {
    logger.error('[moderation] Vision API respondeu erro', body?.error?.message || response.status)
    throw new AppError(503, 'Não foi possível validar a foto agora. Tente de novo em instantes.')
  }

  const first = body?.responses?.[0]
  if (first?.error?.message) {
    logger.error('[moderation] Vision annotate error', first.error.message)
    throw new AppError(503, 'Não foi possível validar a foto agora. Tente de novo em instantes.')
  }

  const annotation = first?.safeSearchAnnotation
  if (!annotation) {
    logger.warn('[moderation] Safe Search sem anotação — upload liberado')
    return
  }

  if (isBlocked(annotation)) {
    logger.info('[moderation] foto bloqueada', {
      adult: annotation.adult,
      racy: annotation.racy,
      violence: annotation.violence,
    })
    throw new AppError(422, USER_REJECT_MESSAGE)
  }
}
