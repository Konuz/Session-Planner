// Test referencyjny: 40 wycinków (38 obiektów) pilotażu odległości z 6.11.2026 wobec katalogu public/data/catalog.json
// i gwiazd oświetlających z gwiazd Gaia pola. Fixture zapisuje wartość, zakres i status pilotażu oraz oczekiwany wynik
// automatycznego łańcucha aplikacji (z powodem znanej różnicy). Po `npm run build:data` test pokazuje zmianę pokrycia.
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { parseCatalog, quickSearch } from './catalog'
import { cutDistance, hasDistance, NO_DISTANCE, refreshCutDistances, type DistanceScope } from './distance'
import fixture from './distancePilot.fixture.json'
import type { PhotoCut, PhotoStar } from './photo'

interface PilotObject { id: string; photo: string; pilot: { ly: number | null; sigmaPct: number | null; scope: DistanceScope | null; status: string; usable3D: boolean }; expect: 'catalog' | 'stars' | 'unverified' | 'none'; note?: string }
const objects = fixture.objects as PilotObject[]
const stars = fixture.stars as PhotoStar[]
const raw = JSON.parse(readFileSync(new URL('../../public/data/catalog.json', import.meta.url), 'utf8'))
const catalog = parseCatalog(raw.rows, raw.sources, raw.unresolved, raw.photoAliases)

it('wczytuje opublikowaną odległość Sh2-155 bez regresora', () => {
  const object = catalog.find((o) => o.id === 'Sh2-155')!
  expect(object.distLy).toBe(2740)
  expect(object.distUncLy).toBeCloseTo(132, 0)
  expect(object.distInfo).toMatchObject({ verified: true, ref: '2015AJ....150..147F' })
})
const byId = new Map(catalog.map((o) => [o.id, o]))

it('w kadrze Woźnicy wyszukuje jedną mgławicę pod każdym oznaczeniem i zachowuje źródło pomiaru', () => {
  for (const [alias, primary] of [['LBN 747', 'Sh2-219'], ['LBN 744', 'Sh2-216'], ['B 25', 'LDN 1465']]) {
    const results = quickSearch(catalog, alias).map((o) => o.id)
    expect(results[0]).toBe(primary)
    expect(results).not.toContain(alias)
    expect(byId.get(primary)?.aliases).toContain(alias)
  }
  expect(byId.get('Sh2-219')?.distLy).toBe(13796)
  expect(byId.get('Sh2-216')).toMatchObject({ type: 'PN', unresolved: false, distInfo: { ref: '2021A&A...656A.110C' } })
  expect(byId.get('Sh2-216')!.distLy! / 3.26156).toBeCloseTo(126, 0)
  // B 15 to część większego obłoku LDN 1445 (Dutra i Bica 2002).
  expect(byId.get('B 15')?.photoPrimaryId).toBeUndefined()
  expect(byId.get('LDN 1445')?.photoPrimaryId).toBeUndefined()
  // Osobne populacje członkowskie w HR23 mimo wspólnej identyfikacji SIMBAD.
  expect(byId.get('vdBH 10')?.photoPrimaryId).toBeUndefined()
  expect(byId.get('Ruprecht 35')?.photoPrimaryId).toBeUndefined()
  expect(byId.get('Pismis 6')?.photoPrimaryId).toBe('NGC 2645')
  expect(byId.get('NGC 2645')).toMatchObject({ distLy: 5611, distInfo: { ref: '2023A&A...673A.114H' } })
})

it('dziedziczy odległość zapisaną tylko pod aliasem, nawet gdy solver wykrył sam główny wpis', () => {
  const rows = parseCatalog([
    ['Sh2-1', '', '', '', 'EN', 1, 2, 10, 0, -1, 99, 99, '', 0, '', ''],
    ['LBN 1', '', '', '', 'EN', 1, 2, 10, 0, -1, 99, 99, '', 1200, '', '', 100, 0],
  ], [[0, 'pomiar', 'publikacja', 'ref', 1]], [], { 'LBN 1': 'Sh2-1' })
  const cut: PhotoCut = { ...NO_DISTANCE, id: 'Sh2-1', type: 'EN', x: 10, y: 10, radius: 5, raDeg: 1, decDeg: 2, enabled: false }
  const project = refreshCutDistances({ cuts: [cut], stars: null }, rows, new Map(rows.map((o) => [o.id, o])))
  expect(project.cuts[0]).toMatchObject({ id: 'Sh2-1', distLy: 1200, uncertaintyLy: 120, distanceSource: 'publikacja', enabled: false })
})

it('odświeża zapisany projekt Tulipana do jednego wycinka i zachowuje ręczny pomiar', () => {
  const makeCut = (id: string, x: number, patch: Partial<PhotoCut> = {}): PhotoCut =>
    ({ ...NO_DISTANCE, id, type: 'EN', x, y: 16, radius: 10, raDeg: 300, decDeg: 35, enabled: true, ...patch })
  const primary = makeCut('Sh2-101', 18)
  const alias = makeCut('LBN 168', 10, { distLy: 7000, distanceOrigin: 'user', distanceSource: 'SIMBAD' })
  const project = refreshCutDistances({ cuts: [alias, primary], stars: null }, catalog, byId)
  expect(project.cuts).toEqual([expect.objectContaining({ id: 'Sh2-101', x: 18, distLy: 7000, distanceOrigin: 'user' })])
  expect(refreshCutDistances(project, catalog, byId)).toBe(project)
  const restored = refreshCutDistances({ cuts: [alias], stars: null }, catalog, byId)
  expect(restored.cuts).toEqual([expect.objectContaining({ id: 'Sh2-101', x: 10, distLy: 7000 })])
  const manualNone = { ...alias, ...NO_DISTANCE, distanceOrigin: 'user' as const }
  expect(refreshCutDistances({ cuts: [primary, manualNone], stars: null }, catalog, byId).cuts[0])
    .toMatchObject({ id: 'Sh2-101', distLy: null, distanceOrigin: 'user', x: 18 })
})

function appDistance(id: string) {
  const object = byId.get(id)
  if (!object) throw new Error(`Brak ${id} w katalogu`)
  const cluster = object.illuminator?.cluster != null ? catalog[object.illuminator.cluster] : null
  return { object, distance: cutDistance(object, stars, cluster) }
}

it.each(objects.map((o) => [o.id, o] as const))('%s: wynik łańcucha zgodny z pilotażem', (_, o) => {
  const { object, distance } = appDistance(o.id)
  if (o.expect === 'none') {
    expect(hasDistance(distance)).toBe(false)
    return
  }
  if (o.expect === 'unverified') {
    expect(object.distInfo?.verified).toBe(false)
    expect(distance.distanceMethod).toContain('niezweryfikowane')
    return
  }
  expect(distance.distanceOrigin).toBe(o.expect === 'stars' ? 'stars' : 'catalog')
  // Zgodność wartości: w 2σ pilotażu, co najmniej 2 % (z SIMBAD a z NED w pilotażu dla IC 2388: 1,6 %).
  const tolerance = Math.max(2 * (o.pilot.sigmaPct ?? 0) / 100, 0.02)
  expect(Math.abs(distance.distLy! / o.pilot.ly! - 1)).toBeLessThanOrEqual(tolerance)
  expect(distance.distanceScope).toBe(o.pilot.scope)
  // Niepewność względna z pilotażu, gdy była podana (z dokładnością do zaokrągleń i dolnej granicy 1 %).
  if (o.pilot.sigmaPct !== null && distance.uncertaintyLy !== null) expect(distance.uncertaintyLy / distance.distLy! * 100).toBeCloseTo(o.pilot.sigmaPct, -0.5)
  // W 3D według progu 50 % (decyzja 14.11.2026; pilotaż liczył 20 %): pomiar lub wartość pośrednia z σ ≤ 50 %.
  expect(hasDistance(distance)).toBe(['measured', 'indirect'].includes(o.pilot.status) && (o.pilot.sigmaPct === null || o.pilot.sigmaPct <= 50))
})

it('pokrycie: obiekty z odległością w 3D i znane różnice względem pilotażu', () => {
  const shown = objects.filter((o) => hasDistance(appDistance(o.id).distance))
  const verified = shown.filter((o) => appDistance(o.id).distance.distanceMethod !== 'Wikidata, niezweryfikowane')
  // Pilotaż: 27/40 wycinków do 3D (część z literatury, próg 20 %). Łańcuch automatyczny: 21 sprawdzonych (z NGC 5169:
  // CF4 z σ 26 % mieści się w progu 50 %) + 3 z Wikidata (B 33, IC 4282, NGC 5198).
  expect(objects.filter((o) => o.pilot.usable3D)).toHaveLength(27)
  expect(verified).toHaveLength(21)
  expect(shown).toHaveLength(24)
  // Kandydaci i obiekty bez danych z pilotażu nigdy nie dostają odległości.
  for (const o of objects.filter((o) => o.pilot.status === 'candidate' || o.pilot.status === 'none')) expect(hasDistance(appDistance(o.id).distance), o.id).toBe(false)
  // Każda różnica ma zapisany powód.
  for (const o of objects.filter((o) => o.pilot.usable3D !== hasDistance(appDistance(o.id).distance) || o.expect === 'unverified')) expect(o.note, o.id).toBeTruthy()
})
