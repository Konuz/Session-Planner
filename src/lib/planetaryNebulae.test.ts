import { expect, it } from 'vitest'
import { MANUAL_OBJECTS } from '../../scripts/manualObjects.ts'
import { newPlanetaryNebulae, parseLeDu, parseV84, planLeDu, pnName, sexagesimal } from '../../scripts/planetaryNebulae.ts'
import { catalogOf } from './catalog'
import { simbadId } from './distance'

it('czyta V/84: pozycje ICRS, nazwy i średnice optyczne', () => {
  expect(sexagesimal('03 03 48.84', true)).toBeCloseTo(45.9535, 4)
  expect(sexagesimal('+64 53 28.2', false)).toBeCloseTo(64.8912, 4)
  expect(sexagesimal('-29 43 46.1', false)).toBeCloseTo(-29.7295, 4)
  expect(sexagesimal('x', true)).toBeNull()
  expect(pnName('A 39  ')).toBe('Abell 39')
  expect(pnName('M 2-19       ')).toBe('M 2-19')
  // Wiersze z V/84/main i V/84/diam (lustro CfA, 7.11.2026), skrócone do potrzebnych kolumn.
  const main = ['PNG\tName\tIdents\t_RA.icrs\t_DE.icrs', '', '--', '--',
    '136.3+05.5\tHFG 1        \t\t03 03 48.84\t+64 53 28.2',
    '047.0+42.4\tA 39         \tPK 47+42 1\t16 27 33.41\t+27 54 34.6',
    '036.1-57.1\tNGC 7293     \tHelix\t22 29 38.55\t-20 50 13.6'].join('\n')
  const diam = ['PNG\tl_oDiam\toDiam', '', '--', '--', '136.3+05.5\t\t500.0', '047.0+42.4\t\t174.0', '036.1-57.1\t<\t900.0'].join('\n')
  const pns = parseV84(main, diam)
  expect(pns.map((p) => [p.name, p.png])).toEqual([['HFG 1', 'PN G136.3+05.5'], ['Abell 39', 'PN G047.0+42.4'], ['NGC 7293', 'PN G036.1-57.1']])
  expect(pns[0].diamArcmin).toBeCloseTo(8.33, 2)
  expect(pns[2].diamArcmin).toBe(0)
  // NGC 7293 już jest w katalogu (po nazwie); Abell 39 leży na pozycji mgławicy katalogu; HFG 1 jest nowa.
  const known = [
    { designations: ['NGC 7293'], raDeg: 337.41, decDeg: -20.84, nebula: true },
    { designations: ['LBN 1'], raDeg: 246.8892, decDeg: 27.9098, nebula: true },
    { designations: ['NGC 1300'], raDeg: 45.9535, decDeg: 64.8912, nebula: false },
  ]
  expect(newPlanetaryNebulae(pns, known).map((p) => p.name)).toEqual(['HFG 1'])
})

it('M 2-19 (Minkowski) nie jest obiektem Messiera; Abell N to w SIMBAD PN A66 N', () => {
  expect(catalogOf('M 51')).toBe('M')
  expect(catalogOf('M 2-19')).toBeNull()
  expect(catalogOf('HFG 1')).toBeNull()
  expect(simbadId('Abell 39')).toBe('PN A66 39')
  expect(simbadId('HFG 1')).toBe('HFG 1')
})

it('czyta Le Dû i in. 2022: nazwy, PN G, oznaczenie HASH i rozmiar a × b', () => {
  // Wiersze z J/A+A/666/A152/table1 (lustro CfA, 15.11.2026), skrócone do potrzebnych kolumn.
  const tsv = ['Name\tHName\tPNG\tRAJ2000\tDEJ2000\tSize\tStatus', ' \t \t \t"h:m:s"\t"d:m:s"\tmin\t ', '--',
    'StDr 31       \t                           \t015.9+01.6\t18 13 54.93\t-14 17 06.93\t11 x 4.6 \tT',
    'Ra 15         \tKn 22                      \t072.0+08.0\t19 38 36.33\t+38 18 33.30\t0.4      \tP',
    'StDr 57       \tLBN 157.08-03.61           \t157.0-03.6\t04 20 43.81\t+44 56 28.17\t1.5      \tP'].join('\n')
  const pns = parseLeDu(tsv)
  expect(pns.map((p) => [p.name, p.png, p.idents, p.diamArcmin, p.minorArcmin])).toEqual([
    ['StDr 31', 'PN G015.9+01.6', [], 11, 4.6],
    ['Ra 15', 'PN G072.0+08.0', ['Kn 22'], 0.4, undefined],
    // „LBN 157.08-03.61” to oznaczenie galaktyczne HASH, nie numer Lyndsa: bez aliasu.
    ['StDr 57', 'PN G157.0-03.6', [], 1.5, undefined],
  ])
  expect(pns[0].raDeg).toBeCloseTo(273.4789, 4)
  expect(pns[0].decDeg).toBeCloseTo(-14.2853, 4)
})

it('lista ręczna: nowe obiekty spoza katalogów, każdy ze źródłem pozycji i rozmiaru', () => {
  expect(MANUAL_OBJECTS.map((o) => o.primary)).toEqual(['Zie 1', 'StDr 56', 'Ou 4', 'HFG 2', 'Simeis 57', 'SDSO 1'])
  for (const o of MANUAL_OBJECTS) {
    expect(o.source).not.toBe('')
    expect(o.raDeg).toBeGreaterThanOrEqual(0)
    expect(o.raDeg).toBeLessThan(360)
    expect(Math.abs(o.decDeg)).toBeLessThanOrEqual(90)
    expect(o.majArcmin).toBeGreaterThan(0)
    if (o.distance) expect(o.distance.ref).toMatch(/^\d{4}/)
  }
  expect(catalogOf('Simeis 57')).toBeNull()
})

it('Le Dû: wspólne oznaczenie daje aliasy, sama pozycja w polu obszaru H II nie', () => {
  const pn = (name: string, png: string, idents: string[], raDeg: number, decDeg: number) => ({ name, png, idents, raDeg, decDeg, diamArcmin: 1.5 })
  const known = [
    { designations: ['Sh2-215'], raDeg: 70.5, decDeg: 43.0, nebula: true },
    { designations: ['Sh2-213'], raDeg: 65.18, decDeg: 44.93, nebula: true },
    // „Hu 2-1” ma ten sam klucz co „Hu 21”, ale leży daleko.
    { designations: ['Hu 2-1', 'PN G051.4+09.6'], raDeg: 262.1, decDeg: 20.8, nebula: true },
  ]
  const plan = planLeDu([
    pn('Pa 167', 'PN G158.3-05.6', ['Sh 2-215'], 70.51, 43.01),
    pn('StDr 57', 'PN G157.0-03.6', [], 65.1825, 44.9412),
    pn('Hu 21', 'PN G100.0+01.0', [], 300, 50),
  ], known)
  expect([...plan.aliases]).toEqual([[0, ['Pa 167', 'PN G158.3-05.6']]])
  expect(plan.added.map((p) => p.name)).toEqual(['StDr 57', 'Hu 21'])
})

it('amatorskie PN pytają SIMBAD o „NAME PN …” (bez tego „Dr 21” to źródło radiowe)', () => {
  expect(simbadId('Dr 21')).toBe('NAME PN Dr 21')
  expect(simbadId('Hu 2')).toBe('NAME PN Hu 2')
  expect(simbadId('StDr Objet 1')).toBe('NAME PN StDr Objet 1')
  expect(simbadId('Ou 4')).toBe('NAME PN Ou 4')
  expect(simbadId('Hu 2-1')).toBe('Hu 2-1')
  expect(simbadId('Pa 30')).toBe('NAME PN Pa 30')
})
