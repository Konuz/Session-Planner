import { expect } from 'vitest'
import type { HorizonPoint } from '../types'

/** Lokalizacja wektorów testowych z załącznika A: 52,0°N, 19,0°E, 150 m n.p.m. */
export const SITE = { latDeg: 52, lonDegEast: 19, elevationM: 150 }
export const TIME_ZONE = 'Europe/Warsaw'
export const MINUTE_MS = 60_000
export const HOUR_MS = 3_600_000

/** M 31 z T7, J2000. */
export const M31 = { raDeg: hms('00:42:44.3'), decDeg: dms('+41:16:09') }

/** Horyzont demonstracyjny z sekcji 6.4 (az°: wysokość°). */
export const DEMO_HORIZON: HorizonPoint[] = [
  [0, 12], [15, 14], [30, 18], [45, 22], [60, 25], [75, 20],
  [90, 15], [105, 12], [120, 28], [135, 35], [150, 30], [165, 10],
  [180, 8], [195, 6], [210, 9], [225, 14], [240, 20], [255, 24],
  [270, 18], [285, 15], [300, 11], [315, 9], [330, 10], [345, 11],
].map(([azDeg, altDeg]) => ({ azDeg, altDeg }))

/** Chwila UTC [ms] z czasu lokalnego zapisanego w wektorze, np. at('2026-10-16 17:47', 'CEST'). */
export function at(local: string, zone: 'CEST' | 'CET'): number {
  return Date.parse(`${local.replace(' ', 'T')}:00${zone === 'CEST' ? '+02:00' : '+01:00'}`)
}

/** Rektascensja z zapisu „HH:MM:SS.s” w stopniach. */
export function hms(text: string): number {
  const [h, m, s] = text.split(':').map(Number)
  return (h + m / 60 + s / 3600) * 15
}

/** Deklinacja z zapisu „±DD:MM:SS” (znak zawsze) w stopniach. */
export function dms(text: string): number {
  const [d, m, s] = text.slice(1).split(':').map(Number)
  return (text.startsWith('-') ? -1 : 1) * (d + m / 60 + s / 3600)
}

export function expectWithin(actual: number, expected: number, tolerance: number): void {
  expect(Math.abs(actual - expected), `${actual} zamiast ${expected} ± ${tolerance}`).toBeLessThanOrEqual(tolerance)
}

/** Czasy z wektorów mają tolerancję ±1 min. */
export function expectSameMinute(actualMs: number, expectedMs: number): void {
  expect(
    Math.abs(actualMs - expectedMs) / MINUTE_MS,
    `${new Date(actualMs).toISOString()} zamiast ${new Date(expectedMs).toISOString()}`,
  ).toBeLessThanOrEqual(1)
}

export function defined<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error('Brak wartości oczekiwanej w wektorze testowym')
  return value
}
