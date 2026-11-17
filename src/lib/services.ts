import { PRESSURE_LEVELS, classifySeeing, computeProfileSeeing, type PressureLevelSample, type SeeingQuality } from './seeing'

// Usługi sieciowe bez klucza API: pogoda i geokodowanie (Open-Meteo), opisy (Wikipedia REST).
// Odpowiedzi trzymane w localStorage z czasem ważności, żeby wolne łącze nie blokowało widoku; zapytania w locie
// są wspólne dla komponentów.

/** undefined: brak ważnego wpisu. Zapisany wynik null (np. brak artykułu) jest trafieniem (audyt C13). */
function readCache<T>(key: string, maxAgeMs: number): T | undefined {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return undefined
    const { at, data } = JSON.parse(raw) as { at: number; data: T }
    return Date.now() - at < maxAgeMs ? data : undefined
  } catch {
    return undefined
  }
}

/** Jedno zapytanie w locie na klucz: komponenty montowane razem dostają ten sam wynik (audyt C14). */
const inFlight = new Map<string, Promise<unknown>>()
function once<T>(key: string, load: () => Promise<T>): Promise<T> {
  const running = inFlight.get(key) as Promise<T> | undefined
  if (running) return running
  const promise = load().finally(() => inFlight.delete(key))
  inFlight.set(key, promise)
  return promise
}

function writeCache(key: string, data: unknown) {
  const payload = JSON.stringify({ at: Date.now(), data })
  try {
    localStorage.setItem(key, payload)
  } catch {
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i)
        if (k && (k.startsWith('wx4:') || k.startsWith('wx3:') || k.startsWith('wx2:') || k.startsWith('wiki:'))) localStorage.removeItem(k)
      }
      localStorage.setItem(key, payload)
    } catch {
      // Pełny magazyn: dane i tak są w pamięci.
    }
  }
}

// ---------- Pogoda ----------

export type WeatherProviderId = 'openmeteo' | 'ecmwf' | 'icon' | 'gfs' | 'ukmo' | 'gem' | 'metno'

export interface WeatherProviderInfo {
  id: WeatherProviderId
  label: string
  /** Krótka etykieta do stopki wykresu i podsumowań. */
  shortLabel: string
  /** Nazwa modelu dla Open-Meteo; brak oznacza zewnętrzne API innego dostawcy. */
  openMeteoModel?: string
  /** Czy źródło dostarcza profil pionowy do estymacji seeingu. */
  hasUpperAir: boolean
}

export const DEFAULT_WEATHER_PROVIDER: WeatherProviderId = 'openmeteo'

export const WEATHER_PROVIDERS: readonly WeatherProviderInfo[] = [
  { id: 'openmeteo', label: 'Open-Meteo · Auto', shortLabel: 'Open-Meteo', openMeteoModel: 'best_match', hasUpperAir: true },
  { id: 'ecmwf', label: 'ECMWF IFS 0.25°', shortLabel: 'ECMWF IFS', openMeteoModel: 'ecmwf_ifs025', hasUpperAir: true },
  { id: 'icon', label: 'DWD ICON', shortLabel: 'DWD ICON', openMeteoModel: 'icon_seamless', hasUpperAir: true },
  { id: 'gfs', label: 'NOAA GFS', shortLabel: 'NOAA GFS', openMeteoModel: 'gfs_seamless', hasUpperAir: true },
  { id: 'ukmo', label: 'UK Met Office', shortLabel: 'UK Met Office', openMeteoModel: 'ukmo_seamless', hasUpperAir: true },
  { id: 'gem', label: 'CMC GEM', shortLabel: 'CMC GEM', openMeteoModel: 'gem_seamless', hasUpperAir: true },
  { id: 'metno', label: 'MET Norway', shortLabel: 'MET Norway', hasUpperAir: false },
]

const PROVIDER_BY_ID = new Map<string, WeatherProviderInfo>(WEATHER_PROVIDERS.map((p) => [p.id, p]))

export function normalizeWeatherProvider(id: unknown): WeatherProviderId {
  return typeof id === 'string' && PROVIDER_BY_ID.has(id) ? (id as WeatherProviderId) : DEFAULT_WEATHER_PROVIDER
}

export function weatherProviderInfo(id: WeatherProviderId): WeatherProviderInfo {
  return PROVIDER_BY_ID.get(id) ?? WEATHER_PROVIDERS[0]
}

export interface WeatherHour {
  t: number
  cloud: number
  cloudLow: number | null
  cloudMid: number | null
  cloudHigh: number | null
  humidity: number
  temp: number
  dew: number
  wind: number
  /** Widzialność [km]; null, gdy model lub dostawca jej nie publikuje. */
  visibilityKm: number | null
  /** Najsilniejszy wiatr na 300/250/200 hPa (prąd strumieniowy) [km/h]; null, gdy model go nie podał. */
  jetKmh: number | null
  /** Seeing wyliczony z profilu pionowego C_n^2 ["]; null przy braku danych izobarycznych. */
  seeingArcsec?: number | null
  /** Składowa warstwy granicznej seeingu ["]; null przy braku profilu. */
  seeingBlArcsec?: number | null
  /** Składowa swobodnej atmosfery seeingu ["]; null przy braku profilu. */
  seeingFaArcsec?: number | null
  /** Wysokość warstwy granicznej [m AGL]; null, gdy model jej nie podał. */
  pblM?: number | null
}

const REQUIRED_FIELDS = ['t', 'cloud', 'humidity', 'temp', 'dew', 'wind'] as const
const OPTIONAL_SURFACE_FIELDS = ['cloudLow', 'cloudMid', 'cloudHigh', 'visibilityKm'] as const
const finiteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const nullableFinite = (v: unknown): v is number | null => v === null || finiteNumber(v)
const validWeatherHour = (h: WeatherHour) =>
  Boolean(h) &&
  REQUIRED_FIELDS.every((k) => finiteNumber(h[k])) &&
  OPTIONAL_SURFACE_FIELDS.every((k) => h[k] === undefined || nullableFinite(h[k]))
const round2 = (v: number) => Math.round(v * 100) / 100
const optAt = (h: Record<string, unknown>, key: string, i: number): number | null => {
  const arr = h[key]
  return Array.isArray(arr) && finiteNumber(arr[i]) ? arr[i] : null
}

const REQUIRED_SURFACE_VARS = ['cloud_cover', 'relative_humidity_2m', 'temperature_2m', 'dew_point_2m', 'wind_speed_10m'] as const
const OPTIONAL_SURFACE_VARS = ['cloud_cover_low', 'cloud_cover_mid', 'cloud_cover_high', 'visibility'] as const
const JET_VARS = ['wind_speed_300hPa', 'wind_speed_250hPa', 'wind_speed_200hPa'] as const
const BL_VARS = ['wind_direction_10m', 'surface_pressure', 'boundary_layer_height', 'wind_speed_80m', 'wind_direction_80m', 'wind_speed_120m', 'wind_direction_120m', 'cape', 'lifted_index'] as const
const PRESSURE_VARS = PRESSURE_LEVELS.flatMap((p) => [
  `temperature_${p}hPa`,
  `wind_speed_${p}hPa`,
  `wind_direction_${p}hPa`,
  `geopotential_height_${p}hPa`,
])
// Do południa planer może pokazywać noc rozpoczętą w poprzedniej dobie UTC.
const OPEN_METEO_PAST_DAYS = 1

export async function fetchWeather(lat: number, lon: number, provider: WeatherProviderId = DEFAULT_WEATHER_PROVIDER): Promise<WeatherHour[]> {
  const info = weatherProviderInfo(provider)
  const pastKey = info.openMeteoModel ? `:past${OPEN_METEO_PAST_DAYS}` : ''
  const key = `wx4:${info.id}:${lat.toFixed(2)},${lon.toFixed(2)}${pastKey}`
  const cached = readCache<WeatherHour[]>(key, 30 * 60_000)
  if (Array.isArray(cached) && cached.every(validWeatherHour)) return cached
  return once(key, () => loadWeather(key, info, lat, lon))
}

async function loadWeather(key: string, info: WeatherProviderInfo, lat: number, lon: number): Promise<WeatherHour[]> {
  const data = info.openMeteoModel
    ? await loadOpenMeteo(info.openMeteoModel, lat, lon)
    : await loadMetNo(lat, lon)
  writeCache(key, data)
  return data
}

async function loadOpenMeteo(model: string, lat: number, lon: number): Promise<WeatherHour[]> {
  // Widzialność, warstwy chmur, zmienne PBL i profile izobaryczne są opcjonalne:
  // ich brak w części modeli (np. ECMWF IFS, GEM) nie może odrzucać całej godziny.
  const hourlyVars = [...REQUIRED_SURFACE_VARS, ...OPTIONAL_SURFACE_VARS, ...BL_VARS, ...PRESSURE_VARS].join(',')
  const modelParam = model && model !== 'best_match' ? `&models=${encodeURIComponent(model)}` : ''
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}${modelParam}&hourly=${hourlyVars}&forecast_days=8&past_days=${OPEN_METEO_PAST_DAYS}&timezone=UTC&timeformat=unixtime`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Pogoda niedostępna (HTTP ${res.status})`)
  const j = await res.json()
  const h = j.hourly as Record<string, unknown> | undefined
  if (!Array.isArray(h?.time)) throw new Error('Nieprawidłowa prognoza')
  const elevationM = finiteNumber(j.elevation) ? j.elevation : null

  return h.time.flatMap((t: unknown, i: number) => {
    if (!finiteNumber(t) || !REQUIRED_SURFACE_VARS.every((k) => finiteNumber((h[k] as unknown[] | undefined)?.[i]))) return []

    const levels: PressureLevelSample[] = []
    for (const p of PRESSURE_LEVELS) {
      const heightM = optAt(h, `geopotential_height_${p}hPa`, i)
      const tempC = optAt(h, `temperature_${p}hPa`, i)
      const windKmh = optAt(h, `wind_speed_${p}hPa`, i)
      if (heightM === null || tempC === null || windKmh === null) continue
      levels.push({ pressureHpa: p, heightM, tempC, windKmh, windDeg: optAt(h, `wind_direction_${p}hPa`, i) })
    }

    const pblHeightM = optAt(h, 'boundary_layer_height', i)
    const temp = (h.temperature_2m as number[])[i]
    const wind = (h.wind_speed_10m as number[])[i]
    const visM = optAt(h, 'visibility', i)
    const profile = computeProfileSeeing({
      elevationM,
      surfacePressureHpa: optAt(h, 'surface_pressure', i),
      temp2mC: temp,
      wind10mKmh: wind,
      wind10mDeg: optAt(h, 'wind_direction_10m', i),
      wind80mKmh: optAt(h, 'wind_speed_80m', i),
      wind80mDeg: optAt(h, 'wind_direction_80m', i),
      wind120mKmh: optAt(h, 'wind_speed_120m', i),
      wind120mDeg: optAt(h, 'wind_direction_120m', i),
      pblHeightM,
      capeJkg: optAt(h, 'cape', i),
      liftedIndex: optAt(h, 'lifted_index', i),
      levels,
    })

    return [{
      t: t * 1000,
      cloud: (h.cloud_cover as number[])[i],
      cloudLow: optAt(h, 'cloud_cover_low', i),
      cloudMid: optAt(h, 'cloud_cover_mid', i),
      cloudHigh: optAt(h, 'cloud_cover_high', i),
      humidity: (h.relative_humidity_2m as number[])[i],
      temp,
      dew: (h.dew_point_2m as number[])[i],
      wind,
      visibilityKm: visM !== null ? visM / 1000 : null,
      jetKmh: JET_VARS.map((k) => optAt(h, k, i)).filter(finiteNumber).reduce<number | null>((m, v) => Math.max(m ?? 0, v), null),
      seeingArcsec: profile ? round2(profile.arcsec) : null,
      seeingBlArcsec: profile ? round2(profile.blArcsec) : null,
      seeingFaArcsec: profile ? round2(profile.faArcsec) : null,
      pblM: pblHeightM !== null ? Math.round(pblHeightM) : null,
    }]
  })
}

const lerp = (a: number, b: number, alpha: number) => a + (b - a) * alpha
const lerpNullable = (a: number | null, b: number | null, alpha: number) => (a !== null && b !== null ? lerp(a, b, alpha) : null)

async function loadMetNo(lat: number, lon: number): Promise<WeatherHour[]> {
  const url = `https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Prognoza MET Norway niedostępna (HTTP ${res.status})`)
  const j = await res.json()
  const series = (j as { properties?: { timeseries?: unknown[] } })?.properties?.timeseries
  if (!Array.isArray(series)) throw new Error('Nieprawidłowa prognoza MET Norway')

  const raw: WeatherHour[] = series.flatMap((entry) => {
    const rec = entry as { time?: string; data?: { instant?: { details?: Record<string, unknown> } } }
    const t = typeof rec.time === 'string' ? Date.parse(rec.time) : NaN
    const d = rec.data?.instant?.details
    if (!finiteNumber(t) || !d) return []
    const cloud = d.cloud_area_fraction
    const humidity = d.relative_humidity
    const temp = d.air_temperature
    const dew = d.dew_point_temperature
    const windMs = d.wind_speed
    if (!finiteNumber(cloud) || !finiteNumber(humidity) || !finiteNumber(temp) || !finiteNumber(dew) || !finiteNumber(windMs)) return []
    return [{
      t,
      cloud,
      cloudLow: finiteNumber(d.cloud_area_fraction_low) ? d.cloud_area_fraction_low : null,
      cloudMid: finiteNumber(d.cloud_area_fraction_medium) ? d.cloud_area_fraction_medium : null,
      cloudHigh: finiteNumber(d.cloud_area_fraction_high) ? d.cloud_area_fraction_high : null,
      humidity,
      temp,
      dew,
      wind: windMs * 3.6,
      visibilityKm: null,
      jetKmh: null,
      seeingArcsec: null,
      seeingBlArcsec: null,
      seeingFaArcsec: null,
      pblM: null,
    }]
  })

  // Po ~60 h MET Norway przechodzi z kroku 1 h na 6 h; zagęszczamy ten odcinek liniowo do co 1 h,
  // aby suwak czasu (±30 min w weatherAt) i podsumowanie 7 nocy działały na każdej nocy.
  const hourly: WeatherHour[] = []
  for (let i = 0; i < raw.length; i++) {
    const cur = raw[i]
    hourly.push(cur)
    const next = raw[i + 1]
    if (!next) continue
    const gap = next.t - cur.t
    const steps = Math.round(gap / 3_600_000)
    if (steps >= 2 && steps <= 6 && Math.abs(gap - steps * 3_600_000) < 60_000) {
      for (let s = 1; s < steps; s++) {
        const a = s / steps
        hourly.push({
          t: cur.t + s * 3_600_000,
          cloud: Math.round(lerp(cur.cloud, next.cloud, a)),
          cloudLow: lerpNullable(cur.cloudLow, next.cloudLow, a),
          cloudMid: lerpNullable(cur.cloudMid, next.cloudMid, a),
          cloudHigh: lerpNullable(cur.cloudHigh, next.cloudHigh, a),
          humidity: lerp(cur.humidity, next.humidity, a),
          temp: round2(lerp(cur.temp, next.temp, a)),
          dew: round2(lerp(cur.dew, next.dew, a)),
          wind: round2(lerp(cur.wind, next.wind, a)),
          visibilityKm: null,
          jetKmh: null,
          seeingArcsec: null,
          seeingBlArcsec: null,
          seeingFaArcsec: null,
          pblM: null,
        })
      }
    }
  }
  return hourly
}

export function weatherAt(hours: readonly WeatherHour[], t: number): WeatherHour | null {
  if (!hours.length || t < hours[0].t - 3_600_000 || t > hours[hours.length - 1].t + 3_600_000) return null
  const best = hours.reduce((best, h) => (Math.abs(h.t - t) < Math.abs(best.t - t) ? h : best))
  return validWeatherHour(best) && Math.abs(best.t - t) <= 1_800_000 ? best : null
}

/**
 * Ocena warunków (wyliczona, nie pomiar przejrzystości): zachmurzenie ma wagę główną, wysoka wilgotność
 * i mała różnica temperatury i punktu rosy obniżają ocenę. Brak widzialności nie obniża wyniku.
 */
export function skyRating(h: WeatherHour): { label: string; score: number } | null {
  if (!validWeatherHour(h)) return null
  let score = 100 - h.cloud
  if (h.humidity > 85) score -= 20
  else if (h.humidity > 70) score -= 8
  if (h.temp - h.dew < 2) score -= 10
  if (h.visibilityKm !== null && h.visibilityKm < 10) score -= 10
  score = Math.max(0, Math.min(100, score))
  const label = score >= 80 ? 'bardzo dobre' : score >= 60 ? 'dobre' : score >= 35 ? 'przeciętne' : 'złe'
  return { label, score }
}

/**
 * Ocena siły wiatru dla astrofotografii (prowadzenie montażu):
 * ≤ 15 km/h (~9 mph) akceptowalny (≤ 8 km/h praktycznie bezwietrznie),
 * 16–24 km/h (10–15 mph) umiarkowany / ryzykowny przy długiej ogniskowej i bez osłony,
 * > 24 km/h (> 15 mph) za silny do stabilnych długich ekspozycji.
 */
export function windRating(windKmh: number): { label: 'dobry' | 'średni' | 'zły'; note: string } | null {
  if (!finiteNumber(windKmh) || windKmh < 0) return null
  const kmh = Math.round(windKmh)
  if (kmh <= 8) return { label: 'dobry', note: 'Wiatr bardzo słaby (≤ 8 km/h) — idealny nawet dla lekkich zestawów i długich ogniskowych' }
  if (kmh <= 15) return { label: 'dobry', note: 'Wiatr akceptowalny (≤ 15 km/h) — stabilne prowadzenie dla typowego montażu paralaktycznego' }
  if (kmh <= 24) return { label: 'średni', note: 'Wiatr umiarkowany (16–24 km/h) — ryzyko poruszeń przy długiej ogniskowej' }
  return { label: 'zły', note: 'Wiatr za silny (> 24 km/h) — drgania tuby i duże błędy prowadzenia przy długich ekspozycjach' }
}

/**
 * Szacunek seeingu z prądu strumieniowego (heurystyka, nie pomiar): silny wiatr na wysokości 9–12 km
 * oznacza turbulencję i rozmyte gwiazdy. Progi w km/h do dostrojenia z obserwacji.
 */
export function seeingEstimate(jetKmh: number | null): { arcsec: number; label: 'dobry' | 'średni' | 'zły' } | null {
  if (jetKmh === null || !finiteNumber(jetKmh)) return null
  const arcsec = 0.8 + 0.015 * jetKmh
  const label = jetKmh < 70 ? 'dobry' : jetKmh <= 125 ? 'średni' : 'zły'
  return { arcsec, label }
}

export interface WeatherSeeingResult {
  arcsec: number
  label: SeeingQuality
  source: 'profile' | 'jet'
  blArcsec: number | null
  faArcsec: number | null
  pblM: number | null
}

/**
 * Zwraca szacowany seeing dla godziny prognozy: preferuje pełny profil pionowy C_n^2 (warstwa
 * graniczna + swobodna atmosfera), a przy jego braku wraca do heurystyki prądu strumieniowego.
 */
export function weatherSeeing(h: WeatherHour | null | undefined): WeatherSeeingResult | null {
  if (!h) return null
  if (finiteNumber(h.seeingArcsec)) {
    return {
      arcsec: h.seeingArcsec,
      label: classifySeeing(h.seeingArcsec),
      source: 'profile',
      blArcsec: finiteNumber(h.seeingBlArcsec) ? h.seeingBlArcsec : null,
      faArcsec: finiteNumber(h.seeingFaArcsec) ? h.seeingFaArcsec : null,
      pblM: finiteNumber(h.pblM) ? h.pblM : null,
    }
  }
  const fallback = seeingEstimate(h.jetKmh ?? null)
  if (!fallback) return null
  return { ...fallback, source: 'jet', blArcsec: null, faArcsec: null, pblM: finiteNumber(h.pblM) ? h.pblM : null }
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
  if (cached !== undefined) return cached
  return once(key, () => loadWikiSummary(key, titlePl, titleEn, fallbackQuery))
}

async function loadWikiSummary(key: string, titlePl: string, titleEn: string, fallbackQuery: string): Promise<WikiSummary | null> {
  // Brak artykułu (4xx, ujednoznacznienie) jest pewną odpowiedzią i trafia do pamięci; błąd sieci lub serwera nie,
  // inaczej chwilowy brak łącza ukryłby opis na 14 dni.
  let failed = false
  const tryTitle = async (lang: 'pl' | 'en', title: string): Promise<WikiSummary | null> => {
    if (!title) return null
    try {
      const res = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`)
      if (!res.ok) {
        if (res.status >= 500 || res.status === 429) failed = true
        return null
      }
      const j = await res.json()
      if (j.type === 'disambiguation' || !j.extract) return null
      return { title: j.title, extract: j.extract, url: j.content_urls?.desktop?.page ?? '', lang }
    } catch {
      failed = true
      return null
    }
  }
  const result = (await tryTitle('pl', titlePl)) ?? (await tryTitle('en', titleEn)) ?? (await tryTitle('en', fallbackQuery))
  if (result || !failed) writeCache(key, result)
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
