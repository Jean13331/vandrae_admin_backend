import { AppError } from './errors'

export type GooglePlace = {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  rating: number | null
}

type LegacyPlace = {
  place_id?: string
  name?: string
  formatted_address?: string
  vicinity?: string
  rating?: number
  geometry?: { location?: { lat?: number; lng?: number } }
}

type LegacySearchResponse = {
  status?: string
  error_message?: string
  results?: LegacyPlace[]
}

function mapLegacyPlace(place: LegacyPlace): GooglePlace | null {
  const lat = Number(place.geometry?.location?.lat)
  const lng = Number(place.geometry?.location?.lng)
  if (!place.place_id || !place.name || !Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return {
    id: place.place_id,
    name: place.name,
    address: place.formatted_address || place.vicinity || '',
    lat,
    lng,
    rating: typeof place.rating === 'number' ? place.rating : null,
  }
}

export async function searchGooglePlaces(
  apiKey: string,
  query: string,
  lat?: number,
  lng?: number,
): Promise<GooglePlace[]> {
  const params = new URLSearchParams({
    query,
    language: 'pt-BR',
    region: 'br',
    key: apiKey,
  })
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    params.set('location', `${lat},${lng}`)
    params.set('radius', '45000')
  }

  const response = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`)
  const body = (await response.json()) as LegacySearchResponse
  const status = body.status ?? ''
  if (status === 'ZERO_RESULTS') return []
  if (status !== 'OK') {
    throw new AppError(
      502,
      body.error_message ||
        'Não foi possível buscar no Google Maps. Ative a Places API nesta chave.',
    )
  }

  return (body.results ?? []).flatMap((place) => {
    const mapped = mapLegacyPlace(place)
    return mapped ? [mapped] : []
  })
}
