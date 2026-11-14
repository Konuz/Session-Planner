import { expect, it } from 'vitest'
import type { Entry } from '../../scripts/catalogDistances.ts'
import { findWise, hiiChoice, parseFosterBrunt, parseRusseil, parseWise, pickVelocity, sharplessKey, type HiiSources, type WiseRegion } from '../../scripts/hiiDistances.ts'

const LY_PER_KPC = 3261.56
const tsv = (head: string[], rows: string[][]) => ['#', head.join('\t'), head.map(() => '').join('\t'), head.map(() => '---').join('\t'), ...rows.map((r) => r.join('\t'))].join('\n')
const entry = (designations: string[], type: string, raDeg: number, decDeg: number, majArcmin = 10): Entry => ({ designations, type, raDeg, decDeg, majArcmin, vdbStarMagV: null })

const FB_HEAD = ['recno', 'A', 'HII', 'OName', 'GLON', 'GLAT', 'vCO', 'vHI', 'r', 'dr', 'Ns', 'Ne', '<E(B-V)>', 'SimbadName', '_RA.icrs', '_DE.icrs']
const WISE_HEAD = ['WISE', 'Rad', 'HIIName', 'Vi1', 'Vm1', 'KDA', 'Dist', 'e_Dist', 'Meth', '_RA.icrs', '_DE.icrs']
const RUSSEIL_HEAD = ['recno', 'Name', 'HaName', 'HaVLSR', 'RRvlsr', 'COvlsr', 'H2COvlsr']

it('Foster & Brunt: odległość i prędkość CO po nazwie regionu', () => {
  const fb = parseFosterBrunt(tsv(FB_HEAD, [['31', ' ', 'Sh2-155   ', '     ', '110.220', '+02.550', '  -8.88', '  -9.71', ' 0.84', ' 0.04', '10', ' ', ' 0.825', 'Sh2-155', '344.3530', '+62.5733']]))
  expect(fb.get('Sh2-155')).toEqual({ name: 'Sh2-155', kpc: 0.84, sigmaKpc: 0.04, vCO: -8.88 })
})

it('WISE: nazwy rozbite po średniku, pusty błąd odległości to σ nieznana', () => {
  const [region] = parseWise(tsv(WISE_HEAD, [['G189.830+00.417', '199', 'G189.971+00.395; S252', '9.7', '', '', '2.1', '', 'Parallax', '092.2425', '+20.6415']]))
  expect(region.names).toContain('S252')
  expect(region).toMatchObject({ kpc: 2.1, sigmaKpc: null, vRrl: 9.7, vMol: null, kda: null, method: 'Parallax' })
  expect(region.radiusDeg).toBeCloseTo(199 / 3600, 6)
})

it('Russeil 2003: klucz Sharplessa z nazwy z „=”, CO albo H₂CO jako prędkość molekularna', () => {
  const r = parseRusseil(tsv(RUSSEIL_HEAD, [['23', '6.0-1.2', 'M8=S25', '5.7', '', '', '6.8']]))
  expect(r.get('S25')).toEqual({ ha: 5.7, rrl: null, co: 6.8 })
  expect(sharplessKey('Sh2-25')).toBe('S25')
  expect(sharplessKey('NGC 2174')).toBeNull()
})

it('prędkość: główny tracer w kolejności rekombinacyjne → molekularne → Hα, rozbieżność > 10 km/s odrzuca', () => {
  expect(pickVelocity({ rrl: [{ v: -62.6, source: 'Anderson i in. 2014' }], mol: [{ v: -10.3, source: 'Russeil 2003' }], ha: [] })).toBeNull()
  expect(pickVelocity({ rrl: [], mol: [{ v: -36.6, source: 'Russeil 2003' }], ha: [{ v: -38.8, source: 'Russeil 2003' }] })).toEqual({ vlsr: -36.6, tracer: 'mol', source: 'Russeil 2003' })
  expect(pickVelocity({ rrl: [], mol: [], ha: [] })).toBeNull()
})

it('WISE: dopasowanie po nazwie Sharplessa woli region z odległością, bez nazwy po pozycji w promieniu', () => {
  const regions = parseWise(tsv(WISE_HEAD, [
    ['G189.766+00.333', '174', 'G189.971+00.395; S252', '', '8.8', '', '', '', '', '092.1298', '+20.6563'],
    ['G189.830+00.417', '199', 'G189.971+00.395; S252', '9.7', '', '', '2.1', '0.1', 'Parallax', '092.2425', '+20.6415'],
    ['G123.207+02.831', '1422', 'S183', '-62.6', '', 'F', '6.6', '1.3', 'OG/Kin', '013.5272', '+65.7023'],
  ]))
  expect(findWise(entry(['Sh2-252'], 'EN', 92.414, 20.5005, 40), ['Sh2-252'], regions)?.kpc).toBe(2.1)
  // Bez nazwy Sharplessa: środek obiektu w promieniu regionu WISE (G189.830: 199″).
  expect(findWise(entry(['NGC 9998'], 'EN', 92.25, 20.64, 2), ['NGC 9998'], regions)?.kpc).toBe(2.1)
  // Duża mgławica nie przejmuje małego regionu z jej obrysu: NGC 2174 (40′) leży 6′ od G189.830, poza jego promieniem 3,3′.
  expect(findWise(entry(['NGC 2174'], 'EN', 92.3484, 20.6596, 40), ['NGC 2174'], regions)).toBeNull()
  expect(findWise(entry(['NGC 9999'], 'EN', 200, 10), ['NGC 9999'], regions)).toBeNull()
})

const wiseRegion = (over: Partial<WiseRegion>): WiseRegion => ({ names: [], raDeg: 0, decDeg: 0, radiusDeg: 0.1, vRrl: null, vMol: null, kda: null, kpc: null, sigmaKpc: null, method: '', ...over })
const sources = (over: Partial<HiiSources>): HiiSources => ({ fb: new Map(), wise: [], russeil: new Map(), ...over })

it('kolejność: paralaksa WISE → Foster & Brunt → WISE pozostałe → kinematyka; σ > 50 % przechodzi dalej', () => {
  const sh155 = entry(['Sh2-155'], 'EN', 344.353, 62.5733, 50)
  const fb = new Map([['Sh2-155', { name: 'Sh2-155', kpc: 0.84, sigmaKpc: 0.04, vCO: -8.88 }]])
  const parallax = wiseRegion({ names: ['S155'], raDeg: 344.353, decDeg: 62.5733, kpc: 0.9, sigmaKpc: 0.05, method: 'Parallax' })
  expect(hiiChoice(sh155, sh155.designations, sources({ fb, wise: [parallax] }))?.key).toBe('WISE paralaksa')
  const fbOnly = hiiChoice(sh155, sh155.designations, sources({ fb }))!
  expect(fbOnly.key).toBe('Foster & Brunt')
  expect(fbOnly.choice.ly).toBeCloseTo(0.84 * LY_PER_KPC, 0)
  expect(fbOnly.choice.source).toMatchObject({ scope: 'object', ref: '2015AJ....150..147F', verified: true })
  const vagueFb = new Map([['Sh2-155', { name: 'Sh2-155', kpc: 0.84, sigmaKpc: 0.6, vCO: -8.88 }]])
  const kin = wiseRegion({ names: ['S155'], raDeg: 344.353, decDeg: 62.5733, kpc: 1.1, sigmaKpc: 0.2, method: 'OG/Kin' })
  expect(hiiChoice(sh155, sh155.designations, sources({ fb: vagueFb, wise: [kin] }))?.key).toBe('WISE')
})

it('kinematyka z prędkości Russeil: wartość niezweryfikowana z opisem tracera i źródła', () => {
  const sh181 = entry(['Sh2-181'], 'EN', 12.3195, 65.212, 15)
  const russeil = new Map([['S181', { ha: -38.8, rrl: null, co: -36.6 }]])
  const result = hiiChoice(sh181, sh181.designations, sources({ russeil }))!
  expect(result.key).toBe('kinematyczna')
  expect(result.choice.source).toMatchObject({ scope: 'object', verified: false, ref: '2019ApJ...885..131R' })
  expect(result.choice.source.method).toContain('Russeil 2003')
  expect(result.choice.ly / LY_PER_KPC).toBeGreaterThan(2)
  expect(result.choice.ly / LY_PER_KPC).toBeLessThan(3)
})

it('własna kinematyka z σ > 50 % (antycentrum) nie trafia do katalogu, żeby wycinek mógł dostać wynik regresora', () => {
  const sh252 = entry(['Sh2-252'], 'EN', 92.414, 20.5005, 40)
  const russeil = new Map([['S252', { ha: null, rrl: null, co: 7.4 }]])
  expect(hiiChoice(sh252, sh252.designations, sources({ russeil }))).toBeNull()
})

it('w kierunku centrum Galaktyki (|l| < 15°) nie liczymy własnej kinematyki: ruchy niekołowe', () => {
  // LBN 1 (l ≈ 0°): przed poprawką punkt styczny 8,2 kpc z σ 2 % (sama niepewność R₀).
  const lbn1 = entry(['LBN 1'], 'EN', 266.2937, -28.8533, 4)
  const wise = [wiseRegion({ names: ['S17'], raDeg: 266.2937, decDeg: -28.8533, radiusDeg: 0.05, vRrl: 20 })]
  expect(hiiChoice(lbn1, lbn1.designations, sources({ wise }))).toBeNull()
})

it('mgławica refleksyjna i obiekt bez danych: brak kroku H II', () => {
  const russeil = new Map([['S181', { ha: -38.8, rrl: null, co: -36.6 }]])
  expect(hiiChoice(entry(['Sh2-181'], 'RN', 12.3195, 65.212), ['Sh2-181'], sources({ russeil }))).toBeNull()
  expect(hiiChoice(entry(['Sh2-999'], 'EN', 0, 0), ['Sh2-999'], sources({}))).toBeNull()
})
