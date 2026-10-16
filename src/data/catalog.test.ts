// Test danych zbudowanych przez scripts/build-catalog.ts (public/catalog, commitowane do repozytorium).
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { designationKey, formatDesignation } from '../services/catalog/records'
import type { Designation, DsoObject } from '../types'
import featured from './featured.json'

const catalog = JSON.parse(readFileSync(new URL('../../public/catalog/catalog.v1.json', import.meta.url), 'utf8')) as DsoObject[]
const meta = JSON.parse(readFileSync(new URL('../../public/catalog/meta.json', import.meta.url), 'utf8')) as { objectCount: number }

const byDesignation = new Map(catalog.flatMap((object) => object.designations.map((designation) => [designationKey(designation), object])))

function find(catalogId: Designation['catalog'], id: string): DsoObject {
  const object = byDesignation.get(designationKey({ catalog: catalogId, id }))
  if (!object) throw new Error(`Brak obiektu ${formatDesignation({ catalog: catalogId, id })}`)
  return object
}

describe('zbudowany katalog (6.1–6.4)', () => {
  it('meta.json opisuje tę samą liczbę obiektów, a uid są unikalne', () => {
    expect(meta.objectCount).toBe(catalog.length)
    expect(new Set(catalog.map((object) => object.uid)).size).toBe(catalog.length)
  })

  it('każde oznaczenie należy do jednego obiektu', () => {
    const designations = catalog.flatMap((object) => object.designations.map(designationKey))
    expect(new Set(designations).size).toBe(designations.length)
  })

  it.each((featured as Designation[]).map((designation) => [formatDesignation(designation), designation] as const))(
    'lista „Klasyki”: %s jest w katalogu',
    (_, designation) => {
      expect(byDesignation.has(designationKey(designation))).toBe(true)
    },
  )

  it('M 42 = NGC 1976 (uid z OpenNGC) z krzyżowym ID LBN 974', () => {
    expect(find('M', '42')).toMatchObject({ uid: 'NGC1976', primary: { catalog: 'M', id: '42' }, type: 'cluster_nebula' })
    expect(find('LBN', '974').uid).toBe('NGC1976')
  })

  it('B 33 z OpenNGC i VII/220A to jeden obiekt o rozmiarze Końskiego Łba, a LDN 1630 jest osobno', () => {
    expect(find('B', '33')).toMatchObject({ sizeMajorArcmin: 6, sizeMinorArcmin: 4, sources: ['OpenNGC', 'VizieR VII/220A'] })
    expect(find('LDN', '1630').uid).not.toBe(find('B', '33').uid)
  })

  it('aliasy z 6.2 i aliasy SNR łączą obiekty; typ refleksyjny z VdB, SNR z Greena', () => {
    expect(find('Sh2', '131').uid).toBe(find('IC', '1396').uid)
    expect(find('VdB', '141')).toMatchObject({ primary: { catalog: 'VdB', id: '141' }, type: 'reflection_nebula' })
    expect(find('Simeis', '147')).toMatchObject({ type: 'supernova_remnant', uid: find('SNR-G', 'G180.0-01.7').uid })
    expect(find('M', '1').uid).toBe(find('SNR-G', 'G184.6-05.8').uid)
  })

  it('części obiektu (IC 1396 → LBN 451, 452) zostają osobnymi wpisami', () => {
    expect(find('LBN', '451').uid).not.toBe(find('IC', '1396').uid)
    expect(find('LBN', '452').uid).not.toBe(find('IC', '1396').uid)
  })

  it('zawiera obiekty Messiera 1–110 oprócz M 40 (gwiazda podwójna, pomijana)', () => {
    const missing = Array.from({ length: 110 }, (_, i) => String(i + 1)).filter(
      (id) => !byDesignation.has(designationKey({ catalog: 'M', id })),
    )
    expect(missing).toEqual(['40'])
  })

  it('żadne oznaczenie z katalogów VizieR nie ginie przy łączeniu', () => {
    const count = (catalogId: Designation['catalog']) =>
      new Set(catalog.flatMap((object) => object.designations.filter((d) => d.catalog === catalogId).map((d) => d.id))).size
    expect({ Sh2: count('Sh2'), LBN: count('LBN'), LDN: count('LDN'), VdB: count('VdB'), B: count('B'), 'SNR-G': count('SNR-G') }).toEqual({
      Sh2: 313,
      LBN: 1125,
      LDN: 1787,
      VdB: 158,
      B: 349,
      'SNR-G': 310,
    })
  })

  it('LDN 1235 nie ma jasności, a ma nieprzezroczystość z LDN', () => {
    expect(find('LDN', '1235')).toMatchObject({ magV: null, ldnOpacity: 6, type: 'dark_nebula' })
  })
})
