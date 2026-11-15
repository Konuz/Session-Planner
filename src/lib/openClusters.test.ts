import { expect, it } from 'vitest'
import { clusterKey, hr23ByName, identityLimitDeg } from '../../scripts/catalogDistances.ts'
import { clusterName, displayOf, parseHr23Catalog, planClusters } from '../../scripts/openClusters.ts'
import { catalogOf } from './catalog'
import { simbadId } from './distance'

// Wiersze z J/A+A/673/A114/clusters (lustro CfA, 15.11.2026), skrócone; pozycje i promienie w stopniach.
const HEAD = ['Name\tAllNames\tType\tCST\tN\tRA_ICRS\tDE_ICRS\tr50\trc\trt\tCMDCl50\tdist50', ' \t \t \t \t \tdeg\tdeg\tdeg\tdeg\tdeg\t \tpc', '--']
const row = (name: string, all: string, type: string, cst: number, ra: number, dec: number, r50: number, rt: number, cmd: number) =>
  `${name.padEnd(20)}\t${all}\t${type}\t${cst}\t50\t${ra}\t${dec}\t${r50}\t${r50 / 2}\t${rt}\t${cmd}\t1000`
const TSV = [...HEAD,
  row('Collinder_135', 'Collinder_135,Theia_19', 'o', 30, 109.3, -36.8, 0.8, 3, 0.99),
  row('Stock_2', 'Stock_2,Theia_524', 'o', 40, 33.8, 59.5, 0.5, 1.5, 0.98),
  row('Theia_990', 'IC_1396,Theia_990,Trumpler_37', 'o', 20, 324.7, 57.5, 0.4, 1.2, 0.9),
  row('Melotte_25', 'Collinder_50,Hyades,MWSC_379,Melotte_25', 'o', 99, 66.7, 16.9, 4.2, 10, 1),
  row('HSC_1', 'HSC_1', 'o', 8, 10, 10, 0.1, 0.3, 0.8),
  row('Berkeley_3', 'Berkeley_3', 'o', 4.9, 20, 60, 0.05, 0.2, 0.9),
  row('Berkeley_4', 'Berkeley_4', 'o', 6, 21, 61, 0.05, 0.2, 0.3),
  row('Teutsch_9', 'Teutsch_9', 'o', 6, 22, 62, 0.05, 0.2, 0.3),
  row('Mamajek_1', 'Mamajek_1', 'm', 20, 130, -79, 1, 3, 0.9),
  row('UBC_7', 'UBC_7,BH_99', 'o', 25, 159.5, -59.2, 0.3, 1, 0.95),
  row('Harvard_21', 'Harvard_21', 'o', 9, 40, 40, 0.05, 0.2, 0.9),
  row('Pal_5', 'Pal_5,Palomar_5', 'g', 15, 229.0, -0.1, 0.05, 0.3, 0.8),
].join('\n')

it('czyta HR23: CST ≥ 5, klasa CMD > 0,5 poza katalogami klasycznymi', () => {
  const rows = parseHr23Catalog(TSV)
  expect(rows.map((c) => c.names[0])).toEqual(['Collinder_135', 'Stock_2', 'Theia_990', 'Melotte_25', 'HSC_1', 'Berkeley_4', 'UBC_7', 'Harvard_21', 'Pal_5'])
  expect(rows[0]).toMatchObject({ type: 'o', raDeg: 109.3, decDeg: -36.8, r50Deg: 0.8, rtDeg: 3 })
  expect(rows[0].names).toEqual(['Collinder_135', 'Theia_19'])
})

it('nazwy klasycznych katalogów i odkryć amatorów, bez grup wykrytych tylko w Gai', () => {
  expect(clusterName('Collinder_135')).toEqual({ display: 'Collinder 135', short: 'Cr 135' })
  expect(clusterName('Trumpler_37')).toEqual({ display: 'Trumpler 37', short: 'Tr 37' })
  expect(clusterName('Berkeley_59')).toEqual({ display: 'Berkeley 59', short: 'Be 59' })
  expect(clusterName('Melotte_25')).toEqual({ display: 'Mel 25', short: 'Melotte 25' })
  expect(clusterName('BH_99')).toEqual({ display: 'vdBH 99', short: null })
  expect(clusterName('Pal_5')).toEqual({ display: 'Palomar 5', short: 'Pal 5' })
  expect(clusterName('Palomar_5')).toEqual({ display: 'Palomar 5', short: 'Pal 5' })
  // „DO 5” to w SIMBAD gwiazda: Dolidze bez skrótu.
  expect(clusterName('Dolidze_5')).toEqual({ display: 'Dolidze 5', short: null })
  expect(clusterName('Teutsch_J1209.3+5431')).toEqual({ display: 'Teutsch J1209.3+5431', short: null })
  expect(clusterName('Alessi-Teutsch_10')).toEqual({ display: 'Alessi-Teutsch 10', short: null })
  for (const gaiaOnly of ['_ESO_390-6', 'ESO_360-12', 'HSC_1', 'UBC_7', 'CWNU_1138', 'Theia_990', 'FSR_0198', 'OC_0021', 'MWSC_379', 'Mamajek_4', 'Platais_6', 'Hyades', 'Delta_Cephei_Cluster']) {
    expect(clusterName(gaiaOnly)).toBeNull()
  }
})

it('dopisuje nowe gromady, a znanym obiektom tylko aliasy', () => {
  const known = [
    { designations: ['IC 1396'], type: 'CN', raDeg: 324.74, decDeg: 57.49, majArcmin: 170 },
    { designations: ['C 41', 'Hiady'], type: 'OC', raDeg: 66.75, decDeg: 15.87, majArcmin: 329 },
    // „H 2-1” daje ten sam klucz co Harvard 21, ale leży daleko: to inna mgławica planetarna.
    { designations: ['H 2-1'], type: 'PN', raDeg: 260, decDeg: -10, majArcmin: 0.1 },
    { designations: ['NGC 6000'], type: 'OC', raDeg: 109.31, decDeg: -36.81, majArcmin: 2 },
  ]
  const plan = planClusters(parseHr23Catalog(TSV), known)
  expect(plan.added.map((c) => [c.primary, c.aliases, c.type])).toEqual([
    ['Stock 2', [], 'OC'],
    ['Berkeley 4', ['Be 4'], 'OC'],
    ['vdBH 99', [], 'OC'],
    ['Harvard 21', [], 'OC'],
    ['Palomar 5', ['Pal 5'], 'GC'],
  ])
  // Średnica: dwa promienie r50 w minutach łuku.
  expect(plan.added[0]).toMatchObject({ raDeg: 33.8, decDeg: 59.5, diamArcmin: 60 })
  // IC 1396 po nazwie z AllNames; Hiady (C 41) tylko po pozycji, więc do potwierdzenia w SIMBAD przed dopisaniem.
  expect([...plan.aliases]).toEqual([[0, ['Trumpler 37', 'Tr 37']]])
  expect(plan.nearby.map((n) => [n.cluster.primary, n.cluster.aliases, n.known])).toEqual([
    ['Collinder 135', ['Cr 135'], 3],
    ['Mel 25', ['Melotte 25', 'Collinder 50', 'Cr 50'], 1],
  ])
  // Rozstrzygnięcie z SIMBAD: Hiady to ten sam obiekt (aliasy), Collinder 135 inny (nowa gromada w kolejności HR23).
  const resolved = planClusters(parseHr23Catalog(TSV), known, (cluster) => cluster.primary === 'Mel 25')
  expect(resolved.added.map((c) => c.primary)).toEqual(['Collinder 135', 'Stock 2', 'Berkeley 4', 'vdBH 99', 'Harvard 21', 'Palomar 5'])
  expect(resolved.aliases.get(1)).toEqual(['Mel 25', 'Melotte 25', 'Collinder 50', 'Cr 50'])
})

it('nowe katalogi gromad trafiają do „pozostałych” i mają nazwy SIMBAD', () => {
  expect(catalogOf('Collinder 135')).toBeNull()
  expect(simbadId('Collinder 135')).toBe('Cl Collinder 135')
  expect(simbadId('Stock 2')).toBe('Cl Stock 2')
  expect(simbadId('vdBH 99')).toBe('Cl VDBH 99')
  expect(simbadId('Palomar 5')).toBe('Cl Pal 5')
  expect(simbadId('Terzan 3')).toBe('Cl Terzan 3')
  expect(simbadId('Cr 135')).toBe('Cr 135')
  expect(simbadId('Teutsch J1209.3+5431')).toBe('Teutsch J1209.3+5431')
})

it('nazwa należy do gromady, w której jest główna; literówka znaku w nazwie z pozycją odpada', () => {
  const tsv = [...HEAD,
    // Mała grupa z „Melotte_20” w AllNames przed właściwą gromadą α Persei.
    row('UBC_200', 'UBC_200,Melotte_20,Stock_99', 'o', 9, 52, 48, 0.1, 0.3, 0.9),
    row('Melotte_20', 'Melotte_20', 'o', 99, 51.33, 49.12, 1.39, 4, 0.99),
    row('Teutsch_J1037.3+6034', 'OC_0545,Teutsch_J1037.3+6034,Teutsch_J1037.3-6034', 'o', 5.3, 159.33, -60.57, 0.03, 0.2, 0.9),
  ].join('\n')
  const plan = planClusters(parseHr23Catalog(tsv), [])
  expect(plan.added.map((c) => [c.primary, c.aliases, c.diamArcmin])).toEqual([
    ['Stock 99', [], 12],
    ['Mel 20', ['Melotte 20'], 166.8],
    ['Teutsch J1037.3-6034', [], 3.6],
  ])
})

it('vdBH i BH to ten sam klucz gromady; granica tożsamości gromady co najmniej jej promień', () => {
  expect(clusterKey('vdBH 85')).toBe(clusterKey('BH_85'))
  expect(identityLimitDeg('OC', 120)).toBe(1)
  expect(identityLimitDeg('OC', 6)).toBe(0.25)
  expect(identityLimitDeg('EN', 120)).toBe(0.25)
})

it('odległość gromady z wiersza, w którym nazwa jest główna, nie z AllNames wcześniejszej grupy', () => {
  const cwnu = { names: ['CWNU_1242', 'Collinder_50', 'Melotte_25'], raDeg: 65.6, decDeg: 15.3, rtDeg: 1.4, d16: 280, d50: 290, d84: 300 }
  const hyades = { names: ['Melotte_25', 'Collinder_50', 'Hyades'], raDeg: 66.7, decDeg: 16.1, rtDeg: 10.4, d16: 47, d50: 47.2, d84: 47.4 }
  const byKey = hr23ByName([cwnu, hyades])
  expect(byKey.get(clusterKey('Mel 25'))).toBe(hyades)
  expect(byKey.get(clusterKey('Cr 50'))).toBe(cwnu)
  expect(byKey.get(clusterKey('CWNU 1242'))).toBe(cwnu)
})

it('skrót wraca do nazwy wyświetlanej (sprawdzenie aliasu w SIMBAD idzie po pełnej nazwie)', () => {
  expect(displayOf('Cz 43')).toBe('Czernik 43')
  expect(displayOf('Cr 257')).toBe('Collinder 257')
  expect(displayOf('Melotte 25')).toBe('Mel 25')
  expect(displayOf('Pal 5')).toBe('Palomar 5')
  expect(displayOf('Stock 2')).toBe('Stock 2')
  expect(displayOf('NGC 7654')).toBe('NGC 7654')
})
