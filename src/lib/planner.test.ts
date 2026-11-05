import { describe, expect, it } from 'vitest'
import { altitudeTrack, darkWindow, nightGrid, nightPhases, visibility } from './night'
import { autoSchedule, localTimeToMs, overlaps, type PlanTarget, type Slot } from './planner'

const TZ = 'Europe/Warsaw'
const MIN = 60_000
const H = 60 * MIN

/** Każdy cel dostaje slot ≥ 10 min w swoim oknie, sloty się nie nakładają. */
function expectEveryTargetScheduled(targets: PlanTarget[], slots: Slot[]) {
  expect(slots.map((s) => s.key).sort()).toEqual(targets.map((t) => t.key).sort())
  expect(overlaps(slots).size).toBe(0)
  for (const s of slots) {
    const t = targets.find((x) => x.key === s.key)!
    expect(s.endMs - s.startMs).toBeGreaterThanOrEqual(10 * MIN)
    expect(s.startMs).toBeGreaterThanOrEqual(t.usableStart!)
    expect(s.endMs).toBeLessThanOrEqual(t.usableEnd!)
  }
}

describe('podział nocy między cele o bliskich najlepszych chwilach (B01)', () => {
  it('M13 i M57 zachodzące o zmierzchu, Wrocław 5/6.11.2026: oba cele dostają slot', () => {
    const site = { latDeg: 51.1, lonDeg: 17.03, elevationM: 120 }
    const n = nightPhases('2026-11-05', site, TZ)
    const grid = nightGrid(n, site, 5)
    const [darkStart, darkEnd] = darkWindow(n)
    const targets = [
      { key: 'M13', eq: { raDeg: 250.42, decDeg: 36.46 } },
      { key: 'M57', eq: { raDeg: 283.40, decDeg: 33.03 } },
    ].map(({ key, eq }) => {
      const v = visibility(eq, altitudeTrack(eq, grid), n, site, 25, [])
      return { key, bestMs: v.bestMs, usableStart: v.windowStart, usableEnd: v.windowEnd }
    })
    expect(targets[0].bestMs).toBe(targets[1].bestMs)
    const slots = autoSchedule(targets, darkStart, darkEnd)
    expectEveryTargetScheduled(targets, slots)
    // Najpierw M13, który zachodzi wcześniej; wspólny czas (do zejścia M13 pod limit) dzielony po połowie.
    const [m13, m57] = targets
    expect(slots.map((s) => s.key)).toEqual(['M13', 'M57'])
    expect(Math.abs(slots[0].endMs - (m13.usableStart! + m13.usableEnd!) / 2)).toBeLessThan(MIN)
    expect(slots[1].endMs).toBe(Math.floor(m57.usableEnd! / MIN) * MIN)
  })
  it('cele o odległych najlepszych chwilach: granica nadal w połowie drogi między nimi', () => {
    const targets = [
      { key: 'a', bestMs: 2 * H, usableStart: 0, usableEnd: 10 * H },
      { key: 'b', bestMs: 8 * H, usableStart: 4 * H, usableEnd: 12 * H },
    ]
    expect(autoSchedule(targets, 0, 12 * H)).toEqual([
      { key: 'a', startMs: 0, endMs: 5 * H },
      { key: 'b', startMs: 5 * H, endMs: 12 * H },
    ])
  })
  it('cel dostałby 20 min: granica przechodzi na połowę wspólnego czasu', () => {
    const targets = [
      { key: 'a', bestMs: 0, usableStart: 0, usableEnd: 2 * H },
      { key: 'b', bestMs: 40 * MIN, usableStart: 0, usableEnd: 3 * H },
    ]
    expect(autoSchedule(targets, 0, 8 * H)).toEqual([
      { key: 'a', startMs: 0, endMs: H },
      { key: 'b', startMs: H, endMs: 3 * H },
    ])
  })
  it.each([5, 15])('najlepsze chwile różniące się o %i min: wcześniejszy cel nie znika', (gapMin) => {
    const targets = [
      { key: 'a', bestMs: 0, usableStart: 0, usableEnd: 2 * H },
      { key: 'b', bestMs: gapMin * MIN, usableStart: 0, usableEnd: 3 * H },
    ]
    expectEveryTargetScheduled(targets, autoSchedule(targets, 0, 8 * H))
  })
})

describe('okna planera', () => {
  it('zaokrągla okno do minut do wewnątrz widoczności', () => {
    const [slot] = autoSchedule([{ key: 'a', bestMs: 1_800_000, usableStart: 20_000, usableEnd: 3_620_000 }], 0, 4_000_000)
    expect(slot.startMs).toBe(60_000)
    expect(slot.endMs).toBe(3_600_000)
  })
  it('zachowuje godziny po zmianie czasu jesienią i wiosną', () => {
    expect(new Date(localTimeToMs('2026-10-25', '20:00', TZ)!).toISOString()).toBe('2026-10-25T19:00:00.000Z')
    expect(new Date(localTimeToMs('2026-10-24', '04:00', TZ)!).toISOString()).toBe('2026-10-25T03:00:00.000Z')
    expect(new Date(localTimeToMs('2026-03-28', '04:00', TZ)!).toISOString()).toBe('2026-03-29T02:00:00.000Z')
  })
  it('odrzuca nieistniejącą godzinę i zachowuje wybrane powtórzenie godziny jesienią', () => {
    expect(localTimeToMs('2026-03-28', '02:30', TZ)).toBeNull()
    expect(localTimeToMs('2026-10-24', '02:30', TZ)).toBe(Date.parse('2026-10-25T00:30:00Z'))
    expect(localTimeToMs('2026-10-24', '02:30', TZ, Date.parse('2026-10-25T01:30:00Z'))).toBe(Date.parse('2026-10-25T01:30:00Z'))
    expect(localTimeToMs('2026-10-24', '24:99', TZ)).toBeNull()
  })
})
