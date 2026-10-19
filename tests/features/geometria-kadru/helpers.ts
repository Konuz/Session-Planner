// Wspólne dane i narzędzia testów funkcji „geometria-kadru”.
//
// Nazwy, których spec nie podaje (wybrane przez test-author; opisane też w zaślepce src/services/framing.ts):
// - `normalizeFraming(framing)` – przycięcie zakresów z P8;
// - `mosaicPanels(profile, framing)` – panele (col, row, center, paDeg, corners: LG, PG, PD, LD);
// - `oagPrisms(profile, framing)` – 4 punkty nieba pryzmatu przy każdym panelu, [] przy `oag: null`;
// - `mosaicSizeDeg(profile, framing)` – { widthDeg, heightDeg };
// - `skyToCutout(cutout, point)` / `cutoutToSky(cutout, pixel)` – rzut TAN na wycinek
//   `{ center, fovDeg, widthPx, heightPx }` i z powrotem.
// Tolerancje ze spec: kąty ±0,002°, PA ±0,01° (z zawinięciem), piksele ±1 px.
import { expect } from 'vitest'
import { DEMO_PROFILES } from '../../../src/data/demo'
import type { EquatorialDeg } from '../../../src/services/astroMath'
import { skyToCutout, type CutoutPoint, type SkyCutout } from '../../../src/services/framing'
import type { EquipmentProfile, Framing } from '../../../src/types'

export const ANGLE_TOL = 0.002
export const PA_TOL = 0.01
export const PX_TOL = 1

function demoProfile(id: string): EquipmentProfile {
  const found = DEMO_PROFILES.find((profile) => profile.id === id)
  if (!found) throw new Error(`Brak profilu ${id}`)
  return structuredClone(found)
}

/** RedCat 51 + ASI2600MC Pro: matryca 23,49 × 15,70 mm, F 250 mm. */
export const redcat = (): EquipmentProfile => demoProfile('demo-redcat51-asi2600mc')
/** „Mój zestaw”: Newton 150/600 + Ares-M Pro (matryca 11,31 × 11,31 mm, F 600 mm). */
export const newton150 = (): EquipmentProfile => demoProfile('demo-moj-zestaw')
/** Esprit 100ED + ASI6200MM Pro: matryca 36,01 × 24,02 mm, F 550 mm. */
export const esprit = (): EquipmentProfile => demoProfile('demo-esprit100-asi6200mm')
/** Newton 200/1000 + ASI533MM Pro: matryca 11,31 × 11,31 mm, F 1000 mm. */
export const newton200 = (): EquipmentProfile => demoProfile('demo-newton200-asi533mm')

export type Oag = NonNullable<EquipmentProfile['oag']>

export function withOag(profile: EquipmentProfile, oag: Oag): EquipmentProfile {
  return { ...profile, oag }
}

/** OAG z P15: pryzmat 8 × 4 mm, odsunięcie 8 mm, kąt 0°. */
export const P15_OAG: Oag = { prismWidthMm: 8, prismHeightMm: 4, offsetFromCenterMm: 8, angleDeg: 0 }

export interface FramingInput {
  ra?: number
  dec?: number
  pa?: number
  cols?: number
  rows?: number
  overlap?: number
}

/** Ustawienia kadru; domyślnie jak w spec: środek RA 30°, Dec 0°, PA 0°, mozaika 2×1, zakładka 20%. */
export function framing({ ra = 30, dec = 0, pa = 0, cols = 2, rows = 1, overlap = 20 }: FramingInput = {}): Framing {
  return { centerRaDeg: ra, centerDecDeg: dec, paDeg: pa, mosaic: { cols, rows, overlapPct: overlap } }
}

/** Wycinek kwadratowy (domyślnie „wycinek 2°”: 1000 × 1000 px, pole 2°). */
export function cutout(raDeg: number, decDeg: number, fovDeg = 2, widthPx = 1000, heightPx = widthPx): SkyCutout {
  return { center: { raDeg, decDeg }, fovDeg, widthPx, heightPx }
}

export function expectNear(actual: number, expected: number, tol: number, what = ''): void {
  expect(Math.abs(actual - expected), `${what}: ${actual} zamiast ${expected} ±${tol}`).toBeLessThanOrEqual(tol)
}

export function expectAngle(actual: number, expected: number, what = 'kąt'): void {
  expectNear(actual, expected, ANGLE_TOL, what)
}

/** RA bez zawinięcia (1,153° ≠ 361,153°) i zawsze w [0, 360). */
export function expectRa(actual: number, expected: number, what = 'RA'): void {
  expect(actual, `${what} w [0, 360)`).toBeGreaterThanOrEqual(0)
  expect(actual, `${what} w [0, 360)`).toBeLessThan(360)
  expectNear(actual, expected, ANGLE_TOL, what)
}

export function expectSky(actual: EquatorialDeg, raDeg: number, decDeg: number, what = 'punkt'): void {
  expectRa(actual.raDeg, raDeg, `${what} RA`)
  expectAngle(actual.decDeg, decDeg, `${what} Dec`)
}

/** PA z zawinięciem: 359,999° zalicza się jako 0°. Wynik ma być w [0, 360). */
export function expectPa(actual: number, expected: number, what = 'PA'): void {
  expect(actual, `${what} w [0, 360)`).toBeGreaterThanOrEqual(0)
  expect(actual, `${what} w [0, 360)`).toBeLessThan(360)
  const diff = Math.abs(((actual - expected + 540) % 360) - 180)
  expect(diff, `${what}: ${actual} zamiast ${expected} ±${PA_TOL}`).toBeLessThanOrEqual(PA_TOL)
}

export function expectPx(actual: CutoutPoint, x: number, y: number, what = 'piksel'): void {
  expectNear(actual.x, x, PX_TOL, `${what} x`)
  expectNear(actual.y, y, PX_TOL, `${what} y`)
}

export interface PixelBox {
  xMin: number
  xMax: number
  yMin: number
  yMax: number
}

/** Zakres x i y punktów nieba po rzucie na wycinek (kolejność punktów nie ma znaczenia). */
export function pixelBox(cut: SkyCutout, points: readonly EquatorialDeg[]): PixelBox {
  const px = points.map((point) => skyToCutout(cut, point))
  return {
    xMin: Math.min(...px.map((p) => p.x)),
    xMax: Math.max(...px.map((p) => p.x)),
    yMin: Math.min(...px.map((p) => p.y)),
    yMax: Math.max(...px.map((p) => p.y)),
  }
}

export function expectBox(actual: PixelBox, x: [number, number], y: [number, number], what = 'prostokąt'): void {
  expectNear(actual.xMin, x[0], PX_TOL, `${what} x min`)
  expectNear(actual.xMax, x[1], PX_TOL, `${what} x max`)
  expectNear(actual.yMin, y[0], PX_TOL, `${what} y min`)
  expectNear(actual.yMax, y[1], PX_TOL, `${what} y max`)
}

/** Odległość kątowa dwóch punktów [°] (wzór haversine, niezależny od testowanego kodu). */
export function separationDeg(a: EquatorialDeg, b: EquatorialDeg): number {
  const rad = Math.PI / 180
  const dDec = (b.decDeg - a.decDeg) * rad
  const dRa = (b.raDeg - a.raDeg) * rad
  const h = Math.sin(dDec / 2) ** 2 + Math.cos(a.decDeg * rad) * Math.cos(b.decDeg * rad) * Math.sin(dRa / 2) ** 2
  return (2 * Math.asin(Math.min(1, Math.sqrt(h)))) / rad
}

/** Wszystkie liczby w strukturze są skończone (bez NaN i ±∞). */
export function collectNumbers(value: unknown, out: number[] = []): number[] {
  if (typeof value === 'number') out.push(value)
  else if (Array.isArray(value)) value.forEach((item) => collectNumbers(item, out))
  else if (value !== null && typeof value === 'object') Object.values(value).forEach((item) => collectNumbers(item, out))
  return out
}
