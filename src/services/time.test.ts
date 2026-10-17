import { describe, expect, it } from 'vitest'
import { at } from '../test/fixtures'
import {
  addDays,
  currentNightDate,
  formatDuration,
  formatLocalTime,
  fullLocalHoursMs,
  localMidnightMs,
  localNoonMs,
  localTimeParts,
} from './time'

describe('czas lokalny strefy IANA', () => {
  it('lokalne południe w CEST i w CET', () => {
    expect(localNoonMs('2026-10-24', 'Europe/Warsaw')).toBe(Date.UTC(2026, 9, 24, 10))
    expect(localNoonMs('2026-10-25', 'Europe/Warsaw')).toBe(Date.UTC(2026, 9, 25, 11))
  })

  it('następny dzień przechodzi przez koniec miesiąca i roku', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('T5: powtórzona godzina 02:30 ma etykiety CEST i CET (zegar 24 h)', () => {
    expect(formatLocalTime(Date.UTC(2026, 9, 25, 0, 30), 'Europe/Warsaw')).toBe('02:30 CEST')
    expect(formatLocalTime(Date.UTC(2026, 9, 25, 1, 30), 'Europe/Warsaw')).toBe('02:30 CET')
    expect(formatLocalTime(Date.UTC(2026, 9, 25, 16, 5), 'Europe/Warsaw')).toBe('17:05 CET')
  })

  it('godzina i skrót strefy osobno, do dwuliniowych etykiet osi', () => {
    expect(localTimeParts(Date.UTC(2026, 9, 25, 0, 0), 'Europe/Warsaw')).toEqual({ time: '02:00', zone: 'CEST' })
    expect(localTimeParts(Date.UTC(2026, 9, 25, 1, 0), 'Europe/Warsaw')).toEqual({ time: '02:00', zone: 'CET' })
  })
})

describe('noc D w trybie „Teraz” (7.0)', () => {
  const zone = 'Europe/Warsaw'

  it('od lokalnego południa trwa noc z bieżącej daty', () => {
    expect(currentNightDate(at('2026-10-16 12:00', 'CEST'), zone)).toBe('2026-10-16')
    expect(currentNightDate(at('2026-10-16 23:30', 'CEST'), zone)).toBe('2026-10-16')
  })

  it('przed lokalnym południem trwa noc z poprzedniej daty', () => {
    expect(currentNightDate(at('2026-10-17 05:00', 'CEST'), zone)).toBe('2026-10-16')
    expect(currentNightDate(at('2026-10-17 11:59', 'CEST'), zone)).toBe('2026-10-16')
    expect(currentNightDate(at('2027-01-01 00:30', 'CET'), zone)).toBe('2026-12-31')
  })

  it('w noc zmiany czasu: powtórzona godzina 02:30 CET należy do nocy 24/25.10', () => {
    expect(currentNightDate(at('2026-10-25 02:30', 'CET'), zone)).toBe('2026-10-24')
  })

  it('lokalna północ nocy D to 00:00 dnia D+1', () => {
    expect(localMidnightMs('2026-06-21', zone)).toBe(at('2026-06-22 00:00', 'CEST'))
    expect(localMidnightMs('2026-10-24', zone)).toBe(at('2026-10-25 00:00', 'CEST'))
  })
})

describe('pełne godziny lokalne na osi wykresu', () => {
  it('T5: noc 24/25.10.2026 ma powtórzoną godzinę 02:00 CEST i 02:00 CET', () => {
    const hours = fullLocalHoursMs({ startMs: at('2026-10-24 16:31', 'CEST'), endMs: at('2026-10-25 07:26', 'CET') }, 'Europe/Warsaw')
    const labels = hours.map((timeMs) => formatLocalTime(timeMs, 'Europe/Warsaw'))
    expect(labels[0]).toBe('17:00 CEST')
    expect(labels.at(-1)).toBe('07:00 CET')
    expect(labels).toContain('02:00 CEST')
    expect(labels).toContain('02:00 CET')
    expect(hours).toHaveLength(16)
  })

  it('w strefie z przesunięciem o pół godziny to pełne godziny lokalne, a nie UTC', () => {
    const hours = fullLocalHoursMs({ startMs: Date.UTC(2026, 9, 16, 12, 0), endMs: Date.UTC(2026, 9, 16, 15, 0) }, 'Asia/Kolkata')
    expect(hours).toEqual([Date.UTC(2026, 9, 16, 12, 30), Date.UTC(2026, 9, 16, 13, 30), Date.UTC(2026, 9, 16, 14, 30)])
  })
})

describe('czas trwania w formacie hh:mm', () => {
  it.each([
    [579, '09:39'],
    [0, '00:00'],
    [61, '01:01'],
    [24 * 60 + 5, '24:05'],
  ])('%s min → %s', (minutes, text) => {
    expect(formatDuration(minutes)).toBe(text)
  })
})
