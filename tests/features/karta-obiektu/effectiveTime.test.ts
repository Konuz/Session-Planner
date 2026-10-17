// Czas efektywny z użytym progiem i najmniejsza separacja od Księżyca w oknie efektywnym (P7, P8).
// Teksty przez `formatDuration` (hh:mm) i `formatDeg`; dane z podsumowania nocy z Workera.
import { describe, expect, it } from 'vitest'
import { formatDeg } from '../../../src/services/format'
import { LOWERED_12, M31, NONE_12, SOUTHERN, WINDOW_18, cardOf, cardWith, givenSummary, moon, nightSummary } from './helpers'

describe('czas efektywny z progiem', () => {
  it('P7: 579 min przy progu −18° → „09:39, próg −18°”', () => {
    const card = cardWith(M31, givenSummary({ darkness: WINDOW_18, effectiveMinutes: 579 }))
    expect(card.effectiveTime).toBe('09:39, próg −18°')
  })

  it('P7: 181 min przy progu obniżonym do −12° → „03:01, próg −12° (obniżony)”', () => {
    const card = cardWith(M31, givenSummary({ darkness: LOWERED_12, effectiveMinutes: 181 }))
    expect(card.effectiveTime).toBe('03:01, próg −12° (obniżony)')
  })

  it('P7: stan „brak okna” → „brak okna przy progu −12°”', () => {
    const card = cardWith(
      M31,
      givenSummary({ darkness: NONE_12, effectiveMinutes: null, transitMs: null, highest: null, moon: null }),
    )
    expect(card.effectiveTime).toBe('brak okna przy progu −12°')
  })

  it('P7 (ta sama reguła, inne wartości): 300 min przy progu obniżonym do −15° → „05:00, próg −15° (obniżony)”', () => {
    const card = cardWith(M31, givenSummary({ darkness: { ...LOWERED_12, thresholdDeg: -15 }, effectiveMinutes: 300 }))
    expect(card.effectiveTime).toBe('05:00, próg −15° (obniżony)')
  })

  it('P7 (dopisek „(obniżony)” tylko przy obniżonym progu): −12° wybrane przez użytkownika → „03:01, próg −12°”', () => {
    const card = cardWith(M31, givenSummary({ darkness: { ...LOWERED_12, lowered: false }, effectiveMinutes: 181 }))
    expect(card.effectiveTime).toBe('03:01, próg −12°')
  })

  it('P7 (ta sama reguła): „brak okna” przy progu −18° bez obniżania → „brak okna przy progu −18°”', () => {
    const card = cardWith(
      M31,
      givenSummary({ darkness: { kind: 'none', thresholdDeg: -18 }, effectiveMinutes: null, transitMs: null, highest: null, moon: null }),
    )
    expect(card.effectiveTime).toBe('brak okna przy progu −18°')
  })

  it('P7 (formatDuration): obiekt niewidoczny w oknie −18° (0 min) → „00:00, próg −18°”', () => {
    const card = cardWith(SOUTHERN, givenSummary({ uid: SOUTHERN.uid, darkness: WINDOW_18, effectiveMinutes: 0, moon: null }))
    expect(card.effectiveTime).toBe('00:00, próg −18°')
  })

  it('P7 (podsumowanie z Workera): M 31 w noc z przykładów, krok 5 min → „09:39, próg −18°”', () => {
    expect(cardOf(M31).effectiveTime).toBe('09:39, próg −18°')
  })
})

describe('najmniejsza separacja od Księżyca w oknie efektywnym', () => {
  it('P8: najmniejsza separacja z podsumowania 47,26° → „47,3°”', () => {
    const card = cardWith(M31, givenSummary({ moon: moon(0.5, 0.34, 47.26) }))
    expect(card.minMoonSeparation).toBe('47,3°')
  })

  it('P8: obiekt bez czasu efektywnego (0 min, bez danych Księżyca) → „—”', () => {
    const card = cardWith(SOUTHERN, givenSummary({ uid: SOUTHERN.uid, effectiveMinutes: 0, moon: null }))
    expect(card.minMoonSeparation).toBe('—')
  })

  it('P8 (ta sama reguła, inna wartość): 130,66° → „130,7°”; separacja w kursorze to osobne pole', () => {
    const card = cardWith(M31, givenSummary({ moon: moon(0.5, 0.34, 130.66) }))
    expect(card.minMoonSeparation).toBe('130,7°')
    expect(card.moonSeparation).toBe('112,8°')
  })

  it('P8 (ta sama reguła): stan „brak okna” → „—”', () => {
    const card = cardWith(
      M31,
      givenSummary({ darkness: NONE_12, effectiveMinutes: null, transitMs: null, highest: null, moon: null }),
    )
    expect(card.minMoonSeparation).toBe('—')
  })

  it('P8 (podsumowanie z Workera): obiekt, który nie wznosi się ponad h_min → „—”; M 31 → separacja z podsumowania', () => {
    expect(nightSummary(SOUTHERN).moon).toBeNull()
    expect(cardOf(SOUTHERN).minMoonSeparation).toBe('—')
    const minSeparationDeg = nightSummary(M31).moon?.minSeparationDeg
    expect(minSeparationDeg).toBeTypeOf('number')
    expect(cardOf(M31).minMoonSeparation).toBe(formatDeg(minSeparationDeg ?? Number.NaN))
  })
})
