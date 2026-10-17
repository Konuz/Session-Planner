// Druga noc z Workera: noc odniesienia liczy ten sam silnik (obliczenia-w-tle) z tymi samymi parametrami co noc D,
// pod osobnym kluczem pamięci („Styk z resztą”, „Pytania”, P2–P5).
import { describe, expect, it, vi } from 'vitest'
import { referenceNightDate } from '../../../src/services/catalogFilters'
import { computeCatalogNight, type CatalogNightParams } from '../../../src/services/catalogNight'
import { DEMO_HORIZON } from '../../../src/test/fixtures'
import type { ObserverLocation, PlanningSettings } from '../../../src/types'
import { createCatalogEngine, type CatalogEngine } from '../../../src/workers/catalogEngine'
import { buildCatalogRequest, type ResultResponse } from '../../../src/workers/catalogMessages'
import {
  KLASYKI,
  NOV_01,
  OCT_15,
  OCT_24,
  OCT_31,
  P5_LOCATION,
  P5_OBJECTS,
  P5_SETTINGS,
  recommended,
  targetsOf,
  visibleTonight,
} from './helpers'

const TARGETS = targetsOf(KLASYKI)

/** Silnik Workera z wczytanymi „Klasyki” i licznikiem liczeń (`compute` woła prawdziwe `computeCatalogNight`). */
function loadedEngine() {
  const compute = vi.fn<typeof computeCatalogNight>((params, targets) => computeCatalogNight(params, targets))
  const engine = createCatalogEngine({ compute })
  expect(engine.handle({ type: 'catalog', objects: TARGETS })).toEqual({ type: 'ready', count: TARGETS.length })
  return { engine, compute }
}

let nextId = 0

function compute(engine: CatalogEngine, params: CatalogNightParams): ResultResponse {
  const response = engine.handle({ type: 'compute', requestId: ++nextId, params })
  if (response.type !== 'result') throw new Error(`Oczekiwano „wynik”, jest ${JSON.stringify(response).slice(0, 200)}`)
  return response
}

/** Żądanie „licz” ze stanu aplikacji dla nocy `nightDate` (lokalizacja i parametry z P5, o ile nie podano innych). */
function requestFor(nightDate: string, location: ObserverLocation = P5_LOCATION, settings: PlanningSettings = P5_SETTINGS) {
  return buildCatalogRequest({ location, nightDate, settings })
}

/** Żądanie o noc odniesienia nocy D: te same lokalizacja i parametry, noc z `referenceNightDate`. */
function referenceRequestFor(nightDate: string, location: ObserverLocation = P5_LOCATION, settings: PlanningSettings = P5_SETTINGS) {
  return requestFor(referenceNightDate(nightDate), location, settings)
}

/** Noc D i noc odniesienia z jednego silnika; „Polecane” i „Widoczne” z odpowiedzi Workera. */
function monthFromWorker(nightDate: string, minEffectiveHours: number) {
  const { engine } = loadedEngine()
  const tonight = compute(engine, requestFor(nightDate))
  const reference = compute(engine, referenceRequestFor(nightDate))
  const data = { nightDate, results: tonight.objects, referenceResults: reference.objects, minEffectiveHours }
  return { recommended: recommended(KLASYKI, data), visible: visibleTonight(KLASYKI, data) }
}

describe('noc odniesienia z tego samego Workera, pod osobnym kluczem', () => {
  it('P5: po nocy D 24/25.10.2026 żądanie o noc odniesienia liczy się od nowa (inny klucz) i daje wyniki nocy 15/16.10.2026', () => {
    const { engine, compute: counted } = loadedEngine()
    expect(compute(engine, requestFor(OCT_24)).fromCache).toBe(false)
    const reference = compute(engine, referenceRequestFor(OCT_24))
    expect(reference.fromCache).toBe(false)
    expect(counted).toHaveBeenCalledTimes(2)
    expect(reference.objects).toEqual(computeCatalogNight(requestFor(OCT_15), TARGETS).objects)
  })

  it('P5: oba wyniki zostają w pamięci: ponowne żądania o noc D 24/25.10 i o noc odniesienia → z pamięci, bez nowego liczenia', () => {
    const { engine, compute: counted } = loadedEngine()
    compute(engine, requestFor(OCT_24))
    compute(engine, referenceRequestFor(OCT_24))
    expect(compute(engine, requestFor(OCT_24)).fromCache).toBe(true)
    expect(compute(engine, referenceRequestFor(OCT_24)).fromCache).toBe(true)
    expect(counted).toHaveBeenCalledTimes(2)
  })

  it('P5: „Polecane” z odpowiedzi Workera dla nocy D 24/25.10.2026, minimum 3 h → M 31, NGC 7000, IC 1396, M 45; bez M 42', () => {
    const { engine } = loadedEngine()
    const tonight = compute(engine, requestFor(OCT_24))
    const reference = compute(engine, referenceRequestFor(OCT_24))
    const data = { nightDate: OCT_24, results: tonight.objects, referenceResults: reference.objects }
    expect(recommended(P5_OBJECTS, data)).toEqual(['M 31', 'NGC 7000', 'IC 1396', 'M 45'])
  })

  it('P2: noc D 31.10/1.11.2026 ma tę samą noc odniesienia co 24/25.10 → żądanie o 15/16.10 przychodzi z pamięci', () => {
    const { engine, compute: counted } = loadedEngine()
    compute(engine, referenceRequestFor(OCT_24))
    expect(referenceRequestFor(OCT_31)).toEqual(requestFor(OCT_15))
    expect(compute(engine, referenceRequestFor(OCT_31)).fromCache).toBe(true)
    expect(counted).toHaveBeenCalledTimes(1)
  })

  // Reguła [Z22] z czasami „Klasyki” (parametry P5, krok 5 min): M 101 ma ok. 1 h w nocy 15/16.10,
  // ok. 1 h 37 min w nocy 31.10/1.11, ok. 1 h 35 min w nocy 1/2.11 i ok. 2 h 25 min w nocy 15/16.11.
  it('P2: noc D 31.10/1.11.2026, minimum 2 h → „Polecane” (noc 15/16.10) odrzuca M 101', () => {
    const { recommended: result } = monthFromWorker(OCT_31, 2)
    expect(result).not.toContain('M 101')
    expect(result).toContain('M 31')
  })

  it('P3: noc D 1/2.11.2026, minimum 2 h → „Polecane” (noc 15/16.11) przyjmuje M 101, a „Widoczne w wybraną noc” (1/2.11) nie', () => {
    const { recommended: result, visible } = monthFromWorker(NOV_01, 2)
    expect(result).toContain('M 101')
    expect(visible).not.toContain('M 101')
  })

  it('P4: noc D 15/16.10.2026 → żądanie o noc odniesienia to to samo żądanie co noc D; Worker odpowiada z pamięci, liczy raz', () => {
    const { engine, compute: counted } = loadedEngine()
    const tonight = compute(engine, requestFor(OCT_15))
    expect(referenceRequestFor(OCT_15)).toEqual(requestFor(OCT_15))
    const reference = compute(engine, referenceRequestFor(OCT_15))
    expect(reference.fromCache).toBe(true)
    expect(reference.objects).toEqual(tonight.objects)
    expect(counted).toHaveBeenCalledTimes(1)
  })
})

// „Pytania”: noc 15. liczona z tymi samymi parametrami co noc D (próg, obniżanie, h_min, krok, horyzont).
describe('noc odniesienia z tymi samymi parametrami co noc D', () => {
  const location: ObserverLocation = { ...P5_LOCATION, horizon: DEMO_HORIZON.map((point) => ({ ...point })) }
  const settings: PlanningSettings = {
    ...P5_SETTINGS,
    darknessThresholdDeg: -15,
    autoLowerThreshold: false,
    minAltitudeDeg: 25,
    catalogStepMin: 2,
  }

  it('Pytania: noc 15. z tymi samymi parametrami co noc D (horyzont z 6.4, −15° bez obniżania, h_min 25°, krok 2 min), noc D 24/25.10 → żądanie o noc odniesienia różni się tylko nocą (2026-10-15)', () => {
    expect(referenceRequestFor(OCT_24, location, settings)).toEqual({ ...requestFor(OCT_24, location, settings), nightDate: OCT_15 })
  })

  it('Pytania: noc 15. z tymi samymi parametrami co noc D → Worker liczy noc odniesienia od nowa i daje wynik nocy 15/16.10 z tymi parametrami, inny niż przy parametrach P5', () => {
    const { engine } = loadedEngine()
    compute(engine, requestFor(OCT_24, location, settings))
    const reference = compute(engine, referenceRequestFor(OCT_24, location, settings))
    expect(reference.fromCache).toBe(false)
    expect(reference.darkness).toMatchObject({ kind: 'window', thresholdDeg: -15 })
    expect(reference.objects).toEqual(computeCatalogNight(requestFor(OCT_15, location, settings), TARGETS).objects)
    expect(reference.objects).not.toEqual(computeCatalogNight(requestFor(OCT_15), TARGETS).objects)
  })
})
