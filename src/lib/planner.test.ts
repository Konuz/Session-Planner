import { describe, expect, it } from 'vitest'
import { autoSchedule, localTimeToMs } from './planner'

const TZ = 'Europe/Warsaw'
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
