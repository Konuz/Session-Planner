import { describe, expect, it } from 'vitest'
import type { CatalogId, Designation, DsoObject, DsoType } from '../../types'
import { mergeRecords, type AliasPair } from './merge'
import type { CatalogSource, DuplicateRecord, ObjectRecord, RecordData } from './records'

const d = (catalog: CatalogId, id: string): Designation => ({ catalog, id })

const SOURCE_TYPE: Record<CatalogSource, DsoType> = {
  OpenNGC: 'emission_nebula',
  'VizieR VII/20': 'emission_nebula',
  'VizieR VII/7A': 'dark_nebula',
  'VizieR VII/9': 'emission_nebula',
  'VizieR VII/21': 'reflection_nebula',
  'VizieR VII/220A': 'dark_nebula',
  'VizieR VII/297': 'supernova_remnant',
}

function record(
  source: CatalogSource,
  designations: Designation[],
  data: Partial<RecordData> = {},
  crossIds: Designation[] = [],
  commonNames: string[] = [],
): ObjectRecord {
  return {
    kind: 'object',
    source,
    designations,
    crossIds,
    commonNames,
    data: {
      type: SOURCE_TYPE[source],
      raDeg: 10,
      decDeg: 20,
      sizeMajorArcmin: null,
      sizeMinorArcmin: null,
      positionAngleDeg: null,
      magV: null,
      surfaceBrightness: null,
      ldnOpacity: null,
      sh2Brightness: null,
      lbnBrightness: null,
      vdbStarMagV: null,
      ...data,
    },
  }
}

const duplicate = (designation: Designation, target: Designation): DuplicateRecord => ({
  kind: 'duplicate',
  source: 'OpenNGC',
  designations: [designation],
  crossIds: [target],
})

function only(objects: DsoObject[]): DsoObject {
  expect(objects).toHaveLength(1)
  return objects[0]
}

describe('łączenie oznaczeń (6.2, Z23)', () => {
  it('wiersz Dup z OpenNGC dołącza oznaczenie do obiektu głównego', () => {
    const { objects } = mergeRecords([record('OpenNGC', [d('NGC', '281')]), duplicate(d('IC', '11'), d('NGC', '281'))], [])
    expect(only(objects)).toMatchObject({ uid: 'NGC281', designations: [d('NGC', '281'), d('IC', '11')], sources: ['OpenNGC'] })
  })

  it('B 33 z addendum OpenNGC i z VII/220A to jeden obiekt; rozmiar i współrzędne z OpenNGC', () => {
    const { objects } = mergeRecords(
      [
        record('VizieR VII/220A', [d('B', '33')], { raDeg: 85.2206, decDeg: -2.4658, sizeMajorArcmin: 4 }),
        record('OpenNGC', [d('B', '33')], { type: 'dark_nebula', raDeg: 85.2458, decDeg: -2.4583, sizeMajorArcmin: 6, sizeMinorArcmin: 4 }, [], ['Horsehead Nebula']),
      ],
      [],
    )
    expect(only(objects)).toMatchObject({
      uid: 'B33',
      primary: d('B', '33'),
      designations: [d('B', '33')],
      sources: ['OpenNGC', 'VizieR VII/220A'],
      raDeg: 85.2458,
      sizeMajorArcmin: 6,
      sizeMinorArcmin: 4,
      commonNames: ['Horsehead Nebula'],
    })
  })

  it('alias IC 1396 = Sh2-131: współrzędne i typ z OpenNGC, jasność Sh2 z własnego katalogu', () => {
    const { objects } = mergeRecords(
      [
        record('OpenNGC', [d('IC', '1396')], { type: 'cluster_nebula', raDeg: 324.74, decDeg: 57.49, sizeMajorArcmin: 14 }),
        record('VizieR VII/20', [d('Sh2', '131')], { raDeg: 324.5, decDeg: 57.3, sizeMajorArcmin: 170, sh2Brightness: 2 }),
      ],
      [[d('IC', '1396'), d('Sh2', '131')]],
    )
    expect(only(objects)).toMatchObject({
      uid: 'IC1396',
      primary: d('IC', '1396'),
      type: 'cluster_nebula',
      raDeg: 324.74,
      sizeMajorArcmin: 14,
      sh2Brightness: 2,
      sources: ['OpenNGC', 'VizieR VII/20'],
    })
  })

  it('aliasy łańcuchowe: Simeis 147 = Sh2-240 = G180.0-01.7; typ SNR z Greena przed Sh2', () => {
    const aliases: AliasPair[] = [
      [d('Simeis', '147'), d('Sh2', '240')],
      [d('Simeis', '147'), d('SNR-G', 'G180.0-01.7')],
    ]
    const { objects } = mergeRecords(
      [
        record('VizieR VII/297', [d('SNR-G', 'G180.0-01.7')], { raDeg: 84.75, sizeMajorArcmin: 180 }, [], ['S147']),
        record('VizieR VII/20', [d('Sh2', '240')], { raDeg: 85.25, sizeMajorArcmin: 180, sh2Brightness: 2 }),
      ],
      aliases,
    )
    expect(only(objects)).toMatchObject({
      uid: 'Sh2-240',
      primary: d('Simeis', '147'),
      designations: [d('Simeis', '147'), d('Sh2', '240'), d('SNR-G', 'G180.0-01.7')],
      type: 'supernova_remnant',
      raDeg: 85.25,
      commonNames: ['S147'],
    })
  })

  it('alias vdB 141 = Sh2-136: typ refleksyjny z VdB, oznaczenie główne vdB 141', () => {
    const { objects } = mergeRecords(
      [record('VizieR VII/20', [d('Sh2', '136')]), record('VizieR VII/21', [d('VdB', '141')], { vdbStarMagV: 9.4 })],
      [[d('VdB', '141'), d('Sh2', '136')]],
    )
    expect(only(objects)).toMatchObject({ primary: d('VdB', '141'), type: 'reflection_nebula', vdbStarMagV: 9.4 })
  })

  it('pojedyncze krzyżowe ID z OpenNGC łączy z rekordem LBN', () => {
    const { objects } = mergeRecords(
      [
        record('OpenNGC', [d('NGC', '7000')], { type: 'emission_nebula' }, [d('LBN', '373')], ['North America Nebula']),
        record('VizieR VII/9', [d('LBN', '373')], { lbnBrightness: 4 }),
      ],
      [],
    )
    expect(only(objects)).toMatchObject({ uid: 'NGC7000', designations: [d('NGC', '7000'), d('LBN', '373')], lbnBrightness: 4 })
  })

  it('kilka obiektów jednego katalogu w krzyżowych ID to części, nie ten sam obiekt', () => {
    const { objects } = mergeRecords(
      [
        record('OpenNGC', [d('IC', '1396')], {}, [d('LBN', '451'), d('LBN', '452')]),
        record('VizieR VII/9', [d('LBN', '451')]),
        record('VizieR VII/9', [d('LBN', '452')]),
      ],
      [],
    )
    expect(objects.map((o) => o.designations)).toEqual([[d('IC', '1396')], [d('LBN', '451')], [d('LBN', '452')]])
  })

  it('nie łączy dwóch obiektów z tego samego źródła; krzyżowe ID należące do innego obiektu jest pomijane', () => {
    const { objects, conflicts } = mergeRecords(
      [record('OpenNGC', [d('NGC', '554A')], {}, [d('NGC', '554')]), record('OpenNGC', [d('NGC', '554')], { type: 'galaxy_group' })],
      [],
    )
    expect(objects.map((o) => o.designations)).toEqual([[d('NGC', '554')], [d('NGC', '554A')]])
    expect(conflicts).toHaveLength(1)
  })

  it('Dup wskazujący pominięty obiekt (np. gwiazdę) nie tworzy obiektu', () => {
    const { objects, conflicts } = mergeRecords([duplicate(d('IC', '973'), d('NGC', '5467'))], [])
    expect(objects).toEqual([])
    expect(conflicts).toHaveLength(1)
  })

  it('krzyżowe ID bez rekordu zostaje oznaczeniem pierwszego obiektu, który je podaje', () => {
    const { objects } = mergeRecords(
      [record('OpenNGC', [d('NGC', '1')], {}, [d('LBN', '9')]), record('OpenNGC', [d('NGC', '2')], {}, [d('LBN', '9')])],
      [],
    )
    expect(objects.map((o) => o.designations)).toEqual([[d('NGC', '1'), d('LBN', '9')], [d('NGC', '2')]])
  })

  it('kolejność oznaczeń: M przed NGC; gwiazdozbiór z astronomy-engine; obiekty posortowane po uid', () => {
    const { objects } = mergeRecords(
      [
        record('OpenNGC', [d('NGC', '224'), d('M', '31')], { type: 'galaxy', raDeg: 10.6848, decDeg: 41.2691 }),
        record('OpenNGC', [d('NGC', '1976'), d('M', '42')], { type: 'cluster_nebula', raDeg: 83.8187, decDeg: -5.3897 }),
      ],
      [],
    )
    expect(objects).toMatchObject([
      { uid: 'NGC1976', primary: d('M', '42'), designations: [d('M', '42'), d('NGC', '1976')], constellation: 'Ori' },
      { uid: 'NGC224', primary: d('M', '31'), designations: [d('M', '31'), d('NGC', '224')], constellation: 'And' },
    ])
  })
})
