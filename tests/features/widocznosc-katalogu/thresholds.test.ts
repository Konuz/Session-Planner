// P10–P12: noc 21/22.06.2026 – obniżanie progu ciemności i „brak okna” [T6, AC4].
import { describe, expect, it } from 'vitest'
import { computeCatalogNight, meridianFlipMs, type CatalogTarget, type ObjectNightSummary } from '../../../src/services/catalogNight'
import { at, expectSameMinute, expectWithin } from '../../../src/test/fixtures'
import {
  CATALOG,
  IC1396,
  JUN_21,
  M101,
  M31,
  NGC7000,
  T9_OBJECTS,
  params,
  present,
  summaryOf,
  windowOf,
  type ParamsPatch,
} from './helpers'

const POLAR: CatalogTarget = { uid: 'test-polar-0h', raDeg: 0, decDeg: 89 }
const SIX = [...T9_OBJECTS, M101]

const june = (patch: ParamsPatch = {}) =>
  params({ ...patch, nightDate: JUN_21, location: { ...patch.location }, settings: { ...patch.settings } })
const north = { location: { latDeg: 54.83 } }

/** uid obiektów, których podsumowanie nie spełnia warunku. */
function offenders(objects: readonly ObjectNightSummary[], ok: (object: ObjectNightSummary) => boolean): string[] {
  return objects.filter((object) => !ok(object)).map((object) => object.uid)
}

describe('P10 noc 21/22.06.2026 na 52,0°N: próg obniżony do −12° [T6, AC4]', () => {
  it('P10: wynik podaje próg −12° obniżony z −18° i okno 23:15–02:16 CEST (±1 min)', () => {
    const result = computeCatalogNight(june(), SIX)
    for (const darkness of [result.darkness, ...result.objects.map((object) => object.darkness)]) {
      expect(darkness).toMatchObject({ kind: 'window', thresholdDeg: -12, lowered: true })
      const window = windowOf(darkness)
      expectSameMinute(window.startMs, at('2026-06-21 23:15', 'CEST'))
      expectSameMinute(window.endMs, at('2026-06-22 02:16', 'CEST'))
    }
  })

  it('P10: żaden obiekt katalogu nie ma więcej niż 3 h 01 min (±1 min)', { timeout: 60_000 }, () => {
    const { objects } = computeCatalogNight(june(), CATALOG)
    expect(objects).toHaveLength(CATALOG.length)
    expect(offenders(objects, (object) => object.effectiveMinutes !== null && object.effectiveMinutes <= 3 * 60 + 1 + 1)).toEqual([])
  })

  it.each([
    ['obiekt przy biegunie', POLAR],
    ['NGC 7000', NGC7000],
    ['IC 1396', IC1396],
  ] as const)('%s jest widoczny przez całe okno: 3 h 01 min (±1 min)', (_, target) => {
    const { objects } = computeCatalogNight(june(), [target])
    expectWithin(present(summaryOf(objects, target.uid).effectiveMinutes, 'czas efektywny'), 3 * 60 + 1, 1)
  })

  it('próg −15° z obniżaniem też spada do −12° (obniżony)', () => {
    const { darkness } = computeCatalogNight(june({ settings: { darknessThresholdDeg: -15 } }), [M31])
    expect(darkness).toMatchObject({ kind: 'window', thresholdDeg: -12, lowered: true })
  })

  it('próg −12° wybrany wprost: to samo okno 23:15–02:16 CEST, bez obniżenia', () => {
    const result = computeCatalogNight(june({ settings: { darknessThresholdDeg: -12 } }), [M31])
    expect(result.darkness).toMatchObject({ kind: 'window', thresholdDeg: -12, lowered: false })
    expect(result.objects[0].darkness).toEqual(result.darkness)
    const window = windowOf(result.darkness)
    expectSameMinute(window.startMs, at('2026-06-21 23:15', 'CEST'))
    expectSameMinute(window.endMs, at('2026-06-22 02:16', 'CEST'))
  })

  it('M 101 góruje o 20:48 CEST, na osi nocy przed początkiem okna: górowanie podane, najwyżej na początku okna', () => {
    const { objects } = computeCatalogNight(june(), [M101])
    const m101 = summaryOf(objects, M101.uid)
    const window = windowOf(m101.darkness)
    expectSameMinute(present(m101.transitMs, 'górowanie'), at('2026-06-21 20:48', 'CEST'))
    expect(present(m101.highest, 'najwyższe położenie').timeMs).toBe(window.startMs)
  })

  it('NGC 7000 góruje o 03:43 CEST, na osi nocy po końcu okna (02:16): górowanie podane, najwyżej na końcu okna', () => {
    const { objects } = computeCatalogNight(june(), [NGC7000])
    const ngc7000 = summaryOf(objects, NGC7000.uid)
    const window = windowOf(ngc7000.darkness)
    const transit = present(ngc7000.transitMs, 'górowanie')
    expectSameMinute(transit, at('2026-06-22 03:43', 'CEST'))
    expectSameMinute(window.endMs, at('2026-06-22 02:16', 'CEST'))
    expect(transit).toBeGreaterThan(window.endMs)
    expect(present(ngc7000.highest, 'najwyższe położenie').timeMs).toBe(window.endMs)
  })

  it('M 31 góruje po końcu osi nocy: góruje w dzień, bez przerzutu', () => {
    const { objects } = computeCatalogNight(june(), [M31])
    const m31 = summaryOf(objects, M31.uid)
    expect(m31.transitMs).toBeNull()
    expect(meridianFlipMs(m31.transitMs, { type: 'gem', flipMinutesAfterMeridian: 10 })).toBeNull()
  })
})

describe('P11 noc 21/22.06.2026 na 54,83°N: brak okna nawet przy −12° [T6, AC4]', () => {
  it('P11: każdy obiekt ma stan „brak okna przy progu −12°”, bez czasu efektywnego i najwyższego położenia', { timeout: 60_000 }, () => {
    const result = computeCatalogNight(june(north), CATALOG)
    expect(result.darkness).toEqual({ kind: 'none', thresholdDeg: -12 })
    expect(result.objects).toHaveLength(CATALOG.length)
    expect(
      offenders(
        result.objects,
        (object) =>
          object.darkness.kind === 'none' &&
          object.darkness.thresholdDeg === -12 &&
          object.effectiveMinutes === null &&
          object.highest === null,
      ),
    ).toEqual([])
  })

  it('P11: górowanie jest nadal podane: NGC 7000 góruje w nocy', () => {
    const { objects } = computeCatalogNight(june(north), [NGC7000])
    const transit = present(summaryOf(objects, NGC7000.uid).transitMs, 'górowanie NGC 7000')
    expect(transit).toBeGreaterThan(at('2026-06-21 21:30', 'CEST'))
    expect(transit).toBeLessThan(at('2026-06-22 04:00', 'CEST'))
  })

  it('górowanie nie zależy od szerokości: NGC 7000 o tej samej chwili na 54,83°N i 52,0°N (±1 min)', () => {
    const atNorth = computeCatalogNight(june(north), [NGC7000]).objects[0]
    const at52 = computeCatalogNight(june(), [NGC7000]).objects[0]
    expectSameMinute(present(atNorth.transitMs, 'górowanie 54,83°N'), present(at52.transitMs, 'górowanie 52,0°N'))
  })

  it('bez obniżania na 54,83°N: „brak okna przy progu −18°”', () => {
    const result = computeCatalogNight(june({ ...north, settings: { autoLowerThreshold: false } }), SIX)
    expect(result.darkness).toEqual({ kind: 'none', thresholdDeg: -18 })
    expect(result.objects.map((object) => object.darkness)).toEqual(SIX.map(() => ({ kind: 'none', thresholdDeg: -18 })))
  })
})

describe('P12 noc 21/22.06.2026 na 52,0°N bez obniżania [T6]', () => {
  it('P12: wyłączone obniżanie → „brak okna przy progu −18°” w każdym wyniku', () => {
    const result = computeCatalogNight(june({ settings: { autoLowerThreshold: false } }), SIX)
    expect(result.darkness).toEqual({ kind: 'none', thresholdDeg: -18 })
    for (const object of result.objects) {
      expect(object.darkness).toEqual({ kind: 'none', thresholdDeg: -18 })
      expect(object.effectiveMinutes).toBeNull()
      expect(object.highest).toBeNull()
    }
  })

  it('bez okna górowanie nadal jest podane: NGC 7000 góruje w nocy', () => {
    const { objects } = computeCatalogNight(june({ settings: { autoLowerThreshold: false } }), [NGC7000])
    const transit = present(summaryOf(objects, NGC7000.uid).transitMs, 'górowanie NGC 7000')
    expect(transit).toBeGreaterThan(at('2026-06-21 21:30', 'CEST'))
    expect(transit).toBeLessThan(at('2026-06-22 04:00', 'CEST'))
  })
})
