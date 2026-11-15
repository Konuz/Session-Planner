import { expect, it } from 'vitest'
import { GALAXY_TYPES, parseArp, parseCederblad, parseHcg, parseRcw, planNebulae } from '../../scripts/brightNebulae.ts'
import { WR_NEBULAE } from '../../scripts/manualObjects.ts'

// Wiersze z VII/231/catalog i VII/216/rcw (lustro CfA, 16.11.2026), skrócone do potrzebnych kolumn.
const CED = ['Ced\tm_Ced\tName\tSpNeb\tClass\tDim1\tDim2\t_RA.icrs\t_DE.icrs', ' \t \t \t \t \tarcmin\tarcmin\t \t ', '--',
  '  1\t \t+64 13     \tc  \tB 1\t  3.0\t  3.0\t00 13 21.0\t+65 36 22',
  '  3\t \tNGC 281    \tE  \tB 2\t 27.0\t 23.0\t00 53 15.1\t+56 35 36',
  ' 44\ta\tNGC 1976   \tC+E\tA 1\t 66.0\t 60.0\t05 35 17.0\t-05 23 28',
  '  2\t \tIC 11      \t   \tC 2\t     \t     \t00 20 22.9\t+56 35 18'].join('\n')
const RCW = ['RCW\tMajAxis\tMinAxis\tIDs\t_RA.icrs\t_DE.icrs', ' \tarcmin\tarcmin\t \t \t ', '--',
  '  1\t150\t150\tNGC2327; HS111,113,114;G2,3     \t07 10 20.2\t-12 01 58',
  '  2\t 14\t 14\tIC2177;HS109;G1                 \t07 04 21.8\t-10 31 33',
  '  7\t 30\t 20\t(NGC2409?); G6                  \t07 31 00.0\t-17 00 00',
  ' 57\t170\t 40\tNGC3603; G38,a,b                \t11 15 00.0\t-61 10 00',
  '107\t  8\t  4\tNGC6164,5; G52                  \t16 34 00.0\t-48 06 00'].join('\n')

it('czyta Cederblada: numer z literą podziału, typ z widma mgławicy i klasy, oznaczenie NGC/IC do porównania', () => {
  const ced = parseCederblad(CED)
  expect(ced.map((n) => [n.primary, n.type, n.names, n.majArcmin, n.minArcmin])).toEqual([
    ['Ced 1', 'RN', [], 3, 3],
    ['Ced 3', 'EN', ['NGC 281'], 27, 23],
    // Klasa A: gromada w mgławicy.
    ['Ced 44a', 'CN', ['NGC 1976'], 66, 60],
    // Bez widma i rozmiaru: mgławica emisyjna, rozmiar 0.
    ['Ced 2', 'EN', ['IC 11'], 0, null],
  ])
  expect(ced[1].raDeg).toBeCloseTo(13.3129, 4)
  expect(ced[1].decDeg).toBeCloseTo(56.5933, 4)
})

it('czyta RCW: osie, NGC/IC bez niepewnych w nawiasie i numery Gum', () => {
  const rcw = parseRcw(RCW)
  expect(rcw.map((n) => [n.primary, n.type, n.names, n.gum, n.majArcmin, n.minArcmin])).toEqual([
    ['RCW 1', 'EN', ['NGC 2327'], ['Gum 2', 'Gum 3'], 150, 150],
    ['RCW 2', 'EN', ['IC 2177'], ['Gum 1'], 14, 14],
    ['RCW 7', 'EN', [], ['Gum 6'], 30, 20],
    ['RCW 57', 'EN', ['NGC 3603'], ['Gum 38', 'Gum 38a', 'Gum 38b'], 170, 40],
    ['RCW 107', 'EN', ['NGC 6164', 'NGC 6165'], ['Gum 52'], 8, 4],
  ])
})

it('ten sam obiekt według SIMBAD dostaje aliasy, inny w tym miejscu daje nowy wiersz', () => {
  const known = [
    // NGC 2327 to mała mgławica refleksyjna w obszarze RCW 1: SIMBAD rozróżnia oba obiekty.
    { designations: ['NGC 2327'], type: 'RN', raDeg: 107.6, decDeg: -11.3, majArcmin: 5 },
    { designations: ['IC 2177'], type: 'EN', raDeg: 106.09, decDeg: -10.53, majArcmin: 20 },
    { designations: ['NGC 3247', 'Gum 29'], type: 'EN', raDeg: 156.6, decDeg: -57.9, majArcmin: 10 },
  ]
  const rcw = parseRcw(RCW)
  const same = (n: { primary: string }, i: number) => n.primary === 'RCW 2' && i === 1 ? true : n.primary === 'RCW 1' && i === 0 ? false : null
  const plan = planNebulae(rcw, known, same)
  expect([...plan.aliases]).toEqual([[1, ['RCW 2', 'Gum 1']]])
  expect(plan.added.map((n) => [n.primary, n.aliases])).toEqual([['RCW 1', ['Gum 2', 'Gum 3']], ['RCW 7', ['Gum 6']], ['RCW 57', ['Gum 38', 'Gum 38a', 'Gum 38b']], ['RCW 107', ['Gum 52']]])
  expect(plan.checked.map((c) => [c.nebula.primary, c.known])).toEqual([['RCW 1', 0], ['RCW 2', 1]])
})

it('bez rozstrzygnięcia w SIMBAD alias tylko przy wspólnej nazwie NGC/IC', () => {
  const known = [{ designations: ['NGC 281', 'Sh2-184'], type: 'EN', raDeg: 13.2, decDeg: 56.6, majArcmin: 35 }]
  const ced = parseCederblad(CED).filter((n) => n.primary === 'Ced 3' || n.primary === 'Ced 2')
  const plan = planNebulae(ced, known, () => null)
  expect([...plan.aliases]).toEqual([[0, ['Ced 3']]])
  // IC 11 (Ced 2) nie ma obiektu katalogu w pobliżu: nowy obiekt.
  expect(plan.added.map((n) => n.primary)).toEqual(['Ced 2'])
})

it('czyta Arpa i HCG z pozycjami w stopniach; Arp przy galaktyce katalogu, HCG jako nowa grupa', () => {
  // Wiersze z VII/192/arpord i VII/213/groups (lustro CfA, 16.11.2026), skrócone.
  const arp = parseArp(['_RAJ2000	_DEJ2000	Arp	Name	Size', 'deg	deg	 	 	arcmin', '--',
    '202.48417	+47.23083	 85	MESSIER 051      	11.0',
    '244.07500	+47.04667	  2	UGC 10310        	 3.5'].join('\n'))
  expect(arp.map((n) => [n.primary, n.names, n.type, n.majArcmin])).toEqual([['Arp 85', ['M 51'], 'G', 11], ['Arp 2', ['UGC 10310'], 'G', 3.5]])
  const hcg = parseHcg(['_RAJ2000	_DEJ2000	HCG	AngSize	Totmag', 'deg	deg	 	arcmin	mag', '--', '006.50087	+25.71809	  1	  2.9	 12.8'].join('\n'))
  expect(hcg).toMatchObject([{ primary: 'HCG 1', type: 'GG', raDeg: 6.50087, decDeg: 25.71809, majArcmin: 2.9, mag: 12.8 }])
  const known = [{ designations: ['M 51', 'NGC 5194'], type: 'G', raDeg: 202.4696, decDeg: 47.1952, majArcmin: 13.7 }]
  const plan = planNebulae([...arp, ...hcg], known, () => null, GALAXY_TYPES)
  expect([...plan.aliases]).toEqual([[0, ['Arp 85']]])
  expect(plan.added.map((n) => n.primary)).toEqual(['Arp 2', 'HCG 1'])
})

it('Arp: galaktyka z kolumny Name wygrywa z SIMBAD, a obiekt bliżej niż 0,5′ to ten sam', () => {
  const pair = { primary: 'Arp 94', names: ['NGC 3226'], gum: [], type: 'G' as const, raDeg: 155.86, decDeg: 19.90, majArcmin: 6, minArcmin: null }
  const close = { primary: 'Arp 83', names: ['NGC 3799'], gum: [], type: 'G' as const, raDeg: 175.0101, decDeg: 15.3201, majArcmin: 3, minArcmin: null }
  const known = [
    { designations: ['NGC 3226'], type: 'G', raDeg: 155.8625, decDeg: 19.8989, majArcmin: 3 },
    { designations: ['NGC 3800'], type: 'G', raDeg: 175.01, decDeg: 15.32, majArcmin: 2 },
  ]
  // SIMBAD wskazuje parę jako osobny obiekt (false), ale Name i pozycja rozstrzygają.
  const plan = planNebulae([pair, close], known, () => false, GALAXY_TYPES, { nameFirst: true, closeDeg: 0.5 / 60 })
  expect([...plan.aliases]).toEqual([[0, ['Arp 94']], [1, ['Arp 83']]])
  expect(plan.added).toEqual([])
})

it('lista WR z Toalá i in. 2015: numer gwiazdy przy nazwie mgławicy', () => {
  expect(WR_NEBULAE).toContainEqual(['WR 136', 'NGC 6888'])
  expect(new Set(WR_NEBULAE.map(([wr]) => wr)).size).toBe(WR_NEBULAE.length)
})

it('szukanie do 30′ łapie małą PN obok pozycji RCW, a mgławica bliżej niż 1′ to ten sam obiekt', () => {
  const rcw124 = { primary: 'RCW 124', names: ['NGC 6302'], gum: ['Gum 60'], type: 'EN' as const, raDeg: 258.39, decDeg: -37.06, majArcmin: 3, minArcmin: 2 }
  const ced1 = { primary: 'Ced 1', names: [], gum: [], type: 'RN' as const, raDeg: 3.3373, decDeg: 65.6061, majArcmin: 3, minArcmin: 3 }
  const known = [
    { designations: ['NGC 6302'], type: 'PN', raDeg: 258.435, decDeg: -37.1033, majArcmin: 0.7 },
    { designations: ['vdB 2'], type: 'RN', raDeg: 3.3383, decDeg: 65.6080, majArcmin: 3.4 },
  ]
  const plan = planNebulae([rcw124, ced1], known, () => null, undefined, { searchDeg: 0.5, closeDeg: 1 / 60 })
  expect([...plan.aliases]).toEqual([[0, ['RCW 124', 'Gum 60']], [1, ['Ced 1']]])
  expect(plan.added).toEqual([])
})
