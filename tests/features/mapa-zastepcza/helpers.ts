// Wspólne dane testów funkcji „mapa-zastepcza” (spec: .autoloop/features/mapa-zastepcza/spec.md).
// Nazwy wybrał test-author (spec ich nie podaje) – opis w src/features/framing/fallbackMap.ts:
// `fallbackMap(catalog, polygonsByUid, cutout)` → `{ uid, kind, lineStyle, shapes, label: { text, position } }[]`.
// Tolerancja pikseli ze spec: ±1 px.
import { readFileSync } from 'node:fs'
import { expect } from 'vitest'
import type { FallbackMapObject } from '../../../src/features/framing/fallbackMap'
import type { EquatorialDeg } from '../../../src/services/astroMath'
import { formatDesignation } from '../../../src/services/catalog/records'
import { cutoutToSky, type CutoutPoint, type SkyCutout } from '../../../src/services/framing'
import { assignOutlines, parseOutlines } from '../../../src/services/outlines'
import type { Designation, DsoObject } from '../../../src/types'

export const PX_TOL = 1
/** Czas na jeden test z pełnym katalogiem (≈16,5 tys. obiektów). */
export const FULL_CATALOG_TIMEOUT = 60_000

/** Katalog aplikacji (public/catalog). Testy czytają go z dysku, bo `loadCatalog` używa fetch. */
export const CATALOG = JSON.parse(
  readFileSync(new URL('../../../public/catalog/catalog.v1.json', import.meta.url), 'utf8'),
) as DsoObject[]

/** Zarysy Stellarium przypisane do katalogu (`zarysy-stellarium`). */
export const ASSIGNMENT = assignOutlines(
  parseOutlines(readFileSync(new URL('../../../src/data/outlines.dat', import.meta.url), 'utf8')),
  CATALOG,
)
export const POLYGONS = ASSIGNMENT.polygonsByUid

/** Wycinek; domyślnie jak w spec: 1000 × 1000 px, pole 2°. */
export function cutout(raDeg: number, decDeg: number, fovDeg = 2, widthPx = 1000, heightPx = widthPx): SkyCutout {
  return { center: { raDeg, decDeg }, fovDeg, widthPx, heightPx }
}

/** Domyślny wycinek spec: pole 2° wokół M 42. */
export const M42_CUTOUT = cutout(83.8221, -5.3911)

/** Obiekt katalogu o oznaczeniu głównym zapisanym jak `formatDesignation` (np. „M 42”, „Sh2-279”). */
export function catalogObject(designation: string): DsoObject {
  const found = CATALOG.find((object) => formatDesignation(object.primary) === designation)
  if (!found) throw new Error(`Brak w katalogu: ${designation}`)
  return found
}

export function uidOf(designation: string): string {
  return catalogObject(designation).uid
}

/** Obiekt mapy o danym oznaczeniu głównym albo undefined. */
export function entry(map: readonly FallbackMapObject[], designation: string): FallbackMapObject | undefined {
  const uid = uidOf(designation)
  return map.find((object) => object.uid === uid)
}

export function mustEntry(map: readonly FallbackMapObject[], designation: string): FallbackMapObject {
  const found = entry(map, designation)
  expect(found, `${designation} na mapie`).toBeDefined()
  return found!
}

export interface SyntheticInput {
  ra: number
  dec: number
  major?: number | null
  minor?: number | null
  pa?: number | null
  names?: string[]
}

/** Sztuczny obiekt katalogu „NGC <id>” (uid `TEST<id>`). */
export function syntheticObject(id: string, { ra, dec, major = null, minor = null, pa = null, names = [] }: SyntheticInput): DsoObject {
  const designation: Designation = { catalog: 'NGC', id }
  return {
    uid: `TEST${id}`,
    primary: designation,
    designations: [designation],
    commonNames: names,
    type: 'emission_nebula',
    raDeg: ra,
    decDeg: dec,
    sizeMajorArcmin: major,
    sizeMinorArcmin: minor,
    positionAngleDeg: pa,
    magV: null,
    surfaceBrightness: null,
    ldnOpacity: null,
    sh2Brightness: null,
    lbnBrightness: null,
    vdbStarMagV: null,
    constellation: 'Ori',
    sources: ['test'],
  }
}

/** Punkt nieba w danym pikselu wycinka (rzut odwrotny z `geometria-kadru`). */
export function skyAt(cut: SkyCutout, x: number, y: number): EquatorialDeg {
  return cutoutToSky(cut, { x, y })
}

export function expectNear(actual: number, expected: number, tol: number, what = ''): void {
  expect(Math.abs(actual - expected), `${what}: ${actual} zamiast ${expected} ±${tol}`).toBeLessThanOrEqual(tol)
}

export function expectPx(actual: CutoutPoint | null | undefined, x: number, y: number, what = 'piksel'): void {
  expect(actual, `${what} istnieje`).toBeTruthy()
  expectNear(actual!.x, x, PX_TOL, `${what} x`)
  expectNear(actual!.y, y, PX_TOL, `${what} y`)
}

export interface PixelBox {
  xMin: number
  xMax: number
  yMin: number
  yMax: number
}

export function box(points: readonly CutoutPoint[]): PixelBox {
  return {
    xMin: Math.min(...points.map((p) => p.x)),
    xMax: Math.max(...points.map((p) => p.x)),
    yMin: Math.min(...points.map((p) => p.y)),
    yMax: Math.max(...points.map((p) => p.y)),
  }
}

/** Średnia punktów (środek elipsy/okręgu z 72 punktów co 5°). */
export function centroid(points: readonly CutoutPoint[]): CutoutPoint {
  return {
    x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
    y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
  }
}

export function distance(a: CutoutPoint, b: CutoutPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/** Wszystkie liczby w strukturze (do sprawdzenia, że nie ma NaN ani ±∞). */
export function collectNumbers(value: unknown, out: number[] = []): number[] {
  if (typeof value === 'number') out.push(value)
  else if (Array.isArray(value)) value.forEach((item) => collectNumbers(item, out))
  else if (value !== null && typeof value === 'object') Object.values(value).forEach((item) => collectNumbers(item, out))
  return out
}

export function expectAllFinite(value: unknown): void {
  const bad = collectNumbers(value).filter((n) => !Number.isFinite(n))
  expect(bad, 'NaN albo ±∞ w wyniku').toEqual([])
}

/** Odległość kątowa [°] (haversine, niezależna od testowanego kodu). */
export function separationDeg(a: EquatorialDeg, b: EquatorialDeg): number {
  const rad = Math.PI / 180
  const dDec = (b.decDeg - a.decDeg) * rad
  const dRa = (b.raDeg - a.raDeg) * rad
  const h = Math.sin(dDec / 2) ** 2 + Math.cos(a.decDeg * rad) * Math.cos(b.decDeg * rad) * Math.sin(dRa / 2) ** 2
  return (2 * Math.asin(Math.min(1, Math.sqrt(h)))) / rad
}

/** Fragment katalogu w promieniu `radiusDeg` od punktu (szybsze testy kolejności i powtarzalności). */
export function catalogNear(center: EquatorialDeg, radiusDeg: number): DsoObject[] {
  return CATALOG.filter((object) => separationDeg(center, { raDeg: object.raDeg, decDeg: object.decDeg }) <= radiusDeg)
}
