// Żądanie „licz” ze stanu aplikacji (lokalizacja, noc D, PlanningSettings): pola klucza pamięci i nic więcej (P5, P6).
import { describe, expect, it } from 'vitest'
import { HOME_LOCATION } from '../../../src/data/locations'
import { DEMO_HORIZON, at } from '../../../src/test/fixtures'
import type { ObserverLocation, PlanningSettings } from '../../../src/types'
import { buildCatalogRequest, type CatalogRequestSource } from '../../../src/workers/catalogMessages'
import { BASE_LOCATION, BASE_SETTINGS, FIVE, OCT_16, baseParams, loaded, resultFor } from './helpers'

const BASE_SOURCE: CatalogRequestSource = { location: BASE_LOCATION, nightDate: OCT_16, settings: BASE_SETTINGS }

describe('żądanie ze stanu aplikacji', () => {
  it('stan bazowy → żądanie bazowe: 52,0°N, 19,0°E, 150 m, Europe/Warsaw, płaski, 16.10, −18° z obniżaniem, 30°, 5 min', () => {
    expect(buildCatalogRequest(BASE_SOURCE)).toEqual(baseParams())
  })

  it('inne wartości trafiają do żądania wprost (Chrząstawa Wielka, horyzont z 6.4, noc 3.11, −15° bez obniżania, 25°, 2 min)', () => {
    const location: ObserverLocation = { ...HOME_LOCATION, horizon: DEMO_HORIZON.map((point) => ({ ...point })) }
    const settings: PlanningSettings = {
      ...BASE_SETTINGS,
      darknessThresholdDeg: -15,
      autoLowerThreshold: false,
      minAltitudeDeg: 25,
      catalogStepMin: 2,
    }
    expect(buildCatalogRequest({ location, nightDate: '2026-11-03', settings })).toEqual({
      location: { latDeg: 51.0956, lonDegEast: 17.3022, elevationM: 125, timezone: 'Europe/Warsaw', horizon: DEMO_HORIZON },
      nightDate: '2026-11-03',
      settings: { darknessThresholdDeg: -15, autoLowerThreshold: false, minAltitudeDeg: 25, catalogStepMin: 2 },
    })
  })

  it('strefa czasowa lokalizacji trafia do żądania (Europe/London)', () => {
    const request = buildCatalogRequest({ ...BASE_SOURCE, location: { ...BASE_LOCATION, timezone: 'Europe/London' } })
    expect(request.location.timezone).toBe('Europe/London')
  })
})

describe('P5 nazwa lokalizacji nie należy do żądania', () => {
  it('P5: ta sama lokalizacja pod inną nazwą → to samo żądanie i wynik z pamięci', () => {
    const renamed: CatalogRequestSource = {
      ...BASE_SOURCE,
      location: { ...BASE_LOCATION, id: 'moje-pole', name: 'Moje pole', bortle: 4, sqm: 21.3 },
    }
    expect(buildCatalogRequest(renamed)).toEqual(buildCatalogRequest(BASE_SOURCE))
    const { engine, compute } = loaded(FIVE)
    resultFor(engine, 1, buildCatalogRequest(BASE_SOURCE))
    expect(resultFor(engine, 2, buildCatalogRequest(renamed)).fromCache).toBe(true)
    expect(compute).toHaveBeenCalledTimes(1)
  })

  it('P5: te same punkty horyzontu jako nowa lista → to samo żądanie i wynik z pamięci', () => {
    const demo = (): CatalogRequestSource => ({
      ...BASE_SOURCE,
      location: { ...BASE_LOCATION, horizon: DEMO_HORIZON.map((point) => ({ ...point })) },
    })
    expect(buildCatalogRequest(demo())).toEqual(buildCatalogRequest(demo()))
    const { engine, compute } = loaded(FIVE)
    resultFor(engine, 1, buildCatalogRequest(demo()))
    expect(resultFor(engine, 2, buildCatalogRequest(demo())).fromCache).toBe(true)
    expect(compute).toHaveBeenCalledTimes(1)
  })
})

describe('P6 zmiany spoza klucza dają to samo żądanie', () => {
  /** Stan aplikacji z polami, które nie wpływają na żądanie: aktywny zestaw i kursor czasu. */
  const APP_STATE = { ...BASE_SOURCE, activeProfileId: 'demo-moj-zestaw', cursorMs: at('2026-10-16 22:00', 'CEST') }

  it.each([
    ['minimum godzin 3 → 2 h', { minEffectiveHours: 2 }],
    ['zakres „Pasuje do kadru” 25–80% → 10–50%', { fitRange: [0.1, 0.5] }],
    ['progi Księżyca', { moonRules: { ...BASE_SETTINGS.moonRules, moonDownMinFraction: 0.6 } }],
    ['seeing 2,5″ → 1,5″', { seeingArcsec: 1.5 }],
    ['krok wykresu nocy 1 → 5 min', { detailStepMin: 5 }],
  ] satisfies [string, Partial<PlanningSettings>][])('P6: %s → to samo żądanie, bez ponownego liczenia', (_, patch) => {
    const changed: CatalogRequestSource = { ...BASE_SOURCE, settings: { ...BASE_SETTINGS, ...patch } }
    expect(buildCatalogRequest(changed)).toEqual(buildCatalogRequest(BASE_SOURCE))
    const { engine, compute } = loaded(FIVE)
    resultFor(engine, 1, buildCatalogRequest(BASE_SOURCE))
    expect(resultFor(engine, 2, buildCatalogRequest(changed)).fromCache).toBe(true)
    expect(compute).toHaveBeenCalledTimes(1)
  })

  it('P6: zmiana aktywnego zestawu albo kursora czasu → to samo żądanie, bez ponownego liczenia', () => {
    const otherProfile = { ...APP_STATE, activeProfileId: 'demo-redcat51-asi2600mc' }
    const otherCursor = { ...APP_STATE, cursorMs: at('2026-10-17 03:30', 'CEST') }
    const base = buildCatalogRequest(APP_STATE)
    expect(base).toEqual(baseParams())
    expect(buildCatalogRequest(otherProfile)).toEqual(base)
    expect(buildCatalogRequest(otherCursor)).toEqual(base)
    const { engine, compute } = loaded(FIVE)
    resultFor(engine, 1, base)
    expect(resultFor(engine, 2, buildCatalogRequest(otherProfile)).fromCache).toBe(true)
    expect(resultFor(engine, 3, buildCatalogRequest(otherCursor)).fromCache).toBe(true)
    expect(compute).toHaveBeenCalledTimes(1)
  })

  it('zmiana pola klucza w stanie (h_min 30° → 20°) zmienia żądanie i liczy od nowa', () => {
    const changed: CatalogRequestSource = { ...BASE_SOURCE, settings: { ...BASE_SETTINGS, minAltitudeDeg: 20 } }
    expect(buildCatalogRequest(changed).settings.minAltitudeDeg).toBe(20)
    const { engine, compute } = loaded(FIVE)
    resultFor(engine, 1, buildCatalogRequest(BASE_SOURCE))
    expect(resultFor(engine, 2, buildCatalogRequest(changed)).fromCache).toBe(false)
    expect(compute).toHaveBeenCalledTimes(2)
  })
})
