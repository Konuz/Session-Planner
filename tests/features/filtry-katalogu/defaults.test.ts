// Stan domyślny filtrów, kolejność wejścia i czysta funkcja (P1, „Styk z resztą”, „Pytania”).
import { describe, expect, it } from 'vitest'
import { DEFAULT_CATALOG_FILTERS, filterCatalog } from '../../../src/services/catalogFilters'
import {
  CATALOG,
  KLASYKI,
  NO_FILTERS,
  contextWith,
  filtersWith,
  names,
  nightResults,
  run,
  uids,
} from './helpers'

describe('P1 żaden filtr nie jest włączony', () => {
  it('P1: stała ze stanem domyślnym: wszystkie filtry wyłączone, także „Widoczne w wybraną noc”; „pokaż obiekty bez jasności” zaznaczone', () => {
    expect(DEFAULT_CATALOG_FILTERS).toEqual(NO_FILTERS)
  })

  it('P1: stan domyślny → przechodzą wszystkie 26 obiektów „Klasyki”, w kolejności wejścia', () => {
    const result = filterCatalog(KLASYKI, DEFAULT_CATALOG_FILTERS, contextWith())
    expect(result).toHaveLength(26)
    expect(uids(result)).toEqual(uids(KLASYKI))
  })

  it('P1: stan domyślny → cały katalog: przechodzi 16 516 obiektów', () => {
    const result = filterCatalog(CATALOG, DEFAULT_CATALOG_FILTERS, contextWith())
    expect(result).toHaveLength(16_516)
    expect(uids(result)).toEqual(uids(CATALOG))
  })

  it('P1: stan domyślny przy gotowych wynikach nocy 16/17.10.2026 → nadal wszystkie 26 (widoczność nie jest filtrowana)', () => {
    const result = filterCatalog(KLASYKI, DEFAULT_CATALOG_FILTERS, contextWith({ results: nightResults(KLASYKI) }))
    expect(uids(result)).toEqual(uids(KLASYKI))
  })

  it('P1: pusty wybór katalogów i pusty wybór typów niczego nie ogranicza: 26 z „Klasyki”, 16 516 z całego katalogu', () => {
    expect(run(KLASYKI, { catalogs: [], types: [] })).toHaveLength(26)
    expect(run(CATALOG, { catalogs: [], types: [] })).toHaveLength(16_516)
  })

  it('P1: pusty wybór katalogów przy wybranym typie ogranicza tylko typ: mgławica ciemna → LDN 1251, LDN 1235, B 33', () => {
    expect(names(run(KLASYKI, { catalogs: [], types: ['dark_nebula'] }))).toEqual(['LDN 1251', 'LDN 1235', 'B 33'])
  })

  it('P1: pusty wybór typów przy wybranym katalogu ogranicza tylko katalog: LDN → LDN 1251, LDN 1235', () => {
    expect(names(run(KLASYKI, { catalogs: ['LDN'], types: [] }))).toEqual(['LDN 1251', 'LDN 1235'])
  })
})

describe('czysta funkcja, wynik w kolejności wejścia', () => {
  // Reguła: obiekty, które przechodzą, w kolejności wejścia („Styk z resztą”).
  it('P1: kolejność wejścia, nie katalogu: „Klasyki” od końca z typem galaktyka → M 81, M 101, M 33, M 31', () => {
    const reversed = [...KLASYKI].reverse()
    expect(names(run(reversed, { types: ['galaxy'] }))).toEqual(['M 81', 'M 101', 'M 33', 'M 31'])
  })

  // Reguła: czysta funkcja („Styk z resztą”).
  it('P1: wejście się nie zmienia: lista obiektów, stan filtrów, wyniki, parametry i zestaw są takie same po filtrowaniu', () => {
    const objects = [...KLASYKI]
    const filters = filtersWith({
      catalogs: ['M', 'LDN'],
      types: ['galaxy', 'dark_nebula'],
      magnitude: { min: 0, max: 10 },
      showWithoutMagnitude: false,
      size: { min: 1, max: 100 },
      visibleTonight: true,
      fitsFrame: true,
    })
    const context = contextWith({ results: nightResults(KLASYKI) })
    const before = structuredClone({ objects, filters, context })
    filterCatalog(objects, filters, context)
    expect({ objects, filters, context }).toEqual(before)
  })
})
