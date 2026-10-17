// Położenie w kursorze, separacja od Księżyca w kursorze, górowanie i przerzut (P4, P5, P6).
// Reguły ze „Styk z resztą”: Alt/Az przez `toEquatorOfDate` (macierz precesji nocy) i `horizontalAt`; Księżyc w kursorze
// podany z zewnątrz (`bodyPosition('moon', …)` raz dla wszystkich kart); separacja przez `angularSeparationDeg`;
// przerzut przez `meridianFlipMs` z `widocznosc-katalogu` (górowanie i montaż zestawu); teksty przez `formatDeg`
// i `formatLocalTime`.
import { describe, expect, it } from 'vitest'
import {
  angularSeparationDeg,
  bodyPosition,
  horizontalAt,
  precessionMatrix,
  toEquatorOfDate,
  type EquatorialDeg,
  type PrecessionMatrix,
} from '../../../src/services/astroMath'
import { formatDeg } from '../../../src/services/format'
import { formatLocalTime } from '../../../src/services/time'
import type { DsoObject } from '../../../src/types'
import {
  M101,
  M31,
  M42,
  M81,
  NIGHT,
  TIME_ZONE,
  at,
  cardContext,
  cardOf,
  cardWith,
  expectTextWithinMinute,
  givenSummary,
  withMount,
} from './helpers'

/** Tekst położenia z reguły: współrzędne daty z macierzy precesji, potem `horizontalAt` w chwili kursora. */
function expectedPosition(object: DsoObject, timeMs: number, precession: PrecessionMatrix = NIGHT.precession): string {
  const { altDeg, azDeg } = horizontalAt(toEquatorOfDate(object, precession), NIGHT.site, timeMs)
  return `wysokość ${formatDeg(altDeg)}, azymut ${formatDeg(azDeg)}`
}

/** Tekst separacji z reguły: `angularSeparationDeg` współrzędnych daty obiektu i Księżyca w kursorze. */
function expectedSeparation(object: DsoObject, moonAtCursor: EquatorialDeg, precession: PrecessionMatrix = NIGHT.precession): string {
  return formatDeg(angularSeparationDeg(toEquatorOfDate(object, precession), moonAtCursor))
}

describe('położenie i separacja od Księżyca w kursorze', () => {
  it('P4: kursor 00:00 CEST → M 31 „wysokość 79,2°, azymut 193,6°”, separacja od Księżyca „112,8°” [T7]', () => {
    const card = cardOf(M31)
    expect(card.position).toBe('wysokość 79,2°, azymut 193,6°')
    expect(card.moonSeparation).toBe('112,8°')
  })

  it('P4 (reguła Alt/Az i separacji w kursorze): kursor 02:00 CEST → M 31 z `horizontalAt` i Księżycem w tym kursorze', () => {
    const cursorMs = at('2026-10-17 02:00', 'CEST')
    const card = cardOf(M31, { cursorMs })
    expect(card.position).toBe(expectedPosition(M31, cursorMs))
    expect(card.position).not.toBe('wysokość 79,2°, azymut 193,6°')
    expect(card.moonSeparation).toBe(expectedSeparation(M31, bodyPosition('moon', NIGHT.site, cursorMs)))
  })

  it('P4 (ta sama reguła): M 42 o 20:00 CEST jest pod horyzontem → wysokość ze znakiem „−”', () => {
    const cursorMs = at('2026-10-16 20:00', 'CEST')
    const card = cardOf(M42, { cursorMs })
    expect(card.position).toBe(expectedPosition(M42, cursorMs))
    expect(card.position).toMatch(/^wysokość −\d+,\d°, azymut \d+,\d°$/)
  })

  it('P4 (Księżyc w kursorze podany z zewnątrz): Księżyc w punkcie M 31 (współrzędne daty) → „0,0°”, 90° dalej → „90,0°”', () => {
    const ofDate = toEquatorOfDate(M31, NIGHT.precession)
    expect(cardOf(M31, { moonAtCursor: ofDate }).moonSeparation).toBe('0,0°')
    expect(cardOf(M31, { moonAtCursor: { raDeg: ofDate.raDeg, decDeg: ofDate.decDeg - 90 } }).moonSeparation).toBe('90,0°')
  })

  it('P4 (macierz precesji nocy z kontekstu): inna macierz daje położenie i separację z tej macierzy', () => {
    const otherEpoch = precessionMatrix(Date.UTC(2100, 0, 1))
    const moonAtCursor = bodyPosition('moon', NIGHT.site, cardContext().cursorMs)
    const card = cardOf(M31, { precession: otherEpoch })
    expect(card.position).toBe(expectedPosition(M31, cardContext().cursorMs, otherEpoch))
    expect(card.position).not.toBe('wysokość 79,2°, azymut 193,6°')
    expect(card.moonSeparation).toBe(expectedSeparation(M31, moonAtCursor, otherEpoch))
  })
})

describe('górowanie, najwyższe położenie i przerzut', () => {
  it('P5: M 31 → „górowanie 23:46 CEST, 79,4°” i „przerzut 23:56 CEST” (±1 min) [T7]', () => {
    const card = cardOf(M31)
    expectTextWithinMinute(card.culmination, 'górowanie 23:46 CEST, 79,4°')
    expectTextWithinMinute(card.flip, 'przerzut 23:56 CEST')
  })

  it('P5 (przerzut = górowanie + flipMinutesAfterMeridian zestawu): GEM z przerzutem 30 min → „przerzut 00:16 CEST” (±1 min)', () => {
    const card = cardOf(M31, { profile: withMount({ type: 'gem', flipMinutesAfterMeridian: 30 }) })
    expectTextWithinMinute(card.flip, 'przerzut 00:16 CEST')
    expectTextWithinMinute(card.culmination, 'górowanie 23:46 CEST, 79,4°')
  })

  it('P5 (górowanie i wysokość z podsumowania podanego wprost): 01:30 CEST na 45,04° → „górowanie 01:30 CEST, 45,0°”, „przerzut 01:40 CEST”', () => {
    const transitMs = at('2026-10-17 01:30', 'CEST')
    const card = cardWith(M31, givenSummary({ transitMs, highest: { timeMs: transitMs, altDeg: 45.04 } }))
    expect(card.culmination).toBe('górowanie 01:30 CEST, 45,0°')
    expect(card.flip).toBe('przerzut 01:40 CEST')
  })

  it('P5 (godziny przez `formatLocalTime` w strefie lokalizacji): górowanie 02:30 CET po zmianie czasu → „górowanie 02:30 CET, 60,0°”', () => {
    const transitMs = at('2026-10-25 02:30', 'CET')
    const card = cardWith(M31, givenSummary({ transitMs, highest: { timeMs: transitMs, altDeg: 60 } }))
    expect(card.culmination).toBe(`górowanie ${formatLocalTime(transitMs, TIME_ZONE)}, 60,0°`)
    expect(card.culmination).toBe('górowanie 02:30 CET, 60,0°')
    expect(card.flip).toBe('przerzut 02:40 CET')
  })

  it('P6: M 101 → „góruje w dzień”, najwyżej o 19:40 CEST (początek okna), bez przerzutu', () => {
    const card = cardOf(M101)
    expect(card.culmination).toContain('góruje w dzień')
    expect(card.culmination).toContain('19:40 CEST')
    expect(card.culmination).not.toContain('górowanie')
    expect(card.flip).toBeNull()
  })

  it('P6 (najwyższe położenie na drugim brzegu okna): M 81 góruje w dzień → „góruje w dzień”, najwyżej o 05:19 CEST, bez przerzutu', () => {
    const card = cardOf(M81)
    expect(card.culmination).toContain('góruje w dzień')
    expect(card.culmination).toContain('05:19 CEST')
    expect(card.culmination).not.toContain('19:40')
    expect(card.flip).toBeNull()
  })

  it('P6: zestaw z montażem widłowym → M 31 bez wiersza przerzutu (pole null), górowanie bez zmian', () => {
    const card = cardOf(M31, { profile: withMount({ type: 'fork', flipMinutesAfterMeridian: 10 }) })
    expect(card.flip).toBeNull()
    expectTextWithinMinute(card.culmination, 'górowanie 23:46 CEST, 79,4°')
  })

  it('P6 (przerzut tylko dla GEM): montaż azymutalny → bez przerzutu', () => {
    const card = cardOf(M31, { profile: withMount({ type: 'altaz', flipMinutesAfterMeridian: 10 }) })
    expect(card.flip).toBeNull()
  })
})
