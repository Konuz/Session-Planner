// Czysta funkcja: nowa lista z tymi samymi obiektami, wejście się nie zmienia („Styk z resztą”).
import { describe, expect, it } from 'vitest'
import { sortCatalog, type CatalogSortKey } from '../../../src/services/catalogSort'
import type { DsoObject } from '../../../src/types'
import { KLASYKI, OCTOBER, REDCAT, contextWith, fitRangeSettings, reversed, uids } from './helpers'

/** Pięć kluczy sortowania. */
const KEYS: readonly CatalogSortKey[] = ['effectiveTime', 'transit', 'size', 'magnitude', 'frameFit']

/** „Klasyki” od końca (każdy obiekt ma wynik nocy 16/17.10.2026). */
const objects: DsoObject[] = reversed(KLASYKI)

describe('czysta funkcja („Styk z resztą”)', () => {
  it('każdy klucz: wynik to nowa lista z tymi samymi obiektami (te same uid, ta sama liczba)', () => {
    for (const key of KEYS) {
      const input = [...objects]
      const result = sortCatalog(input, key, contextWith())
      expect(result, key).not.toBe(input)
      expect(result, key).toHaveLength(input.length)
      expect([...uids(result)].sort(), key).toEqual([...uids(input)].sort())
    }
  })

  it('każdy klucz: lista obiektów, wyniki nocy, parametry i zestaw są takie same po sortowaniu', () => {
    for (const key of KEYS) {
      const input = [...objects]
      const context = contextWith({ results: [...OCTOBER].reverse(), profile: REDCAT, settings: fitRangeSettings([0.3, 0.9]) })
      const before = structuredClone({ input, context })
      sortCatalog(input, key, context)
      expect({ input, context }, key).toEqual(before)
    }
  })

  it('każdy klucz: zamrożona lista obiektów i zamrożone wyniki nocy → sortowanie działa i zwraca wszystkie obiekty', () => {
    for (const key of KEYS) {
      const input = Object.freeze([...objects])
      const results = Object.freeze([...OCTOBER])
      const result = sortCatalog(input, key, contextWith({ results }))
      expect(result, key).toHaveLength(input.length)
      expect(uids(input), key).toEqual(uids(objects))
    }
  })
})
