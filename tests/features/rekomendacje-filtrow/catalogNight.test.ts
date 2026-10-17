// P1, P2, P12 i reguły „Styk z resztą” oraz „Pytania”: dane Księżyca w podsumowaniu obiektu z computeCatalogNight (T4, T5, T7).
import { describe, expect, it } from 'vitest'
import { DEMO_LOCATION } from '../../../src/data/demo'
import { angularSeparationDeg, bodyPosition, horizonAltitudeDeg, toEquatorOfDate } from '../../../src/services/astroMath'
import {
  computeCatalogNight,
  prepareCatalogNight,
  type CatalogNightParams,
  type CatalogTarget,
  type ObjectNightSummary,
} from '../../../src/services/catalogNight'
import { filterAdvice, type MoonConditions } from '../../../src/services/filterAdvice'
import { DEFAULT_MOON_RULES, DEFAULT_PLANNING_SETTINGS } from '../../../src/services/planningSettings'
import { at, expectWithin } from '../../../src/test/fixtures'
import { createCatalogEngine } from '../../../src/workers/catalogEngine'
import { buildCatalogRequest } from '../../../src/workers/catalogMessages'
import type { ObserverLocation, PlanningSettings } from '../../../src/types'
import {
  JUN_21,
  M31,
  M42,
  MY_SET,
  NGC7000,
  OCT_24,
  colorsOf,
  pairs,
  params,
  present,
  referenceMoon,
  rules,
  seven,
  summaryOf,
  targetOf,
  type ParamsPatch,
} from './helpers'

const DEMO_HORIZON = DEMO_LOCATION.horizon

/** Podsumowanie jednego obiektu przy parametrach z przykładów zmienionych przez `patch`. */
function summary(target: CatalogTarget, patch: ParamsPatch = {}): ObjectNightSummary {
  return summaryOf(computeCatalogNight(params(patch), [targetOf(target)]).objects, target.uid)
}

function moonOf(target: CatalogTarget, patch: ParamsPatch = {}): MoonConditions {
  return present(summary(target, patch).moon, `dane Księżyca ${target.uid}`)
}

/** Porównanie z wzorcem: udział ±1e-6, oświetlenie ±1e-4, separacja ±0,01°. */
function expectMatches(actual: MoonConditions, expected: MoonConditions): void {
  expectWithin(actual.moonDownFraction, expected.moonDownFraction, 1e-6)
  expectWithin(actual.illumination, expected.illumination, 1e-4)
  expectWithin(actual.minSeparationDeg, expected.minSeparationDeg, 0.01)
}

describe('P1, P2 M 31 i Mój zestaw [AC5, AC6]', () => {
  it('P1: noc 16/17.10.2026: okno efektywne M 31 to całe okno 19:40–05:19 CEST, Księżyc nad horyzontem przez 6–8% (< 10%) → siedem filtrów zielonych', () => {
    const night = prepareCatalogNight(params())
    expect(night.darkness.kind).toBe('window')
    const m31 = summary(M31)
    const windowMinutes = night.darkness.kind === 'window' ? (night.darkness.window.endMs - night.darkness.window.startMs) / 60_000 : 0
    expectWithin(present(m31.effectiveMinutes, 'czas efektywny'), windowMinutes, 5)
    const data = present(m31.moon, 'dane Księżyca M 31')
    // „Pytania”: Księżyc nad horyzontem = wysokość geometryczna > 0°, więc ok. 6–8% okna, a nie dokładnie 45/579.
    expect(1 - data.moonDownFraction).toBeGreaterThanOrEqual(0.06)
    expect(1 - data.moonDownFraction).toBeLessThanOrEqual(0.08)
    expect(data.moonDownFraction).toBeGreaterThanOrEqual(0.9)
    expect(pairs(filterAdvice(data, M31.type, DEFAULT_MOON_RULES, MY_SET))).toEqual(seven('green', 'green', 'green'))
  })

  it('P2: noc 24/25.10.2026: Księżyc nad horyzontem przez całe okno efektywne (pod 0%), oświetlenie ≈ 98% (±1 p.p.) → L, R, G, B czerwone', () => {
    const data = moonOf(M31, { nightDate: OCT_24 })
    expect(data.moonDownFraction).toBe(0)
    expect(data.illumination).toBeGreaterThanOrEqual(0.97)
    expect(data.illumination).toBeLessThanOrEqual(0.99)
    expect(colorsOf(filterAdvice(data, M31.type, DEFAULT_MOON_RULES, MY_SET), ['L', 'R', 'G', 'B'])).toEqual(['red', 'red', 'red', 'red'])
  })
})

describe('Styk: dane Księżyca liczone z próbek okna ciemności, tylko w oknie efektywnym obiektu', () => {
  // [opis, obiekt, parametry] – wzorzec `referenceMoon` liczy te same reguły wprost z publicznego API.
  const CASES: readonly (readonly [string, CatalogTarget, ParamsPatch])[] = [
    ['P1: M 31, 16/17.10, horyzont płaski', M31, {}],
    ['P2: M 31, 24/25.10, horyzont płaski', M31, { nightDate: OCT_24 }],
    ['NGC 7000, 16/17.10, horyzont płaski', NGC7000, {}],
    ['M 42, 16/17.10, horyzont płaski', M42, {}],
    ['M 31, 16/17.10, horyzont demonstracyjny', M31, { location: { horizon: DEMO_HORIZON } }],
    ['NGC 7000, 16/17.10, horyzont demonstracyjny', NGC7000, { location: { horizon: DEMO_HORIZON } }],
    ['M 42, 16/17.10, horyzont demonstracyjny, h_min 20° (T11)', M42, { location: { horizon: DEMO_HORIZON }, settings: { minAltitudeDeg: 20 } }],
    ['NGC 7000, 16/17.10, krok 10 min', NGC7000, { settings: { catalogStepMin: 10 } }],
  ]

  it.each(CASES)('%s: udział pod horyzontem, oświetlenie w środku okna efektywnego i najmniejsza separacja jak we wzorcu', (_, target, patch) => {
    const expected = present(referenceMoon(target, params(patch)).effective, 'wzorzec')
    expectMatches(moonOf(target, patch), expected)
  })

  it('wzorzec odtwarza T7: separacja M 31 od Księżyca o 00:00 CEST 17.10 (współrzędne daty, Księżyc topocentrycznie) 112,82° (±0,01°)', () => {
    const night = prepareCatalogNight(params())
    const moonAtMidnight = bodyPosition('moon', night.site, at('2026-10-17 00:00', 'CEST'))
    expectWithin(angularSeparationDeg(toEquatorOfDate(M31, night.precession), moonAtMidnight), 112.82, 0.01)
  })

  it('P1, T7: najmniejsza separacja M 31 w oknie efektywnym nie przekracza 112,82° z 00:00 CEST, które leży w tym oknie', () => {
    const data = moonOf(M31)
    expect(data.minSeparationDeg).toBeLessThanOrEqual(112.83)
    expect(data.minSeparationDeg).toBeGreaterThan(100)
  })

  it('NGC 7000 (widoczna 19:40–ok. 02:30): dane z okna efektywnego, a nie z całego okna ciemności', () => {
    const reference = referenceMoon(NGC7000, params())
    const effective = present(reference.effective, 'wzorzec w oknie efektywnym')
    const whole = present(reference.wholeWindow, 'wzorzec w całym oknie')
    // Dane testu: wyniki dla obu okien wyraźnie się różnią.
    expect(Math.abs(effective.minSeparationDeg - whole.minSeparationDeg)).toBeGreaterThan(0.5)
    expect(Math.abs(effective.moonDownFraction - whole.moonDownFraction)).toBeGreaterThan(0.02)
    expect(Math.abs(effective.illumination - whole.illumination)).toBeGreaterThan(0.003)
    expectMatches(moonOf(NGC7000), effective)
  })

  it('M 42 (widoczna od ok. 03:20): Księżyc zaszedł o 20:25, więc w oknie efektywnym jest pod horyzontem przez 100% → wszystkie filtry zielone', () => {
    const whole = present(referenceMoon(M42, params()).wholeWindow, 'wzorzec w całym oknie')
    expect(whole.moonDownFraction).toBeLessThan(1)
    const data = moonOf(M42)
    expect(data.moonDownFraction).toBe(1)
    expect(pairs(filterAdvice(data, M42.type, DEFAULT_MOON_RULES, MY_SET))).toEqual(seven('green', 'green', 'green'))
  })

  it('P1, „Pytania”: Księżyc nad horyzontem liczony względem 0°, nie horyzontu lokalnego: przy horyzoncie demonstracyjnym udział jak przy płaskim', () => {
    const night = prepareCatalogNight(params({ location: { horizon: DEMO_HORIZON } }))
    if (night.darkness.kind !== 'window') throw new Error('brak okna ciemności')
    // Dane testu: o 19:40 Księżyc jest nad 0° (ok. 3,2°), ale pod horyzontem lokalnym (ok. 10° w azymucie ok. 212°).
    const moonAtStart = bodyPosition('moon', night.site, night.darkness.window.startMs)
    expect(moonAtStart.altDeg).toBeGreaterThan(0)
    expect(moonAtStart.altDeg).toBeLessThan(horizonAltitudeDeg(DEMO_HORIZON, moonAtStart.azDeg))
    const demo = moonOf(M31, { location: { horizon: DEMO_HORIZON } })
    const flat = moonOf(M31)
    expect(demo.moonDownFraction).toBeLessThan(1)
    expectWithin(demo.moonDownFraction, flat.moonDownFraction, 1e-9)
    expect(1 - demo.moonDownFraction).toBeGreaterThanOrEqual(0.06)
    expect(1 - demo.moonDownFraction).toBeLessThanOrEqual(0.08)
  })
})

describe('P12 obiekt bez czasu efektywnego', () => {
  /** RA 0h, −60°: na 52°N nigdy nie wschodzi, więc czas efektywny 0 min. */
  const SOUTH: CatalogTarget = { uid: 'test-south-0h', raDeg: 0, decDeg: -60 }

  it('P12: obiekt z czasem efektywnym 0 min → brak danych Księżyca i brak rekomendacji', () => {
    const result = summary(SOUTH)
    expect(result.effectiveMinutes).toBe(0)
    const data = result.moon ?? null
    expect(data).toBeNull()
    expect(filterAdvice(data, 'galaxy', DEFAULT_MOON_RULES, MY_SET)).toEqual([])
  })

  it('P12: „brak okna” (noc 21/22.06.2026 na 54,83°N) → brak danych Księżyca i brak rekomendacji dla M 31', () => {
    const result = summary(M31, { nightDate: JUN_21, location: { latDeg: 54.83 } })
    expect(result.darkness.kind).toBe('none')
    expect(result.effectiveMinutes).toBeNull()
    const data = result.moon ?? null
    expect(data).toBeNull()
    expect(filterAdvice(data, M31.type, DEFAULT_MOON_RULES, MY_SET)).toEqual([])
  })

  it('P12: w tym samym wyniku M 31 ma dane Księżyca, a obiekt bez czasu efektywnego nie', () => {
    const { objects } = computeCatalogNight(params(), [targetOf(M31), SOUTH])
    present(summaryOf(objects, M31.uid).moon, 'dane Księżyca M 31')
    expect(summaryOf(objects, SOUTH.uid).moon ?? null).toBeNull()
  })
})

describe('Styk: dane Księżyca przychodzą z Workera, kolory liczy wątek główny', () => {
  const LOCATION: ObserverLocation = { ...DEMO_LOCATION, horizon: [] }
  const SETTINGS: PlanningSettings = { ...DEFAULT_PLANNING_SETTINGS, minAltitudeDeg: 30, catalogStepMin: 5 }

  function request(settings: PlanningSettings): CatalogNightParams {
    return buildCatalogRequest({ location: LOCATION, nightDate: '2026-10-16', settings })
  }

  it('P1: wynik nocy z silnika Workera zawiera dane Księżyca M 31, takie jak z computeCatalogNight', () => {
    const engine = createCatalogEngine()
    engine.handle({ type: 'catalog', objects: [targetOf(M31)] })
    const response = engine.handle({ type: 'compute', requestId: 1, params: request(SETTINGS) })
    if (response.type !== 'result') throw new Error(`odpowiedź ${response.type}`)
    const data = present(summaryOf(response.objects, M31.uid).moon, 'dane Księżyca z Workera')
    expect(data).toEqual(computeCatalogNight(request(SETTINGS), [targetOf(M31)]).objects[0].moon)
  })

  it('zmiana progów Księżyca (jak w P11) nie wymaga ponownego liczenia: ten sam wynik z pamięci, a kolory z nowymi progami są inne', () => {
    const engine = createCatalogEngine()
    engine.handle({ type: 'catalog', objects: [targetOf(M31)] })
    const changed: PlanningSettings = { ...SETTINGS, moonRules: rules({ moonDownMinFraction: 0.95 }) }
    expect(request(changed)).toEqual(request(SETTINGS))
    const first = engine.handle({ type: 'compute', requestId: 1, params: request(SETTINGS) })
    const second = engine.handle({ type: 'compute', requestId: 2, params: request(changed) })
    if (first.type !== 'result' || second.type !== 'result') throw new Error('brak wyniku')
    expect(second.fromCache).toBe(true)
    const data = present(summaryOf(second.objects, M31.uid).moon, 'dane Księżyca z pamięci')
    expect(pairs(filterAdvice(data, M31.type, SETTINGS.moonRules, MY_SET))).toEqual(seven('green', 'green', 'green'))
    // Przy progu 95% obowiązuje wiersz 3 tabeli. Warunki M 31 tej nocy: udział < 95%, oświetlenie < 50%, separacja ≥ 90°,
    // więc L, R, G, B żółte; Ha, SII zielone (≥ 50°); OIII zielony (≥ 70° i < 75%).
    expect(data.moonDownFraction).toBeLessThan(0.95)
    expect(data.illumination).toBeLessThan(0.5)
    expect(data.minSeparationDeg).toBeGreaterThanOrEqual(90)
    expect(pairs(filterAdvice(data, M31.type, changed.moonRules, MY_SET))).toEqual(seven('yellow', 'green', 'green'))
  })
})
