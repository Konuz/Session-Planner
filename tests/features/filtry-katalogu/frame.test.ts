// „Pasuje do kadru” aktywnego zestawu: wielka oś w zakresie `fitRange` krótszego boku kadru (P12–P14) [Z21].
import { describe, expect, it } from 'vitest'
import type { DsoObject, EquipmentProfile } from '../../../src/types'
import {
  CATALOG,
  IC1805,
  M1,
  M101,
  M31,
  M33,
  M81,
  MY_SET,
  NGC6888,
  NGC7000,
  NGC7635,
  REDCAT,
  SH2_155,
  fitRangeArcmin,
  names,
  run,
  settingsWith,
  shortSideArcmin,
  syntheticObject,
} from './helpers'

/** Obiekty z P12 w kolejności z przykładu. */
const P12_OBJECTS = [NGC6888, M81, M101, SH2_155, NGC7635, M33, M31, M1]

const fits = (objects: readonly DsoObject[], profile: EquipmentProfile, fitRange?: [number, number]) =>
  names(run(objects, { fitsFrame: true }, { profile, settings: settingsWith(fitRange ? { fitRange } : {}) }))

/** Obiekty syntetyczne 0,01′ po obu stronach obu granic zakresu (granice z `computeOptics`). */
function aroundBounds(profile: EquipmentProfile, fitRange: [number, number]) {
  const [low, high] = fitRangeArcmin(profile, fitRange)
  const object = (uid: string, size: number) => syntheticObject(uid, { sizeMajorArcmin: size })
  return {
    belowLow: object('test-below-low', low - 0.01),
    aboveLow: object('test-above-low', low + 0.01),
    belowHigh: object('test-below-high', high - 0.01),
    aboveHigh: object('test-above-high', high + 0.01),
  }
}

describe('P12 Mój zestaw, zakres domyślny 25–80% [Z21]', () => {
  it('P12: krótszy bok 64,8′, zakres 16,2′–51,84′ → NGC 6888, M 81, M 101, Sh2-155; odpadają NGC 7635, M 33, M 31, M 1', () => {
    const [low, high] = fitRangeArcmin(MY_SET, [0.25, 0.8])
    expect(shortSideArcmin(MY_SET)).toBeCloseTo(64.8, 2)
    expect(low).toBeCloseTo(16.2, 2)
    expect(high).toBeCloseTo(51.84, 2)
    expect(fits(P12_OBJECTS, MY_SET)).toEqual(['NGC 6888', 'M 81', 'M 101', 'Sh2-155'])
  })

  it('P12: obie granice po obu stronach: 0,01′ pod 16,2′ nie, 0,01′ nad tak; 0,01′ pod 51,84′ tak, 0,01′ nad nie', () => {
    const { belowLow, aboveLow, belowHigh, aboveHigh } = aroundBounds(MY_SET, [0.25, 0.8])
    expect(fits([belowLow, aboveLow, belowHigh, aboveHigh], MY_SET)).toEqual([aboveLow.uid, belowHigh.uid])
  })

  it('P12: obiekt bez rozmiaru nie pasuje do kadru', () => {
    const unknown = syntheticObject('test-no-size')
    const sized = syntheticObject('test-size-30', { sizeMajorArcmin: 30 })
    expect(fits([unknown, sized], MY_SET)).toEqual([sized.uid])
  })

  it('P12: „Pasuje do kadru” łączy się z innym filtrem przez „i”: typ galaktyka → M 81, M 101', () => {
    expect(names(run(P12_OBJECTS, { fitsFrame: true, types: ['galaxy'] }, { profile: MY_SET }))).toEqual(['M 81', 'M 101'])
  })
})

describe('P13 inny aktywny zestaw', () => {
  it('P13: RedCat 51 + ASI2600MC Pro (zakres 53,96′–172,7′) → NGC 7000 (120′) pasuje, Sh2-155 (50′) i M 31 (177,83′) nie', () => {
    const [low, high] = fitRangeArcmin(REDCAT, [0.25, 0.8])
    expect(low).toBeCloseTo(53.96, 1)
    expect(high).toBeCloseTo(172.7, 1)
    expect(fits([SH2_155, NGC7000, M31], REDCAT)).toEqual(['NGC 7000'])
  })

  it('P13: te same obiekty z Moim zestawem → pasuje Sh2-155, a NGC 7000 nie', () => {
    expect(fits([SH2_155, NGC7000, M31], MY_SET)).toEqual(['Sh2-155'])
  })

  it('P13: obie granice RedCat po obu stronach (±0,01′)', () => {
    const { belowLow, aboveLow, belowHigh, aboveHigh } = aroundBounds(REDCAT, [0.25, 0.8])
    expect(fits([belowLow, aboveLow, belowHigh, aboveHigh], REDCAT)).toEqual([aboveLow.uid, belowHigh.uid])
  })

  // Reguła: kadr to krótszy bok FOV z `computeOptics` („Styk z resztą”).
  it('P13: liczy się krótszy bok: RedCat z matrycą obróconą (4176 × 6248 px) → ten sam wynik', () => {
    const rotated: EquipmentProfile = { ...REDCAT, camera: { ...REDCAT.camera, resolutionXPx: 4176, resolutionYPx: 6248 } }
    expect(fits([SH2_155, NGC7000, M31, M33, IC1805], rotated)).toEqual(fits([SH2_155, NGC7000, M31, M33, IC1805], REDCAT))
    expect(fits([SH2_155, NGC7000, M31, M33, IC1805], rotated)).toEqual(['NGC 7000', 'M 33', 'IC 1805'])
  })

  it('P13: kadr z computeOptics uwzględnia mnożnik: Mój zestaw z reduktorem 0,5× (krótszy bok 129,6′, 32,4′–103,7′) → Sh2-155, M 33, IC 1805', () => {
    const reduced: EquipmentProfile = { ...MY_SET, reducerFactor: 0.5 }
    expect(fitRangeArcmin(reduced, [0.25, 0.8])[1]).toBeCloseTo(103.68, 1)
    expect(fits([NGC6888, M81, SH2_155, M33, IC1805, NGC7000], reduced)).toEqual(['Sh2-155', 'M 33', 'IC 1805'])
  })

  it('P13: binning nie zmienia kadru: Mój zestaw z binningiem 2 → ten sam wynik co w P12', () => {
    const binned: EquipmentProfile = { ...MY_SET, camera: { ...MY_SET.camera, binning: 2 } }
    expect(fits(P12_OBJECTS, binned)).toEqual(['NGC 6888', 'M 81', 'M 101', 'Sh2-155'])
  })
})

describe('P14 zakres „Pasuje do kadru” z parametrów planowania', () => {
  it('P14: zakres 25–100% → dla Mojego zestawu pasuje też M 33 (62,09′)', () => {
    expect(fits(P12_OBJECTS, MY_SET, [0.25, 1])).toEqual(['NGC 6888', 'M 81', 'M 101', 'Sh2-155', 'M 33'])
  })

  // Reguła: zakres `fitRange` z parametrów planowania („Styk z resztą”, Z21).
  it('P14: zakres 30–50% (19,44′–32,4′) → NGC 6888, M 81, M 101; Sh2-155 (50′) już nie', () => {
    expect(fits(P12_OBJECTS, MY_SET, [0.3, 0.5])).toEqual(['NGC 6888', 'M 81', 'M 101'])
  })

  it('P14: zakres 10–25% (6,48′–16,2′) → NGC 7635 (15′) i M 1 (8′)', () => {
    expect(fits(P12_OBJECTS, MY_SET, [0.1, 0.25])).toEqual(['NGC 7635', 'M 1'])
  })

  it('P14: granice zakresu 30–50% po obu stronach (±0,01′)', () => {
    const { belowLow, aboveLow, belowHigh, aboveHigh } = aroundBounds(MY_SET, [0.3, 0.5])
    expect(fits([belowLow, aboveLow, belowHigh, aboveHigh], MY_SET, [0.3, 0.5])).toEqual([aboveLow.uid, belowHigh.uid])
  })

  // Reguła z „Pytania”: granice „Pasuje do kadru” włącznie. Części 0,25 i 0,5 są dokładne w zapisie binarnym, więc
  // wielka oś równa krótszemu bokowi [′] × 0,25 albo × 0,5 leży dokładnie na granicy przy mnożeniu i przy dzieleniu.
  it('P14: zakres 25–50%: obiekty dokładnie na obu granicach (krótszy bok × 0,25 i × 0,5) pasują, Mój zestaw i RedCat', () => {
    for (const profile of [MY_SET, REDCAT]) {
      const [low, high] = fitRangeArcmin(profile, [0.25, 0.5])
      const onLow = syntheticObject('test-on-low', { sizeMajorArcmin: low })
      const onHigh = syntheticObject('test-on-high', { sizeMajorArcmin: high })
      expect(fits([onLow, onHigh], profile, [0.25, 0.5]), profile.name).toEqual([onLow.uid, onHigh.uid])
    }
  })

  it('P14: cały katalog: kadr większy od każdego obiektu i zakres 0–100% → odpadają dokładnie 573 obiekty bez rozmiaru', () => {
    const wideLens: EquipmentProfile = {
      ...MY_SET,
      telescope: { specId: null, label: 'Obiektyw 50 mm', apertureMm: 25, focalLengthMm: 50 },
      camera: { ...MY_SET.camera, specId: null, label: 'Matryca 36 × 24 mm', resolutionXPx: 6000, resolutionYPx: 4000, pixelSizeUm: 6 },
    }
    const largest = Math.max(...CATALOG.map((object) => object.sizeMajorArcmin ?? 0))
    expect(shortSideArcmin(wideLens)).toBeGreaterThan(largest)
    const result = run(CATALOG, { fitsFrame: true }, { profile: wideLens, settings: settingsWith({ fitRange: [0, 1] }) })
    expect(result).toHaveLength(16_516 - 573)
    expect(result.filter((object) => object.sizeMajorArcmin === null)).toEqual([])
  })

  it('P14: cały katalog, Mój zestaw i zakres domyślny → żadnego obiektu bez rozmiaru; każdy wynik ma wielką oś 16,2′–51,84′', () => {
    const [low, high] = fitRangeArcmin(MY_SET, [0.25, 0.8])
    const result = run(CATALOG, { fitsFrame: true }, { profile: MY_SET })
    expect(result.filter((object) => object.sizeMajorArcmin === null)).toEqual([])
    expect(result.length).toBeGreaterThan(0)
    expect(
      result.filter((object) => object.sizeMajorArcmin === null || object.sizeMajorArcmin < low || object.sizeMajorArcmin > high),
    ).toEqual([])
    const expected = CATALOG.filter(
      (object) => object.sizeMajorArcmin !== null && object.sizeMajorArcmin >= low && object.sizeMajorArcmin <= high,
    )
    expect(result.map((object) => object.uid)).toEqual(expected.map((object) => object.uid))
  })
})
