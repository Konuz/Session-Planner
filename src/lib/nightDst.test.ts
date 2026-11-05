import { beforeEach, describe, expect, it, vi } from 'vitest'
import { riseSetMs, sunCrossingMs, type Site } from './astro'
import { nightPhases } from './night'

vi.mock('./astro', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./astro')>()
  return {
    ...actual,
    riseSetMs: vi.fn(),
    sunCrossingMs: vi.fn(),
  }
})

const SITE: Site = { latDeg: 51.09, lonDeg: 17.29, elevationM: 130 }
const TZ = 'Europe/Warsaw'
const HOUR_MS = 3_600_000

const crossing = vi.mocked(sunCrossingMs)
const riseSet = vi.mocked(riseSetMs)

function mockSolarEvents() {
  crossing.mockImplementation((_site, _direction, _altitude, startMs) => startMs + HOUR_MS)
  riseSet.mockImplementation((_body, _site, _direction, startMs) => startMs + HOUR_MS)
}

describe('nightPhases i zmiany czasu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each([
    ['2026-03-29', Date.UTC(2026, 2, 29, 10)],
    ['2026-10-25', Date.UTC(2026, 9, 25, 11)],
  ])('wyszukiwania faz zaczynają się o lokalnym południu (%s)', (date, expectedNoon) => {
    mockSolarEvents()

    nightPhases(date, SITE, TZ)

    const starts = crossing.mock.calls.map((call) => call[3])
    expect(starts.slice(0, 3).every((start) => start === expectedNoon)).toBe(true)
    expect(starts.slice(3).every((start) => start === expectedNoon + HOUR_MS)).toBe(true)
    expect(riseSet.mock.calls[0][3]).toBe(expectedNoon)
    expect(riseSet.mock.calls[1][3]).toBe(expectedNoon + HOUR_MS)
    expect(crossing.mock.calls.slice(0, 3).every((call) => call[4] === 1)).toBe(true)
    expect(crossing.mock.calls.slice(3).every((call) => call[4] === 23 / 24)).toBe(true)
    expect(riseSet.mock.calls[0][4]).toBe(1)
    expect(riseSet.mock.calls[1][4]).toBe(23 / 24)
  })

  it.each([
    ['2026-03-28', Date.UTC(2026, 2, 28, 11), 23 / 24],
    ['2026-10-24', Date.UTC(2026, 9, 24, 10), 25 / 24],
  ])('noc obejmująca zmianę czasu ma rzeczywisty zakres wyszukiwania (%s)', (date, expectedNoon, expectedDays) => {
    mockSolarEvents()

    nightPhases(date, SITE, TZ)

    expect(crossing.mock.calls[0][3]).toBe(expectedNoon)
    expect(crossing.mock.calls[0][4]).toBeCloseTo(expectedDays, 12)
    expect(crossing.mock.calls[3][3]).toBe(expectedNoon + HOUR_MS)
    expect(crossing.mock.calls[3][4]).toBeCloseTo(expectedDays - 1 / 24, 12)
    expect(riseSet.mock.calls[0][4]).toBeCloseTo(expectedDays, 12)
    expect(riseSet.mock.calls[1][4]).toBeCloseTo(expectedDays - 1 / 24, 12)
  })

  it('zachowuje zdarzenie w ostatniej godzinie 25-godzinnej nocy i odrzuca zdarzenie o następnym południu', () => {
    const nextNoon = Date.UTC(2026, 9, 25, 11)
    mockSolarEvents()
    riseSet.mockImplementation((_body, _site, direction, startMs) => direction === 1 ? nextNoon - HOUR_MS : startMs + HOUR_MS)

    const retained = nightPhases('2026-10-24', SITE, TZ)

    expect(retained.sunrise).toBe(nextNoon - HOUR_MS)
    expect(retained.endMs).toBe(nextNoon)

    vi.clearAllMocks()
    mockSolarEvents()
    riseSet.mockImplementation((_body, _site, direction, startMs) => direction === 1 ? nextNoon : startMs + HOUR_MS)

    const clipped = nightPhases('2026-10-24', SITE, TZ)

    expect(clipped.sunrise).toBeNull()
  })

  it('przycina wiosenną noc do następnego lokalnego południa', () => {
    const nextNoon = Date.UTC(2026, 2, 29, 10)
    mockSolarEvents()
    riseSet.mockImplementation((_body, _site, direction, startMs) => direction === 1 ? nextNoon : startMs + HOUR_MS)
    const night = nightPhases('2026-03-28', SITE, TZ)
    expect(night.sunrise).toBeNull()
    expect(night.endMs).toBe(nextNoon - 6 * HOUR_MS)
  })
})
