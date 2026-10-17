// P1–P9: widoczność obiektów katalogu w noc 16/17.10.2026 na 52,0°N, 19,0°E (T4, T7, T9, T11).
import { describe, expect, it } from 'vitest'
import { DEMO_LOCATION } from '../../../src/data/demo'
import {
  computeCatalogNight,
  meridianFlipMs,
  prepareCatalogNight,
  summarizeObject,
  type CatalogTarget,
  type ObjectNightSummary,
} from '../../../src/services/catalogNight'
import { MINUTE_MS, at, expectSameMinute, expectWithin } from '../../../src/test/fixtures'
import type { DsoObject, Mount } from '../../../src/types'
import {
  M101,
  M31,
  M42,
  M45,
  NGC7000,
  IC1396,
  T9_OBJECTS,
  params,
  present,
  summaryOf,
  windowOf,
  type ParamsPatch,
} from './helpers'

const GEM_10: Mount = { type: 'gem', flipMinutesAfterMeridian: 10 }

/** Obiekty testowe spoza katalogu (współrzędne J2000). */
const POLAR: CatalogTarget = { uid: 'test-polar-0h', raDeg: 0, decDeg: 89 }
const POLAR_6H: CatalogTarget = { uid: 'test-polar-6h', raDeg: 90, decDeg: 89 }
const SOUTH: CatalogTarget = { uid: 'test-south-0h', raDeg: 0, decDeg: -60 }
const SOUTH_12H: CatalogTarget = { uid: 'test-south-12h', raDeg: 180, decDeg: -60 }
/** RA 20h06m, +40°: góruje ok. 19:10 CEST, czyli na osi nocy, ale przed początkiem okna (19:40). */
const EARLY: CatalogTarget = { uid: 'test-early', raDeg: 301.5, decDeg: 40 }
/** RA 7h28m, +40°: góruje ok. 06:31 CEST 17.10, czyli na osi nocy (do 08:12), ale po końcu okna (05:19). */
const RISING: CatalogTarget = { uid: 'test-rising', raDeg: 112, decDeg: 40 }
/**
 * RA 10h00m, +40°: góruje ok. 09:02 CEST 17.10, po końcu osi nocy (08:12), czyli w dzień.
 * Na początku okna jest ok. 3,7° nad horyzontem, opada do dolnej kulminacji ok. 21:04 CEST (ok. +1,9°), potem rośnie do końca okna.
 */
const RISING_DAY: CatalogTarget = { uid: 'test-rising-day', raDeg: 150, decDeg: 40 }

/*
 * Granice osi nocy 16/17.10: zachód 17:47, wschód 07:12 CEST, więc oś 16:47 CEST 16.10 – 08:12 CEST 17.10 (t₀ = zachód − 1 h).
 * Górowania z kotwicy: M 31 (RA 0h42,7m) góruje o 23:46 CEST; 1° RA to ok. 4 min (dokładnie 3,989 min czasu słonecznego).
 */
/** RA 8h40m, +40°: góruje ok. 07:43 CEST 17.10 (07:42:46), po wschodzie (07:12), ale przed końcem osi (08:12), więc w nocy. */
const AXIS_END_IN: CatalogTarget = { uid: 'test-axis-end-in', raDeg: 130, decDeg: 40 }
/** RA 9h36m, +40°: góruje ok. 08:38 CEST 17.10, po końcu osi (08:12), czyli w dzień. */
const AXIS_END_OUT: CatalogTarget = { uid: 'test-axis-end-out', raDeg: 144, decDeg: 40 }
/** RA 17h20m, +40°: góruje ok. 16:24 CEST 16.10, przed t₀ (16:47); następne górowanie (ok. 16:20 CEST 17.10) wypada po końcu osi. */
const BEFORE_T0: CatalogTarget = { uid: 'test-before-t0', raDeg: 260, decDeg: 40 }
/** RA 18h00m, +40°: góruje ok. 17:04 CEST 16.10, po t₀ (16:47), ale przed zachodem (17:47), więc w nocy. */
const AFTER_T0: CatalogTarget = { uid: 'test-after-t0', raDeg: 270, decDeg: 40 }

/** Podsumowanie jednego obiektu przy parametrach z przykładów zmienionych przez `patch`. */
function summary(target: CatalogTarget, patch: ParamsPatch = {}): ObjectNightSummary {
  return summaryOf(computeCatalogNight(params(patch), [target]).objects, target.uid)
}

function minutesOf(target: CatalogTarget, patch: ParamsPatch = {}): number {
  return present(summary(target, patch).effectiveMinutes, `czas efektywny ${target.uid}`)
}

/** Czas efektywny z T9 (krok 1 min). */
const T9_MINUTES: readonly (readonly [string, DsoObject, number])[] = [
  ['M 31', M31, 9 * 60 + 39],
  ['IC 1396', IC1396, 9 * 60 + 2],
  ['M 45', M45, 7 * 60 + 14],
  ['NGC 7000', NGC7000, 6 * 60 + 50],
  ['M 42', M42, 2 * 60 + 3],
]

describe('P1, P2 czas efektywny pięciu obiektów z T9 [AC1]', () => {
  it.each(T9_MINUTES)('P1: %s przy kroku 5 min (±5 min)', (_, object, minutes) => {
    const { objects } = computeCatalogNight(params({ settings: { catalogStepMin: 5 } }), T9_OBJECTS)
    expectWithin(present(summaryOf(objects, object.uid).effectiveMinutes, 'czas efektywny'), minutes, 5)
  })

  it.each(T9_MINUTES)('P2: %s przy kroku 1 min (±1 min)', (_, object, minutes) => {
    const { objects } = computeCatalogNight(params({ settings: { catalogStepMin: 1 } }), T9_OBJECTS)
    expectWithin(present(summaryOf(objects, object.uid).effectiveMinutes, 'czas efektywny'), minutes, 1)
  })

  it.each(T9_MINUTES)('%s przy kroku 10 min (±10 min)', (_, object, minutes) => {
    expectWithin(minutesOf(object, { settings: { catalogStepMin: 10 } }), minutes, 10)
  })

  it('krok katalogu z parametrów: M 42 przy kroku 30 min liczy się od próbki 03:40 do końca okna, 1 h 39 min (±1 min)', () => {
    // Próbki co 30 min od 19:40; M 42 przekracza 30° ok. 03:16, więc próbka 03:10 jest za nisko,
    // a liczą się próbki 03:40, 04:10, 04:40 (po 30 min) i 05:10 (przycięta do 05:19): 99 min.
    expectWithin(minutesOf(M42, { settings: { catalogStepMin: 30 } }), 60 + 39, 1)
  })
})

describe('P3 stan nocy w każdym wyniku [T4]', () => {
  it('P3: każdy wynik podaje próg −18° bez obniżenia i okno 19:40–05:19 CEST (±1 min)', () => {
    const result = computeCatalogNight(params(), [...T9_OBJECTS, M101])
    expect(result.objects).toHaveLength(6)
    for (const darkness of [result.darkness, ...result.objects.map((object) => object.darkness)]) {
      expect(darkness).toMatchObject({ kind: 'window', thresholdDeg: -18, lowered: false })
      const window = windowOf(darkness)
      expectSameMinute(window.startMs, at('2026-10-16 19:40', 'CEST'))
      expectSameMinute(window.endMs, at('2026-10-17 05:19', 'CEST'))
    }
  })

  it('pusta lista obiektów: brak wyników, ale stan nocy jest podany', () => {
    const result = computeCatalogNight(params(), [])
    expect(result.objects).toEqual([])
    expect(result.darkness).toMatchObject({ kind: 'window', thresholdDeg: -18, lowered: false })
  })

  it('próg −15° bez obniżania: okno zaczyna się wcześniej niż przy −18° i kończy później', () => {
    const at18 = windowOf(computeCatalogNight(params(), []).darkness)
    const result = computeCatalogNight(params({ settings: { darknessThresholdDeg: -15, autoLowerThreshold: false } }), [M31])
    expect(result.darkness).toMatchObject({ kind: 'window', thresholdDeg: -15, lowered: false })
    const at15 = windowOf(result.darkness)
    expect(at15.startMs).toBeLessThan(at18.startMs)
    expect(at15.endMs).toBeGreaterThan(at18.endMs)
    expect(result.objects[0].darkness).toEqual(result.darkness)
  })
})

describe('P4 górowanie i najwyższe położenie [T7]', () => {
  const TRANSITS: readonly (readonly [string, string, DsoObject])[] = [
    ['NGC 7000', '2026-10-16 20:03', NGC7000],
    ['IC 1396', '2026-10-16 20:42', IC1396],
    ['M 31', '2026-10-16 23:46', M31],
    ['M 45', '2026-10-17 02:50', M45],
    ['M 42', '2026-10-17 04:38', M42],
  ]

  it.each(TRANSITS)('P4: %s góruje o %s CEST (±1 min)', (_, local, object) => {
    const { objects } = computeCatalogNight(params(), T9_OBJECTS)
    expectSameMinute(present(summaryOf(objects, object.uid).transitMs, 'górowanie'), at(local, 'CEST'))
  })

  it('P4: M 31 jest najwyżej w górowaniu: 79,42° (±0,01°)', () => {
    const m31 = summary(M31)
    const highest = present(m31.highest, 'najwyższe położenie')
    expect(highest.timeMs).toBe(present(m31.transitMs, 'górowanie'))
    expectWithin(highest.altDeg, 79.42, 0.01)
  })

  it.each(TRANSITS)('%s góruje w oknie ciemności, więc najwyższe położenie przypada na górowanie', (_, __, object) => {
    const result = summary(object)
    expect(present(result.highest, 'najwyższe położenie').timeMs).toBe(present(result.transitMs, 'górowanie'))
  })

  it('górowanie na osi nocy, ale przed początkiem okna, jest podane; najwyższe położenie przypada na początek okna', () => {
    const result = summary(EARLY)
    const transit = present(result.transitMs, 'górowanie')
    const window = windowOf(result.darkness)
    expectSameMinute(transit, at('2026-10-16 19:10', 'CEST'))
    expect(transit).toBeLessThan(window.startMs)
    expect(present(result.highest, 'najwyższe położenie').timeMs).toBe(window.startMs)
  })

  it('górowanie na osi nocy, ale po końcu okna (06:31 CEST), jest podane; najwyższe położenie przypada na koniec okna', () => {
    const result = summary(RISING)
    const transit = present(result.transitMs, 'górowanie')
    const window = windowOf(result.darkness)
    expectSameMinute(transit, at('2026-10-17 06:31', 'CEST'))
    expect(transit).toBeGreaterThan(window.endMs)
    expect(transit).toBeLessThan(at('2026-10-17 08:12', 'CEST'))
    const highest = present(result.highest, 'najwyższe położenie')
    expect(highest.timeMs).toBe(window.endMs)
    // Na końcu okna (ok. 72 min przed górowaniem, kąt godzinny ok. −18°):
    // sin h = sin 52° sin 40° + cos 52° cos 40° cos 18° ≈ 0,955 → h ≈ 72,8°, mniej niż w górowaniu (90° − 52° + 40° = 78°).
    expect(highest.altDeg).toBeLessThan(78)
    expectWithin(highest.altDeg, 72.8, 0.5)
  })

  it('obiekt górujący w dzień i wznoszący się od dolnej kulminacji (ok. 21:04) do rana: brak górowania w nocy, najwyższe położenie na końcu okna', () => {
    const result = summary(RISING_DAY)
    expect(result.transitMs).toBeNull()
    const window = windowOf(result.darkness)
    const highest = present(result.highest, 'najwyższe położenie')
    expect(highest.timeMs).toBe(window.endMs)
    // Na końcu okna (ok. 3 h 43 min przed górowaniem o 09:02, kąt godzinny ok. −56°):
    // sin h = sin 52° sin 40° + cos 52° cos 40° cos 56° ≈ 0,770 → h ≈ 50,4°; na początku okna obiekt jest tuż nad horyzontem.
    expectWithin(highest.altDeg, 50.4, 0.5)
  })
})

describe('P5 obiekt górujący w dzień', () => {
  it('P5: M 101 nie ma górowania w nocy, a najwyższe położenie w oknie przypada na jego początek, 19:40 CEST (±1 min)', () => {
    const m101 = summary(M101)
    expect(m101.transitMs).toBeNull()
    const highest = present(m101.highest, 'najwyższe położenie')
    expectSameMinute(highest.timeMs, at('2026-10-16 19:40', 'CEST'))
    expect(highest.timeMs).toBe(windowOf(m101.darkness).startMs)
  })
})

describe('granice osi nocy dla górowania: t₀ = zachód − 1 h (16:47), koniec osi = wschód + 1 h (08:12 CEST)', () => {
  it('górowanie po wschodzie, ale przed końcem osi (ok. 07:43 CEST) jest podane; najwyższe położenie na końcu okna', () => {
    const result = summary(AXIS_END_IN)
    const transit = present(result.transitMs, 'górowanie')
    const window = windowOf(result.darkness)
    expectSameMinute(transit, at('2026-10-17 07:43', 'CEST'))
    expect(transit).toBeGreaterThan(at('2026-10-17 07:12', 'CEST'))
    expect(transit).toBeLessThan(at('2026-10-17 08:12', 'CEST'))
    const highest = present(result.highest, 'najwyższe położenie')
    expect(highest.timeMs).toBe(window.endMs)
    // Na końcu okna (05:19, ok. 2 h 23 min przed górowaniem, kąt godzinny ok. −35,9°):
    // sin h = sin 52° sin 40° + cos 52° cos 40° cos 35,9° ≈ 0,888 → h ≈ 62,6°.
    expectWithin(highest.altDeg, 62.6, 0.5)
  })

  it('górowanie po końcu osi (ok. 08:38 CEST, 26 min po 08:12) to górowanie w dzień: brak górowania, najwyższe położenie na końcu okna', () => {
    const result = summary(AXIS_END_OUT)
    expect(result.transitMs).toBeNull()
    const window = windowOf(result.darkness)
    const highest = present(result.highest, 'najwyższe położenie')
    expect(highest.timeMs).toBe(window.endMs)
    // Na końcu okna (05:19, ok. 3 h 19 min przed górowaniem, kąt godzinny ok. −49,9°):
    // sin h = sin 52° sin 40° + cos 52° cos 40° cos 49,9° ≈ 0,810 → h ≈ 54,1°.
    expectWithin(highest.altDeg, 54.1, 0.5)
  })

  it('górowanie przed t₀ (ok. 16:24 CEST, 23 min przed 16:47): następne wypada po końcu osi, więc brak górowania; najwyższe położenie na początku okna', () => {
    const result = summary(BEFORE_T0)
    expect(result.transitMs).toBeNull()
    const window = windowOf(result.darkness)
    const highest = present(result.highest, 'najwyższe położenie')
    expect(highest.timeMs).toBe(window.startMs)
    // Na początku okna (19:40, ok. 3 h 16 min po górowaniu, kąt godzinny ok. +49,1°):
    // sin h = sin 52° sin 40° + cos 52° cos 40° cos 49,1° ≈ 0,815 → h ≈ 54,6°; na końcu okna obiekt jest tuż nad horyzontem.
    expectWithin(highest.altDeg, 54.6, 0.5)
  })

  it('górowanie po t₀, ale przed zachodem (ok. 17:04 CEST), jest podane; najwyższe położenie na początku okna', () => {
    const result = summary(AFTER_T0)
    const transit = present(result.transitMs, 'górowanie')
    const window = windowOf(result.darkness)
    expectSameMinute(transit, at('2026-10-16 17:04', 'CEST'))
    expect(transit).toBeLessThan(at('2026-10-16 17:47', 'CEST'))
    expect(transit).toBeLessThan(window.startMs)
    const highest = present(result.highest, 'najwyższe położenie')
    expect(highest.timeMs).toBe(window.startMs)
    // Na początku okna (19:40, ok. 2 h 36 min po górowaniu, kąt godzinny ok. +39,1°):
    // sin h = sin 52° sin 40° + cos 52° cos 40° cos 39,1° ≈ 0,873 → h ≈ 60,8°.
    expectWithin(highest.altDeg, 60.8, 0.5)
  })
})

describe('P6 przerzut przez południk [Z10]', () => {
  it('P6: GEM z przerzutem 10 min po południku: M 31 23:56 CEST (±1 min)', () => {
    expectSameMinute(present(meridianFlipMs(summary(M31).transitMs, GEM_10), 'przerzut'), at('2026-10-16 23:56', 'CEST'))
  })

  it('P6: montaż widłowy → brak przerzutu', () => {
    expect(meridianFlipMs(summary(M31).transitMs, { type: 'fork', flipMinutesAfterMeridian: 10 })).toBeNull()
  })

  it('P6: M 101 (góruje w dzień) → brak przerzutu', () => {
    expect(meridianFlipMs(summary(M101).transitMs, GEM_10)).toBeNull()
  })

  it('montaż alt-az → brak przerzutu', () => {
    expect(meridianFlipMs(summary(M31).transitMs, { type: 'altaz', flipMinutesAfterMeridian: 10 })).toBeNull()
  })

  it('GEM z przerzutem 20 min: M 45 o górowaniu + 20 min, czyli 03:10 CEST (±1 min)', () => {
    const transit = present(summary(M45).transitMs, 'górowanie')
    const flip = present(meridianFlipMs(transit, { type: 'gem', flipMinutesAfterMeridian: 20 }), 'przerzut')
    expect(flip).toBe(transit + 20 * MINUTE_MS)
    expectSameMinute(flip, at('2026-10-17 03:10', 'CEST'))
  })

  it('przerzut z górowania podanego wprost: 23:46 CEST + 10 min = 23:56 CEST; GEM bez opóźnienia = górowanie', () => {
    const transit = at('2026-10-16 23:46', 'CEST')
    expect(meridianFlipMs(transit, GEM_10)).toBe(at('2026-10-16 23:56', 'CEST'))
    expect(meridianFlipMs(transit, { type: 'gem', flipMinutesAfterMeridian: 0 })).toBe(transit)
    expect(meridianFlipMs(null, GEM_10)).toBeNull()
  })
})

describe('P7 obiekt przy biegunie', () => {
  it.each([POLAR, POLAR_6H])('P7: deklinacja +89° ($uid) widoczna przez całe okno: 9 h 39 min (±1 min) przy kroku 5 min', (target) => {
    expectWithin(minutesOf(target, { settings: { catalogStepMin: 5 } }), 9 * 60 + 39, 1)
  })

  it.each([7, 30])('ostatni przedział przycięty do końca okna: obiekt przy biegunie przy kroku %i min nadal 9 h 39 min (±1 min)', (step) => {
    expectWithin(minutesOf(POLAR, { settings: { catalogStepMin: step } }), 9 * 60 + 39, 1)
  })

  it('obiekt przy biegunie: czas efektywny równy długości okna ciemności', () => {
    const result = summary(POLAR)
    const window = windowOf(result.darkness)
    expectWithin(present(result.effectiveMinutes, 'czas efektywny'), (window.endMs - window.startMs) / MINUTE_MS, 1)
  })
})

describe('P8 obiekt, który nigdy nie wschodzi', () => {
  it.each([SOUTH, SOUTH_12H])('P8: deklinacja −60° ($uid): czas efektywny 0 min (to nie „brak okna”), najwyżej poniżej 0°', (target) => {
    const result = summary(target)
    expect(result.darkness.kind).toBe('window')
    expect(result.effectiveMinutes).toBe(0)
    expect(present(result.highest, 'najwyższe położenie').altDeg).toBeLessThan(0)
  })

  it('deklinacja −60° górująca w oknie (RA 0h): najwyżej ok. −22° (90° − 52° − 60°)', () => {
    expectWithin(present(summary(SOUTH).highest, 'najwyższe położenie').altDeg, -22, 0.5)
  })
})

describe('P9 horyzont lokalny w czasie efektywnym [T11]', () => {
  it('P9: M 42 przy h_min 20° i kroku 1 min, horyzont płaski: 3 h 49 min (±1 min)', () => {
    expectWithin(minutesOf(M42, { settings: { minAltitudeDeg: 20, catalogStepMin: 1 } }), 3 * 60 + 49, 1)
  })

  it('P9: M 42 przy h_min 20° i kroku 1 min, horyzont demonstracyjny z 6.4: 2 h 22 min (±1 min)', () => {
    const patch: ParamsPatch = { location: DEMO_LOCATION, settings: { minAltitudeDeg: 20, catalogStepMin: 1 } }
    expectWithin(minutesOf(M42, patch), 2 * 60 + 22, 1)
  })

  it('ściana 60° na azymutach 90–180°, h_min 30°, krok 1 min: M 31 9 h 20 min, M 42 0 h 39 min, M 45 3 h 34 min (±1 min)', () => {
    const wall = [
      { azDeg: 0, altDeg: 0 },
      { azDeg: 89, altDeg: 0 },
      { azDeg: 90, altDeg: 60 },
      { azDeg: 180, altDeg: 60 },
      { azDeg: 181, altDeg: 0 },
    ]
    const { objects } = computeCatalogNight(params({ location: { horizon: wall }, settings: { catalogStepMin: 1 } }), [M31, M42, M45])
    expectWithin(present(summaryOf(objects, M31.uid).effectiveMinutes, 'M 31'), 9 * 60 + 20, 1)
    expectWithin(present(summaryOf(objects, M42.uid).effectiveMinutes, 'M 42'), 39, 1)
    expectWithin(present(summaryOf(objects, M45.uid).effectiveMinutes, 'M 45'), 3 * 60 + 34, 1)
  })
})

describe('przygotowanie nocy raz i podsumowanie obiektu', () => {
  it('podsumowanie obiektu w przygotowanej nocy jest takie samo jak wynik dla katalogu', () => {
    const night = prepareCatalogNight(params())
    const { objects } = computeCatalogNight(params(), [M31, M101, SOUTH])
    expect(summarizeObject(night, M31)).toEqual(summaryOf(objects, M31.uid))
    expect(summarizeObject(night, M101)).toEqual(summaryOf(objects, M101.uid))
    expect(summarizeObject(night, SOUTH)).toEqual(summaryOf(objects, SOUTH.uid))
  })

  it('wyniki w kolejności obiektów wejścia, z uid; wynik obiektu nie zależy od pozostałych', () => {
    const forward = computeCatalogNight(params(), T9_OBJECTS).objects
    const reversed = computeCatalogNight(params(), [...T9_OBJECTS].reverse()).objects
    expect(forward.map((object) => object.uid)).toEqual(T9_OBJECTS.map((object) => object.uid))
    expect(reversed.map((object) => object.uid)).toEqual([...T9_OBJECTS].reverse().map((object) => object.uid))
    expect(reversed).toEqual([...forward].reverse())
  })
})
