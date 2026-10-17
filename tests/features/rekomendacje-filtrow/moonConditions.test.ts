// P13, P12 i reguły z „Styk z resztą” oraz „Pytania”: dane Księżyca obiektu z próbek okna podanych wprost.
import { describe, expect, it } from 'vitest'
import { filterAdvice, moonConditions, type MoonSample } from '../../../src/services/filterAdvice'
import { DEFAULT_MOON_RULES } from '../../../src/services/planningSettings'
import { at } from '../../../src/test/fixtures'
import { MY_SET, illuminationAt, pairs, patchAt, present, run, sample, seven, uniqueIllumination } from './helpers'

const UP = 10
const DOWN = -10

describe('P13 okno efektywne z przerwą', () => {
  /*
   * Próbki co 5 min od 18:30 do 05:00 CEST (126 próbek, oświetlenie każdej inne).
   * Obiekt widoczny tylko 20:00–21:00 i 03:00–04:00 (24 próbki).
   * Księżyc nad horyzontem 18:30–20:30 i 21:00–03:00, pod horyzontem 20:30–21:00 i 03:00–05:00.
   * W widocznych godzinach: Księżyc nad horyzontem 20:00–20:30 (6 próbek), pod 20:30–21:00 i 03:00–04:00 (18 próbek) → 75%.
   * Najmniejsza separacja w widocznych godzinach 40° (03:30); mniejsze (10°, 15°, 5°) są tylko poza nimi.
   * Środek: połowa między 20:00 a 04:00 = 00:00 (próbka niewidoczna); środek całego zakresu próbek to 23:45.
   */
  function p13Samples(): MoonSample[] {
    let samples = [
      ...run('2026-10-16 18:30', '2026-10-16 20:00', { objectVisible: false, moonAltDeg: UP }),
      ...run('2026-10-16 20:00', '2026-10-16 20:30', { objectVisible: true, moonAltDeg: UP }),
      ...run('2026-10-16 20:30', '2026-10-16 21:00', { objectVisible: true, moonAltDeg: DOWN }),
      ...run('2026-10-16 21:00', '2026-10-17 03:00', { objectVisible: false, moonAltDeg: UP }),
      ...run('2026-10-17 03:00', '2026-10-17 04:00', { objectVisible: true, moonAltDeg: DOWN }),
      ...run('2026-10-17 04:00', '2026-10-17 05:00', { objectVisible: false, moonAltDeg: DOWN }),
    ]
    samples = uniqueIllumination(samples)
    samples = patchAt(samples, '2026-10-16 19:30', { moonSeparationDeg: 10 })
    samples = patchAt(samples, '2026-10-16 20:10', { moonSeparationDeg: 60 })
    samples = patchAt(samples, '2026-10-16 23:00', { moonSeparationDeg: 15 })
    samples = patchAt(samples, '2026-10-17 03:30', { moonSeparationDeg: 40 })
    samples = patchAt(samples, '2026-10-17 04:30', { moonSeparationDeg: 5 })
    return samples
  }

  it('P13: dane testu: 126 próbek, 24 widoczne, próbka 00:00 niewidoczna', () => {
    const samples = p13Samples()
    expect(samples).toHaveLength(126)
    expect(samples.filter((item) => item.objectVisible)).toHaveLength(24)
    expect(samples.find((item) => item.timeMs === at('2026-10-17 00:00', 'CEST'))?.objectVisible).toBe(false)
  })

  it('P13: udział Księżyca pod horyzontem tylko z próbek 20:00–21:00 i 03:00–04:00: 18 z 24 → 75%', () => {
    const result = present(moonConditions(p13Samples()), 'dane Księżyca')
    expect(result.moonDownFraction).toBeCloseTo(0.75, 9)
  })

  it('P13: najmniejsza separacja tylko z próbek widocznych: 40° (mniejsze 10°, 15° i 5° są poza oknem efektywnym)', () => {
    expect(present(moonConditions(p13Samples()), 'dane Księżyca').minSeparationDeg).toBe(40)
  })

  it('P13: oświetlenie z próbki 00:00, w połowie między początkiem pierwszej części (20:00) a końcem ostatniej (04:00)', () => {
    const samples = p13Samples()
    const result = present(moonConditions(samples), 'dane Księżyca')
    expect(result.illumination).toBeCloseTo(illuminationAt(samples, '2026-10-17 00:00'), 9)
    expect(result.illumination).not.toBeCloseTo(illuminationAt(samples, '2026-10-16 23:45'), 9)
  })

  it('P13: przy próbkach różnej długości środek liczy się z końca ostatniej widocznej próbki: 20:00–04:00 → 00:00, nie 23:20', () => {
    // Widoczne: 20:00 (60 min) i 03:00 (60 min). Środek = (20:00 + 04:00) / 2 = 00:00.
    // Gdyby liczyć od początku ostatniej próbki (03:00), środek wypadłby o 23:30, najbliżej próbki 23:20.
    const samples = [
      sample('2026-10-16 19:00', 60, { objectVisible: false, moonIllumination: 0.11 }),
      sample('2026-10-16 20:00', 60, { objectVisible: true, moonIllumination: 0.12 }),
      sample('2026-10-16 21:00', 140, { objectVisible: false, moonIllumination: 0.13 }),
      sample('2026-10-16 23:20', 40, { objectVisible: false, moonIllumination: 0.14 }),
      sample('2026-10-17 00:00', 60, { objectVisible: false, moonIllumination: 0.15 }),
      sample('2026-10-17 01:00', 120, { objectVisible: false, moonIllumination: 0.16 }),
      sample('2026-10-17 03:00', 60, { objectVisible: true, moonIllumination: 0.17 }),
    ]
    expect(present(moonConditions(samples), 'dane Księżyca').illumination).toBe(0.15)
  })
})

describe('reguły „Styk z resztą” i „Pytania”: dane Księżyca z próbek', () => {
  it('P13: środek okna efektywnego bez przerwy: obiekt widoczny 21:00–01:00 wśród próbek 19:00–05:00 → oświetlenie z próbki 23:00, nie z 00:00', () => {
    const samples = uniqueIllumination([
      ...run('2026-10-16 19:00', '2026-10-16 21:00', { objectVisible: false }),
      ...run('2026-10-16 21:00', '2026-10-17 01:00', { objectVisible: true }),
      ...run('2026-10-17 01:00', '2026-10-17 05:00', { objectVisible: false }),
    ])
    expect(present(moonConditions(samples), 'dane Księżyca').illumination).toBeCloseTo(illuminationAt(samples, '2026-10-16 23:00'), 9)
  })

  it('P13: oświetlenie z próbki najbliższej środka: próbki co 10 min 20:00–20:54 (ostatnia 4 min) → środek 20:27, próbka 20:30', () => {
    const samples = uniqueIllumination(run('2026-10-16 20:00', '2026-10-16 20:54', { objectVisible: true }, 10))
    expect(samples).toHaveLength(6)
    expect(present(moonConditions(samples), 'dane Księżyca').illumination).toBeCloseTo(illuminationAt(samples, '2026-10-16 20:30'), 9)
  })

  it('P13: udział pod horyzontem liczy czas trwania próbek: 4 próbki po 5 min pod horyzontem i 1 min nad → 20/21, nie 4/5', () => {
    let samples = run('2026-10-16 20:00', '2026-10-16 20:21', { objectVisible: true, moonAltDeg: DOWN })
    samples = patchAt(samples, '2026-10-16 20:20', { moonAltDeg: UP })
    expect(samples.map((item) => item.durationMs / 60_000)).toEqual([5, 5, 5, 5, 1])
    expect(present(moonConditions(samples), 'dane Księżyca').moonDownFraction).toBeCloseTo(20 / 21, 9)
  })

  it('P13: „nad horyzontem” to wysokość > 0°: Księżyc na wysokości dokładnie 0° jest pod horyzontem, na 0,01° nad', () => {
    const atZero = [
      sample('2026-10-16 20:00', 5, { moonAltDeg: 0 }),
      sample('2026-10-16 20:05', 5, { moonAltDeg: -5 }),
    ]
    const justAbove = [
      sample('2026-10-16 20:00', 5, { moonAltDeg: 0.01 }),
      sample('2026-10-16 20:05', 5, { moonAltDeg: -5 }),
    ]
    expect(present(moonConditions(atZero), 'dane Księżyca').moonDownFraction).toBe(1)
    expect(present(moonConditions(justAbove), 'dane Księżyca').moonDownFraction).toBeCloseTo(0.5, 9)
  })

  it('P13: najmniejsza separacja także z próbek z Księżycem pod horyzontem: 30° (Księżyc pod) zamiast 60° (Księżyc nad)', () => {
    const samples = [
      sample('2026-10-16 20:00', 5, { moonAltDeg: UP, moonSeparationDeg: 60 }),
      sample('2026-10-16 20:05', 5, { moonAltDeg: DOWN, moonSeparationDeg: 30 }),
      sample('2026-10-16 20:10', 5, { moonAltDeg: UP, moonSeparationDeg: 75 }),
    ]
    expect(present(moonConditions(samples), 'dane Księżyca').minSeparationDeg).toBe(30)
  })

  it('P13: Księżyc nad horyzontem tylko w próbkach niewidocznych → w oknie efektywnym 100% pod horyzontem', () => {
    const samples = [
      ...run('2026-10-16 19:40', '2026-10-16 20:30', { objectVisible: false, moonAltDeg: UP }),
      ...run('2026-10-16 20:30', '2026-10-16 23:00', { objectVisible: true, moonAltDeg: DOWN }),
    ]
    expect(present(moonConditions(samples), 'dane Księżyca').moonDownFraction).toBe(1)
  })

  it('P3: 8 z 10 widocznych próbek z Księżycem pod horyzontem → dokładnie 80%, więc przy progach domyślnych wszystkie filtry zielone', () => {
    let samples = run('2026-10-16 21:00', '2026-10-16 21:50', { objectVisible: true, moonAltDeg: DOWN, moonIllumination: 0.9, moonSeparationDeg: 10 })
    samples = patchAt(samples, '2026-10-16 21:00', { moonAltDeg: UP })
    samples = patchAt(samples, '2026-10-16 21:05', { moonAltDeg: UP })
    const result = present(moonConditions(samples), 'dane Księżyca')
    expect(result.moonDownFraction).toBeCloseTo(0.8, 9)
    expect(result.minSeparationDeg).toBe(10)
    expect(result.illumination).toBe(0.9)
    expect(pairs(filterAdvice(result, 'galaxy', DEFAULT_MOON_RULES, MY_SET))).toEqual(seven('green', 'green', 'green'))
  })
})

describe('P12 obiekt bez czasu efektywnego', () => {
  it('P12: brak próbek („brak okna”) → brak danych Księżyca', () => {
    expect(moonConditions([])).toBeNull()
  })

  it('P12: obiekt niewidoczny w żadnej próbce (0 min) → brak danych Księżyca, więc brak rekomendacji', () => {
    const samples = run('2026-10-16 19:40', '2026-10-17 05:15', { objectVisible: false, moonAltDeg: UP })
    const result = moonConditions(samples)
    expect(result).toBeNull()
    expect(filterAdvice(result, 'galaxy', DEFAULT_MOON_RULES, MY_SET)).toEqual([])
  })
})
