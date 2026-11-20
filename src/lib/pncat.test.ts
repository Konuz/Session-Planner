import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { mergePncat } from '../../scripts/pncat.ts'
import { parseCatalog, quickSearch, searchScore, type CatalogRow } from './catalog'

const header = 'PNG,Name,PNstat,RAJ2000,DECJ2000,DRAJ2000,DDECJ2000,Catalogue,MajDiam,MinDiam'.split(',')
const input = (png: string, name: string, status: string, ra: number, dec: number, size: string) =>
  [png, name, status, '', '', String(ra), String(dec), '', size, size]
const existing = (id: string, aliases: string, type: CatalogRow[4], ra: number, dec: number): CatalogRow =>
  [id, aliases, '', '', type, ra, dec, 1, 1, -1, 99, 99, 'Cyg', 0, '', '']

it('dopisuje potwierdzone PN i aliasy, zachowuje indeksy oraz pomija kandydatów i konflikty', () => {
  const ngc = existing('NGC 7009', '', 'PN', 316.0, -11.3)
  const other = existing('Sh2-42', '', 'EN', 273.0, -15.0)
  const rows = [ngc, other]
  const ju = input('075.5+01.7', 'Ju 1', 'T', 303.83938, 38.0455, '240')
  const csv = [
    header, ju, ju,
    input('037.7-34.5', 'NGC 7009', 'T', 316.0, -11.3, '60'),
    input('013.3+01.1', 'Sh 2-42', 'T', 273.0, -15.0, '60'),
    input('076.0+01.7', 'Kandydat', 'L', 304.0, 38.0, '60'),
    input('080.3-10.4', 'MWP 1', 'T', 319.3, 34.2, '840'),
  ]
  const report = mergePncat(rows, csv)
  expect(report.added).toEqual(['PN G075.5+01.7'])
  expect(report.aliased).toEqual(['PN G037.7-34.5'])
  expect(report.disputed).toEqual(['PN G080.3-10.4'])
  expect(report.review).toHaveLength(1)
  expect(rows.slice(0, 2).map((row) => row[0])).toEqual(['NGC 7009', 'Sh2-42'])
  expect(ngc[1]).toBe('PN G037.7-34.5')
  expect(rows[2].slice(7, 9)).toEqual([4, 4])
  const catalog = parseCatalog(rows)
  for (const name of ['PN G075.5+01.7', 'PN G75.5+1.7', 'Ju 1', 'Soap Bubble Nebula']) {
    expect(quickSearch(catalog, name)[0]?.id).toBe('Ju 1')
  }
  expect(mergePncat(rows, csv).added).toEqual([])
  expect(rows).toHaveLength(3)
})

it('odnajduje rozdzielone i przeklasyfikowane obiekty w wygenerowanym katalogu', () => {
  const data: { rows: CatalogRow[] } = JSON.parse(readFileSync('public/data/catalog.json', 'utf8'))
  const catalog = parseCatalog(data.rows)
  for (const [png, id, type] of [
    ['013.3+01.1', 'Sh2-42', 'PN'],
    ['091.0-06.3', 'Sh2-123', 'PN'],
    ['094.5-00.8a', 'LDu 1', 'PN'],
    ['120.2-05.3', 'Sh2-176', 'PN'],
    ['138.1+04.1', 'Sh2-200', 'PN'],
    ['150.0-00.3', 'Te 5', 'PN'],
    ['158.3-05.6a', 'Sh2-215', 'PN'],
    ['258.5-01.3', 'RCW 24', 'PN'],
    ['260.1+00.2', 'Vo 3', 'PN'],
    ['289.6-01.6a', 'St 52', 'PN'],
    ['302.1+00.3', 'RCW 69', 'PN'],
    ['330.7-02.0', 'Wray 17-75', 'PN'],
    ['358.0-02.7', 'PN Al 2-O', 'PN'],
    ['358.5-02.5', 'M 4-7', 'PN'],
    ['359.5+02.6', 'Al 2-I', 'PN'],
    ['359.6+02.2', 'Al 2-K', 'PN'],
    ['002.3+02.2', 'K 5-11', 'PN'],
    ['260.7+00.9', 'PK 260+00 1', 'RN'],
    ['329.5-02.2', 'HeFa 1', 'PN'],
  ]) {
    const object = quickSearch(catalog, `PN G${png}`)[0]
    expect(object, png).toMatchObject({ id, type })
    expect(catalog.filter((o) => o.id === id), id).toHaveLength(1)
  }
  expect(quickSearch(catalog, 'LDu 1')[0]?.id).toBe('LDu 1')
  expect(quickSearch(catalog, 'St 52')[0]?.id).toBe('St 52')
  expect(quickSearch(catalog, 'PN G358.3-02.5')).toHaveLength(0)
  expect(quickSearch(catalog, 'Al 2-O')[0]?.decDeg).toBeCloseTo(-32.0511, 4)
  expect(quickSearch(catalog, 'M 4-7')[0]?.decDeg).toBeCloseTo(-31.6001, 4)
  const matches = quickSearch(catalog, 'M 47')
  expect(matches[0]?.id).toBe('M 47')
  expect(matches.filter((o) => ['M 47', 'M 4-7'].includes(o.id))
    .sort((a, b) => searchScore(a, 'M 4–7') - searchScore(b, 'M 4–7')).map((o) => o.id)).toEqual(['M 4-7', 'M 47'])
  expect(quickSearch(catalog, 'HeFa 1')[0]?.distLy).toBe(11399)
  expect(quickSearch(catalog, 'Wray 17-75')[0]?.distLy).toBeNull()
})
