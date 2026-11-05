import { describe, expect, it } from 'vitest'
import { altitudeTrack, darkWindow, localHourTicks, nightGrid, nightPhases, tzOffsetMs, visibility } from './night'
import { autoSchedule } from './planner'

const TROMSO = { latDeg: 69.65, lonDeg: 18.96, elevationM: 0 }
const VEGA = { raDeg: 279.23, decDeg: 38.78 }

describe('noc na dużych szerokościach (B05)', () => {
  it('dzień polarny (Tromsø, 21.06): brak ciemnego okna, zero godzin i pusty plan', () => {
    const n = nightPhases('2026-06-21', TROMSO, 'Europe/Oslo')
    expect(n.sunset).toBeNull()
    expect(n.polarDay).toBe(true)
    const [start, end] = darkWindow(n)
    expect(end).toBe(start)
    const v = visibility(VEGA, altitudeTrack(VEGA, nightGrid(n, TROMSO)), n, TROMSO, 25, [])
    expect(v.hoursUsable).toBe(0)
    expect(v.windowStart).toBeNull()
    expect(autoSchedule([{ key: 'vega', bestMs: v.bestMs, usableStart: v.windowStart, usableEnd: v.windowEnd }], start, end)).toEqual([])
  })

  it('noc polarna (Tromsø, 21.12): wykres i siatka próbek obejmują całe ciemne okno', () => {
    const n = nightPhases('2026-12-21', TROMSO, 'Europe/Oslo')
    expect(n.sunset).toBeNull()
    expect(n.polarDay).toBe(false)
    const [start, end] = darkWindow(n)
    expect([start, end]).toEqual([n.astroDusk, n.astroDawn])
    expect(n.startMs).toBeLessThanOrEqual(start - 60 * 60_000)
    expect(n.endMs).toBeGreaterThanOrEqual(end + 60 * 60_000)
    const times = nightGrid(n, TROMSO).times
    expect(times[0]).toBeLessThanOrEqual(start)
    expect(times[times.length - 1]).toBeGreaterThanOrEqual(end)
  })

  it('głęboka noc polarna (85°N, 21.12): Słońce stale poniżej −18°, ciemno przez cały wykres', () => {
    const site = { latDeg: 85, lonDeg: 16, elevationM: 0 }
    const n = nightPhases('2026-12-21', site, 'Arctic/Longyearbyen')
    expect(n.astroDusk).toBeNull()
    expect(n.polarDay).toBe(false)
    expect(darkWindow(n)).toEqual([n.startMs, n.endMs])
  })

  it('białe noce (Reykjavík, 21.06): bez zmierzchu cywilnego ciemne okno to czas pod horyzontem', () => {
    const site = { latDeg: 64.13, lonDeg: -21.9, elevationM: 0 }
    const n = nightPhases('2026-06-21', site, 'Atlantic/Reykjavik')
    expect(n.civilDusk).toBeNull()
    expect(n.sunset).not.toBeNull()
    expect(n.polarDay).toBe(false)
    expect(darkWindow(n)).toEqual([n.sunset, n.sunrise])
  })
})

describe('znaczniki godzin na wykresie (B13)', () => {
  it('wypadają na pełnych godzinach lokalnych także w strefie +05:30 i przy zmianie czasu', () => {
    const H = 3_600_000
    const cases: [string, number, number][] = [
      ['Asia/Kolkata', Date.parse('2026-11-05T12:10:00Z'), Date.parse('2026-11-06T01:50:00Z')],
      ['Asia/Kathmandu', Date.parse('2026-11-05T12:10:00Z'), Date.parse('2026-11-06T01:50:00Z')],
      ['Europe/Warsaw', Date.parse('2026-10-24T15:20:00Z'), Date.parse('2026-10-25T06:40:00Z')],
    ]
    for (const [tz, start, end] of cases) {
      const ticks = localHourTicks(start, end, tz)
      expect(ticks.length, tz).toBeGreaterThan(10)
      for (const t of ticks) {
        expect(t).toBeGreaterThanOrEqual(start)
        expect(t).toBeLessThanOrEqual(end)
        expect((t + tzOffsetMs(t, tz)) % H, `${tz} ${new Date(t).toISOString()}`).toBe(0)
      }
    }
  })
})
