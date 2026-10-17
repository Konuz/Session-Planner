// Odznaki rekomendacji filtrów (P9): kolory z `rekomendacje-filtrow`, znak stanu i opis tekstowy, więc stan nie zależy
// tylko od koloru.
import { describe, expect, it } from 'vitest'
import { filterAdvice } from '../../../src/services/filterAdvice'
import { DEFAULT_MOON_RULES } from '../../../src/services/planningSettings'
import { M101, M31, MY_FILTERS, SOUTHERN, adviceFor, cardOf, cardWith, givenSummary, moon, nightSummary } from './helpers'

describe('odznaki filtrów Mojego zestawu', () => {
  it('P9: kolejność L, R, G, B, Ha, OIII, SII; ✓ zielony, ! żółty, ✗ czerwony; opis np. „Ha: średnie warunki”', () => {
    const advice = adviceFor(['green', 'green', 'green', 'green', 'yellow', 'red', 'yellow'])
    const { badges } = cardWith(M31, givenSummary(), advice)
    expect(badges.map((badge) => badge.filter)).toEqual(['L', 'R', 'G', 'B', 'Ha', 'OIII', 'SII'])
    expect(badges.map((badge) => badge.color)).toEqual(['green', 'green', 'green', 'green', 'yellow', 'red', 'yellow'])
    expect(badges.map((badge) => badge.mark)).toEqual(['✓', '✓', '✓', '✓', '!', '✗', '!'])
    expect(badges.map((badge) => badge.description)).toEqual([
      'L: dobre warunki',
      'R: dobre warunki',
      'G: dobre warunki',
      'B: dobre warunki',
      'Ha: średnie warunki',
      'OIII: złe warunki',
      'SII: średnie warunki',
    ])
  })

  it('P9: te same filtry w innych stanach → znak i opis idą za kolorem (L czerwony, Ha zielony, OIII żółty)', () => {
    const advice = adviceFor(['red', 'yellow', 'green', 'red', 'green', 'yellow', 'red'])
    const { badges } = cardWith(M31, givenSummary(), advice)
    expect(badges.map((badge) => badge.mark)).toEqual(['✗', '!', '✓', '✗', '✓', '!', '✗'])
    expect(badges.map((badge) => badge.description)).toEqual([
      'L: złe warunki',
      'R: średnie warunki',
      'G: dobre warunki',
      'B: złe warunki',
      'Ha: dobre warunki',
      'OIII: średnie warunki',
      'SII: złe warunki',
    ])
  })

  it('P9: kolory z `filterAdvice` (Księżyc obecny, oświetlenie 10%, separacja 30°) → L, R, G, B ✓; Ha, SII !; OIII ✗', () => {
    const advice = filterAdvice(moon(0, 0.1, 30), 'emission_nebula', DEFAULT_MOON_RULES, MY_FILTERS)
    const { badges } = cardWith(M31, givenSummary({ moon: moon(0, 0.1, 30) }), advice)
    expect(badges.map((badge) => `${badge.filter} ${badge.mark}`)).toEqual([
      'L ✓',
      'R ✓',
      'G ✓',
      'B ✓',
      'Ha !',
      'OIII ✗',
      'SII !',
    ])
  })

  it('P9 (noc z przykładów, M 31 [AC5]): Księżyc pod horyzontem przez ponad 80% okna → siedem odznak ✓ „dobre warunki”', () => {
    const { badges } = cardOf(M31)
    expect(badges.map((badge) => badge.filter)).toEqual(['L', 'R', 'G', 'B', 'Ha', 'OIII', 'SII'])
    expect(badges.every((badge) => badge.mark === '✓')).toBe(true)
    expect(badges.map((badge) => badge.description)).toEqual(MY_FILTERS.map((filter) => `${filter}: dobre warunki`))
  })

  it('P9 (noc z przykładów, M 101): odznaki mają kolory z `filterAdvice` dla podsumowania obiektu', () => {
    const summary = nightSummary(M101)
    const expected = filterAdvice(summary.moon ?? null, M101.type, DEFAULT_MOON_RULES, MY_FILTERS)
    const { badges } = cardOf(M101)
    expect(badges.map(({ filter, color }) => ({ filter, color }))).toEqual(expected)
  })

  it('P9: obiekt bez rekomendacji (pusta lista) → brak odznak', () => {
    expect(cardWith(M31, givenSummary(), []).badges).toEqual([])
  })

  it('P9: obiekt bez czasu efektywnego (`filterAdvice` z danymi Księżyca null) → brak odznak', () => {
    expect(nightSummary(SOUTHERN).moon).toBeNull()
    expect(cardOf(SOUTHERN).badges).toEqual([])
  })

  it('P9: odznaki tego samego stanu mają ten sam token koloru, różne stany – różne tokeny', () => {
    const advice = adviceFor(['green', 'green', 'yellow', 'yellow', 'red', 'red', 'green'])
    const { badges } = cardWith(M31, givenSummary(), advice)
    const tokenOf = (color: string) => [...new Set(badges.filter((badge) => badge.color === color).map((badge) => badge.colorToken))]
    expect(tokenOf('green')).toHaveLength(1)
    expect(tokenOf('yellow')).toHaveLength(1)
    expect(tokenOf('red')).toHaveLength(1)
    expect(new Set([...tokenOf('green'), ...tokenOf('yellow'), ...tokenOf('red')]).size).toBe(3)
  })
})
