// Usługi sieciowe bez klucza API: pogoda i geokodowanie (Open-Meteo), opisy (Wikipedia REST).
// Odpowiedzi trzymane w pamięci i w localStorage z czasem ważności, żeby wolne łącze nie blokowało widoku.

function readCache<T>(key: string, maxAgeMs: number): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const { at, data } = JSON.parse(raw) as { at: number; data: T }
    return Date.now() - at < maxAgeMs ? data : null
  } catch {
    return null
  }
}

function writeCache(key: string, data: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify({ at: Date.now(), data }))
  } catch {
    // Pełny magazyn: dane i tak są w pamięci.
  }
}

// ---------- Pogoda ----------

export interface WeatherHour {
  t: number
  cloud: number
  cloudLow: number
  cloudMid: number
  cloudHigh: number
  humidity: number
  temp: number
  dew: number
  wind: number
  visibilityKm: number
}

export async function fetchWeather(lat: number, lon: number): Promise<WeatherHour[]> {
  const key = `wx:${lat.toFixed(2)},${lon.toFixed(2)}`
  const cached = readCache<WeatherHour[]>(key, 30 * 60_000)
  if (cached) return cached
  const vars = 'cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,relative_humidity_2m,temperature_2m,dew_point_2m,wind_speed_10m,visibility'
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=${vars}&forecast_days=8&timezone=UTC&timeformat=unixtime`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Pogoda niedostępna (HTTP ${res.status})`)
  const j = await res.json()
  const h = j.hourly
  const data: WeatherHour[] = h.time.map((t: number, i: number) => ({
    t: t * 1000,
    cloud: h.cloud_cover[i],
    cloudLow: h.cloud_cover_low[i],
    cloudMid: h.cloud_cover_mid[i],
    cloudHigh: h.cloud_cover_high[i],
    humidity: h.relative_humidity_2m[i],
    temp: h.temperature_2m[i],
    dew: h.dew_point_2m[i],
    wind: h.wind_speed_10m[i],
    visibilityKm: h.visibility[i] / 1000,
  }))
  writeCache(key, data)
  return data
}

export function weatherAt(hours: readonly WeatherHour[], t: number): WeatherHour | null {
  if (!hours.length || t < hours[0].t - 3_600_000 || t > hours[hours.length - 1].t + 3_600_000) return null
  return hours.reduce((best, h) => (Math.abs(h.t - t) < Math.abs(best.t - t) ? h : best))
}

/**
 * Ocena warunków (wyliczona, nie pomiar przejrzystości): zachmurzenie ma wagę główną, wysoka wilgotność
 * i mała różnica temperatury i punktu rosy obniżają ocenę.
 */
export function skyRating(h: WeatherHour): { label: string; score: number } {
  let score = 100 - h.cloud
  if (h.humidity > 85) score -= 20
  else if (h.humidity > 70) score -= 8
  if (h.temp - h.dew < 2) score -= 10
  if (h.visibilityKm < 10) score -= 10
  score = Math.max(0, Math.min(100, score))
  const label = score >= 80 ? 'bardzo dobre' : score >= 60 ? 'dobre' : score >= 35 ? 'przeciętne' : 'złe'
  return { label, score }
}

// ---------- Geokodowanie ----------

export interface Place {
  name: string
  region: string
  latDeg: number
  lonDeg: number
  elevationM: number
  timeZone: string
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=pl&format=json`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Wyszukiwarka miejscowości niedostępna (HTTP ${res.status})`)
  const j = await res.json()
  return (j.results ?? []).map((r: Record<string, string | number>) => ({
    name: String(r.name),
    region: [r.admin2, r.admin1, r.country].filter(Boolean).join(', '),
    latDeg: Number(r.latitude),
    lonDeg: Number(r.longitude),
    elevationM: Number(r.elevation ?? 0),
    timeZone: String(r.timezone ?? 'UTC'),
  }))
}

/** Strefa czasowa i wysokość dla współrzędnych (np. z geolokalizacji przeglądarki). */
export async function placeForCoords(lat: number, lon: number): Promise<Pick<Place, 'timeZone' | 'elevationM'>> {
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&timezone=auto&forecast_days=1&current=temperature_2m`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const j = await res.json()
  return { timeZone: j.timezone ?? 'UTC', elevationM: j.elevation ?? 0 }
}

// ---------- Wikipedia ----------

export interface WikiSummary {
  title: string
  extract: string
  url: string
  lang: 'pl' | 'en'
}

export async function fetchWikiSummary(titlePl: string, titleEn: string, fallbackQuery: string): Promise<WikiSummary | null> {
  const key = `wiki:${titlePl || titleEn || fallbackQuery}`
  const cached = readCache<WikiSummary | null>(key, 14 * 86_400_000)
  if (cached !== null) return cached
  const tryTitle = async (lang: 'pl' | 'en', title: string): Promise<WikiSummary | null> => {
    if (!title) return null
    const res = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`)
    if (!res.ok) return null
    const j = await res.json()
    if (j.type === 'disambiguation' || !j.extract) return null
    return { title: j.title, extract: j.extract, url: j.content_urls?.desktop?.page ?? '', lang }
  }
  const result = (await tryTitle('pl', titlePl)) ?? (await tryTitle('en', titleEn)) ?? (await tryTitle('en', fallbackQuery))
  writeCache(key, result)
  return result
}

/**
 * Adres wyszukiwania AstroBin dla obiektu z filtrem nagród IOTD i Top Pick. Nowa wyszukiwarka (app.astrobin.com)
 * trzyma filtry w parametrze `p`: ciąg `klucz=JSON` zakodowany jak w adresie, zapisany jako napis msgpack,
 * skompresowany zlib (deflate) i w base64; tak robi ich `compressQueryString`.
 */
export async function astrobinSearchUrl(subject: string): Promise<string> {
  const query = [
    ['text', { value: '', matchType: 'ALL', onlySearchInTitlesAndDescriptions: false }],
    ['subjects', { value: [subject], matchType: null }],
    ['award', ['iotd', 'top-pick']],
  ]
    .map(([k, v]) => `${encodeURIComponent(k as string)}=${encodeURIComponent(JSON.stringify(v))}`)
    .join('&')
  const text = new TextEncoder().encode(query)
  const head = text.length < 32 ? [0xa0 | text.length] : text.length < 256 ? [0xd9, text.length] : [0xda, text.length >> 8, text.length & 255]
  const packed = new Uint8Array([...head, ...text])
  const zipped = new Uint8Array(await new Response(new Blob([packed]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer())
  let bin = ''
  for (const b of zipped) bin += String.fromCharCode(b)
  return `https://app.astrobin.com/search?p=${encodeURIComponent(btoa(bin))}`
}
