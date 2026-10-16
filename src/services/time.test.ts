import { describe, expect, it } from 'vitest'
import { addDays, formatLocalTime, localNoonMs } from './time'

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
})
