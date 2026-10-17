// Klucz pamięci podręcznej: co liczy od nowa (P4), a co bierze wynik z pamięci (P5–P7) [AC7].
import { describe, expect, it } from 'vitest'
import { computeCatalogNight, type CatalogNightParams } from '../../../src/services/catalogNight'
import { DEMO_HORIZON } from '../../../src/test/fixtures'
import type { HorizonPoint, ObserverLocation, PlanningSettings } from '../../../src/types'
import type { ResultResponse } from '../../../src/workers/catalogMessages'
import {
  BASE_LOCATION,
  BASE_SETTINGS,
  FIVE,
  OCT_15,
  OCT_16,
  OCT_17,
  baseParams,
  loaded,
  paramsWith,
  resultFor,
  type ParamsPatch,
} from './helpers'

/** Horyzont demonstracyjny z 6.4 jako nowa lista (nowe obiekty punktów). */
const demoHorizon = (): HorizonPoint[] => DEMO_HORIZON.map(({ azDeg, altDeg }) => ({ azDeg, altDeg }))

/** Horyzont demonstracyjny z jednym punktem zmienionym. */
function demoHorizonWith(index: number, point: HorizonPoint): HorizonPoint[] {
  return demoHorizon().map((original, i) => (i === index ? point : original))
}

/** P4: każda zmiana osobno względem żądania bazowego. */
const CHANGES: readonly (readonly [string, ParamsPatch])[] = [
  ['szerokość 52,0° → 52,5°', { location: { latDeg: 52.5 } }],
  ['długość 19,0° → 20,0°', { location: { lonDegEast: 20 } }],
  ['wysokość 150 → 300 m', { location: { elevationM: 300 } }],
  ['strefa Europe/Warsaw → Europe/London', { location: { timezone: 'Europe/London' } }],
  ['horyzont płaski → demonstracyjny', { location: { horizon: demoHorizon() } }],
  ['noc 16.10 → 17.10', { nightDate: OCT_17 }],
  ['próg −18° → −15°', { settings: { darknessThresholdDeg: -15 } }],
  ['obniżanie włączone → wyłączone', { settings: { autoLowerThreshold: false } }],
  ['h_min 30° → 20°', { settings: { minAltitudeDeg: 20 } }],
  ['krok 5 → 1 min', { settings: { catalogStepMin: 1 } }],
]

describe('P4 zmiana pola klucza daje nowe liczenie [AC7]', () => {
  it.each(CHANGES)('P4: %s → nowe liczenie, z wynikiem dla nowych parametrów', (_, patch) => {
    const { engine, compute } = loaded(FIVE)
    expect(resultFor(engine, 1, baseParams()).fromCache).toBe(false)
    const changed = paramsWith(patch)
    const result = resultFor(engine, 2, changed)
    expect(result).toMatchObject({ requestId: 2, fromCache: false })
    expect(compute).toHaveBeenCalledTimes(2)
    const expected = computeCatalogNight(changed, FIVE)
    expect(result.darkness).toEqual(expected.darkness)
    expect(result.objects).toEqual(expected.objects)
  })

  it('P4: wszystkie dziesięć zmian po kolei → dziesięć nowych liczeń; potem każda z nich i żądanie bazowe są z pamięci', () => {
    const { engine, compute } = loaded(FIVE)
    let requestId = 0
    const first = new Map<string, ResultResponse>()
    first.set('bazowe', resultFor(engine, ++requestId, baseParams()))
    for (const [label, patch] of CHANGES) {
      const result = resultFor(engine, ++requestId, paramsWith(patch))
      expect(result.fromCache, label).toBe(false)
      first.set(label, result)
    }
    expect(compute).toHaveBeenCalledTimes(CHANGES.length + 1)
    for (const [label, patch] of [['bazowe', {}] as const, ...CHANGES]) {
      const again = resultFor(engine, ++requestId, paramsWith(patch))
      expect(again.fromCache, label).toBe(true)
      expect(again.darkness, label).toEqual(first.get(label)?.darkness)
      expect(again.objects, label).toEqual(first.get(label)?.objects)
    }
    expect(compute).toHaveBeenCalledTimes(CHANGES.length + 1)
  })

  it.each([
    ['wysokość jednego punktu horyzontu (135°: 35° → 36°)', demoHorizonWith(9, { azDeg: 135, altDeg: 36 })],
    ['azymut jednego punktu horyzontu (180° → 182°)', demoHorizonWith(12, { azDeg: 182, altDeg: 8 })],
    ['horyzont bez ostatniego punktu', demoHorizon().slice(0, -1)],
  ] as const)('zmiana punktów horyzontu: %s → nowe liczenie', (_, horizon) => {
    const { engine, compute } = loaded(FIVE)
    resultFor(engine, 1, paramsWith({ location: { horizon: demoHorizon() } }))
    const changed = paramsWith({ location: { horizon } })
    const result = resultFor(engine, 2, changed)
    expect(result.fromCache).toBe(false)
    expect(compute).toHaveBeenCalledTimes(2)
    expect(result.objects).toEqual(computeCatalogNight(changed, FIVE).objects)
  })

  it('szerokość 52,0° i długość 19,0° zamienione miejscami to inne żądanie', () => {
    const { engine, compute } = loaded(FIVE)
    resultFor(engine, 1, paramsWith({ location: { latDeg: 52, lonDegEast: 19 } }))
    expect(resultFor(engine, 2, paramsWith({ location: { latDeg: 19, lonDegEast: 52 } })).fromCache).toBe(false)
    expect(compute).toHaveBeenCalledTimes(2)
  })
})

describe('P5 horyzont z punktów, nie z nazwy lokalizacji', () => {
  /** Lokalizacja demonstracyjna 52,0°N, 19,0°E z horyzontem z 6.4 (pełny rekord z nazwą). */
  const DEMO_SITE: ObserverLocation = { ...BASE_LOCATION, id: 'demo', name: 'Polska centralna (demo)', horizon: demoHorizon() }
  const request = (location: ObserverLocation, settings: PlanningSettings = BASE_SETTINGS): CatalogNightParams => ({
    location,
    nightDate: OCT_16,
    settings,
  })

  it('P5: te same punkty horyzontu przekazane jako nowa lista → wynik z pamięci', () => {
    const { engine, compute } = loaded(FIVE)
    const first = resultFor(engine, 1, request(DEMO_SITE))
    const again = resultFor(engine, 2, request({ ...DEMO_SITE, horizon: demoHorizon() }))
    expect(again).toMatchObject({ requestId: 2, fromCache: true })
    expect(again.objects).toEqual(first.objects)
    expect(compute).toHaveBeenCalledTimes(1)
  })

  it('P5: ta sama lokalizacja pod inną nazwą (i z innym id) → wynik z pamięci', () => {
    const { engine, compute } = loaded(FIVE)
    const first = resultFor(engine, 1, request(DEMO_SITE))
    const renamed: ObserverLocation = { ...DEMO_SITE, id: 'moje-pole', name: 'Moje pole', bortle: 4, sqm: 21.3, horizon: demoHorizon() }
    const again = resultFor(engine, 2, request(renamed))
    expect(again).toMatchObject({ requestId: 2, fromCache: true })
    expect(again.objects).toEqual(first.objects)
    expect(compute).toHaveBeenCalledTimes(1)
  })

  it('P5: horyzont płaski jako nowa pusta lista pod inną nazwą → wynik z pamięci', () => {
    const { engine, compute } = loaded(FIVE)
    resultFor(engine, 1, request(BASE_LOCATION))
    expect(resultFor(engine, 2, request({ ...BASE_LOCATION, name: 'Inna nazwa', horizon: [] })).fromCache).toBe(true)
    expect(compute).toHaveBeenCalledTimes(1)
  })

  it('ta sama nazwa, ale inny horyzont → nowe liczenie', () => {
    const { engine, compute } = loaded(FIVE)
    resultFor(engine, 1, request(BASE_LOCATION))
    expect(resultFor(engine, 2, request({ ...BASE_LOCATION, horizon: demoHorizon() })).fromCache).toBe(false)
    expect(compute).toHaveBeenCalledTimes(2)
  })
})

/** P6: parametry planowania spoza klucza pamięci. */
const OUTSIDE_KEY: readonly (readonly [string, Partial<PlanningSettings>])[] = [
  ['minimum godzin 3 → 2 h', { minEffectiveHours: 2 }],
  ['zakres „Pasuje do kadru” 25–80% → 10–50%', { fitRange: [0.1, 0.5] }],
  [
    'progi Księżyca',
    {
      moonRules: {
        ...BASE_SETTINGS.moonRules,
        moonDownMinFraction: 0.6,
        oxygen: { ...BASE_SETTINGS.moonRules.oxygen, greenMinSepDeg: 80 },
      },
    },
  ],
  ['seeing 2,5″ → 1,5″', { seeingArcsec: 1.5 }],
  ['krok wykresu nocy 1 → 5 min', { detailStepMin: 5 }],
]

describe('P6 parametry spoza klucza nie liczą od nowa', () => {
  const request = (settings: PlanningSettings): CatalogNightParams => ({ location: BASE_LOCATION, nightDate: OCT_16, settings })

  it.each(OUTSIDE_KEY)(
    'P6: %s → wynik z pamięci, bez ponownego liczenia',
    (_, patch) => {
      const { engine, compute } = loaded(FIVE)
      const first = resultFor(engine, 1, request(BASE_SETTINGS))
      const again = resultFor(engine, 2, request({ ...BASE_SETTINGS, ...patch }))
      expect(again).toMatchObject({ requestId: 2, fromCache: true })
      expect(again.objects).toEqual(first.objects)
      expect(compute).toHaveBeenCalledTimes(1)
    },
  )

  it('P6: wszystkie parametry spoza klucza zmienione naraz → wynik z pamięci', () => {
    const { engine, compute } = loaded(FIVE)
    resultFor(engine, 1, request(BASE_SETTINGS))
    const changed: PlanningSettings = {
      ...BASE_SETTINGS,
      minEffectiveHours: 2,
      fitRange: [0.1, 0.5],
      seeingArcsec: 1.5,
      detailStepMin: 5,
      moonRules: { ...BASE_SETTINGS.moonRules, moonDownMinFraction: 0.6 },
    }
    expect(resultFor(engine, 2, request(changed)).fromCache).toBe(true)
    expect(compute).toHaveBeenCalledTimes(1)
  })

  it('pełne parametry planowania i żądanie z samymi polami klucza to ten sam klucz', () => {
    const { engine, compute } = loaded(FIVE)
    resultFor(engine, 1, request(BASE_SETTINGS))
    expect(resultFor(engine, 2, baseParams()).fromCache).toBe(true)
    expect(compute).toHaveBeenCalledTimes(1)
  })
})

describe('P7 kilka nocy w pamięci', () => {
  it('P7: noce 16.10 → 17.10 → 16.10: trzecie żądanie jest z pamięci, z wynikiem pierwszego', () => {
    const { engine, compute } = loaded(FIVE)
    const first = resultFor(engine, 1, paramsWith({ nightDate: OCT_16 }))
    const second = resultFor(engine, 2, paramsWith({ nightDate: OCT_17 }))
    const third = resultFor(engine, 3, paramsWith({ nightDate: OCT_16 }))
    expect([first.fromCache, second.fromCache, third.fromCache]).toEqual([false, false, true])
    expect(third.requestId).toBe(3)
    expect(third.darkness).toEqual(first.darkness)
    expect(third.objects).toEqual(first.objects)
    expect(third.darkness).not.toEqual(second.darkness)
    expect(compute).toHaveBeenCalledTimes(2)
  })

  it('P7: noc D (16.10) i noc z 15. dnia miesiąca (15.10) pamiętane osobno; obie potem bez liczenia', () => {
    const { engine, compute } = loaded(FIVE)
    const nightD = resultFor(engine, 1, paramsWith({ nightDate: OCT_16 }))
    const night15 = resultFor(engine, 2, paramsWith({ nightDate: OCT_15 }))
    expect([nightD.fromCache, night15.fromCache]).toEqual([false, false])
    expect(night15.darkness).not.toEqual(nightD.darkness)
    const night15Again = resultFor(engine, 3, paramsWith({ nightDate: OCT_15 }))
    const nightDAgain = resultFor(engine, 4, paramsWith({ nightDate: OCT_16 }))
    expect(night15Again).toMatchObject({ requestId: 3, fromCache: true })
    expect(nightDAgain).toMatchObject({ requestId: 4, fromCache: true })
    expect(night15Again.darkness).toEqual(night15.darkness)
    expect(night15Again.objects).toEqual(night15.objects)
    expect(nightDAgain.darkness).toEqual(nightD.darkness)
    expect(nightDAgain.objects).toEqual(nightD.objects)
    expect(compute).toHaveBeenCalledTimes(2)
  })
})
