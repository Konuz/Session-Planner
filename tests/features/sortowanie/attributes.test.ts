// Sortowanie po rozmiarze i jasności oraz porządek oznaczeń przy remisie i braku wartości (P3, P4, P5).
import { describe, expect, it } from 'vitest'
import { sortCatalog } from '../../../src/services/catalogSort'
import {
  CATALOG,
  IC1805,
  IC1848,
  KLASYKI,
  M1,
  M31,
  M42,
  M45,
  NGC1499,
  NGC6960,
  NGC6992,
  SIMEIS147,
  contextWith,
  designated,
  inputOrders,
  names,
  orderViolations,
  reversed,
  sorted,
  syntheticObject,
} from './helpers'

/** P4: „Klasyki” od najjaśniejszego, potem 17 obiektów bez jasności w porządku oznaczeń z P5. */
const P4_ORDER = [
  'M 45',
  'M 31',
  'M 42',
  'M 33',
  'IC 1805',
  'IC 1848',
  'M 81',
  'M 101',
  'M 1',
  'B 33',
  'IC 1396',
  'LDN 1235',
  'LDN 1251',
  'NGC 281',
  'NGC 1499',
  'NGC 2237',
  'NGC 6888',
  'NGC 6960',
  'NGC 6992',
  'NGC 7000',
  'NGC 7635',
  'Sh2-129',
  'Sh2-155',
  'Simeis 147',
  'vdB 141',
  'vdB 152',
]

describe('P3 rozmiar od największego (wielka oś)', () => {
  const noSize = syntheticObject('test-no-size')
  const P3_OBJECTS = [NGC6960, SIMEIS147, M31, NGC1499, M45, M1, noSize]

  it('P3: NGC 6960 (210′), Simeis 147 (180′), M 31 (177,83′), NGC 1499 (160′), M 45 (150′), M 1 (8′), na końcu obiekt bez rozmiaru', () => {
    for (const input of inputOrders(P3_OBJECTS)) {
      expect(sorted(input, 'size'), names(input).join(', ')).toEqual([
        'NGC 6960',
        'Simeis 147',
        'M 31',
        'NGC 1499',
        'M 45',
        'M 1',
        'test-no-size',
      ])
    }
  })

  // Reguła z „Pytania”: obiekty bez wartości zawsze na końcu, między sobą w porządku oznaczeń (P5).
  it('P3: kilka obiektów bez rozmiaru idzie na koniec w porządku oznaczeń: B 7, LDN 9, LDN 10', () => {
    const objects = [designated('LDN', '10'), M1, designated('B', '7'), designated('LDN', '9'), M45]
    for (const input of inputOrders(objects)) {
      expect(sorted(input, 'size'), names(input).join(', ')).toEqual(['M 45', 'M 1', 'B 7', 'LDN 9', 'LDN 10'])
    }
  })

  // Reguła z „Pytania” i P5: remis rozstrzyga oznaczenie główne; IC 1805 (60 × 60′) i NGC 6992 (60 × 8′).
  it('P3: remis wielkiej osi 60′: NGC 6992, IC 1805 → IC 1805 przed NGC 6992', () => {
    expect(sorted([NGC6992, IC1805], 'size')).toEqual(['IC 1805', 'NGC 6992'])
    expect(sorted([IC1805, NGC6992], 'size')).toEqual(['IC 1805', 'NGC 6992'])
  })

  it('P3: cała lista „Klasyki” (NGC 6992 przed IC 1805 na wejściu) → NGC 6960, Simeis 147, M 31, NGC 1499, M 45 na początku; IC 1805 tuż przed NGC 6992', () => {
    const result = sorted(KLASYKI, 'size')
    expect(result.slice(0, 5)).toEqual(['NGC 6960', 'Simeis 147', 'M 31', 'NGC 1499', 'M 45'])
    expect(result.indexOf('NGC 6992')).toBe(result.indexOf('IC 1805') + 1)
    expect(result).toHaveLength(26)
  })

  // Reguły z „Pytania”: rozmiar malejąco, remis i brak wartości według oznaczenia, obiekty bez rozmiaru na końcu.
  it('P3: cały katalog → wielka oś nie rośnie, remisy w porządku oznaczeń, 573 obiekty bez rozmiaru na końcu w porządku oznaczeń', () => {
    const result = sortCatalog(reversed(CATALOG), 'size', contextWith())
    expect(result).toHaveLength(16_516)
    expect(result.slice(-573).every((object) => object.sizeMajorArcmin === null)).toBe(true)
    expect(orderViolations(result, (object) => (object.sizeMajorArcmin === null ? null : -object.sizeMajorArcmin))).toEqual([])
  })
})

describe('P4 jasność od najjaśniejszego (najmniejsza wartość mag)', () => {
  it('P4: „Klasyki” → M 45 (1,2), M 31 (3,44), M 42 (4), M 33 (5,79), IC 1805, IC 1848 (6,5), M 81 (6,92), M 101 (7,9), M 1 (8,4), potem 17 bez jasności', () => {
    for (const input of inputOrders(KLASYKI)) {
      expect(sorted(input, 'magnitude'), names(input).join(', ')).toEqual(P4_ORDER)
    }
  })

  // Reguła z „Pytania”: od najjaśniejszego (najmniejsza wartość mag); 0 mag i jasność ujemna to wartości, nie brak.
  it('P4: jasności podane wprost 1,2 (M 45), 0, −1,46 i brak → −1,46, 0, M 45, na końcu obiekt bez jasności', () => {
    const zero = syntheticObject('test-0-mag', { magV: 0 })
    const negative = syntheticObject('test-minus-1.46-mag', { magV: -1.46 })
    const none = syntheticObject('test-no-mag')
    for (const input of inputOrders([M45, none, zero, negative])) {
      expect(sorted(input, 'magnitude'), names(input).join(', ')).toEqual([
        'test-minus-1.46-mag',
        'test-0-mag',
        'M 45',
        'test-no-mag',
      ])
    }
  })

  // Reguły z „Pytania”: jasność rosnąco, remis i brak wartości według oznaczenia, obiekty bez jasności na końcu.
  it('P4: cały katalog → jasność nie maleje, 12 319 obiektów bez jasności na końcu w porządku oznaczeń', () => {
    const result = sortCatalog(reversed(CATALOG), 'magnitude', contextWith())
    expect(result).toHaveLength(16_516)
    expect(result.slice(-12_319).every((object) => object.magV === null)).toBe(true)
    expect(orderViolations(result, (object) => object.magV)).toEqual([])
  })
})

describe('P5 remis i brak wartości: oznaczenie główne w porządku naturalnym', () => {
  it('P5: remis jasności 6,5 mag: IC 1848, IC 1805 → IC 1805 przed IC 1848', () => {
    expect(sorted([IC1848, IC1805], 'magnitude')).toEqual(['IC 1805', 'IC 1848'])
    expect(sorted([IC1805, IC1848], 'magnitude')).toEqual(['IC 1805', 'IC 1848'])
  })

  it('P5: „Klasyki” od końca (IC 1848 przed IC 1805 na wejściu) → IC 1805, IC 1848 na miejscach 5 i 6', () => {
    expect(sorted(reversed(KLASYKI), 'magnitude').slice(4, 6)).toEqual(['IC 1805', 'IC 1848'])
  })

  it('P5: obiekty bez jasności z P4 → B 33, IC 1396, LDN 1235, LDN 1251, NGC 281, NGC 1499, …, vdB 152', () => {
    const withoutMagnitude = KLASYKI.filter((object) => object.magV === null)
    expect(withoutMagnitude).toHaveLength(17)
    for (const input of inputOrders(withoutMagnitude)) {
      expect(sorted(input, 'magnitude'), names(input).join(', ')).toEqual(P4_ORDER.slice(9))
    }
  })

  it('P5: porządek naturalny, nie tekstowy: NGC 281 przed NGC 1499, M 1 przed M 81 przed M 101', () => {
    const objects = [designated('NGC', '1499'), designated('M', '101'), designated('NGC', '281'), designated('M', '81'), designated('M', '1')]
    for (const input of inputOrders(objects)) {
      expect(sorted(input, 'magnitude'), names(input).join(', ')).toEqual(['M 1', 'M 81', 'M 101', 'NGC 281', 'NGC 1499'])
    }
  })

  // Reguła: porządek oznaczeń z `formatDesignation(primary)` („Styk z resztą”), nie z uid ani innych oznaczeń.
  it('P5: liczy się oznaczenie główne, nie uid: M 45 (Mel22), M 42 (NGC1976), M 31 (NGC224) bez jasności → M 31, M 42, M 45', () => {
    const objects = [M45, M42, M31].map((object) => ({ ...object, magV: null }))
    for (const input of inputOrders(objects)) {
      expect(sorted(input, 'magnitude'), names(input).join(', ')).toEqual(['M 31', 'M 42', 'M 45'])
    }
  })
})
