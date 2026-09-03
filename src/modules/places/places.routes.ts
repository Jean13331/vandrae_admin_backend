import { Router } from 'express'
import type { Env } from '../../config/env'
import { asyncHandler } from '../../lib/asyncHandler'
import { AppError } from '../../lib/errors'
import { searchGooglePlaces } from '../../lib/googlePlaces'

export function createPlacesRouter(env: Env) {
  const router = Router()

  router.get(
    '/search',
    asyncHandler(async (req, res) => {
      const query = String(req.query.q ?? '').trim()
      if (query.length < 2) {
        res.json({ places: [] })
        return
      }
      if (!env.GOOGLE_MAPS_API_KEY) {
        throw new AppError(503, 'Busca do Google Maps ainda não está configurada no servidor.')
      }
      const lat = Number(req.query.lat)
      const lng = Number(req.query.lng)
      const places = await searchGooglePlaces(
        env.GOOGLE_MAPS_API_KEY,
        query,
        Number.isFinite(lat) ? lat : undefined,
        Number.isFinite(lng) ? lng : undefined,
      )
      res.json({ places })
    }),
  )

  return router
}
