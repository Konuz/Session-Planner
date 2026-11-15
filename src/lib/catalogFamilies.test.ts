import { expect, it } from 'vitest'
import { catalogOf, skyShown } from './catalog'

it('rodziny katalogów „Inne”: oznaczenia trafiają do swojej rodziny, kopuła ukrywa wyłączone', () => {
  expect(['Collinder 135', 'Cr 135', 'Mel 25', 'Teutsch J1209.3+5431', 'StDr 56', 'Ou 4', 'SDSO 1', 'Ced 214a', 'RCW 86', 'Gum 29', 'DWB 111', 'Arp 85', 'HCG 92', 'WR 136'].map(catalogOf))
    .toEqual(['Cl', 'Cl', 'Cl', 'Cl', 'PNam', 'PNam', 'PNam', 'BN', 'BN', 'BN', 'BN', 'Arp', 'HCG', 'WR'])
  // „M 2-19” (Minkowski), „Hu 2-1”, „HFG 1” i „Abell 39” zostają poza rodzinami.
  expect(['M 2-19', 'Hu 2-1', 'HFG 1', 'Abell 39'].map(catalogOf)).toEqual([null, null, null, null])
  const groups = { M: true, NGC: true, IC: true, Sh2: true, B: true, vdB: true, LBN: true, LDN: true, SNR: true, other: true }
  expect(skyShown({ catalogs: ['Arp'] }, groups, ['Arp'])).toBe(false)
  expect(skyShown({ catalogs: ['NGC', 'Arp'] }, groups, ['Arp'])).toBe(true)
  expect(skyShown({ catalogs: ['Cl', 'BN'] }, groups, ['Cl'])).toBe(true)
  expect(skyShown({ catalogs: [] }, groups, ['Cl'])).toBe(true)
  expect(skyShown({ catalogs: ['WR'] }, { ...groups, other: false }, [])).toBe(false)
})
