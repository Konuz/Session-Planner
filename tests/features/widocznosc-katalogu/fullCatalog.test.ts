// P13: pełny katalog aplikacji w noc 16/17.10.2026, krok 5 min [7A, AC7].
import { describe, expect, it } from 'vitest'
import { computeCatalogNight, type ObjectNightSummary } from '../../../src/services/catalogNight'
import { CATALOG, M101, M31, T9_OBJECTS, params, summaryOf, windowOf } from './helpers'

/** Budżet 7A na cały katalog [ms]. */
const BUDGET_MS = 3000

describe('P13 pełny katalog', () => {
  it('P13: wynik dla wszystkich 16 516 obiektów w czasie do 3 s (mierzonym w teście)', { timeout: 60_000 }, () => {
    expect(CATALOG).toHaveLength(16_516)
    const startedMs = performance.now()
    const result = computeCatalogNight(params({ settings: { catalogStepMin: 5 } }), CATALOG)
    const elapsedMs = performance.now() - startedMs
    expect(result.objects).toHaveLength(16_516)
    expect(elapsedMs, `liczenie katalogu trwało ${Math.round(elapsedMs)} ms`).toBeLessThanOrEqual(BUDGET_MS)
  })

  it('wyniki w kolejności katalogu, każdy z uid obiektu i stanem nocy', { timeout: 60_000 }, () => {
    const result = computeCatalogNight(params(), CATALOG)
    expect(result.objects.map((object) => object.uid)).toEqual(CATALOG.map((object) => object.uid))
    const windowMinutes = (() => {
      const window = windowOf(result.darkness)
      return (window.endMs - window.startMs) / 60_000
    })()
    const wrong = (ok: (object: ObjectNightSummary) => boolean) => result.objects.filter((object) => !ok(object)).map((object) => object.uid)
    expect(result.objects.map((object) => object.darkness)).toEqual(result.objects.map(() => result.darkness))
    expect(
      wrong((object) => object.effectiveMinutes !== null && object.effectiveMinutes >= 0 && object.effectiveMinutes <= windowMinutes + 1),
    ).toEqual([])
    expect(wrong((object) => object.highest !== null)).toEqual([])
  })

  it('wynik obiektu w pełnym katalogu jest taki sam jak przy liczeniu kilku obiektów', { timeout: 60_000 }, () => {
    const full = computeCatalogNight(params(), CATALOG).objects
    const few = computeCatalogNight(params(), [...T9_OBJECTS, M101]).objects
    for (const object of few) expect(summaryOf(full, object.uid)).toEqual(object)
    expect(summaryOf(full, M31.uid).transitMs).not.toBeNull()
    expect(summaryOf(full, M101.uid).transitMs).toBeNull()
  })
})
