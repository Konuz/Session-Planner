import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PRESSURE_LEVELS, classifySeeing, computeProfileSeeing, type PressureLevelSample, type VerticalProfile } from './seeing'

const CALM_LEVELS: PressureLevelSample[] = [
  { pressureHpa: 1000, heightM: 90, tempC: 3.0, windKmh: 6, windDeg: 210 },
  { pressureHpa: 950, heightM: 520, tempC: 2.2, windKmh: 16, windDeg: 225 },
  { pressureHpa: 925, heightM: 740, tempC: 1.0, windKmh: 20, windDeg: 230 },
  { pressureHpa: 900, heightM: 965, tempC: -0.3, windKmh: 22, windDeg: 235 },
  { pressureHpa: 850, heightM: 1430, tempC: -3.2, windKmh: 25, windDeg: 240 },
  { pressureHpa: 800, heightM: 1920, tempC: -6.1, windKmh: 28, windDeg: 245 },
  { pressureHpa: 700, heightM: 2990, tempC: -12.4, windKmh: 33, windDeg: 255 },
  { pressureHpa: 600, heightM: 4200, tempC: -19.8, windKmh: 38, windDeg: 260 },
  { pressureHpa: 500, heightM: 5580, tempC: -28.5, windKmh: 44, windDeg: 265 },
  { pressureHpa: 400, heightM: 7190, tempC: -39.5, windKmh: 50, windDeg: 270 },
  { pressureHpa: 300, heightM: 9120, tempC: -52.0, windKmh: 56, windDeg: 275 },
  { pressureHpa: 250, heightM: 10280, tempC: -56.5, windKmh: 54, windDeg: 275 },
  { pressureHpa: 200, heightM: 11680, tempC: -55.0, windKmh: 46, windDeg: 270 },
  { pressureHpa: 150, heightM: 13520, tempC: -54.0, windKmh: 35, windDeg: 265 },
  { pressureHpa: 100, heightM: 16120, tempC: -55.5, windKmh: 28, windDeg: 260 },
]

function makeProfile(overrides: Partial<VerticalProfile> = {}): VerticalProfile {
  return {
    elevationM: 120,
    surfacePressureHpa: 998,
    temp2mC: 1.0,
    wind10mKmh: 6,
    wind10mDeg: 200,
    wind80mKmh: 12,
    wind80mDeg: 215,
    wind120mKmh: 15,
    wind120mDeg: 220,
    pblHeightM: 110,
    capeJkg: 0,
    liftedIndex: 14,
    levels: CALM_LEVELS,
    ...overrides,
  }
}

describe('classifySeeing', () => {
  it('klasyfikuje seeing w sekundach łuku jako dobry, średni i zły', () => {
    expect(classifySeeing(0.8)).toBe('dobry')
    expect(classifySeeing(1.59)).toBe('dobry')
    expect(classifySeeing(1.6)).toBe('średni')
    expect(classifySeeing(2.5)).toBe('średni')
    expect(classifySeeing(2.51)).toBe('zły')
  })
})

describe('computeProfileSeeing', () => {
  it('wylicza realistyczny seeing na spokojnej nizinnej nocy i rozbija na BL i FA', () => {
    const res = computeProfileSeeing(makeProfile())
    expect(res).not.toBeNull()
    expect(res!.arcsec).toBeGreaterThan(0.5)
    expect(res!.arcsec).toBeLessThan(1.8)
    expect(res!.blArcsec).toBeGreaterThan(0)
    expect(res!.faArcsec).toBeGreaterThan(0.4)
    expect(res!.arcsec).toBeGreaterThanOrEqual(res!.faArcsec)
    expect(res!.pblM).toBe(110)
    expect(res!.label).toBe(classifySeeing(res!.arcsec))
  })

  it('silne ścinanie wiatru na wysokości (jet stream) pogarsza składową swobodnej atmosfery', () => {
    const calm = computeProfileSeeing(makeProfile())!
    const jetLevels = CALM_LEVELS.map((l) => {
      if (l.pressureHpa === 300) return { ...l, windKmh: 165, windDeg: 280 }
      if (l.pressureHpa === 250) return { ...l, windKmh: 215, windDeg: 295 }
      if (l.pressureHpa === 200) return { ...l, windKmh: 150, windDeg: 260 }
      return l
    })
    const jet = computeProfileSeeing(makeProfile({ levels: jetLevels }))!
    expect(jet.faArcsec).toBeGreaterThan(calm.faArcsec + 0.3)
    expect(jet.arcsec).toBeGreaterThan(calm.arcsec + 0.3)
  })

  it('silny wiatr przy ziemi, wysoki PBL i konwekcja pogarszają seeing w warstwie granicznej', () => {
    const calm = computeProfileSeeing(makeProfile())!
    const unstable = computeProfileSeeing(makeProfile({
      temp2mC: 22,
      wind10mKmh: 26,
      wind80mKmh: 52,
      wind120mKmh: 62,
      pblHeightM: 1200,
      capeJkg: 900,
      liftedIndex: -4,
      levels: CALM_LEVELS.map((l) => (l.pressureHpa >= 850 ? { ...l, windKmh: 55, windDeg: 260 } : l)),
    }))!
    expect(unstable.blArcsec).toBeGreaterThan(calm.blArcsec + 0.5)
    expect(unstable.arcsec).toBeGreaterThan(calm.arcsec)
  })

  it('odfiltrowuje poziomy ekstrapolowane pod terenem i poprawnie liczy dla obserwatorium górskiego', () => {
    const base = makeProfile({ elevationM: 150, surfacePressureHpa: 980 })
    const withoutUnderground = computeProfileSeeing({
      ...base,
      levels: CALM_LEVELS.filter((l) => l.pressureHpa < 980 - 5 && l.heightM > 170),
    })
    const withFakeUnderground = computeProfileSeeing({
      ...base,
      levels: [
        { pressureHpa: 1000, heightM: -40, tempC: 35, windKmh: 200, windDeg: 0 },
        { pressureHpa: 978, heightM: 165, tempC: -20, windKmh: 180, windDeg: 180 },
        ...CALM_LEVELS,
      ],
    })
    expect(withFakeUnderground).toEqual(withoutUnderground)

    const summit = computeProfileSeeing({
      elevationM: 2200,
      surfacePressureHpa: 785,
      temp2mC: 5,
      wind10mKmh: 4,
      wind10mDeg: 190,
      wind80mKmh: 5,
      wind80mDeg: 195,
      wind120mKmh: 6,
      wind120mDeg: 200,
      pblHeightM: 35,
      levels: CALM_LEVELS,
    })!
    expect(summit.arcsec).toBeGreaterThan(0.35)
    expect(summit.arcsec).toBeLessThan(1.2)
    expect(summit.label).toBe('dobry')
  })

  it('działa przy braku opcjonalnych pól wiatru 80/120 m, kierunku i PBL', () => {
    const bare = computeProfileSeeing({
      elevationM: null,
      surfacePressureHpa: null,
      temp2mC: 4,
      wind10mKmh: 10,
      wind10mDeg: null,
      wind80mKmh: null,
      wind120mKmh: null,
      pblHeightM: null,
      capeJkg: null,
      liftedIndex: null,
      levels: CALM_LEVELS.map(({ windDeg: _omit, ...rest }) => rest),
    })
    expect(bare).not.toBeNull()
    expect(Number.isFinite(bare!.arcsec)).toBe(true)
    expect(bare!.arcsec).toBeGreaterThan(0.5)
  })

  it('zwraca null przy zbyt małej liczbie poziomów ponad gruntem lub błędnych danych', () => {
    expect(computeProfileSeeing(makeProfile({ levels: [] }))).toBeNull()
    expect(computeProfileSeeing(makeProfile({ levels: [CALM_LEVELS[4]] }))).toBeNull()
    expect(computeProfileSeeing(makeProfile({
      elevationM: 3200,
      surfacePressureHpa: 680,
      levels: CALM_LEVELS.filter((l) => l.pressureHpa >= 700),
    }))).toBeNull()
    expect(computeProfileSeeing(makeProfile({ temp2mC: Number.NaN }))).toBeNull()
  })
})

describe('integracja fetchWeather i weatherSeeing', () => {
  beforeEach(() => {
    vi.resetModules()
    const mem = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => { mem.set(k, v) },
      removeItem: (k: string) => { mem.delete(k) },
      key: (i: number) => [...mem.keys()][i] ?? null,
      get length() { return mem.size },
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('pobiera pełny profil pionowy Open-Meteo i wylicza seeing z profilu C_n^2', async () => {
    const hourly: Record<string, unknown> = {
      time: [1_800_000_000],
      cloud_cover: [15],
      cloud_cover_low: [5],
      cloud_cover_mid: [0],
      cloud_cover_high: [10],
      relative_humidity_2m: [55],
      temperature_2m: [1.0],
      dew_point_2m: [-2.0],
      wind_speed_10m: [6],
      wind_direction_10m: [200],
      wind_speed_80m: [12],
      wind_direction_80m: [215],
      wind_speed_120m: [15],
      wind_direction_120m: [220],
      surface_pressure: [998],
      boundary_layer_height: [110],
      cape: [0],
      lifted_index: [14],
      visibility: [25000],
    }
    for (const p of PRESSURE_LEVELS) {
      const sample = CALM_LEVELS.find((l) => l.pressureHpa === p)!
      hourly[`geopotential_height_${p}hPa`] = [sample.heightM]
      hourly[`temperature_${p}hPa`] = [sample.tempC]
      hourly[`wind_speed_${p}hPa`] = [sample.windKmh]
      hourly[`wind_direction_${p}hPa`] = [sample.windDeg]
    }
    const fetchMock = vi.fn(async (_url: string) => new Response(JSON.stringify({ elevation: 120, hourly })))
    vi.stubGlobal('fetch', fetchMock)

    const { fetchWeather, weatherSeeing } = await import('./services')
    const [hour] = await fetchWeather(51.1, 17.0)
    const calledUrl = String(fetchMock.mock.calls[0][0])
    expect(calledUrl).toContain('geopotential_height_500hPa')
    expect(calledUrl).toContain('boundary_layer_height')
    expect(calledUrl).toContain('surface_pressure')

    expect(hour.seeingArcsec).toBeGreaterThan(0.5)
    expect(hour.seeingBlArcsec).toBeGreaterThan(0)
    expect(hour.seeingFaArcsec).toBeGreaterThan(0.4)
    expect(hour.pblM).toBe(110)
    expect(hour.jetKmh).toBe(56)

    const s = weatherSeeing(hour)!
    expect(s.source).toBe('profile')
    expect(s.arcsec).toBe(hour.seeingArcsec)
  })

  it('wraca do szacunku z prądu strumieniowego, gdy brak pełnego profilu pionowego', async () => {
    const hourly = {
      time: [1_800_000_000],
      cloud_cover: [10],
      cloud_cover_low: [0],
      cloud_cover_mid: [0],
      cloud_cover_high: [10],
      relative_humidity_2m: [50],
      temperature_2m: [5],
      dew_point_2m: [0],
      wind_speed_10m: [8],
      visibility: [20000],
      wind_speed_250hPa: [100],
    }
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ hourly }))))

    const { fetchWeather, weatherSeeing, seeingEstimate } = await import('./services')
    const [hour] = await fetchWeather(52.1, 21.0)
    expect(hour.seeingArcsec).toBeNull()
    expect(hour.jetKmh).toBe(100)
    const fallback = weatherSeeing(hour)!
    expect(fallback.source).toBe('jet')
    expect(fallback.arcsec).toBe(seeingEstimate(100)!.arcsec)
    expect(fallback.label).toBe('średni')
    expect(weatherSeeing({ ...hour, seeingArcsec: null, jetKmh: null })).toBeNull()
  })
})
