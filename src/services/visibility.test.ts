import { Body, DefineStar, Observer, SearchHourAngle } from 'astronomy-engine'
import { describe, expect, it } from 'vitest'
import {
  DEMO_HORIZON,
  HOUR_MS,
  M31,
  MINUTE_MS,
  SITE,
  TIME_ZONE,
  at,
  defined,
  dms,
  expectSameMinute,
  expectWithin,
  hms,
} from '../test/fixtures'
import {
  angularSeparationDeg,
  bodyPosition,
  horizontalAt,
  moonIlluminatedFraction,
  precessionMatrix,
  riseSetMs,
  toEquatorOfDate,
} from './astroMath'
import { formatLocalTime } from './time'
import {
  darknessWindow,
  effectiveMinutes,
  highestPoint,
  meridianFlipMs,
  nightRange,
  nightSun,
  sampleGrid,
  sunBelowAltitude,
  sunLowestPoint,
  transitMs,
  type Darkness,
  type TimeRange,
} from './visibility'

function windowOf(darkness: Darkness): TimeRange {
  if (darkness.kind !== 'window') throw new Error(`Brak okna przy progu ${darkness.thresholdDeg}°`)
  return darkness.window
}

const OCT_16 = nightRange('2026-10-16', TIME_ZONE)
const OCT_24 = nightRange('2026-10-24', TIME_ZONE)
const JUN_21 = nightRange('2026-06-21', TIME_ZONE)

describe('noc D', () => {
  it('trwa od lokalnego południa D do lokalnego południa D+1 (25 h przy zmianie czasu)', () => {
    expect(OCT_24).toEqual({ startMs: Date.UTC(2026, 9, 24, 10), endMs: Date.UTC(2026, 9, 25, 11) })
  })
})

describe('T3 minimalna wysokość Słońca, noc 21/22.06.2026, 19°E', () => {
  it.each([
    [49, -17.57],
    [52, -14.57],
    [54.5, -12.07],
    [54.83, -11.74],
  ])('%s°N: %s°', (latDeg, expected) => {
    expectWithin(sunLowestPoint({ ...SITE, latDeg }, JUN_21).altDeg, expected, 0.01)
  })

  it('54,83°N: najniżej o 00:46 CEST', () => {
    expectSameMinute(sunLowestPoint({ ...SITE, latDeg: 54.83 }, JUN_21).timeMs, at('2026-06-22 00:46', 'CEST'))
  })
})

describe('T4 noc 16/17.10.2026', () => {
  it('zachód Słońca 17:47 CEST, wschód 07:12 CEST', () => {
    const sun = nightSun(SITE, OCT_16)
    expectSameMinute(defined(sun.sunsetMs), at('2026-10-16 17:47', 'CEST'))
    expectSameMinute(defined(sun.sunriseMs), at('2026-10-17 07:12', 'CEST'))
  })

  it('Słońce schodzi przez −6° o 18:22 i przez −12° o 19:01 CEST', () => {
    expectSameMinute(defined(sunBelowAltitude(SITE, OCT_16, -6)).startMs, at('2026-10-16 18:22', 'CEST'))
    expectSameMinute(defined(sunBelowAltitude(SITE, OCT_16, -12)).startMs, at('2026-10-16 19:01', 'CEST'))
  })

  it('noc astronomiczna od 19:40 do 05:19 CEST (9 h 39 min)', () => {
    const darkness = darknessWindow(SITE, OCT_16, -18, true)
    expect(darkness).toMatchObject({ kind: 'window', thresholdDeg: -18, lowered: false })
    const window = windowOf(darkness)
    expectSameMinute(window.startMs, at('2026-10-16 19:40', 'CEST'))
    expectSameMinute(window.endMs, at('2026-10-17 05:19', 'CEST'))
    expectWithin((window.endMs - window.startMs) / MINUTE_MS, 9 * 60 + 39, 1)
  })

  it('Księżyc zachodzi 16.10 o 20:25 CEST', () => {
    const moonset = riseSetMs('moon', SITE, 'set', OCT_16.startMs, OCT_16.endMs)
    expectSameMinute(defined(moonset), at('2026-10-16 20:25', 'CEST'))
  })

  it('o 00:00 CEST 17.10 Księżyc: oświetlenie 33,8%, wysokość −27,7°', () => {
    const midnight = at('2026-10-17 00:00', 'CEST')
    expectWithin(moonIlluminatedFraction(midnight) * 100, 33.8, 0.05)
    expectWithin(bodyPosition('moon', SITE, midnight).altDeg, -27.7, 0.05)
  })
})

describe('T5 noc 24/25.10.2026 (zmiana czasu)', () => {
  it('zachód Słońca 17:31 CEST, wschód 06:26 CET', () => {
    const sun = nightSun(SITE, OCT_24)
    expectSameMinute(defined(sun.sunsetMs), at('2026-10-24 17:31', 'CEST'))
    expectSameMinute(defined(sun.sunriseMs), at('2026-10-25 06:26', 'CET'))
  })

  it('ciemność −18° od 19:24 CEST do 04:32 CET', () => {
    const window = windowOf(darknessWindow(SITE, OCT_24, -18, true))
    expectSameMinute(window.startMs, at('2026-10-24 19:24', 'CEST'))
    expectSameMinute(window.endMs, at('2026-10-25 04:32', 'CET'))
  })

  it('Księżyc nad horyzontem całą noc: wschód 16:28 CEST, zachód 05:29 CET', () => {
    const moonrise = defined(riseSetMs('moon', SITE, 'rise', OCT_24.startMs, OCT_24.endMs))
    const moonset = defined(riseSetMs('moon', SITE, 'set', OCT_24.startMs, OCT_24.endMs))
    expectSameMinute(moonrise, at('2026-10-24 16:28', 'CEST'))
    expectSameMinute(moonset, at('2026-10-25 05:29', 'CET'))
    const window = windowOf(darknessWindow(SITE, OCT_24, -18, true))
    expect(moonrise).toBeLessThan(window.startMs)
    expect(moonset).toBeGreaterThan(window.endMs)
  })

  it('oświetlenie Księżyca 98,0% o 01:00 CEST', () => {
    expectWithin(moonIlluminatedFraction(at('2026-10-25 01:00', 'CEST')) * 100, 98, 0.05)
  })

  it('oś wykresu (zachód − 1 h … wschód + 1 h) ma powtórzoną godzinę oznaczoną CEST i CET', () => {
    const { axis } = nightSun(SITE, OCT_24)
    const labels: string[] = []
    for (let t = Math.ceil(axis.startMs / HOUR_MS) * HOUR_MS; t <= axis.endMs; t += HOUR_MS) {
      labels.push(formatLocalTime(t, TIME_ZONE))
    }
    expect(labels).toContain('02:00 CEST')
    expect(labels).toContain('02:00 CET')
  })
})

describe('T6 okna ciemności, noc 21/22.06.2026', () => {
  it('52°N: brak okna przy −18° i przy −15°', () => {
    expect(sunBelowAltitude(SITE, JUN_21, -18)).toBeNull()
    expect(sunBelowAltitude(SITE, JUN_21, -15)).toBeNull()
  })

  it('52°N: próg spada do −12°, okno 23:15–02:16 CEST (3 h 01 min)', () => {
    const darkness = darknessWindow(SITE, JUN_21, -18, true)
    expect(darkness).toMatchObject({ kind: 'window', thresholdDeg: -12, lowered: true })
    const window = windowOf(darkness)
    expectSameMinute(window.startMs, at('2026-06-21 23:15', 'CEST'))
    expectSameMinute(window.endMs, at('2026-06-22 02:16', 'CEST'))
    expectWithin((window.endMs - window.startMs) / MINUTE_MS, 3 * 60 + 1, 1)
  })

  it('52°N bez automatycznego obniżania: brak okna przy −18°', () => {
    expect(darknessWindow(SITE, JUN_21, -18, false)).toEqual({ kind: 'none', thresholdDeg: -18 })
  })

  it('54,83°N: brak okna nawet przy −12°', () => {
    expect(darknessWindow({ ...SITE, latDeg: 54.83 }, JUN_21, -18, true)).toEqual({ kind: 'none', thresholdDeg: -12 })
  })
})

describe('T7 M 31, noc 16/17.10.2026', () => {
  // Wartości T7 dotyczą chwili 00:00 CEST 17.10; przesunięcie wynosi wtedy 0,31352°.
  const midnight = at('2026-10-17 00:00', 'CEST')
  const ofDate = toEquatorOfDate(M31, precessionMatrix(midnight))
  const { axis } = nightSun(SITE, OCT_16)
  const transit = transitMs(ofDate.raDeg, SITE.lonDegEast, axis.startMs)

  it('przesunięcie J2000 → równik i równonoc daty: 0,314°', () => {
    expectWithin(angularSeparationDeg(M31, ofDate), 0.314, 0.0005)
  })

  it('górowanie 23:46 CEST, h_max 79,42°', () => {
    expectSameMinute(transit, at('2026-10-16 23:46', 'CEST'))
    const window = windowOf(darknessWindow(SITE, OCT_16, -18, true))
    const highest = highestPoint(ofDate, SITE, window, transit)
    expect(highest.timeMs).toBe(transit)
    expectWithin(highest.altDeg, 79.42, 0.01)
  })

  it('górowanie analityczne zgodne z referencją DefineStar + SearchHourAngle', () => {
    DefineStar(Body.Star1, M31.raDeg / 15, M31.decDeg, 1000)
    const observer = new Observer(SITE.latDeg, SITE.lonDegEast, SITE.elevationM)
    const reference = SearchHourAngle(Body.Star1, observer, 0, new Date(axis.startMs))
    expectSameMinute(transit, reference.time.date.getTime())
  })

  it('o 00:00 CEST 17.10: h = 79,17°, az = 193,58°', () => {
    const position = horizontalAt(ofDate, SITE, midnight)
    expectWithin(position.altDeg, 79.17, 0.01)
    expectWithin(position.azDeg, 193.58, 0.05)
  })

  it('separacja od Księżyca (topocentrycznie) 112,82°', () => {
    expectWithin(angularSeparationDeg(ofDate, bodyPosition('moon', SITE, midnight)), 112.82, 0.01)
  })
})

describe('najwyższe położenie, gdy obiekt góruje w dzień', () => {
  it('M 101 w nocy 16/17.10.2026: maksimum na brzegu okna (wieczorem)', () => {
    const m101 = toEquatorOfDate({ raDeg: hms('14:03:12.6'), decDeg: dms('+54:20:57') }, precessionMatrix(OCT_16.startMs))
    const { axis } = nightSun(SITE, OCT_16)
    const transit = transitMs(m101.raDeg, SITE.lonDegEast, axis.startMs)
    expect(transit).toBeGreaterThan(axis.endMs)
    const window = windowOf(darknessWindow(SITE, OCT_16, -18, true))
    expect(highestPoint(m101, SITE, window, transit).timeMs).toBe(window.startMs)
  })
})

describe('przerzut przez południk [Z10]', () => {
  it('montaż GEM: górowanie + 10 min; inne montaże bez przerzutu', () => {
    const transit = at('2026-10-16 23:46', 'CEST')
    expect(meridianFlipMs(transit, { type: 'gem', flipMinutesAfterMeridian: 10 })).toBe(at('2026-10-16 23:56', 'CEST'))
    expect(meridianFlipMs(transit, { type: 'fork', flipMinutesAfterMeridian: 10 })).toBeNull()
  })
})

describe('siatka próbek okna (sekcja 4)', () => {
  it('zaczyna się na początku okna, a ostatni przedział jest przycięty do końca okna', () => {
    const grid = sampleGrid({ startMs: 0, endMs: 12 * MINUTE_MS }, 5, SITE.lonDegEast)
    expect(grid.timesMs).toEqual([0, 5 * MINUTE_MS, 10 * MINUTE_MS])
    expect(grid.durationsMs).toEqual([5 * MINUTE_MS, 5 * MINUTE_MS, 2 * MINUTE_MS])
  })
})

const T9_OBJECTS = [
  ['M 31', '00:42:44.3', '+41:16:09', 9 * 60 + 39],
  ['NGC 7000', '20:59:17', '+44:31:44', 6 * 60 + 50],
  ['IC 1396', '21:39:06', '+57:30:00', 9 * 60 + 2],
  ['M 42', '05:35:17.3', '-05:23:28', 2 * 60 + 3],
  ['M 45', '03:47:24', '+24:07:00', 7 * 60 + 14],
] as const

describe('T9 czas efektywny, noc 16/17.10.2026, próg −18°, h_min 30°, horyzont płaski', () => {
  const window = windowOf(darknessWindow(SITE, OCT_16, -18, true))
  const matrix = precessionMatrix(window.startMs)
  const target = (ra: string, dec: string) => toEquatorOfDate({ raDeg: hms(ra), decDeg: dms(dec) }, matrix)

  it.each(T9_OBJECTS)('%s: krok 1 min', (_, ra, dec, minutes) => {
    const grid = sampleGrid(window, 1, SITE.lonDegEast)
    expectWithin(effectiveMinutes(target(ra, dec), SITE, grid, 30, []), minutes, 1)
  })

  it.each(T9_OBJECTS)('%s: krok 5 min (±5 min)', (_, ra, dec, minutes) => {
    const grid = sampleGrid(window, 5, SITE.lonDegEast)
    expectWithin(effectiveMinutes(target(ra, dec), SITE, grid, 30, []), minutes, 5)
  })
})

describe('T11 horyzont w czasie efektywnym, noc 16/17.10.2026, krok 1 min', () => {
  const window = windowOf(darknessWindow(SITE, OCT_16, -18, true))
  const matrix = precessionMatrix(window.startMs)
  const grid = sampleGrid(window, 1, SITE.lonDegEast)
  const m42 = toEquatorOfDate({ raDeg: hms('05:35:17.3'), decDeg: dms('-05:23:28') }, matrix)
  const m45 = toEquatorOfDate({ raDeg: hms('03:47:24'), decDeg: dms('+24:07:00') }, matrix)
  const m31 = toEquatorOfDate(M31, matrix)
  const wall = [
    { azDeg: 0, altDeg: 0 },
    { azDeg: 89, altDeg: 0 },
    { azDeg: 90, altDeg: 60 },
    { azDeg: 180, altDeg: 60 },
    { azDeg: 181, altDeg: 0 },
  ]

  it('M 42, h_min 20°: horyzont płaski 3 h 49 min, demonstracyjny 2 h 22 min', () => {
    expectWithin(effectiveMinutes(m42, SITE, grid, 20, []), 3 * 60 + 49, 1)
    expectWithin(effectiveMinutes(m42, SITE, grid, 20, DEMO_HORIZON), 2 * 60 + 22, 1)
  })

  it('ściana 60° na azymutach 90–180°, h_min 30°: M 31 9 h 20 min, M 42 0 h 39 min, M 45 3 h 34 min', () => {
    expectWithin(effectiveMinutes(m31, SITE, grid, 30, wall), 9 * 60 + 20, 1)
    expectWithin(effectiveMinutes(m42, SITE, grid, 30, wall), 39, 1)
    expectWithin(effectiveMinutes(m45, SITE, grid, 30, wall), 3 * 60 + 34, 1)
  })
})
