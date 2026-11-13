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
