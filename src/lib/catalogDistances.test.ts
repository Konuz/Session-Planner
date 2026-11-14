import { expect, it } from 'vitest'
import { cf4Choice, checkIdentity, clusterKey, cw21Choice, findCw21, findHr23, findRl22, parseCw21, hr23Choice, matchCf4, parseHr23, parseRl22, parseVizierTsv, parseZucker, rl22Choice, snrKey, withWikidataFallback, zuckerChoice, type Entry, type Hr23Cluster, type SimbadObject } from '../../scripts/catalogDistances.ts'

const LY_PER_PC = 3.26156
const entry = (designations: string[], type: string, raDeg: number, decDeg: number, majArcmin = 10): Entry => ({ designations, type, raDeg, decDeg, majArcmin, vdbStarMagV: null })
const simbadObject = (mainId: string, otype: string, raDeg: number, decDeg: number): SimbadObject => ({ mainId, otype, raDeg, decDeg, z: null, zQual: '', nbref: 1 })

it('tożsamość: przypadki znane z pilotażu (pozycje SIMBAD z 6.11.2026)', () => {
  const simbad = new Map<string, SimbadObject>([
    ['SH 2-277', simbadObject('SH 2-277', 'HII', 85.5925, -1.92306)],
    ['LBN 773', simbadObject('IC 336', 'HII', 54.25, 23.4)],
    ['IC 434', simbadObject('IC 434', 'HII', 85.25, -2.5)],
    ['LBN 953', simbadObject('NAME Flame Nebula', 'HII', 85.42792, -1.91222)],
    ['NGC 2024', simbadObject('NGC 2024', 'Cl*', 85.42, -1.9)],
    ['VDB 57', simbadObject('HD 38087', 'Or*', 85.7524, -2.3126)],
    ['NGC 1432', simbadObject('NGC 1432', 'RNe', 56.4566, 24.3679)],
  ])
  // Sh2-277: 0,67° od SIMBAD mimo promienia 60′ w katalogu; LBN 773 to w SIMBAD IC 336, 1,56° dalej.
  expect(checkIdentity(entry(['Sh2-277'], 'EN', 85.1819, -2.4471, 120), simbad)).toMatchObject({ verdict: 'position', mainId: 'SH 2-277' })
  expect(checkIdentity(entry(['LBN 773'], 'EN', 55.7359, 22.6582, 150), simbad).sepDeg).toBeCloseTo(1.556, 2)
  // IC 434 jest sobą, ale alias LBN 953 należy do Mgławicy Płomień.
  const ic434 = checkIdentity(entry(['IC 434', 'LBN 953'], 'EN', 85.2537, -2.4538, 90), simbad)
  expect(ic434.verdict).toBe('ok')
  expect(ic434.foreignAliases).toEqual([{ alias: 'LBN 953', mainId: 'NAME Flame Nebula', sepDeg: expect.closeTo(0.57, 1) }])
  // Typy: NGC 2024 to w SIMBAD gromada, NGC 1432 mgławica refleksyjna; vdB przy gwieździe to nie rozbieżność.
  expect(checkIdentity(entry(['NGC 2024'], 'EN', 85.4274, -1.8563, 30), simbad).typeNote).toContain('Cl*')
  expect(checkIdentity(entry(['NGC 1432', 'LBN 771'], 'EN', 56.4566, 24.3679, 60), simbad).typeNote).toContain('refleksyjna')
  expect(checkIdentity(entry(['vdB 57'], 'RN', 85.7524, -2.3126), simbad)).toMatchObject({ verdict: 'ok', typeNote: '' })
  expect(checkIdentity(entry(['IC 4282'], 'G', 202.83, 47.18), simbad).verdict).toBe('missing')
})

it('gromady HR23 łączy po nazwie i sprawdza pozycję', () => {
  const tsv = ['#', 'Name\tAllNames\tType\tCST\tRA_ICRS\tDE_ICRS\trt\tdist16\tdist50\tdist84', '\t\t\t\tdeg\tdeg\tdeg\tpc\tpc\tpc', '----\t----', 'Melotte_22\tMelotte_22,Pleiades\to\t99\t56.6\t24.1\t4.71\t134.82\t134.84\t134.86', 'Slab\tSlab\to\t3\t0\t0\t1\t10\t20\t30', 'Moving\tMoving\tm\t50\t0\t0\t1\t10\t20\t30'].join('\n')
  const clusters = parseHr23(tsv)
  expect(clusters).toHaveLength(1)
  expect(clusterKey('Mel 22')).toBe(clusterKey('Melotte_22'))
  const byKey = new Map<string, Hr23Cluster>(clusters[0].names.map((n) => [clusterKey(n), clusters[0]]))
  const m45 = entry(['M 45', 'Mel 22'], 'OC', 56.8692, 24.1053, 150)
  expect(findHr23(m45, m45.designations, byKey)).toBe(clusters[0])
  expect(findHr23({ ...m45, raDeg: 80 }, m45.designations, byKey)).toBeNull()
  expect(findHr23({ ...m45, type: 'EN' }, m45.designations, byKey)).toBeNull()
  const choice = hr23Choice(clusters[0])
  expect(choice.ly / LY_PER_PC).toBeCloseTo(134.84, 2)
  // Dolna granica niepewności 1 %.
  expect(choice.sigmaLy! / choice.ly).toBeCloseTo(0.01, 4)
})

it('CF4: dopasowanie pozycją jeden do jednego, metoda i σ z błędu modułu', () => {
  const m51 = { raDeg: 202.4696, decDeg: 47.1952, dm: 29.606, eDm: 0.08, methods: ['TRGB', 'SN II'] }
  const companion = { raDeg: 202.4983, decDeg: 47.2661, dm: 29.355, eDm: 0.27, methods: ['SBF'] }
  const entries = [entry(['M 51'], 'G', 202.4696, 47.19517), entry(['NGC 5195'], 'G', 202.4983, 47.2661), entry(['IC 434'], 'EN', 202.4696, 47.1952), entry(['M 51 duplikat'], 'G', 202.4697, 47.1953)]
  const matched = matchCf4(entries, [m51, companion])
  expect(matched.get(0)).toBe(m51)
  expect(matched.get(1)).toBe(companion)
  expect(matched.has(2)).toBe(false)
  expect(matched.has(3)).toBe(false)
  const choice = cf4Choice(m51)
  expect(choice.ly / 3.26156e6).toBeCloseTo(8.34, 2)
  expect(choice.sigmaLy! / choice.ly).toBeCloseTo(0.0368, 3)
  expect(choice.source.method).toBe('TRGB + SN II (Cosmicflows-4)')
})

it('Zucker 2020: linie widzenia w obrysie mgławicy ciemnej, rozbieżne linie bez wartości', () => {
  const tsv = ['Name\td16\td50\td84\t_RA.icrs\t_DE.icrs', '\tpc\tpc\tpc\tdeg\tdeg', '--', '--', 'Orion_B\t420\t433\t446\t86.22\t-1.35', 'Orion_B\t423\t436\t449\t86.43\t-0.47', 'Orion_B\t398\t411\t424\t84.9\t-2.6'].join('\n')
  expect(parseVizierTsv(tsv)).toHaveLength(4)
  const lines = parseZucker(tsv)
  const ldn1630 = zuckerChoice(entry(['LDN 1630'], 'DN', 86.3858, -0.9809, 165.6), lines)!
  expect(ldn1630.ly / LY_PER_PC).toBeCloseTo(434.5, 1)
  expect(ldn1630.source.scope).toBe('cloud')
  expect(ldn1630.sigmaLy! / ldn1630.ly).toBeGreaterThan(0.05)
  // B 33: najbliższa linia 0,9° dalej, poza obrysem.
  expect(zuckerChoice(entry(['B 33'], 'DN', 85.2458, -2.4583, 6), lines)).toBeNull()
  const spread = [...lines, { raDeg: 86.4, decDeg: -1, d16: 590, d50: 600, d84: 610 }]
  expect(zuckerChoice(entry(['LDN 1630'], 'DN', 86.3858, -0.9809, 165.6), spread)).toBeNull()
})

it('Wikidata zastępuje pomiar z σ > 50 %, ale nie pomiar w progu; bez Wikidata zostaje pomiar', () => {
  // NGC 5169: CF4 z σ ≈ 26 % mieści się w progu 50 % (decyzja 14.11.2026) i wygrywa z Wikidata.
  const ngc5169 = cf4Choice({ raDeg: 202.04, decDeg: 46.67, dm: 33.705, eDm: 0.57, methods: ['Tully–Fisher'] })
  expect(ngc5169.sigmaLy! / ngc5169.ly).toBeGreaterThan(0.2)
  expect(withWikidataFallback(ngc5169, 156554880)).toBe(ngc5169)
  const vague = cf4Choice({ raDeg: 202.04, decDeg: 46.67, dm: 33.705, eDm: 1.2, methods: ['Tully–Fisher'] })
  expect(vague.sigmaLy! / vague.ly).toBeGreaterThan(0.5)
  expect(withWikidataFallback(vague, 156554880)).toMatchObject({ ly: 156554880, sigmaLy: null, source: { verified: false, method: 'Wikidata, niezweryfikowane' } })
  expect(withWikidataFallback(vague, null)).toBe(vague)
  const m51 = cf4Choice({ raDeg: 202.4696, decDeg: 47.1952, dm: 29.606, eDm: 0.08, methods: ['TRGB'] })
  expect(withWikidataFallback(m51, 24787856)).toBe(m51)
  expect(withWikidataFallback(null, 1500)?.ly).toBe(1500)
  expect(withWikidataFallback(null, null)).toBeNull()
})

it('SNR: Ranasinghe & Leahy 2022 po oznaczeniu Greena, odległość zrewidowana albo z literatury, bez granic', () => {
  expect(snrKey('SNR G116.5+01.1')).toBe(snrKey('G116.5+1.1'))
  expect(snrKey('SNR G000.0+00.0')).toBe('0.0+0.0')
  expect(snrKey('SNR G184.6-05.8')).toBe('184.6-5.8')
  expect(snrKey('LBN 576')).toBeNull()
  // Wiersze z J/ApJ/940/63/table1 (6.11.2026, lustro CfA), skrócone do potrzebnych kolumn.
  const tsv = ['SNR\tl_Distl1\tDistl1\tDistl2\te_Distl1\tE_Distl1\tMethod\tl_Dist\tDist\te_Dist\t_RA\t_DE', '\t\tkpc', '--', '--',
    'G116.9+0.2\t\t1.600\t\t\t\tKinematic distance\t\t2.10\t0.60\t359.80\t+62.44',
    'G18.0-0.7\t\t3.100\t\t0.200\t0.200\tOptical extinction\t\t\t\t276.30\t-13.57',
    'G4.5+6.8\t\t5.100\t\t0.700\t0.800\tProper motion + v _shock\t\t\t\t262.68\t-21.49',
    'G15.9+0.2\t\t11.500\t13.0\t\t\tKinematic distance\t\t\t\t274.72\t-15.03',
    'G17.4-2.3\t>\t2.300\t\t\t\tEstimation\t\t\t\t277.25\t-14.85',
    'G7.5-1.7\t\t1.700\t\t\t\tPWN association\t\t\t\t272.53\t-23.17'].join('\n')
  const snrs = parseRl22(tsv)
  expect(snrs.map((s) => s.key)).toEqual(['116.9+0.2', '18.0-0.7', '4.5+6.8', '15.9+0.2', '7.5-1.7'])
  expect(snrs[0]).toMatchObject({ kpc: 2.1, sigmaKpc: 0.6, revised: true, method: 'odległość kinematyczna' })
  expect(snrs[1]).toMatchObject({ kpc: 3.1, sigmaKpc: 0.2, revised: false, method: 'ekstynkcja optyczna' })
  expect(snrs[2].sigmaKpc).toBeCloseTo(0.75)
  expect(snrs[3]).toMatchObject({ kpc: 12.25, sigmaKpc: 0.75 })
  expect(snrs[4]).toMatchObject({ kpc: 1.7, sigmaKpc: null })
  const byKey = new Map(snrs.map((s) => [s.key, s]))
  const ctb1 = entry(['SNR G116.9+00.2', 'CTB 1'], 'SNR', 359.7917, 62.4333, 34)
  const found = findRl22(ctb1, ctb1.designations, byKey)!
  const choice = rl22Choice(found)
  expect(choice.ly / LY_PER_PC).toBeCloseTo(2100, 0)
  expect(choice.source).toMatchObject({ scope: 'object', method: 'odległość kinematyczna (odległość zrewidowana)', ref: '2022ApJ...940...63R', verified: true })
  // σ 29 %: bez Wikidata zostaje pomiar, ale nie trafia do 3D.
  expect(withWikidataFallback(choice, null)).toBe(choice)
  expect(findRl22({ ...ctb1, raDeg: 10 }, ctb1.designations, byKey)).toBeNull()
  expect(findRl22({ ...ctb1, type: 'EN' }, ctb1.designations, byKey)).toBeNull()
})

it('PN: gwiazda centralna z Chornay & Walton 2021 po „PN G…” albo pozycji, tylko wiarygodne dopasowania', () => {
  // Wiersze z J/A+A/656/A110/tablea1 (lustro CfA, 8.11.2026), skrócone.
  const tsv = ['PNG\tName\tRel\tRUWE\tpnRAdeg\tpnDEdeg\tpnRad\trcomb\tb_rcomb\tB_rcomb', '--', '--', '--',
    '136.3+05.5\tHFG 1\t0.9998\t1.022\t45.94596\t+64.90983\t250.00\t706.01\t699.01\t714.01',
    '036.1-57.1\tNGC 7293\t0.99999\t0.954\t337.41058\t-20.83711\t485.00\t199.00\t197.00\t200.00',
    '000.0-01.0\tJaSt 69\t0.2554\t0.987\t267.54154\t-29.31816\t7.00\t\t\t',
    '010.0+00.0\tX\t0.9\t2.5\t270\t-20\t5\t1000\t900\t1100'].join('\n')
  const pns = parseCw21(tsv)
  expect(pns.map((p) => p.png)).toEqual(['PN G136.3+05.5', 'PN G036.1-57.1'])
  const byPng = new Map(pns.map((p) => [p.png, p]))
  const hfg1 = entry(['HFG 1', 'PN G136.3+05.5'], 'PN', 45.9535, 64.8912, 8.3)
  const choice = cw21Choice(findCw21(hfg1, hfg1.designations, pns, byPng)!)
  expect(choice.ly / LY_PER_PC).toBeCloseTo(706, 0)
  expect(choice.sigmaLy! / LY_PER_PC).toBeCloseTo(7.5, 1)
  expect(choice.source).toMatchObject({ scope: 'object', ref: '2021A&A...656A.110C', verified: true })
  // NGC 7293 z OpenNGC nie ma aliasu „PN G…”: dopasowanie pozycją w promieniu mgławicy.
  expect(findCw21(entry(['NGC 7293'], 'PN', 337.4108, -20.8372, 16), ['NGC 7293'], pns, byPng)?.png).toBe('PN G036.1-57.1')
  expect(findCw21(entry(['NGC 7293'], 'EN', 337.4108, -20.8372, 16), ['NGC 7293'], pns, byPng)).toBeNull()
  expect(findCw21(entry(['Y'], 'PN', 300, 10), ['Y'], pns, byPng)).toBeNull()
})
