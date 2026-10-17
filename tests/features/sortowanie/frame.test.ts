// Sortowanie po dopasowaniu do kadru aktywnego zestawu: wielka oś najbliżej środka zakresu „Pasuje do kadru” (P6, P7).
import { describe, expect, it } from 'vitest'
import type { DsoObject, EquipmentProfile } from '../../../src/types'
import {
  IC1848,
  LDN1251,
  M1,
  M101,
  M31,
  M33,
  MY_SET,
  NGC2237,
  NGC281,
  NGC6888,
  NGC7000,
  REDCAT,
  SH2_155,
  designated,
  fitRangeSettings,
  frameCenterArcmin,
  inputOrders,
  names,
  shortSideArcmin,
  sorted,
  syntheticObject,
} from './helpers'

/** Obiekty z P6. */
const P6_OBJECTS = [NGC281, LDN1251, IC1848, M101, SH2_155, M31]
const P6_ORDER = ['NGC 281', 'LDN 1251', 'IC 1848', 'M 101', 'Sh2-155', 'M 31']

const fit = (objects: readonly DsoObject[], profile: EquipmentProfile, fitRange?: [number, number]) =>
  sorted(objects, 'frameFit', fitRange ? { profile, settings: fitRangeSettings(fitRange) } : { profile })

describe('P6 dopasowanie do kadru Mojego zestawu (środek zakresu 34,02′)', () => {
  it('P6: NGC 281 (35′), LDN 1251 (29,9′), IC 1848 (40′), M 101 (23,99′), Sh2-155 (50′), M 31 (177,83′) przy każdej kolejności wejścia', () => {
    expect(frameCenterArcmin(MY_SET)).toBeCloseTo(34.02, 2)
    for (const input of inputOrders(P6_OBJECTS)) {
      expect(fit(input, MY_SET), names(input).join(', ')).toEqual(P6_ORDER)
    }
  })

  it('P6: obiekt bez rozmiaru idzie na koniec', () => {
    const noSize = syntheticObject('test-no-size')
    for (const input of inputOrders([noSize, ...P6_OBJECTS])) {
      expect(fit(input, MY_SET), names(input).join(', ')).toEqual([...P6_ORDER, 'test-no-size'])
    }
  })

  // Reguła z „Pytania”: obiekty bez wartości zawsze na końcu, między sobą w porządku oznaczeń (P5).
  it('P6: kilka obiektów bez rozmiaru → na końcu w porządku oznaczeń: B 7, LDN 9, LDN 10', () => {
    const objects = [designated('LDN', '10'), M31, designated('B', '7'), NGC281, designated('LDN', '9')]
    for (const input of inputOrders(objects)) {
      expect(fit(input, MY_SET), names(input).join(', ')).toEqual(['NGC 281', 'M 31', 'B 7', 'LDN 9', 'LDN 10'])
    }
  })

  // Reguła z „Pytania”: miarą jest odległość wielkiej osi od środka zakresu, w minutach kątowych (jak w P6).
  it('P6: odległość w minutach kątowych: NGC 6888 (20′, 14,02′ od środka) przed Sh2-155 (50′, 15,98′ od środka)', () => {
    expect(fit([SH2_155, NGC6888], MY_SET)).toEqual(['NGC 6888', 'Sh2-155'])
    expect(fit([NGC6888, SH2_155], MY_SET)).toEqual(['NGC 6888', 'Sh2-155'])
  })

  it('P6: po obu stronach środka liczy się sama odległość: 10′ pod środkiem przed 11′ nad, 10′ nad przed 11′ pod', () => {
    const center = frameCenterArcmin(MY_SET)
    const below10 = syntheticObject('test-below-10', { sizeMajorArcmin: center - 10 })
    const above11 = syntheticObject('test-above-11', { sizeMajorArcmin: center + 11 })
    const below11 = syntheticObject('test-below-11', { sizeMajorArcmin: center - 11 })
    const above10 = syntheticObject('test-above-10', { sizeMajorArcmin: center + 10 })
    expect(fit([above11, below10], MY_SET)).toEqual(['test-below-10', 'test-above-11'])
    expect(fit([below11, above10], MY_SET)).toEqual(['test-above-10', 'test-below-11'])
  })

  it('P6: wielka oś równa środkowi zakresu jest najlepsza: przed NGC 281 (0,98′ od środka)', () => {
    const exact = syntheticObject('test-center', { sizeMajorArcmin: frameCenterArcmin(MY_SET) })
    expect(fit([NGC281, exact], MY_SET)).toEqual(['test-center', 'NGC 281'])
  })

  // Reguła z „Pytania” i P5: remis rozstrzyga oznaczenie główne w porządku naturalnym.
  it('P6: równa wielka oś (30′) → porządek oznaczeń: LDN 10, LDN 9, B 7 → B 7, LDN 9, LDN 10', () => {
    const objects = ['10', '9'].map((id) => designated('LDN', id, { sizeMajorArcmin: 30 }))
    const input = [...objects, designated('B', '7', { sizeMajorArcmin: 30 })]
    for (const order of inputOrders(input)) {
      expect(fit(order, MY_SET), names(order).join(', ')).toEqual(['B 7', 'LDN 9', 'LDN 10'])
    }
  })

  // Reguła: zakres `fitRange` z parametrów planowania („Styk z resztą”); środek 62,5% krótszego boku = 40,5′.
  it('P6: zakres z parametrów 25–100% (środek 40,5′) → IC 1848, NGC 281, Sh2-155, LDN 1251, M 101, M 31', () => {
    expect(frameCenterArcmin(MY_SET, [0.25, 1])).toBeCloseTo(40.5, 2)
    for (const input of inputOrders(P6_OBJECTS)) {
      expect(fit(input, MY_SET, [0.25, 1]), names(input).join(', ')).toEqual([
        'IC 1848',
        'NGC 281',
        'Sh2-155',
        'LDN 1251',
        'M 101',
        'M 31',
      ])
    }
  })

  // Reguła: kadr aktywnego zestawu z `computeOptics` („Styk z resztą”); reduktor 0,5× → krótszy bok 129,6′, środek 68,04′.
  it('P6: Mój zestaw z reduktorem 0,5× (środek 68,04′) → M 33, NGC 2237, Sh2-155, IC 1848, NGC 281, NGC 7000, M 31', () => {
    const reduced: EquipmentProfile = { ...MY_SET, reducerFactor: 0.5 }
    expect(shortSideArcmin(reduced)).toBeCloseTo(129.6, 1)
    const objects = [NGC281, IC1848, SH2_155, M33, NGC2237, NGC7000, M31]
    for (const input of inputOrders(objects)) {
      expect(fit(input, reduced), names(input).join(', ')).toEqual([
        'M 33',
        'NGC 2237',
        'Sh2-155',
        'IC 1848',
        'NGC 281',
        'NGC 7000',
        'M 31',
      ])
    }
  })
})

describe('P7 dopasowanie do kadru innego zestawu', () => {
  it('P7: RedCat 51 + ASI2600MC Pro (środek 113,3′): M 1, M 31, NGC 7000 → NGC 7000 (120′), M 31 (177,83′), M 1 (8′)', () => {
    expect(frameCenterArcmin(REDCAT)).toBeCloseTo(113.3, 1)
    for (const input of inputOrders([M1, M31, NGC7000])) {
      expect(fit(input, REDCAT), names(input).join(', ')).toEqual(['NGC 7000', 'M 31', 'M 1'])
    }
  })

  // Reguła: kadr aktywnego zestawu („Styk z resztą”); Mój zestaw ma środek 34,02′.
  it('P7: te same obiekty z Moim zestawem → M 1 (26,02′ od środka), NGC 7000 (85,98′), M 31 (143,81′)', () => {
    for (const input of inputOrders([M1, M31, NGC7000])) {
      expect(fit(input, MY_SET), names(input).join(', ')).toEqual(['M 1', 'NGC 7000', 'M 31'])
    }
  })

  it('P7: RedCat i obiekt bez rozmiaru → obiekt bez rozmiaru na końcu', () => {
    const noSize = syntheticObject('test-no-size')
    expect(fit([noSize, M1, NGC7000, M31], REDCAT)).toEqual(['NGC 7000', 'M 31', 'M 1', 'test-no-size'])
  })
})
