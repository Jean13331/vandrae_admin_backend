type TrailGeometry = {
  type: 'LineString' | 'MultiLineString'
  coordinates: number[][] | number[][][]
}

export type ElevationPoint = {
  km: number
  ele: number
}

export type TrailElevation = {
  minM: number
  maxM: number
  ganhoM: number
  perdaM: number
  inicioM: number
  fimM: number
  pontos: ElevationPoint[]
}

type LatLng = { lat: number; lng: number }

function flattenCoordinates(geometry: TrailGeometry | null): LatLng[] {
  if (!geometry?.coordinates?.length) return []

  const lines =
    geometry.type === 'MultiLineString'
      ? (geometry.coordinates as number[][][])
      : [geometry.coordinates as number[][]]

  return lines.flatMap((line) => line.map(([lng, lat]) => ({ lat, lng })))
}

function samplePoints(points: LatLng[], maxPoints: number) {
  if (points.length <= maxPoints) return points

  const sampled: LatLng[] = []
  for (let index = 0; index < maxPoints; index += 1) {
    const sourceIndex = Math.round((index * (points.length - 1)) / (maxPoints - 1))
    sampled.push(points[sourceIndex])
  }
  return sampled
}

function haversineKm(from: LatLng, to: LatLng) {
  const toRad = (value: number) => (value * Math.PI) / 180
  const earthKm = 6371
  const dLat = toRad(to.lat - from.lat)
  const dLng = toRad(to.lng - from.lng)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * earthKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function lookupTrailElevation(geometry: TrailGeometry | null): Promise<TrailElevation | null> {
  const sampled = samplePoints(flattenCoordinates(geometry), 80)
  if (sampled.length < 2) return null

  const url = new URL('https://api.open-meteo.com/v1/elevation')
  url.searchParams.set('latitude', sampled.map((point) => point.lat.toFixed(5)).join(','))
  url.searchParams.set('longitude', sampled.map((point) => point.lng.toFixed(5)).join(','))

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) return null

    const body = (await response.json()) as { elevation?: number[] }
    const elevations = body.elevation
    if (!elevations || elevations.length !== sampled.length) return null

    let distanceKm = 0
    let ganhoM = 0
    let perdaM = 0
    const pontos: ElevationPoint[] = elevations.map((ele, index) => {
      if (index > 0) {
        distanceKm += haversineKm(sampled[index - 1], sampled[index])
        const delta = ele - elevations[index - 1]
        if (delta > 0) ganhoM += delta
        if (delta < 0) perdaM += Math.abs(delta)
      }

      return {
        km: Math.round(distanceKm * 100) / 100,
        ele: Math.round(ele),
      }
    })

    return {
      minM: Math.round(Math.min(...elevations)),
      maxM: Math.round(Math.max(...elevations)),
      ganhoM: Math.round(ganhoM),
      perdaM: Math.round(perdaM),
      inicioM: Math.round(elevations[0]),
      fimM: Math.round(elevations[elevations.length - 1]),
      pontos,
    }
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}
