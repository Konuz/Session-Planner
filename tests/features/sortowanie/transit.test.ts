// Sortowanie po godzinie górowania: w kolejności nocy, od wieczora; górowanie w dzień na końcu (P2).
import { describe, expect, it } from 'vitest'
import { sortCatalog } from '../../../src/services/catalogSort'
import { at } from '../../../src/test/fixtures'
import type { DsoObject } from '../../../src/types'
import {
  KLASYKI,
  M1,
  M101,
  M31,
  M33,
  M45,
  M81,
  OCTOBER,
  T9_OBJECTS,
  contextWith,
  inputOrders,
  names,
  orderViolations,
  sorted,
  summary,
  syntheticObject,
} from './helpers'

const transitOf = (object: DsoObject): number | null => {
  const result = OCTOBER.find((candidate) => candidate.uid === object.uid)
  if (!result) throw new Error(`Brak wyniku dla ${object.uid}`)
  return result.transitMs
}

describe('P2 godzina górowania w kolejności nocy, od wieczora', () => {
  it('P2: noc 16/17.10.2026 → NGC 7000 (20:03), IC 1396 (20:42), M 31 (23:46), M 45 (02:50), M 42 (04:38), M 101 (w dzień) na końcu', () => {
    expect(transitOf(M101)).toBeNull()
    for (const input of inputOrders([...T9_OBJECTS, M101])) {
      expect(sorted(input, 'transit'), names(input).join(', ')).toEqual(['NGC 7000', 'IC 1396', 'M 31', 'M 45', 'M 42', 'M 101'])
    }
  })

  it('P2: górowanie 02:50 następnego dnia wypada po 23:46: M 45, M 31 → M 31, M 45', () => {
    expect(sorted([M45, M31], 'transit')).toEqual(['M 31', 'M 45'])
  })

  // Reguła: górowanie porównuje się jako chwilę w czasie, więc kolejność nocy wychodzi sama („Styk z resztą”).
  it('P2: chwile podane wprost 01:00, 19:30, 05:00 i 22:00 CEST → 19:30, 22:00, 01:00, 05:00 (północ po drodze)', () => {
    const times = {
      'test-0100': at('2026-10-17 01:00', 'CEST'),
      'test-1930': at('2026-10-16 19:30', 'CEST'),
      'test-0500': at('2026-10-17 05:00', 'CEST'),
      'test-2200': at('2026-10-16 22:00', 'CEST'),
    }
    const objects = Object.keys(times).map((uid) => syntheticObject(uid))
    const results = Object.entries(times).map(([uid, transitMs]) => summary(uid, 300, transitMs))
    for (const input of inputOrders(objects)) {
      expect(sorted(input, 'transit', { results })).toEqual(['test-1930', 'test-2200', 'test-0100', 'test-0500'])
    }
  })

  // Reguła: chwila w czasie, nie godzina zegara („Styk z resztą”); noc 24/25.10.2026 ze zmianą czasu o 03:00 CEST.
  it('P2: noc zmiany czasu 24/25.10.2026: górowanie 02:15 CET wypada po 02:30 CEST', () => {
    const cet = syntheticObject('test-0215-cet')
    const cest = syntheticObject('test-0230-cest')
    const results = [summary(cet.uid, 300, at('2026-10-25 02:15', 'CET')), summary(cest.uid, 300, at('2026-10-25 02:30', 'CEST'))]
    expect(sorted([cet, cest], 'transit', { results })).toEqual(['test-0230-cest', 'test-0215-cet'])
    expect(sorted([cest, cet], 'transit', { results })).toEqual(['test-0230-cest', 'test-0215-cet'])
  })

  // Reguła z „Pytania”: obiekty bez wartości (górowanie w dzień) zawsze na końcu, w porządku oznaczeń (P5).
  it('P2: kilka obiektów górujących w dzień idzie na koniec w porządku oznaczeń: M 1, M 81, M 101', () => {
    const objects = [M101, M31, M81, M45, M1]
    const results = [
      summary(M101.uid, 60, null),
      summary(M31.uid, 579, at('2026-10-16 23:46', 'CEST')),
      summary(M81.uid, 579, null),
      summary(M45.uid, 434, at('2026-10-17 02:50', 'CEST')),
      summary(M1.uid, 314, null),
    ]
    for (const input of inputOrders(objects)) {
      expect(sorted(input, 'transit', { results }), names(input).join(', ')).toEqual(['M 31', 'M 45', 'M 1', 'M 81', 'M 101'])
    }
  })

  // Reguła z „Pytania” i P5: remis rozstrzyga oznaczenie główne w porządku naturalnym.
  it('P2: równa chwila górowania → porządek oznaczeń: M 101, M 81, M 33, M 31 → M 31, M 33, M 81, M 101', () => {
    const objects = [M101, M81, M33, M31]
    const results = objects.map((object) => summary(object.uid, 300, at('2026-10-17 00:00', 'CEST')))
    for (const input of inputOrders(objects)) {
      expect(sorted(input, 'transit', { results })).toEqual(['M 31', 'M 33', 'M 81', 'M 101'])
    }
  })

  // Reguły z „Pytania”: górowanie od wieczora, remis i brak wartości według oznaczenia, brak wartości na końcu.
  // Że M 81 też góruje w dzień (transitMs null), wynika z wyników `widocznosc-katalogu`, nie z tej spec: sprawdza to
  // pierwsza asercja. M 81 przed M 101 to porządek naturalny oznaczeń (P5).
  it('P2: cała lista „Klasyki” → chwile górowania rosną; M 81 i M 101 (górują w dzień) na końcu jako M 81, M 101', () => {
    const daytime = KLASYKI.filter((object) => transitOf(object) === null)
    expect(names(daytime).sort()).toEqual(['M 101', 'M 81'])
    for (const input of inputOrders(KLASYKI)) {
      const result = sortCatalog(input, 'transit', contextWith())
      expect(result).toHaveLength(26)
      expect(names(result).slice(-2)).toEqual(['M 81', 'M 101'])
      expect(orderViolations(result, transitOf)).toEqual([])
    }
  })
})
