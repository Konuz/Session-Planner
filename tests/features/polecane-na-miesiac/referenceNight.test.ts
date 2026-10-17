// Noc odniesienia „Polecane na miesiąc” [Z22]: 'RRRR-MM-15' z daty wieczoru nocy D (P1–P4, „Styk z resztą”, „Pytania”).
import { describe, expect, it } from 'vitest'
import { referenceNightDate } from '../../../src/services/catalogFilters'

describe('P1–P4 noc odniesienia z daty wieczoru nocy D', () => {
  it('P1: noc D 16/17.10.2026 → noc odniesienia 15/16.10.2026', () => {
    expect(referenceNightDate('2026-10-16')).toBe('2026-10-15')
  })

  it('P2: noc D 31.10/1.11.2026 → noc odniesienia 15/16.10.2026, bo liczy się data wieczoru nocy D', () => {
    expect(referenceNightDate('2026-10-31')).toBe('2026-10-15')
  })

  it('P3: noc D 1/2.11.2026 → noc odniesienia 15/16.11.2026', () => {
    expect(referenceNightDate('2026-11-01')).toBe('2026-11-15')
  })

  it('P4: noc D 15/16.10.2026 → noc odniesienia to ta sama noc', () => {
    expect(referenceNightDate('2026-10-15')).toBe('2026-10-15')
  })
})

// Reguła: noc odniesienia to RRRR-MM-15 z daty nocy D („Styk z resztą”); miesiąc to miesiąc daty wieczoru („Pytania”).
describe('reguła RRRR-MM-15 dla innych nocy D', () => {
  it('P1: noc D 14/15.10.2026 (przed 15.) → noc odniesienia 15/16.10.2026, późniejsza niż noc D', () => {
    expect(referenceNightDate('2026-10-14')).toBe('2026-10-15')
  })

  it('P1: każda noc D października 2026 (od 1/2.10 do 31.10/1.11) → 2026-10-15', () => {
    const nights = Array.from({ length: 31 }, (_, index) => `2026-10-${String(index + 1).padStart(2, '0')}`)
    expect(nights.map(referenceNightDate)).toEqual(Array.from({ length: 31 }, () => '2026-10-15'))
  })

  it('P3: każda noc D listopada 2026 (od 1/2.11 do 30.11/1.12) → 2026-11-15', () => {
    const nights = Array.from({ length: 30 }, (_, index) => `2026-11-${String(index + 1).padStart(2, '0')}`)
    expect(nights.map(referenceNightDate)).toEqual(Array.from({ length: 30 }, () => '2026-11-15'))
  })

  it('P2: przełom roku: noc D 31.12.2026/1.01.2027 → 2026-12-15, a noc D 1/2.01.2027 → 2027-01-15', () => {
    expect(referenceNightDate('2026-12-31')).toBe('2026-12-15')
    expect(referenceNightDate('2027-01-01')).toBe('2027-01-15')
  })

  it('P2: koniec lutego: noc D 28.02/1.03.2026 → 2026-02-15, 29.02/1.03.2028 (rok przestępny) → 2028-02-15, 1/2.03.2026 → 2026-03-15', () => {
    expect(referenceNightDate('2026-02-28')).toBe('2026-02-15')
    expect(referenceNightDate('2028-02-29')).toBe('2028-02-15')
    expect(referenceNightDate('2026-03-01')).toBe('2026-03-15')
  })

  it('P1: miesiąc jednocyfrowy z zerem wiodącym: noc D 7/8.06.2026 → 2026-06-15, 30.09/1.10.2026 → 2026-09-15', () => {
    expect(referenceNightDate('2026-06-07')).toBe('2026-06-15')
    expect(referenceNightDate('2026-09-30')).toBe('2026-09-15')
  })

  it('P4: noc D z 15. dnia innych miesięcy → ta sama noc (2026-11-15, 2027-01-15, 2026-06-15)', () => {
    for (const night of ['2026-11-15', '2027-01-15', '2026-06-15']) expect(referenceNightDate(night)).toBe(night)
  })
})
