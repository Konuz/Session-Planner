import { afterEach, describe, expect, it, vi } from 'vitest'
import { MakeTime, RotateVector, Rotation_EQJ_EQD, SiderealTime, SphereFromVector, Vector } from 'astronomy-engine'
import { altAz, hourAngleDeg, nextTransitMs } from './astro'
import { nightPhases, visibility, type AltSample } from './night'
import { fetchWeather, seeingEstimate, skyRating, weatherAt, type WeatherHour } from './services'
import { fmtNum } from './format'

const site = { latDeg: 51.09, lonDeg: 17.29, elevationM: 130 }
const start = Date.UTC(2026, 9, 22, 12)
const minute = 60_000
const eq = { raDeg: 202.4696, decDeg: 47.1952 }
const night = { ...nightPhases('2026-10-22', site, 'Europe/Warsaw'), startMs: start, endMs: start + 60 * minute, astroDusk: start, astroDawn: start + 60 * minute }

afterEach(() => vi.unstubAllGlobals())

describe('przedziały widoczności', () => {
  it.each([60, 63])('nie dodaje próbki końcowej do %i minut, także w workerze', async (minutes) => {
    const end = start + minutes * minute
    const n = { ...night, endMs: end, astroDawn: end }
    const track: AltSample[] = []
    for (let t = start; t < end; t += 5 * minute) track.push({ t, alt: 50, az: 0 })
    track.push({ t: end, alt: 60, az: 0 })
    const result = visibility(eq, track, n, site, 20, [])
    expect(result.hoursUsable).toBeCloseTo(minutes / 60)
    expect([result.windowStart, result.windowEnd]).toEqual([start, end])
    expect(result.bestMs).toBe(end)
    const postMessage = vi.fn()
    const scope = { onmessage: null as unknown as (e: MessageEvent) => void, postMessage }
    vi.stubGlobal('self', scope)
    vi.resetModules()
    await import('../workers/visibility.worker')
    scope.onmessage({ data: { id: 1, ra: new Float64Array([0]), dec: new Float64Array([89]), site, darkStart: start, darkEnd: end, minAltDeg: 20, horizon: [] } } as MessageEvent)
    await vi.waitFor(() => expect(postMessage).toHaveBeenCalled())
    expect(postMessage.mock.calls[0][0].hours[0]).toBeCloseTo(minutes / 60, 5)
  })

  it('worker liczy tylko najnowsze z zadań czekających w kolejce, ze współrzędnymi z pierwszego (audyt C12)', async () => {
    const postMessage = vi.fn()
    const scope = { onmessage: null as unknown as (e: MessageEvent) => void, postMessage }
    vi.stubGlobal('self', scope)
    vi.resetModules()
    await import('../workers/visibility.worker')
    const end = start + 60 * minute
    const req = (id: number, minAltDeg: number, coords: boolean) => ({ data: { id, ...(coords ? { ra: new Float64Array([0]), dec: new Float64Array([89]) } : {}), site, darkStart: start, darkEnd: end, minAltDeg, horizon: [] } } as MessageEvent)
    scope.onmessage(req(1, 20, true))
    scope.onmessage(req(2, 25, false))
    scope.onmessage(req(3, 30, false))
    await vi.waitFor(() => expect(postMessage).toHaveBeenCalled())
    await new Promise((r) => setTimeout(r, 10))
    expect(postMessage).toHaveBeenCalledTimes(1)
    expect(postMessage.mock.calls[0][0].id).toBe(3)
    expect(postMessage.mock.calls[0][0].hours[0]).toBeCloseTo(1, 5)
  })

  it('przycina przedziały do ciemnego okna i nie łączy przerw horyzontu', () => {
    const track = [0, 5, 10, 15, 20].map((m) => ({ t: start + m * minute, alt: m === 10 ? 5 : 50, az: 0 }))
    const n = { ...night, astroDusk: start + 2 * minute, astroDawn: start + 18 * minute }
    const result = visibility(eq, track, n, site, 20, [])
    expect(result.hoursUsable).toBeCloseTo(11 / 60)
    expect([result.windowStart, result.windowEnd]).toEqual([start + 2 * minute, start + 10 * minute])
  })
})

describe('górowanie względem niezależnego obrotu astronomy-engine', () => {
  const referenceHA = (o: typeof eq, t: number) => {
    const r = o.raDeg * Math.PI / 180, d = o.decDeg * Math.PI / 180
    const v = new Vector(Math.cos(d) * Math.cos(r), Math.cos(d) * Math.sin(r), Math.sin(d), MakeTime(new Date(t)))
    const s = SphereFromVector(RotateVector(Rotation_EQJ_EQD(new Date(t)), v))
    return ((SiderealTime(new Date(t)) * 15 + site.lonDeg - s.lon + 540) % 360) - 180
  }
  it.each([eq, { raDeg: 83.8187, decDeg: -5.3897 }, { raDeg: 12.11, decDeg: 85.255 }])('zeruje HA daty dla $raDeg', (o) => {
    const t = nextTransitMs(o, start, site)
    expect(Math.abs(referenceHA(o, t))).toBeLessThan(0.00001)
    expect(hourAngleDeg(o, start, site)).toBeCloseTo(referenceHA(o, start), 7)
    expect(nextTransitMs(o, t - 500, site)).toBeCloseTo(t, -1)
    expect(nextTransitMs(o, t + 500, site)).toBeGreaterThan(t + 86_000_000)
    const n = { ...night, endMs: start + 86_400_000 }
    const result = visibility(o, [], n, site, 20, [])
    expect(result.transitAlt).toBeCloseTo(altAz(o, t, site).altDeg, 8)
  })
})

describe('braki prognozy', () => {
  const hour: WeatherHour = { t: start, cloud: 0, cloudLow: 0, cloudMid: 0, cloudHigh: 0, humidity: 40, temp: 10, dew: 0, wind: 5, visibilityKm: 20, jetKmh: 50 }
  it('null zachmurzenia nie oznacza dobrych warunków', () => {
    expect(skyRating({ ...hour, cloud: null } as unknown as WeatherHour)).toBeNull()
    expect(fmtNum(null as unknown as number)).toBe('-')
  })
  it.each(['cloud_cover', 'relative_humidity_2m', 'temperature_2m', 'dew_point_2m', 'wind_speed_10m'])('odrzuca niepełną godzinę %s przed konwersją i zapisem', async (field) => {
    const h: Record<string, unknown> = { time: [start / 1000] }
    for (const key of ['cloud_cover', 'cloud_cover_low', 'cloud_cover_mid', 'cloud_cover_high', 'relative_humidity_2m', 'temperature_2m', 'dew_point_2m', 'wind_speed_10m', 'visibility']) h[key] = [10]
    h[field] = [null]
    const setItem = vi.fn()
    vi.stubGlobal('localStorage', { getItem: () => null, setItem })
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ hourly: h })))
    expect(await fetchWeather(51, 17)).toEqual([])
    expect(JSON.parse(setItem.mock.calls[0][1]).data).toEqual([])
  })
  it('brak widzialności i rozbicia warstw chmur nie odrzuca godziny ani nie udaje mgły (0 km)', async () => {
    const h: Record<string, unknown> = {
      time: [start / 1000],
      cloud_cover: [0],
      cloud_cover_low: [null],
      cloud_cover_mid: [null],
      cloud_cover_high: [null],
      relative_humidity_2m: [40],
      temperature_2m: [10],
      dew_point_2m: [0],
      wind_speed_10m: [5],
      visibility: [null],
    }
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() })
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ hourly: h })))
    const [parsed] = await fetchWeather(51, 17)
    expect(parsed.visibilityKm).toBeNull()
    expect(parsed.cloudLow).toBeNull()
    expect(skyRating(parsed)?.score).toBe(100)
    expect(skyRating({ ...parsed, visibilityKm: 5 })?.score).toBe(90)
    expect(skyRating({ ...parsed, visibilityKm: 0 })?.score).toBe(90)
  })
  it('brak wiatrów wysokich nie odrzuca godziny, a seeing jest wtedy nieznany', async () => {
    const h: Record<string, unknown> = { time: [start / 1000] }
    for (const key of ['cloud_cover', 'cloud_cover_low', 'cloud_cover_mid', 'cloud_cover_high', 'relative_humidity_2m', 'temperature_2m', 'dew_point_2m', 'wind_speed_10m', 'visibility']) h[key] = [10]
    h.wind_speed_250hPa = [null]
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() })
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ hourly: h })))
    const [hour] = await fetchWeather(51, 17)
    expect(hour.cloud).toBe(10)
    expect(hour.jetKmh).toBeNull()
    expect(seeingEstimate(hour.jetKmh)).toBeNull()
  })
  it('seeing: progi prądu strumieniowego', () => {
    expect(seeingEstimate(40)).toEqual({ arcsec: 1.4, label: 'dobry' })
    expect(seeingEstimate(100)?.label).toBe('średni')
    expect(seeingEstimate(160)?.label).toBe('zły')
  })
  it('nie zastępuje brakującej godziny pogodą sprzed godziny ani ze starego cache', async () => {
    expect(weatherAt([hour, { ...hour, t: start + 2 * 3_600_000 }], start + 3_600_000)).toBeNull()
    vi.stubGlobal('localStorage', { getItem: () => JSON.stringify({ at: Date.now(), data: [{ ...hour, cloud: null }] }), setItem: vi.fn() })
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ hourly: { time: [] } })))
    expect(await fetchWeather(51, 17)).toEqual([])
  })
})
