import { expect, it } from 'vitest'
import type { DSO } from './catalog'
import { cutDistance, hasDistance, illuminatorDistance, isStarOtype, newestCutMeasurement, NO_DISTANCE, redshiftDistance, refreshCutDistances, regressorDistance, regressorEligible, regressorPollDelay, simbadId, type DistanceInfo, type RegressorPollState } from './distance'
import type { PhotoCut, PhotoStar } from './photo'

const LY_PER_PC = 3.26156

it('wybiera najnowszy pomiar po roku publikacji i zachowuje go po odświeżeniu wycinka', () => {
  const m = { ...NO_DISTANCE, distLy: 400, distanceRef: '2023AJ', source: 'SIMBAD' as const, url: '', distanceSource: 'SIMBAD' }
  const choices = [{ ...m, distanceRef: '' }, m, { ...m, distanceRef: '2010AJ' }]
  const next = newestCutMeasurement(NO_DISTANCE, choices)!
  expect(next).toMatchObject({ distanceOrigin: 'published', distanceRef: '2023AJ', distLy: 400 })
  expect(newestCutMeasurement(next, choices)).toBeNull()
  expect(newestCutMeasurement({ ...NO_DISTANCE, distanceOrigin: 'user' }, choices)).toBeNull()
  const object = { id: 'test', type: 'DN', distLy: null, illuminator: null } as DSO
  const project = { cuts: [{ id: object.id, type: object.type, ...next } as PhotoCut], stars: null }
  expect(refreshCutDistances(project, [object], new Map([[object.id, object]]))).toBe(project)
})

it('zachowuje własny opublikowany pomiar wycinka przed odległością odziedziczoną z SNR', () => {
  const inherited = { ...NO_DISTANCE, distLy: 2400, distanceScope: 'remnant' as const, distanceRef: '2022ApJ' }
  const own = { ...NO_DISTANCE, distLy: 2200, distanceRef: '2018AJ', source: 'SIMBAD' as const, url: '' }
  const published = newestCutMeasurement(inherited, [{ ...inherited, source: 'Katalog', url: '' }, own])
  expect(published).toMatchObject({ distLy: 2200, distanceOrigin: 'published' })
  const object = { id: 'test', type: 'SNR', distLy: 2400, distUncLy: null, distInfo: verified('publikacja SNR', 'remnant'), illuminator: null } as DSO
  const project = { cuts: [{ id: object.id, type: object.type, ...published } as PhotoCut], stars: null }
  expect(refreshCutDistances(project, [object], new Map([[object.id, object]]))).toBe(project)
})

it('przelicza z na odległość w układzie CMB jak pilotaż (astropy, H₀ = 70, Ωm = 0,3)', () => {
  // Wartości z output/odleglosci-pilotaz-2026-11-06 (decisions.py): IC 4278 i IC 2388.
  const ic4278 = redshiftDistance(0.01705246367, 202.6148, 47.2469)!
  expect(ic4278.distLy / LY_PER_PC / 1e6).toBeCloseTo(75.231, 1)
  expect(ic4278.uncertaintyLy / ic4278.distLy).toBeCloseTo(0.057, 2)
  const ic2388 = redshiftDistance(0.03271, 129.9855, 19.6453)!
  expect(ic2388.distLy / LY_PER_PC / 1e6).toBeCloseTo(142.79, 0)
  // Bliska galaktyka: prędkość własna przeważa, bez wartości.
  expect(redshiftDistance(0.004, 202.47, 47.2)).toBeNull()
  expect(redshiftDistance(-0.001, 0, 0)).toBeNull()
})

it('zapisuje identyfikatory tak, jak zna je SIMBAD', () => {
  expect(simbadId('Sh2-277')).toBe('SH 2-277')
  expect(simbadId('B 33')).toBe('Barnard 33')
  expect(simbadId('vdB 52')).toBe('VDB 52')
  expect(simbadId('Mel 22')).toBe('Cl Melotte 22')
  expect(simbadId('NGC 2024')).toBe('NGC 2024')
  expect(simbadId('C 14')).toBeNull()
})

it('odróżnia gwiazdy od gromad i asocjacji w typach SIMBAD', () => {
  expect(isStarOtype('Or*')).toBe(true)
  expect(isStarOtype('*')).toBe(true)
  expect(isStarOtype('Y*O')).toBe(true)
  expect(isStarOtype('Cl*')).toBe(false)
  expect(isStarOtype('As*')).toBe(false)
  expect(isStarOtype('RNe')).toBe(false)
})

const verified = (source: string, scope: DistanceInfo['scope'] = 'object'): DistanceInfo => ({ scope, method: 'm', source, ref: 'bib', verified: true })
const star = (id: string, raDeg: number, decDeg: number, gMag: number, distLy: number | null, lo: number | null = null, hi: number | null = null): PhotoStar =>
  ({ id, x: 0, y: 0, raDeg, decDeg, gMag, bpRp: 0, parallaxMas: null, parallaxOverError: null, distLy, distLoLy: lo, distHiLy: hi })

// Gwiazdy z IC434.stars.json (Gaia DR3, Bailer-Jones) i pozycje vdB z katalogu aplikacji.
const hd37903 = { star: 'HD 37903', raDeg: 85.41, decDeg: -2.259, vMag: 7.82, cluster: null }
const ngc2023 = { distLy: null, distUncLy: null, distInfo: null, illuminator: hd37903 } satisfies Pick<DSO, 'distLy' | 'distUncLy' | 'distInfo' | 'illuminator'>

it('bierze odległość gwiazdy oświetlającej z gwiazd Gaia pola', () => {
  const field = [star('Gaia DR3 3216478266124377984', 85.40995, -2.25902, 7.7, 394.1 * LY_PER_PC, 390 * LY_PER_PC, 398 * LY_PER_PC), star('Gaia DR3 2', 85.4105, -2.2592, 15, 3000)]
  const d = illuminatorDistance(ngc2023, field, null)!
  expect(d.distLy! / LY_PER_PC).toBeCloseTo(394.1, 1)
  expect(d).toMatchObject({ distanceScope: 'illuminator', distanceOrigin: 'stars', distanceRef: '2021AJ....161..147B' })
  expect(d.distanceMethod).toContain('HD 37903')
  // Gwiazda bez wiarygodnej paralaksy, za daleko od pozycji albo o innej jasności: brak odległości.
  expect(illuminatorDistance(ngc2023, [star('a', 85.40995, -2.25902, 7.7, null)], null)).toBeNull()
  expect(illuminatorDistance(ngc2023, [star('a', 85.42, -2.25902, 7.7, 1000)], null)).toBeNull()
  expect(illuminatorDistance(ngc2023, [star('a', 85.40995, -2.25902, 12, 1000)], null)).toBeNull()
})

it('gwiazda-członek gromady dostaje odległość gromady, gwiazda tła swoją', () => {
  const pleiades = { id: 'M 45', distLy: 134.84 * LY_PER_PC, distUncLy: 0.1, distInfo: verified('Hunt & Reffert 2023') }
  const merope = { distLy: null, distUncLy: null, distInfo: null, illuminator: { star: 'HD 23480', raDeg: 56.5816, decDeg: 23.9484, vMag: 4.18, cluster: 0 } }
  const member = illuminatorDistance(merope, [star('Gaia DR3 1', 56.58155, 23.94836, 4.1, 462, 443, 481)], pleiades)!
  expect(member.distLy).toBe(pleiades.distLy)
  expect(member.distanceSource).toBe('Hunt & Reffert 2023')
  expect(member.distanceMethod).toContain('M 45')
  const background = illuminatorDistance(merope, [star('Gaia DR3 1', 56.58155, 23.94836, 4.1, 900, 880, 920)], pleiades)!
  expect(background.distLy).toBe(900)
})

it('łańcuch: sprawdzony katalog, potem gwiazda oświetlająca, na końcu Wikidata', () => {
  const wikidata: DistanceInfo = { scope: 'object', method: 'Wikidata, niezweryfikowane', source: 'Wikidata (P2583)', ref: '', verified: false }
  const field = [star('Gaia DR3 1', 85.40995, -2.25902, 7.7, 1285, 1270, 1300)]
  expect(cutDistance({ ...ngc2023, distLy: 1500, distInfo: wikidata }, field, null).distLy).toBe(1285)
  expect(cutDistance({ ...ngc2023, distLy: 1500, distInfo: wikidata }, null, null)).toMatchObject({ distLy: 1500, distanceMethod: 'Wikidata, niezweryfikowane' })
  expect(cutDistance({ ...ngc2023, distLy: 1400, distUncLy: 30, distInfo: verified('Zucker 2020', 'cloud') }, field, null)).toMatchObject({ distLy: 1400, uncertaintyLy: 30, distanceScope: 'cloud' })
  expect(hasDistance(cutDistance(ngc2023, [], null))).toBe(false)
})

it('odświeża odległości ustalone przez aplikację, wybór użytkownika zostaje', () => {
  const object = (id: string, extra: Partial<DSO>) => ({ id, type: 'RN', distLy: null, distUncLy: null, distInfo: null, illuminator: null, ...extra }) as DSO
  const catalog = [object('M 45', { i: 0, distLy: 440, distUncLy: 4.4, distInfo: verified('Hunt & Reffert 2023') }), object('IC 349', { i: 1, illuminator: { star: 'HD 23480', raDeg: 56.5816, decDeg: 23.9484, vMag: 4.18, cluster: 0 } }), object('B 33', { i: 2, distLy: 1500, distInfo: { scope: 'object', method: 'Wikidata, niezweryfikowane', source: 'Wikidata (P2583)', ref: '', verified: false } })]
  const byId = new Map(catalog.map((o) => [o.id, o]))
  const cut = (id: string, extra: Partial<PhotoCut> = {}): PhotoCut => ({ id, type: 'RN', raDeg: 0, decDeg: 0, x: 0, y: 0, radius: 1, enabled: true, distLy: null, uncertaintyLy: null, distanceScope: 'object', distanceMethod: '', distanceSource: '', distanceRef: '', distanceOrigin: 'catalog', ...extra })
  const project = { cuts: [cut('M 45', { distLy: 438, distanceSource: 'Wikidata (P2583)' }), cut('IC 349'), cut('B 33', { distLy: 1300, distanceSource: 'SIMBAD — x', distanceOrigin: 'user' })], stars: null }
  const first = refreshCutDistances(project, catalog, byId)
  expect(first.cuts[0]).toMatchObject({ distLy: 440, uncertaintyLy: 4.4, distanceSource: 'Hunt & Reffert 2023' })
  expect(first.cuts[1].distLy).toBeNull()
  expect(first.cuts[2]).toBe(project.cuts[2])
  expect(refreshCutDistances(first, catalog, byId)).toBe(first)
  const withStars = refreshCutDistances({ ...first, stars: { stars: [star('Gaia DR3 1', 56.58155, 23.94836, 4.1, 462, 443, 481)] } }, catalog, byId)
  expect(withStars.cuts[1]).toMatchObject({ distLy: 440, distanceScope: 'illuminator', distanceOrigin: 'stars' })
})

it('regresor: pokazuje sensowne wartości jako niezweryfikowane z metodą modelu, odrzuca resztę', () => {
  // Przypadki z przebiegów pilotażu 6.11.2026 (output/odleglosci-pilotaz-2026-11-06/regressor).
  const lbn950 = regressorDistance({ status: 'ok', kind: 'group', members: 89, distance_pc: 379.52, lo_pc: 355.45, hi_pc: 401.61, cone_deg: 0.45 }, 84.38, -2.3)!
  expect(lbn950).toMatchObject({ distanceScope: 'population', distanceOrigin: 'regressor', distanceSource: 'astro-regressor (model)' })
  expect(lbn950.distLy! / LY_PER_PC).toBeCloseTo(379.52, 1)
  expect(lbn950.distanceMethod).toBe('regresor, niezweryfikowane: grupa 89 gwiazd Gaia DR3 (HDBSCAN 5D + MLE paralaks), stożek 0,45°')
  const ic4278 = regressorDistance({ status: 'ok', kind: 'sdss_z', z_helio: 0.01672 }, 202.6148, 47.2469)!
  expect(ic4278.distanceScope).toBe('redshift')
  expect(ic4278.distanceMethod).toContain('z widma SDSS')
  expect(regressorDistance({ status: 'abstain', reason: 'NO_KINEMATICALLY_COHERENT_CLUSTER' }, 0, 0)).toBeNull()
  expect(regressorDistance({ status: 'error', message: '503' }, 0, 0)).toBeNull()
  // NGC 5169 (CF4, σ 26 %) mieści się w progu 50 %; σ > 50 % i grupa poniżej 5 gwiazd: bez wartości.
  expect(regressorDistance({ status: 'ok', kind: 'cf4', distance_pc: 55.08e6, lo_pc: 42.36e6, hi_pc: 71.61e6 }, 0, 0)?.distLy).toBeCloseTo(55.08e6 * LY_PER_PC, -4)
  expect(regressorDistance({ status: 'ok', kind: 'cf4', distance_pc: 1000, lo_pc: 400, hi_pc: 1500 }, 0, 0)).toBeNull()
  expect(regressorDistance({ status: 'ok', kind: 'group', members: 4, distance_pc: 400, lo_pc: 390, hi_pc: 410, cone_deg: 0.3 }, 0, 0)).toBeNull()
})

it('regresor: tylko wycinki bez odległości, z rozstrzygniętą tożsamością i obsługiwanym typem; wartość zostaje przy odświeżaniu', () => {
  const cut = (extra: Partial<PhotoCut>): PhotoCut => ({ id: 'LBN 950', type: 'EN', raDeg: 0, decDeg: 0, x: 0, y: 0, radius: 1, enabled: true, distLy: null, uncertaintyLy: null, distanceScope: 'object', distanceMethod: '', distanceSource: '', distanceRef: '', distanceOrigin: 'catalog', ...extra })
  expect(regressorEligible(cut({}), { unresolved: false })).toBe(true)
  expect(regressorEligible(cut({}), { unresolved: true })).toBe(false)
  expect(regressorEligible(cut({ type: 'PN' }), { unresolved: false })).toBe(false)
  expect(regressorEligible(cut({ type: 'DN' }), { unresolved: false })).toBe(false)
  expect(regressorEligible(cut({ distanceOrigin: 'user' }), { unresolved: false })).toBe(false)
  expect(regressorEligible(cut({ distLy: 1000 }), { unresolved: false })).toBe(false)
  const object = { id: 'LBN 950', type: 'EN', distLy: null, distUncLy: null, distInfo: null, illuminator: null, unresolved: false } as unknown as DSO
  const regressed = cut({ distLy: 1238, uncertaintyLy: 75, distanceScope: 'population', distanceMethod: 'regresor, niezweryfikowane: grupa', distanceSource: 'astro-regressor (model)', distanceOrigin: 'regressor' })
  const project = { cuts: [regressed], stars: null }
  expect(refreshCutDistances(project, [object], new Map([['LBN 950', object]]))).toBe(project)
  const withCatalog = { ...object, distLy: 1300, distInfo: verified('Zucker 2020', 'cloud') } as DSO
  expect(refreshCutDistances(project, [withCatalog], new Map([['LBN 950', withCatalog]])).cuts[0]).toMatchObject({ distLy: 1300, distanceOrigin: 'catalog' })
})

it('odpytuje regresor często przy liczonym wycinku, rzadziej w kolejce, a po błędzie z odstępem do 2 min (C08)', () => {
  const series = (start: number | null, states: RegressorPollState[]) => {
    let delay = start
    return states.map((state) => (delay = regressorPollDelay(delay, state)))
  }
  expect(series(null, ['running', 'running'])).toEqual([3000, 3000])
  expect(series(null, ['queued', 'queued', 'queued', 'queued', 'queued'])).toEqual([5000, 7500, 11_250, 15_000, 15_000])
  expect(series(3000, ['error', 'error', 'error', 'error', 'error'])).toEqual([15_000, 30_000, 60_000, 120_000, 120_000])
  // Po powrocie serwera: kolejka od razu do 15 s, liczony wycinek do 3 s.
  expect(series(120_000, ['queued'])).toEqual([15_000])
  expect(series(120_000, ['running'])).toEqual([3000])
  expect(series(null, ['error'])).toEqual([15_000])
})
