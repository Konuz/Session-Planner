// P14: pełny katalog aplikacji z danymi Księżyca w noc 16/17.10.2026, krok 5 min [7A, AC7].
import { describe, expect, it } from 'vitest'
import { computeCatalogNight } from '../../../src/services/catalogNight'
import { CATALOG, M31, M42, NGC7000, params, present, summaryOf, targetOf } from './helpers'

/** Budżet 7A na cały katalog [ms]. */
const BUDGET_MS = 3000

describe('P14 pełny katalog z danymi Księżyca', () => {
  it('P14: wynik dla wszystkich 16 516 obiektów, z danymi Księżyca, w czasie do 3 s (mierzonym w teście)', { timeout: 60_000 }, () => {
    expect(CATALOG).toHaveLength(16_516)
    const startedMs = performance.now()
    const result = computeCatalogNight(params({ settings: { catalogStepMin: 5 } }), CATALOG)
    const elapsedMs = performance.now() - startedMs
    expect(result.objects).toHaveLength(16_516)
    present(summaryOf(result.objects, M31.uid).moon, 'dane Księżyca M 31')
    expect(elapsedMs, `liczenie katalogu trwało ${Math.round(elapsedMs)} ms`).toBeLessThanOrEqual(BUDGET_MS)
  })

  it('P14: dane Księżyca ma dokładnie każdy obiekt z czasem efektywnym > 0 min; wartości w zakresach 0–1 i 0–180°', { timeout: 60_000 }, () => {
    const { objects } = computeCatalogNight(params(), CATALOG)
    const withoutMoon = objects.filter((object) => (object.effectiveMinutes ?? 0) > 0 && !object.moon).map((object) => object.uid)
    const unexpectedMoon = objects.filter((object) => !((object.effectiveMinutes ?? 0) > 0) && object.moon).map((object) => object.uid)
    expect(withoutMoon.length, `bez danych Księżyca: ${withoutMoon.slice(0, 10).join(', ')}`).toBe(0)
    expect(unexpectedMoon.length, `dane Księżyca bez czasu efektywnego: ${unexpectedMoon.slice(0, 10).join(', ')}`).toBe(0)
    const outOfRange = objects
      .filter((object) => {
        const data = object.moon
        if (!data) return false
        return !(
          data.moonDownFraction >= 0 &&
          data.moonDownFraction <= 1 &&
          data.illumination >= 0 &&
          data.illumination <= 1 &&
          data.minSeparationDeg >= 0 &&
          data.minSeparationDeg <= 180
        )
      })
      .map((object) => object.uid)
    expect(outOfRange.length, `poza zakresem: ${outOfRange.slice(0, 10).join(', ')}`).toBe(0)
    expect(objects.filter((object) => object.moon).length).toBeGreaterThan(1000)
  })

  it('P14: dane Księżyca obiektu w pełnym katalogu są takie same jak przy liczeniu kilku obiektów', { timeout: 60_000 }, () => {
    const full = computeCatalogNight(params(), CATALOG).objects
    const few = computeCatalogNight(params(), [M31, NGC7000, M42].map(targetOf)).objects
    for (const object of few) {
      present(object.moon, `dane Księżyca ${object.uid}`)
      expect(summaryOf(full, object.uid).moon).toEqual(object.moon)
    }
  })
})
