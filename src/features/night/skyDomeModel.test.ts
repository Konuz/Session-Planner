import { describe, expect, it } from 'vitest'
import { buildNightFrame, buildObjectTrack, cursorReadout, type NightSettings } from '../../services/nightChart'
import { DEMO_HORIZON, M31, MINUTE_MS, SITE, TIME_ZONE, at, defined, dms, expectSameMinute, expectWithin, hms } from '../../test/fixtures'
import type { HorizonPoint } from '../../types'
import {
  DOME,
  domeCursor,
  domeLayers,
  domePoint,
  domeRadius,
  domeTrack,
  horizonOutline,
  markerLabel,
  type Dome,
  type DomePoint,
} from './skyDomeModel'

const SETTINGS: NightSettings = { darknessThresholdDeg: -18, autoLowerThreshold: true, detailStepMin: 1 }
const OCT_16 = buildNightFrame(SITE, TIME_ZONE, '2026-10-16', SETTINGS)
const OCT_24 = buildNightFrame(SITE, TIME_ZONE, '2026-10-24', SETTINGS)
const M42 = { raDeg: hms('05:35:17.3'), decDeg: dms('-05:23:28') }
const IC1396 = { raDeg: hms('21:39:06'), decDeg: dms('+57:30:00') }
const OTHER_DOME: Dome = { cx: 50, cy: 70, radius: 40 }

const distance = (point: DomePoint, dome: Dome) => Math.hypot(point.x - dome.cx, point.y - dome.cy)

function expectPoint(point: DomePoint, x: number, y: number): void {
  expectWithin(point.x, x, 1e-9)
  expectWithin(point.y, y, 1e-9)
}

function window16() {
  if (OCT_16.darkness.kind !== 'window') throw new Error('brak okna ciemności 16/17.10.2026')
  return OCT_16.darkness.window
}

describe('T16 rzut azymutalny równoodległościowy: zenit w środku, N u góry, E po lewej', () => {
  it.each([DOME, OTHER_DOME])('az 0° → góra, 90° → lewo, 180° → dół, 270° → prawo, h = 90° → środek', (dome) => {
    const { cx, cy, radius: r } = dome
    expectPoint(domePoint({ altDeg: 0, azDeg: 0 }, dome), cx, cy - r)
    expectPoint(domePoint({ altDeg: 0, azDeg: 90 }, dome), cx - r, cy)
    expectPoint(domePoint({ altDeg: 0, azDeg: 180 }, dome), cx, cy + r)
    expectPoint(domePoint({ altDeg: 0, azDeg: 270 }, dome), cx + r, cy)
    for (const azDeg of [0, 77, 200]) expectPoint(domePoint({ altDeg: 90, azDeg }, dome), cx, cy)
  })

  it('r = R·(90° − h)/90°: h = 30° → 2R/3, h = 60° → R/3, h = −9° → 1,1·R (poza tarczą)', () => {
    expectWithin(domeRadius(30, DOME), (2 * DOME.radius) / 3, 1e-9)
    expectWithin(domeRadius(60, OTHER_DOME), OTHER_DOME.radius / 3, 1e-9)
    expectWithin(distance(domePoint({ altDeg: -9, azDeg: 135 }, DOME), DOME), 1.1 * DOME.radius, 1e-9)
  })

  it('M 31 o 00:00 CEST 17.10.2026 (h = 79,17°, az = 193,58°) leży 0,12·R od środka, nieco na prawo od pionu w dół', () => {
    const cursorMs = at('2026-10-17 00:00', 'CEST')
    const readout = cursorReadout(OCT_16, M31, [], 30, cursorMs)
    const { point } = defined(domeCursor(OCT_16, readout.object, cursorMs, DOME).object)
    const dx = point.x - DOME.cx
    const dy = point.y - DOME.cy
    expectWithin(Math.hypot(dx, dy) / DOME.radius, (90 - 79.17) / 90, 0.001)
    expect(dx, 'na prawo od pionu').toBeGreaterThan(0)
    expect(dy, 'poniżej środka').toBeGreaterThan(0)
    // Odchylenie od pionu w dół = az − 180°.
    expectWithin((Math.atan2(dx, dy) * 180) / Math.PI, 193.58 - 180, 0.1)
  })
})

describe('warstwy stałe widoku sfery', () => {
  it('okręgi 0°, 30° i 60° oraz południk N–S przez zenit', () => {
    const layers = domeLayers([], 30, DOME)
    expect(layers.rings.map((ring) => ring.altDeg)).toEqual([0, 30, 60])
    layers.rings.forEach((ring, i) => expectWithin(ring.r, (DOME.radius * (3 - i)) / 3, 1e-9))
    expectPoint(layers.meridian.from, DOME.cx, DOME.cy - DOME.radius)
    expectPoint(layers.meridian.to, DOME.cx, DOME.cy + DOME.radius)
  })

  it('okrąg h_min z parametrów planowania: 20° → 7/9·R, 35° → 11/18·R', () => {
    expectWithin(domeLayers([], 20, DOME).minAltitude.r, (DOME.radius * 7) / 9, 1e-9)
    expectWithin(domeLayers([], 35, OTHER_DOME).minAltitude.r, (OTHER_DOME.radius * 11) / 18, 1e-9)
    expect(domeLayers([], 35, DOME).minAltitude.altDeg).toBe(35)
  })

  it('kierunki świata poza tarczą: N u góry, E po lewej, S na dole, W po prawej', () => {
    const byLabel = Object.fromEntries(domeLayers([], 30, DOME).cardinals.map((c) => [c.label, c]))
    const { cx, cy, radius: r } = DOME
    expect(byLabel.N.y).toBeLessThan(cy - r)
    expect(byLabel.N.x).toBe(cx)
    expect(byLabel.E.x).toBeLessThan(cx - r)
    expect(byLabel.E.y).toBe(cy)
    expect(byLabel.S.y).toBeGreaterThan(cy + r)
    expect(byLabel.W.x).toBeGreaterThan(cx + r)
  })

  it('pas „za nisko” między okręgiem h_min a brzegiem tarczy; h_min 0° → bez pasa', () => {
    expect(domeLayers([], 30, DOME).lowZonePath).not.toBe('')
    expect(domeLayers([], 0, DOME).lowZonePath).toBe('')
  })
})

describe('wielokąt własnego horyzontu', () => {
  it('horyzont płaski ([]) albo w całości ≤ 0° → brak wielokąta', () => {
    expect(horizonOutline([])).toEqual([])
    expect(domeLayers([], 30, DOME).horizonPath).toBe('')
    const below: HorizonPoint[] = [
      { azDeg: 0, altDeg: -3 },
      { azDeg: 180, altDeg: 0 },
    ]
    expect(horizonOutline(below)).toEqual([])
    expect(domeLayers(below, 30, DOME).horizonPath).toBe('')
  })

  it('horyzont demonstracyjny: punkt co 1° z wysokością z interpolacji i każdy wierzchołek [T10]', () => {
    const outline = horizonOutline(DEMO_HORIZON)
    expect(outline).toHaveLength(360)
    for (const vertex of DEMO_HORIZON) expect(outline).toContainEqual(vertex)
    // Między (120°: 28°) a (135°: 35°).
    expectWithin(defined(outline.find((p) => p.azDeg === 127)).altDeg, 28 + (7 * 7) / 15, 1e-9)
    expect(domeLayers(DEMO_HORIZON, 30, DOME).horizonPath).not.toBe('')
  })

  it('wierzchołek o niecałkowitym azymucie jest w obrysie (ostre narożniki zostają)', () => {
    const outline = horizonOutline([
      { azDeg: 10, altDeg: 5 },
      { azDeg: 127.5, altDeg: 40 },
    ])
    expect(outline).toContainEqual({ azDeg: 127.5, altDeg: 40 })
    expect(outline).toHaveLength(361)
  })

  it('zawinięcie 360° → 0°: punkty {350: 10, 10: 20} → az 0° na 15° [T10]', () => {
    const outline = horizonOutline([
      { azDeg: 10, altDeg: 20 },
      { azDeg: 350, altDeg: 10 },
    ])
    expectWithin(defined(outline.find((p) => p.azDeg === 0)).altDeg, 15, 1e-9)
  })

  it('ujemna wysokość horyzontu jest przycięta do 0° (brzeg tarczy)', () => {
    const outline = horizonOutline([
      { azDeg: 0, altDeg: -4 },
      { azDeg: 180, altDeg: 20 },
    ])
    expect(defined(outline.find((p) => p.azDeg === 0)).altDeg).toBe(0)
    expectWithin(defined(outline.find((p) => p.azDeg === 90)).altDeg, 8, 1e-9)
  })

  it('ściana (0: 0), (89: 0), (90: 60), (180: 60), (181: 0): az 135° na R/3, az 45° na brzegu', () => {
    const wall = [
      [0, 0],
      [89, 0],
      [90, 60],
      [180, 60],
      [181, 0],
    ].map(([azDeg, altDeg]) => ({ azDeg, altDeg }))
    const outline = horizonOutline(wall)
    const pointAt = (azDeg: number) => domePoint(defined(outline.find((p) => p.azDeg === azDeg)), DOME)
    expectWithin(distance(pointAt(135), DOME), DOME.radius / 3, 1e-9)
    expectWithin(distance(pointAt(45), DOME), DOME.radius, 1e-9)
  })
})

describe('trajektoria obiektu w oknie ciemności', () => {
  it('M 31, noc 16/17.10.2026: od początku do końca okna (19:40–05:19 CEST), krok 1 min', () => {
    const track = domeTrack(OCT_16, M31, [], 30, DOME)
    const { startMs, endMs } = window16()
    expectSameMinute(startMs, at('2026-10-16 19:40', 'CEST'))
    expectSameMinute(endMs, at('2026-10-17 05:19', 'CEST'))
    expect(track.inDarkness).toBe(true)
    expect(track.range).toEqual({ startMs, endMs })
    expect(track.samples[0].timeMs).toBe(startMs)
    expect(track.samples.at(-1)?.timeMs).toBe(endMs)
    expect(track.samples[1].timeMs - track.samples[0].timeMs).toBe(MINUTE_MS)
  })

  it('krok 5 min: pierwsza i ostatnia próbka nadal na brzegach okna', () => {
    const frame = buildNightFrame(SITE, TIME_ZONE, '2026-10-16', { ...SETTINGS, detailStepMin: 5 })
    const track = domeTrack(frame, M31, [], 30, DOME)
    const { startMs, endMs } = window16()
    expect(track.samples[0].timeMs).toBe(startMs)
    expect(track.samples.at(-1)?.timeMs).toBe(endMs)
    expect(track.samples[1].timeMs - track.samples[0].timeMs).toBe(5 * MINUTE_MS)
  })

  it('M 31 widoczny przez całe okno → jeden przebieg widoczny', () => {
    const { runs } = domeTrack(OCT_16, M31, [], 30, DOME)
    expect(runs.map((run) => run.visible)).toEqual([true])
    expect(runs[0].path.startsWith('M')).toBe(true)
  })

  it('M 42, h_min 30°: najpierw za nisko, potem widoczny; czas próbek widocznych ≈ czas efektywny 2 h 03 min [T9]', () => {
    const { runs, samples } = domeTrack(OCT_16, M42, [], 30, DOME)
    expect(runs[0].visible).toBe(false)
    expect(runs.some((run) => run.visible)).toBe(true)
    let visibleMs = 0
    for (let i = 0; i + 1 < samples.length; i++) if (samples[i].state === 'visible') visibleMs += samples[i + 1].timeMs - samples[i].timeMs
    const effective = defined(buildObjectTrack(OCT_16, M42, { horizon: [], minAltitudeDeg: 30, mount: { type: 'gem', flipMinutesAfterMeridian: 10 } }).effectiveMinutes)
    expect(effective).toBe(123)
    expectWithin(visibleMs / MINUTE_MS, effective, 2)
  })

  it('stan próbek uwzględnia własny horyzont: ściana 60° na południu zasłania górującego M 31', () => {
    const wall = [
      [0, 0],
      [89, 0],
      [90, 60],
      [270, 60],
      [271, 0],
    ].map(([azDeg, altDeg]) => ({ azDeg, altDeg }))
    const { samples } = domeTrack(OCT_16, M31, wall, 30, DOME)
    const midnight = defined(samples.find((s) => s.timeMs >= at('2026-10-17 00:00', 'CEST')))
    expect(midnight.state).toBe('visible') // 79° nad ścianą 60°
    expect(samples.some((s) => s.state === 'obstructed')).toBe(true)
  })

  it('pełne godziny w oknie 16/17.10: 20–05, znacznik 00:00 CEST w miejscu z T16, opis odsunięty od środka tarczy', () => {
    const { hours } = domeTrack(OCT_16, M31, [], 30, DOME)
    expect(hours.map((hour) => hour.label)).toEqual(['20', '21', '22', '23', '00', '01', '02', '03', '04', '05'])
    const midnight = defined(hours.find((hour) => hour.timeMs === at('2026-10-17 00:00', 'CEST')))
    expectWithin(distance(midnight.point, DOME) / DOME.radius, (90 - 79.17) / 90, 0.001)
    for (const hour of hours) {
      expectWithin(Math.hypot(hour.labelPoint.x - hour.point.x, hour.labelPoint.y - hour.point.y), 11, 1e-6)
      expect(distance(hour.labelPoint, DOME)).toBeGreaterThan(distance(hour.point, DOME))
    }
  })

  it('noc zmiany czasu 24/25.10.2026, IC 1396 (okołobiegunowy): powtórzona godzina 02 ze skrótem strefy [T5]', () => {
    const { hours } = domeTrack(OCT_24, IC1396, [], 30, DOME)
    expect(hours.map((hour) => hour.label)).toEqual(['20', '21', '22', '23', '00', '01', '02 CEST', '02 CET', '03', '04'])
  })

  it('godziny, w których obiekt jest pod horyzontem, nie mają znacznika (M 42 wschodzi w nocy)', () => {
    const { hours } = domeTrack(OCT_16, M42, [], 30, DOME)
    expect(hours.length).toBeGreaterThan(0)
    expect(hours.length).toBeLessThan(10)
    expect(hours.every((hour) => hour.altDeg > 0)).toBe(true)
    expect(hours.at(-1)?.label).toBe('05')
  })

  it('noc bez okna ciemności (21/22.06.2026, −18° bez obniżania): trajektoria na całej osi wykresu', () => {
    const frame = buildNightFrame(SITE, TIME_ZONE, '2026-06-21', { ...SETTINGS, autoLowerThreshold: false })
    expect(frame.darkness.kind).toBe('none')
    const track = domeTrack(frame, M31, [], 30, DOME)
    expect(track.inDarkness).toBe(false)
    expect(track.range).toEqual(frame.axis)
    expect(track.samples[0].timeMs).toBe(frame.axis.startMs)
    expect(track.samples.at(-1)?.timeMs).toBe(frame.axis.endMs)
  })
})

describe('opis znacznika obiektu', () => {
  const offsetOf = (label: DomePoint, point: DomePoint) => ({ x: label.x - point.x, y: label.y - point.y })

  it('M 31 o 00:00 CEST: opis po stronie trajektorii naprzeciw opisu godziny 00 (ku środkowi tarczy)', () => {
    const cursorMs = at('2026-10-17 00:00', 'CEST')
    const track = domeTrack(OCT_16, M31, [], 30, DOME)
    const { point } = defined(domeCursor(OCT_16, cursorReadout(OCT_16, M31, [], 30, cursorMs).object, cursorMs, DOME).object)
    const hour = defined(track.hours.find((h) => h.timeMs === cursorMs))
    const label = markerLabel(point, track, DOME)
    const toLabel = offsetOf(label, point)
    const toHour = offsetOf(hour.labelPoint, hour.point)
    expect(toLabel.x * toHour.x + toLabel.y * toHour.y).toBeLessThan(0)
    expectWithin(Math.hypot(toLabel.x, toLabel.y), 20, 1e-6)
    expect(label.y, 'M 31 górujący na południe od zenitu → opis nad znacznikiem').toBeLessThan(point.y)
    expect(label.anchor).toBe('middle')
  })

  it('bez trajektorii: opis w stronę środka tarczy, a w zenicie – w górę', () => {
    const east = markerLabel({ x: DOME.cx - 100, y: DOME.cy }, null, DOME)
    expectPoint(east, DOME.cx - 80, DOME.cy)
    expect(east.anchor).toBe('start')
    const zenith = markerLabel({ x: DOME.cx, y: DOME.cy }, null, DOME)
    expectPoint(zenith, DOME.cx, DOME.cy - 20)
  })

  it('kursor z dala od trajektorii (przed oknem ciemności): jak bez trajektorii', () => {
    const track = domeTrack(OCT_16, M31, [], 30, DOME)
    const point = { x: DOME.cx + 120, y: DOME.cy }
    expectPoint(markerLabel(point, track, DOME), DOME.cx + 100, DOME.cy)
    expect(markerLabel(point, track, DOME).anchor).toBe('end')
  })
})

describe('kursor czasu na widoku sfery', () => {
  it('Księżyc o 00:00 CEST 17.10.2026: pod horyzontem (−27,7°), 33,8% oświetlenia [T4]', () => {
    const { moon } = domeCursor(OCT_16, null, at('2026-10-17 00:00', 'CEST'), DOME)
    expectWithin(moon.altDeg, -27.7, 0.05)
    expect(moon.aboveHorizon).toBe(false)
    expectWithin(moon.illuminatedFraction, 0.338, 0.001)
    expect(moon.waxing).toBe(true)
  })

  it('Księżyc o 01:00 CEST 25.10.2026: nad horyzontem, w tarczy, 98,0% oświetlenia [T5]', () => {
    const { moon } = domeCursor(OCT_24, null, at('2026-10-25 01:00', 'CEST'), DOME)
    expect(moon.aboveHorizon).toBe(true)
    expect(distance(moon.point, DOME)).toBeLessThan(DOME.radius)
    expectWithin(distance(moon.point, DOME), domeRadius(moon.altDeg, DOME), 1e-9)
    expectWithin(moon.illuminatedFraction, 0.98, 0.001)
  })

  it('niebo w chwili kursora: pasy jak na wykresie nocy 16/17.10.2026 [T4]', () => {
    const band = (local: string) => domeCursor(OCT_16, null, at(local, 'CEST'), DOME).band
    expect(band('2026-10-16 15:00')).toBe('day') // przed osią wykresu
    expect(band('2026-10-16 18:00')).toBe('civil') // zachód 17:47, −6° o 18:22
    expect(band('2026-10-16 18:40')).toBe('nautical') // −12° o 19:01
    expect(band('2026-10-16 19:20')).toBe('astronomical') // −18° o 19:40
    expect(band('2026-10-17 00:00')).toBe('night')
  })

  it('bez obiektu → brak znacznika; obiekt z odczytu kursora zachowuje wysokość, azymut i stan', () => {
    const cursorMs = at('2026-10-16 21:00', 'CEST')
    expect(domeCursor(OCT_16, null, cursorMs, DOME).object).toBeNull()
    const readout = cursorReadout(OCT_16, M42, DEMO_HORIZON, 30, cursorMs)
    const object = defined(domeCursor(OCT_16, readout.object, cursorMs, DOME).object)
    const expected = defined(readout.object)
    expect(object.state).toBe(expected.state)
    expect(object.altDeg).toBe(expected.altDeg)
    expectPoint(object.point, domePoint(expected, DOME).x, domePoint(expected, DOME).y)
  })
})
