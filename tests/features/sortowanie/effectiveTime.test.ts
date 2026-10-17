// Sortowanie po czasie efektywnym (domyślne): od najdłuższego, bez wartości na końcu (P1, P8).
import { describe, expect, it } from 'vitest'
import { DEFAULT_CATALOG_SORT, sortCatalog } from '../../../src/services/catalogSort'
import type { DsoObject } from '../../../src/types'
import {
  IC1396,
  JUNE_21_NO_WINDOW_PARAMS,
  KLASYKI,
  M1,
  M101,
  M31,
  M33,
  M42,
  M45,
  M81,
  NGC7000,
  NO_WINDOW,
  OCTOBER,
  T9_OBJECTS,
  contextWith,
  inputOrders,
  names,
  nightResults,
  orderViolations,
  reversed,
  sorted,
  summary,
  syntheticObject,
} from './helpers'

const P1_ORDER = ['M 31', 'IC 1396', 'M 45', 'NGC 7000', 'M 42']

/** Pięć obiektów z T9 i M 101 w porządku oznaczeń (P5): numerycznie M 31 < M 42 < M 45 < M 101. */
const DESIGNATION_ORDER_T9_M101 = ['IC 1396', 'M 31', 'M 42', 'M 45', 'M 101', 'NGC 7000']
const T9_M101 = [...T9_OBJECTS, M101]

describe('P1 czas efektywny od najdłuższego (domyślnie)', () => {
  it('P1: sortowanie domyślne to czas efektywny', () => {
    expect(DEFAULT_CATALOG_SORT).toBe('effectiveTime')
  })

  it('P1: noc 16/17.10.2026, sortowanie domyślne → M 31, IC 1396, M 45, NGC 7000, M 42 przy każdej kolejności wejścia', () => {
    for (const input of inputOrders(T9_OBJECTS)) {
      expect(names(sortCatalog(input, DEFAULT_CATALOG_SORT, contextWith())), names(input).join(', ')).toEqual(P1_ORDER)
    }
  })

  it('P1: klucz „czas efektywny” → ta sama kolejność: M 31, IC 1396, M 45, NGC 7000, M 42', () => {
    expect(sorted([M42, NGC7000, M45, IC1396, M31], 'effectiveTime')).toEqual(P1_ORDER)
  })

  // Reguła: wyniki nocy D z `widocznosc-katalogu`, dopasowane po uid („Styk z resztą”).
  it('P1: wyniki tylko tych pięciu obiektów, w odwrotnej kolejności → nadal M 31, IC 1396, M 45, NGC 7000, M 42', () => {
    const results = reversed(nightResults(T9_OBJECTS))
    expect(sorted(reversed(T9_OBJECTS), 'effectiveTime', { results })).toEqual(P1_ORDER)
  })

  it('P1: cała lista „Klasyki” (26) → pięć obiektów z T9 stoi w kolejności M 31, IC 1396, M 45, NGC 7000, M 42', () => {
    const result = sorted(reversed(KLASYKI), 'effectiveTime')
    expect(result).toHaveLength(26)
    expect(result.filter((name) => P1_ORDER.includes(name))).toEqual(P1_ORDER)
  })

  // Reguła z „Pytania”: czas efektywny malejąco, remis rozstrzyga oznaczenie główne w porządku naturalnym.
  it('P1: cała lista „Klasyki” → czas efektywny nie rośnie, a przy równym czasie oznaczenia idą w porządku naturalnym', () => {
    const minutes = new Map(OCTOBER.map((result) => [result.uid, result.effectiveMinutes]))
    for (const input of inputOrders(KLASYKI)) {
      const result = sortCatalog(input, 'effectiveTime', contextWith())
      const rank = (object: DsoObject) => {
        const value = minutes.get(object.uid)
        return value === undefined || value === null ? null : -value
      }
      expect(orderViolations(result, rank)).toEqual([])
    }
  })

  // Reguła z „Pytania”: czas efektywny malejąco; czasy podane wprost.
  it('P1: czasy podane wprost 5, 600, 0 i 300 min → 600, 300, 5, 0 min', () => {
    const minutes = [5, 600, 0, 300]
    const objects = minutes.map((value) => syntheticObject(`test-${value}-min`))
    const results = minutes.map((value) => summary(`test-${value}-min`, value))
    for (const input of inputOrders(objects)) {
      expect(sorted(input, 'effectiveTime', { results })).toEqual(['test-600-min', 'test-300-min', 'test-5-min', 'test-0-min'])
    }
  })

  // Reguła z „Pytania” i P5: remis rozstrzyga oznaczenie główne w porządku naturalnym (liczby rosnąco).
  it('P1: remis czasu efektywnego (579 min) rozstrzyga oznaczenie: M 101, M 81, M 33, M 31 → M 31, M 33, M 81, M 101', () => {
    const objects = [M101, M81, M33, M31]
    const results = objects.map((object) => summary(object.uid, 579))
    for (const input of inputOrders(objects)) {
      expect(sorted(input, 'effectiveTime', { results })).toEqual(['M 31', 'M 33', 'M 81', 'M 101'])
    }
  })
})

describe('P8 brak wyników albo brak okna: wszystkie obiekty bez wartości', () => {
  it('P8: wyniki jeszcze się liczą (null) → porządek oznaczeń z P5: IC 1396, M 31, M 42, M 45, M 101, NGC 7000', () => {
    for (const input of inputOrders(T9_M101)) {
      expect(sorted(input, 'effectiveTime', { results: null }), names(input).join(', ')).toEqual(DESIGNATION_ORDER_T9_M101)
    }
  })

  it('P8: noc bez okna (21/22.06.2026 na 54,83°N, wynik z widocznosc-katalogu) → porządek oznaczeń z P5', () => {
    const results = nightResults(T9_M101, JUNE_21_NO_WINDOW_PARAMS)
    expect(results.map((result) => result.effectiveMinutes)).toEqual([null, null, null, null, null, null])
    for (const input of inputOrders(T9_M101)) {
      expect(sorted(input, 'effectiveTime', { results }), names(input).join(', ')).toEqual(DESIGNATION_ORDER_T9_M101)
    }
  })

  it('P8: stan „brak okna” podany wprost (czas null) → porządek oznaczeń: M 1, M 31, M 81, M 101', () => {
    const objects = [M101, M81, M31, M1]
    const results = objects.map((object) => summary(object.uid, null, null, NO_WINDOW))
    for (const input of inputOrders(objects)) {
      expect(sorted(input, 'effectiveTime', { results })).toEqual(['M 1', 'M 31', 'M 81', 'M 101'])
    }
  })

  it('P8: obiekt z czasem 0 min stoi przed obiektami bez wartości: M 42 (0 min), reszta bez wartości → M 42, potem porządek oznaczeń', () => {
    const results = T9_M101.map((object) => summary(object.uid, object === M42 ? 0 : null))
    for (const input of inputOrders(T9_M101)) {
      expect(sorted(input, 'effectiveTime', { results }), names(input).join(', ')).toEqual([
        'M 42',
        'IC 1396',
        'M 31',
        'M 45',
        'M 101',
        'NGC 7000',
      ])
    }
  })

  // Reguła z „Pytania”: obiekty bez wartości są zawsze na końcu, w porządku oznaczeń.
  it('P8: obiekty z czasem przed obiektami bez wartości: M 101 (60 min), M 45 (0 min), NGC 7000 (300 min), reszta null', () => {
    const minutes = new Map([
      [M101, 60],
      [M45, 0],
      [NGC7000, 300],
    ])
    const results = T9_M101.map((object) => summary(object.uid, minutes.get(object) ?? null))
    for (const input of inputOrders(T9_M101)) {
      expect(sorted(input, 'effectiveTime', { results }), names(input).join(', ')).toEqual([
        'NGC 7000',
        'M 101',
        'M 45',
        'IC 1396',
        'M 31',
        'M 42',
      ])
    }
  })
})
