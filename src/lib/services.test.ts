import { afterEach, beforeEach, expect, it, vi } from 'vitest'

// Pamięć localStorage w Node: prosta mapa.
beforeEach(() => {
  vi.resetModules()
  const data = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => { data.set(k, v) },
    removeItem: (k: string) => { data.delete(k) },
    key: (i: number) => [...data.keys()][i] ?? null,
    get length() { return data.size },
  })
})
afterEach(() => vi.unstubAllGlobals())

it('brak artykułu w Wikipedii trafia do pamięci i nie jest odpytywany ponownie (audyt C13)', async () => {
  const fetchMock = vi.fn(async () => new Response('{}', { status: 404 }))
  vi.stubGlobal('fetch', fetchMock)
  const { fetchWikiSummary } = await import('./services')
  expect(await fetchWikiSummary('Brak', 'Missing', 'Missing object')).toBeNull()
  expect(fetchMock).toHaveBeenCalledTimes(3)
  expect(await fetchWikiSummary('Brak', 'Missing', 'Missing object')).toBeNull()
  expect(fetchMock).toHaveBeenCalledTimes(3)
})

it('błąd sieci nie zapisuje braku artykułu na zapas', async () => {
  const fetchMock = vi.fn(async () => { throw new TypeError('offline') })
  vi.stubGlobal('fetch', fetchMock)
  const { fetchWikiSummary } = await import('./services')
  expect(await fetchWikiSummary('Brak', '', '')).toBeNull()
  expect(await fetchWikiSummary('Brak', '', '')).toBeNull()
  expect(fetchMock).toHaveBeenCalledTimes(2)
})

it('dwa równoczesne zapytania o pogodę dla tego samego miejsca dają jedno żądanie (audyt C14)', async () => {
  const hourly = { time: [1_800_000_000], cloud_cover: [10], cloud_cover_low: [0], cloud_cover_mid: [0], cloud_cover_high: [10], relative_humidity_2m: [50], temperature_2m: [5], dew_point_2m: [0], wind_speed_10m: [3], visibility: [20000] }
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ hourly })))
  vi.stubGlobal('fetch', fetchMock)
  const { fetchWeather } = await import('./services')
  const [a, b] = await Promise.all([fetchWeather(51.1, 17.0), fetchWeather(51.1, 17.0)])
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(a).toEqual(b)
  expect(a[0].cloud).toBe(10)
  // Po zakończeniu: odczyt z localStorage, bez sieci.
  await fetchWeather(51.1, 17.0)
  expect(fetchMock).toHaveBeenCalledTimes(1)
})

it('pobiera pogodę dla nocy rozpoczętej w poprzedniej dobie UTC mimo starego wpisu w pamięci', async () => {
  const yesterday23 = Date.parse('2026-11-15T23:00:00Z')
  const today00 = Date.parse('2026-11-16T00:00:00Z')
  localStorage.setItem('wx4:openmeteo:51.09,17.29', JSON.stringify({
    at: Date.now(),
    data: [{ t: today00, cloud: 20, humidity: 60, temp: 5, dew: 1, wind: 7 }],
  }))
  vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
    const params = new URL(String(input)).searchParams
    const times = params.get('past_days') === '1' ? [yesterday23, today00] : [today00]
    const hourly = {
      time: times.map((t) => t / 1000),
      cloud_cover: times.map(() => 30),
      relative_humidity_2m: times.map(() => 60),
      temperature_2m: times.map(() => 5),
      dew_point_2m: times.map(() => 1),
      wind_speed_10m: times.map(() => 7),
    }
    return new Response(JSON.stringify({ hourly }))
  })
  const { fetchWeather, weatherAt } = await import('./services')
  const hours = await fetchWeather(51.09, 17.29)
  expect(weatherAt(hours, Date.parse('2026-11-15T22:35:00Z'))).toMatchObject({ t: yesterday23, cloud: 30 })
})

it('przełączanie dostawcy używa osobnych kluczy cache i przekazuje wybrany model do API', async () => {
  const urls: string[] = []
  const hourly = {
    time: [1_800_000_000],
    cloud_cover: [15],
    relative_humidity_2m: [55],
    temperature_2m: [8],
    dew_point_2m: [2],
    wind_speed_10m: [7],
    visibility: [null],
  }
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    urls.push(String(input))
    return new Response(JSON.stringify({ hourly }))
  })
  vi.stubGlobal('fetch', fetchMock)
  const { fetchWeather } = await import('./services')

  const auto = await fetchWeather(51.1, 17.0, 'openmeteo')
  const ecmwf = await fetchWeather(51.1, 17.0, 'ecmwf')
  const cachedEcmwf = await fetchWeather(51.1, 17.0, 'ecmwf')

  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(urls[0]).not.toContain('models=')
  expect(urls[1]).toContain('models=ecmwf_ifs025')
  expect(auto[0].visibilityKm).toBeNull()
  expect(ecmwf).toEqual(cachedEcmwf)
})

it('parsuje prognozę MET Norway, przelicza m/s na km/h i zagęszcza krok 6 h do godzinowego', async () => {
  const urls: string[] = []
  const metResponse = {
    properties: {
      timeseries: [
        {
          time: '2026-11-14T00:00:00Z',
          data: { instant: { details: { air_temperature: 6, dew_point_temperature: 2, relative_humidity: 76, wind_speed: 2.5, cloud_area_fraction: 10, cloud_area_fraction_low: 0, cloud_area_fraction_medium: 5, cloud_area_fraction_high: 10 } } },
        },
        {
          time: '2026-11-14T06:00:00Z',
          data: { instant: { details: { air_temperature: 12, dew_point_temperature: 8, relative_humidity: 64, wind_speed: 5.0, cloud_area_fraction: 70, cloud_area_fraction_low: 30, cloud_area_fraction_medium: 35, cloud_area_fraction_high: 40 } } },
        },
      ],
    },
  }
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    urls.push(String(input))
    return new Response(JSON.stringify(metResponse))
  })
  vi.stubGlobal('fetch', fetchMock)
  const { fetchWeather, skyRating, weatherAt, weatherSeeing } = await import('./services')

  const hours = await fetchWeather(51.09, 17.29, 'metno')
  expect(urls[0]).toContain('api.met.no/weatherapi/locationforecast/2.0/complete?lat=51.0900&lon=17.2900')
  expect(hours).toHaveLength(7)
  expect(hours[0].wind).toBeCloseTo(9.0, 4)
  expect(hours[0].visibilityKm).toBeNull()
  expect(hours[0].jetKmh).toBeNull()
  expect(weatherSeeing(hours[0])).toBeNull()
  expect(skyRating(hours[0])?.label).toBe('bardzo dobre')

  const mid = weatherAt(hours, Date.parse('2026-11-14T03:00:00Z'))
  expect(mid?.temp).toBe(9)
  expect(mid?.cloud).toBe(40)
  expect(mid?.wind).toBeCloseTo(13.5, 4)
})

it('windRating klasyfikuje prędkość wiatru według progów astrofotograficznych', async () => {
  const { windRating } = await import('./services')
  expect(windRating(5)?.label).toBe('dobry')
  expect(windRating(15.4)?.label).toBe('dobry')
  expect(windRating(16)?.label).toBe('średni')
  expect(windRating(24)?.label).toBe('średni')
  expect(windRating(25)?.label).toBe('zły')
  expect(windRating(-1)).toBeNull()
  expect(windRating(Number.NaN)).toBeNull()
})
