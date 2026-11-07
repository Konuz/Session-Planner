import { expect, it } from 'vitest'
import { newPlanetaryNebulae, parseV84, pnName, sexagesimal } from '../../scripts/planetaryNebulae.ts'
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
