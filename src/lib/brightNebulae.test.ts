import { expect, it } from 'vitest'
import { parseCederblad, parseRcw, planNebulae } from '../../scripts/brightNebulae.ts'

// Wiersze z VII/231/catalog i VII/216/rcw (lustro CfA, 16.11.2026), skrócone do potrzebnych kolumn.
const CED = ['Ced\tm_Ced\tName\tSpNeb\tClass\tDim1\tDim2\t_RA.icrs\t_DE.icrs', ' \t \t \t \t \tarcmin\tarcmin\t \t ', '--',
  '  1\t \t+64 13     \tc  \tB 1\t  3.0\t  3.0\t00 13 21.0\t+65 36 22',
  '  3\t \tNGC 281    \tE  \tB 2\t 27.0\t 23.0\t00 53 15.1\t+56 35 36',
  ' 44\ta\tNGC 1976   \tC+E\tA 1\t 66.0\t 60.0\t05 35 17.0\t-05 23 28',
  '  2\t \tIC 11      \t   \tC 2\t     \t     \t00 20 22.9\t+56 35 18'].join('\n')
const RCW = ['RCW\tMajAxis\tMinAxis\tIDs\t_RA.icrs\t_DE.icrs', ' \tarcmin\tarcmin\t \t \t ', '--',
  '  1\t150\t150\tNGC2327; HS111,113,114;G2,3     \t07 10 20.2\t-12 01 58',
  '  2\t 14\t 14\tIC2177;HS109;G1                 \t07 04 21.8\t-10 31 33',
  '  7\t 30\t 20\t(NGC2409?); G6                  \t07 31 00.0\t-17 00 00'].join('\n')

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
  expect(plan.added.map((n) => [n.primary, n.aliases])).toEqual([['RCW 1', ['Gum 2', 'Gum 3']], ['RCW 7', ['Gum 6']]])
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
