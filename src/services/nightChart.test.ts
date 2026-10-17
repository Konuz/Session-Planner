import { describe, expect, it } from 'vitest'
import { DEMO_HORIZON, M31, MINUTE_MS, SITE, TIME_ZONE, at, defined, dms, expectSameMinute, expectWithin, hms } from '../test/fixtures'
import type { Mount } from '../types'
import {
  buildNightFrame,
  buildObjectTrack,
  cursorReadout,
  darknessNote,
  defaultCursorMs,
  moonReference,
  trackState,
  type NightFrame,
  type NightSettings,
  type TwilightBand,
} from './nightChart'
import { formatLocalTime } from './time'

const SETTINGS: NightSettings = { darknessThresholdDeg: -18, autoLowerThreshold: true, detailStepMin: 1 }
const GEM: Mount = { type: 'gem', flipMinutesAfterMeridian: 10 }

const OCT_16 = buildNightFrame(SITE, TIME_ZONE, '2026-10-16', SETTINGS)
const OCT_24 = buildNightFrame(SITE, TIME_ZONE, '2026-10-24', SETTINGS)
const JUN_21 = buildNightFrame(SITE, TIME_ZONE, '2026-06-21', SETTINGS)
const JUN_21_NORTH = buildNightFrame({ ...SITE, latDeg: 54.83 }, TIME_ZONE, '2026-06-21', SETTINGS)

function band(frame: NightFrame, name: TwilightBand) {
  return defined(frame.bands.find((segment) => segment.band === name))
}

function windowOf(frame: NightFrame) {
  if (frame.darkness.kind !== 'window') throw new Error('Brak okna ciemności')
  return frame.darkness.window
}

const m42 = { raDeg: hms('05:35:17.3'), decDeg: dms('-05:23:28') }

describe('T4 wykres nocy 16/17.10.2026', () => {
  it('zachód Słońca 17:47 CEST i wschód 07:12 CEST', () => {
    expectSameMinute(defined(OCT_16.sunsetMs), at('2026-10-16 17:47', 'CEST'))
    expectSameMinute(defined(OCT_16.sunriseMs), at('2026-10-17 07:12', 'CEST'))
  })

  it('oś X od zachodu − 1 h (16:47 CEST) do wschodu + 1 h (08:12 CEST)', () => {
    expectSameMinute(OCT_16.axis.startMs, at('2026-10-16 16:47', 'CEST'))
    expectSameMinute(OCT_16.axis.endMs, at('2026-10-17 08:12', 'CEST'))
  })

  it('pasy w kolejności rysowania: dzień, zmierzch cywilny, żeglarski, astronomiczny, noc', () => {
    expect(OCT_16.bands.map((segment) => segment.band)).toEqual(['day', 'civil', 'nautical', 'astronomical', 'night'])
    expect(band(OCT_16, 'day')).toEqual({ band: 'day', ...OCT_16.axis })
  })

  it('granice pasów: zachód 17:47, −6° 18:22, −12° 19:01, noc −18° 19:40–05:19, wschód 07:12 CEST', () => {
    expectSameMinute(band(OCT_16, 'civil').startMs, at('2026-10-16 17:47', 'CEST'))
    expectSameMinute(band(OCT_16, 'civil').endMs, at('2026-10-17 07:12', 'CEST'))
    expectSameMinute(band(OCT_16, 'nautical').startMs, at('2026-10-16 18:22', 'CEST'))
    expectSameMinute(band(OCT_16, 'astronomical').startMs, at('2026-10-16 19:01', 'CEST'))
    expectSameMinute(band(OCT_16, 'night').startMs, at('2026-10-16 19:40', 'CEST'))
    expectSameMinute(band(OCT_16, 'night').endMs, at('2026-10-17 05:19', 'CEST'))
  })

  it('okno ciemności przy progu −18° bez komunikatu o obniżeniu progu', () => {
    expect(OCT_16.darkness).toMatchObject({ kind: 'window', thresholdDeg: -18, lowered: false })
    expect(darknessNote(OCT_16)).toBeNull()
  })

  it('kursor po zmianie nocy: środek okna ciemności', () => {
    const { startMs, endMs } = windowOf(OCT_16)
    expect(defaultCursorMs(OCT_16)).toBe((startMs + endMs) / 2)
  })

  it('Księżyc: zachód 16.10 o 20:25 CEST, bez wschodu w zakresie osi, przybywa', () => {
    expectSameMinute(defined(OCT_16.moon.setMs), at('2026-10-16 20:25', 'CEST'))
    expect(OCT_16.moon.riseMs).toBeNull()
    expect(OCT_16.moon.reference.waxing).toBe(true)
  })

  it('próbki Księżyca obejmują całą oś', () => {
    expect(OCT_16.moon.samples[0].timeMs).toBe(OCT_16.axis.startMs)
    expect(OCT_16.moon.samples.at(-1)?.timeMs).toBe(OCT_16.axis.endMs)
  })
})

describe('T5 wykres nocy 24/25.10.2026 (zmiana czasu)', () => {
  it('etykiety osi mają powtórzoną godzinę 02:00 CEST i 02:00 CET', () => {
    const labels = OCT_24.hourTicksMs.map((timeMs) => formatLocalTime(timeMs, TIME_ZONE))
    expect(labels).toContain('02:00 CEST')
    expect(labels).toContain('02:00 CET')
    expect(labels[0]).toBe('17:00 CEST')
    expect(labels.at(-1)).toBe('07:00 CET')
  })

  it('okno ciemności −18° od 19:24 CEST do 04:32 CET', () => {
    expectSameMinute(windowOf(OCT_24).startMs, at('2026-10-24 19:24', 'CEST'))
    expectSameMinute(windowOf(OCT_24).endMs, at('2026-10-25 04:32', 'CET'))
  })

  it('Księżyc nad horyzontem przez całe okno; zachód 05:29 CET; oświetlenie ≈ 98%', () => {
    const { startMs, endMs } = windowOf(OCT_24)
    const inWindow = OCT_24.moon.samples.filter((sample) => sample.timeMs >= startMs && sample.timeMs <= endMs)
    expect(inWindow.length).toBeGreaterThan(50)
    for (const sample of inWindow) expect(sample.altDeg).toBeGreaterThan(0)
    expect(OCT_24.moon.riseMs).toBeNull()
    expectSameMinute(defined(OCT_24.moon.setMs), at('2026-10-25 05:29', 'CET'))
    expectWithin(OCT_24.moon.reference.illuminatedFraction * 100, 98, 0.5)
  })
})

describe('T3 i T6 noc 21/22.06.2026', () => {
  it('52°N: Słońce najniżej −14,57°, więc jest pas astronomiczny, a nie ma pasa nocy', () => {
    expectWithin(JUN_21.sunLowest.altDeg, -14.57, 0.01)
    expect(JUN_21.bands.map((segment) => segment.band)).toEqual(['day', 'civil', 'nautical', 'astronomical'])
  })

  it('52°N: próg spada do −12°, okno 23:15–02:16 CEST, interfejs pokazuje komunikat', () => {
    expect(JUN_21.darkness).toMatchObject({ kind: 'window', thresholdDeg: -12, lowered: true })
    expectSameMinute(windowOf(JUN_21).startMs, at('2026-06-21 23:15', 'CEST'))
    expectSameMinute(windowOf(JUN_21).endMs, at('2026-06-22 02:16', 'CEST'))
    expect(darknessNote(JUN_21)).toBe('Brak okna przy progu −18°; użyto progu −12°.')
  })

  it('54,83°N: Słońce najniżej −11,74° o 00:46 CEST, bez pasa astronomicznego', () => {
    expectWithin(JUN_21_NORTH.sunLowest.altDeg, -11.74, 0.01)
    expectSameMinute(JUN_21_NORTH.sunLowest.timeMs, at('2026-06-22 00:46', 'CEST'))
    expect(JUN_21_NORTH.bands.map((segment) => segment.band)).toEqual(['day', 'civil', 'nautical'])
  })

  it('54,83°N: stan „brak okna przy −12°”, kursor na lokalnej północy', () => {
    expect(JUN_21_NORTH.darkness).toEqual({ kind: 'none', thresholdDeg: -12 })
    expect(darknessNote(JUN_21_NORTH)).toBe('Brak okna ciemności nawet przy progu −12°.')
    expect(defaultCursorMs(JUN_21_NORTH)).toBe(at('2026-06-22 00:00', 'CEST'))
  })

  it('bez automatycznego obniżania: brak okna przy −18°', () => {
    const frame = buildNightFrame(SITE, TIME_ZONE, '2026-06-21', { ...SETTINGS, autoLowerThreshold: false })
    expect(frame.darkness).toEqual({ kind: 'none', thresholdDeg: -18 })
    expect(darknessNote(frame)).toBe('Brak okna ciemności przy progu −18°.')
  })
})

describe('tor obiektu na wykresie nocy', () => {
  const m31 = buildObjectTrack(OCT_16, M31, { horizon: [], minAltitudeDeg: 30, mount: GEM })

  it('próbki co krok szczegółowy pokrywają całą oś', () => {
    expect(m31.samples[0].timeMs).toBe(OCT_16.axis.startMs)
    expect(m31.samples[1].timeMs - m31.samples[0].timeMs).toBe(MINUTE_MS)
    expect(m31.samples.at(-1)?.timeMs).toBe(OCT_16.axis.endMs)
  })

  it('T7 M 31: górowanie 23:46 CEST na 79,42°, przerzut GEM 10 min później', () => {
    const transit = defined(m31.transit)
    expectSameMinute(transit.timeMs, at('2026-10-16 23:46', 'CEST'))
    expectWithin(transit.altDeg, 79.42, 0.01)
    expect(m31.flipMs).toBe(transit.timeMs + 10 * MINUTE_MS)
  })

  it('montaż bez przerzutu: brak linii przerzutu', () => {
    const fork = buildObjectTrack(OCT_16, M31, { horizon: [], minAltitudeDeg: 30, mount: { ...GEM, type: 'fork' } })
    expect(fork.flipMs).toBeNull()
  })

  it('obiekt górujący w dzień (M 101): bez linii górowania i przerzutu', () => {
    const m101 = { raDeg: hms('14:03:12.6'), decDeg: dms('+54:20:57') }
    const track = buildObjectTrack(OCT_16, m101, { horizon: [], minAltitudeDeg: 30, mount: GEM })
    expect(track.transit).toBeNull()
    expect(track.flipMs).toBeNull()
  })

  it('T9: czas efektywny M 31 = 9 h 39 min (próg −18°, h_min 30°, horyzont płaski, krok 1 min)', () => {
    expectWithin(defined(m31.effectiveMinutes), 9 * 60 + 39, 1)
  })

  it('T11: M 42 przy h_min 20°: horyzont płaski 3 h 49 min, demonstracyjny 2 h 22 min', () => {
    const flat = buildObjectTrack(OCT_16, m42, { horizon: [], minAltitudeDeg: 20, mount: GEM })
    const demo = buildObjectTrack(OCT_16, m42, { horizon: DEMO_HORIZON, minAltitudeDeg: 20, mount: GEM })
    expectWithin(defined(flat.effectiveMinutes), 3 * 60 + 49, 1)
    expectWithin(defined(demo.effectiveMinutes), 2 * 60 + 22, 1)
  })

  it('stan próbek zgadza się z czasem efektywnym: widoczne minuty w oknie ≈ czas efektywny', () => {
    const demo = buildObjectTrack(OCT_16, m42, { horizon: DEMO_HORIZON, minAltitudeDeg: 20, mount: GEM })
    const { startMs, endMs } = windowOf(OCT_16)
    const visible = demo.samples.filter((s) => s.state === 'visible' && s.timeMs >= startMs && s.timeMs < endMs)
    expectWithin(visible.length, defined(demo.effectiveMinutes), 2)
    expect(demo.samples.some((s) => s.state === 'obstructed')).toBe(true)
    expect(demo.samples.some((s) => s.state === 'low')).toBe(true)
  })

  it('wysokość horyzontu w próbce odpowiada azymutowi obiektu', () => {
    const demo = buildObjectTrack(OCT_16, m42, { horizon: DEMO_HORIZON, minAltitudeDeg: 20, mount: GEM })
    const flat = buildObjectTrack(OCT_16, m42, { horizon: [], minAltitudeDeg: 20, mount: GEM })
    expect(flat.samples.every((s) => s.horizonDeg === 0)).toBe(true)
    expect(demo.samples.some((s) => s.horizonDeg >= 30)).toBe(true)
  })

  it('bez okna ciemności czas efektywny jest nieokreślony', () => {
    const track = buildObjectTrack(JUN_21_NORTH, M31, { horizon: [], minAltitudeDeg: 30, mount: GEM })
    expect(track.effectiveMinutes).toBeNull()
  })
})

describe('odczyt w kursorze czasu', () => {
  it('T7 o 00:00 CEST 17.10: M 31 h = 79,17°, az = 193,58°; Księżyc −27,7°, oświetlenie 33,8% (T4)', () => {
    const readout = cursorReadout(OCT_16, M31, [], 30, at('2026-10-17 00:00', 'CEST'))
    expectWithin(defined(readout.object).altDeg, 79.17, 0.01)
    expectWithin(defined(readout.object).azDeg, 193.58, 0.05)
    expect(defined(readout.object).state).toBe('visible')
    expectWithin(readout.moon.altDeg, -27.7, 0.05)
    expectWithin(readout.moon.illuminatedFraction * 100, 33.8, 0.05)
  })

  it('M 42 z horyzontem demonstracyjnym: wysokość horyzontu dla azymutu obiektu', () => {
    const readout = cursorReadout(OCT_16, m42, DEMO_HORIZON, 20, at('2026-10-17 00:00', 'CEST'))
    const object = defined(readout.object)
    expect(object.horizonDeg).toBeGreaterThan(10)
    expect(object.state).toBe(trackState(object.altDeg, object.horizonDeg, 20))
  })

  it('bez obiektu tylko Księżyc', () => {
    expect(cursorReadout(OCT_16, null, [], 30, at('2026-10-17 00:00', 'CEST')).object).toBeNull()
  })
})

describe('„za przeszkodą” i „za nisko” (7C)', () => {
  it.each([
    [31, 15, 30, 'visible'],
    [41, 40, 30, 'visible'],
    [20, 15, 30, 'low'],
    [30, 15, 30, 'low'],
    [10, 15, 30, 'obstructed'],
    [35, 40, 30, 'obstructed'],
    [15, 15, 10, 'obstructed'],
  ] as const)('h = %s°, horyzont %s°, h_min %s° → %s', (altDeg, horizonDeg, minAltDeg, state) => {
    expect(trackState(altDeg, horizonDeg, minAltDeg)).toBe(state)
  })
})

describe('chwila odniesienia ikony fazy Księżyca', () => {
  const axis = { startMs: 0, endMs: 100 * MINUTE_MS }

  it('najwyższe położenie nad horyzontem', () => {
    const samples = [-5, 12, 30, 25, -1].map((altDeg, i) => ({ timeMs: i * 25 * MINUTE_MS, altDeg }))
    expect(moonReference(samples, axis)).toEqual({ timeMs: 50 * MINUTE_MS, altDeg: 30 })
  })

  it('Księżyc pod horyzontem przez całą oś: środek osi', () => {
    const samples = [-5, -12, -30].map((altDeg, i) => ({ timeMs: i * 50 * MINUTE_MS, altDeg }))
    expect(moonReference(samples, axis)).toEqual({ timeMs: 50 * MINUTE_MS, altDeg: -12 })
  })
})
