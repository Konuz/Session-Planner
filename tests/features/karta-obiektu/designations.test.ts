// Oznaczenia, nazwa i typ na karcie (P1, P2, P3, P10). Teksty z `formatDesignation`.
import { describe, expect, it } from 'vitest'
import type { DsoObject, DsoType } from '../../../src/types'
import {
  HCG79,
  IC1090,
  LDN1235,
  M101,
  M13,
  M31,
  M42,
  M45,
  M57,
  NGC6960,
  NGC7000,
  SH2_155,
  SIMEIS147,
  VDB141,
  cardOf,
} from './helpers'

describe('oznaczenie główne, pozostałe oznaczenia i nazwa zwyczajowa', () => {
  it('P1: M 31 → oznaczenie główne „M 31”, pozostałe „NGC 224”, nazwa „Andromeda Galaxy”, typ „galaktyka”', () => {
    const card = cardOf(M31)
    expect(card.primary).toBe('M 31')
    expect(card.otherDesignations).toBe('NGC 224')
    expect(card.name).toBe('Andromeda Galaxy')
    expect(card.type).toBe('galaxy')
    expect(card.typeLabel).toBe('galaktyka')
  })

  it('P2: Sh2-155 → pozostałe „LBN 529, C 9”, nazwa „Cave Nebula”', () => {
    const card = cardOf(SH2_155)
    expect(card.primary).toBe('Sh2-155')
    expect(card.otherDesignations).toBe('LBN 529, C 9')
    expect(card.name).toBe('Cave Nebula')
  })

  it('P2: M 45 → pozostałe „Mel 22”, nazwa „Pleiades”', () => {
    const card = cardOf(M45)
    expect(card.primary).toBe('M 45')
    expect(card.otherDesignations).toBe('Mel 22')
    expect(card.name).toBe('Pleiades')
  })

  it('P2: LDN 1235 → bez wiersza nazwy i bez wiersza pozostałych oznaczeń (oba pola null)', () => {
    const card = cardOf(LDN1235)
    expect(card.primary).toBe('LDN 1235')
    expect(card.otherDesignations).toBeNull()
    expect(card.name).toBeNull()
  })

  it('P2 (reguła „pozostałe” = wszystkie oznaczenia bez głównego, w kolejności z katalogu): M 101 → „M 102, NGC 5457”, bez nazwy', () => {
    const card = cardOf(M101)
    expect(card.primary).toBe('M 101')
    expect(card.otherDesignations).toBe('M 102, NGC 5457')
    expect(card.name).toBeNull()
  })

  it('P2 (ta sama reguła): Simeis 147 → „Sh2-240, G180.0-01.7”; oznaczenie główne nie musi być pierwsze na liście', () => {
    expect(cardOf(SIMEIS147).otherDesignations).toBe('Sh2-240, G180.0-01.7')
    const reordered: DsoObject = { ...M31, designations: [{ catalog: 'NGC', id: '224' }, { catalog: 'M', id: '31' }] }
    const card = cardOf(reordered)
    expect(card.primary).toBe('M 31')
    expect(card.otherDesignations).toBe('NGC 224')
  })

  it('P3: NGC 6960 ma trzy nazwy zwyczajowe; karta pokazuje pierwszą, „Veil Nebula”', () => {
    expect(NGC6960.commonNames).toHaveLength(3)
    const card = cardOf(NGC6960)
    expect(card.name).toBe('Veil Nebula')
    expect(card.otherDesignations).toBe('LBN 191')
  })

  it('P3 (ta sama reguła): M 42 ma dwie nazwy → „Great Orion Nebula”', () => {
    expect(cardOf(M42).name).toBe('Great Orion Nebula')
  })
})

/** Etykiety typów z P10 i obiekt katalogu każdego typu. */
const TYPE_LABELS: readonly (readonly [DsoType, string, DsoObject])[] = [
  ['galaxy', 'galaktyka', M31],
  ['galaxy_group', 'grupa galaktyk', HCG79],
  ['emission_nebula', 'mgławica emisyjna', NGC7000],
  ['reflection_nebula', 'mgławica refleksyjna', VDB141],
  ['dark_nebula', 'mgławica ciemna', LDN1235],
  ['planetary_nebula', 'mgławica planetarna', M57],
  ['supernova_remnant', 'pozostałość po supernowej', SIMEIS147],
  ['open_cluster', 'gromada otwarta', M45],
  ['globular_cluster', 'gromada kulista', M13],
  ['cluster_nebula', 'gromada z mgławicą', M42],
  ['other', 'inny obiekt', IC1090],
]

describe('etykiety typów', () => {
  it('P10: Simeis 147 → „pozostałość po supernowej”, M 42 → „gromada z mgławicą”', () => {
    expect(cardOf(SIMEIS147).typeLabel).toBe('pozostałość po supernowej')
    expect(cardOf(M42).typeLabel).toBe('gromada z mgławicą')
  })

  it.each(TYPE_LABELS)('P10: typ %s → etykieta „%s”', (type, label, object) => {
    expect(object.type).toBe(type)
    const card = cardOf(object)
    expect(card.type).toBe(type)
    expect(card.typeLabel).toBe(label)
  })
})
