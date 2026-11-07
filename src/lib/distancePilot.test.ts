// Test referencyjny: 40 wycinków (38 obiektów) pilotażu odległości z 6.11.2026 wobec katalogu public/data/catalog.json
// i gwiazd oświetlających z gwiazd Gaia pola. Fixture zapisuje wartość, zakres i status pilotażu oraz oczekiwany wynik
// automatycznego łańcucha aplikacji (z powodem znanej różnicy). Po `npm run build:data` test pokazuje zmianę pokrycia.
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { parseCatalog } from './catalog'
import { cutDistance, hasDistance, type DistanceScope } from './distance'
import fixture from './distancePilot.fixture.json'
import type { PhotoStar } from './photo'

interface PilotObject { id: string; photo: string; pilot: { ly: number | null; sigmaPct: number | null; scope: DistanceScope | null; status: string; usable3D: boolean }; expect: 'catalog' | 'stars' | 'unverified' | 'none'; note?: string }
const objects = fixture.objects as PilotObject[]
const stars = fixture.stars as PhotoStar[]
const raw = JSON.parse(readFileSync(new URL('../../public/data/catalog.json', import.meta.url), 'utf8'))
const catalog = parseCatalog(raw.rows, raw.sources, raw.unresolved)
const byId = new Map(catalog.map((o) => [o.id, o]))

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
  // W 3D tak jak w pilotażu (σ ≤ 20 %).
  expect(hasDistance(distance)).toBe(o.pilot.usable3D)
})

it('pokrycie: obiekty z odległością w 3D i znane różnice względem pilotażu', () => {
  const shown = objects.filter((o) => hasDistance(appDistance(o.id).distance))
  const verified = shown.filter((o) => appDistance(o.id).distance.distanceMethod !== 'Wikidata, niezweryfikowane')
  // Pilotaż: 27/40 wycinków do 3D (część z literatury). Łańcuch automatyczny: 20 sprawdzonych + 4 z Wikidata
  // (B 33, IC 4282, NGC 5198 oraz NGC 5169 zamiast CF4 z σ 26 %).
  expect(objects.filter((o) => o.pilot.usable3D)).toHaveLength(27)
  expect(verified).toHaveLength(20)
  expect(shown).toHaveLength(24)
  // Kandydaci i obiekty bez danych z pilotażu nigdy nie dostają odległości.
  for (const o of objects.filter((o) => o.pilot.status === 'candidate' || o.pilot.status === 'none')) expect(hasDistance(appDistance(o.id).distance), o.id).toBe(false)
  // Każda różnica ma zapisany powód.
  for (const o of objects.filter((o) => o.pilot.usable3D !== hasDistance(appDistance(o.id).distance) || o.expect === 'unverified')) expect(o.note, o.id).toBeTruthy()
})
