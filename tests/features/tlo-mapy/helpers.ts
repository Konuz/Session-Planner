// Wspólne dane i narzędzia testów funkcji „tlo-mapy” (spec: .autoloop/features/tlo-mapy/spec.md).
//
// Nazwy, których spec nie podaje (wybrane przez test-author; opis także w zaślepce src/features/framing/mapBackground.ts):
// - `mapBackground(stars, cutout)` → `{ stars: StarDot[], grid: GridLine[] }`:
//   - `StarDot` = `{ x, y, radius }` w kolejności rysowania;
//   - `GridLine` = `{ kind: 'ra' | 'dec', valueDeg, label, points, labelAnchor }` (RA w [0, 360));
// - `starRadius(mag)`, `MAX_BACKGROUND_STARS`;
// - gwiazdy to `Star` z `src/services/stars.ts` (`raDeg`, `decDeg`, `mag` = V);
// - `FramingView` dostaje opcjonalny prop `stars`; tło w svg widoku: `<g data-role="grid">` (linie + `<text>` opisów)
//   i `<g data-role="stars">` (kropki `<circle cx cy r>`).
// Wycinek widoku: 1000 × 1000 jednostek, skala `2·tan(pole/2)/1000` (jak `viewCutout` z `zakladka-kadr`).
import { expect } from 'vitest'
import { cutoutToSky, skyToCutout, type CutoutPoint, type SkyCutout } from '../../../src/services/framing'
import type { Star } from '../../../src/services/stars'
import type { GridLine } from '../../../src/features/framing/mapBackground'

export const VIEW = 1000

/** Wycinek widoku 1000 × 1000 o środku (ra; dec) i polu fov [°]. */
export function cutout(raDeg: number, decDeg: number, fovDeg: number): SkyCutout {
  return { center: { raDeg, decDeg }, fovDeg, widthPx: VIEW, heightPx: VIEW }
}

export function star(raDeg: number, decDeg: number, mag: number): Star {
  return { raDeg: ((raDeg % 360) + 360) % 360, decDeg, mag }
}

/** Promień z reguły spec: 1 + 0,6·(10 − V), przycięty do [1, 8]. */
export const ruleRadius = (mag: number): number => Math.min(8, Math.max(1, 1 + 0.6 * (10 - mag)))

export function expectNear(actual: number, expected: number, tol: number, what = ''): void {
  expect(Number.isFinite(actual), `${what}: ${actual} nie jest liczbą skończoną`).toBe(true)
  expect(Math.abs(actual - expected), `${what}: ${actual} zamiast ${expected} ±${tol}`).toBeLessThanOrEqual(tol)
}

export function expectPoint(actual: CutoutPoint | null | undefined, x: number, y: number, tol = 1, what = 'punkt'): void {
  expect(actual, `${what}: brak punktu`).toBeTruthy()
  expectNear(actual!.x, x, tol, `${what} x`)
  expectNear(actual!.y, y, tol, `${what} y`)
}

export const isFinitePoint = (p: CutoutPoint): boolean => Number.isFinite(p.x) && Number.isFinite(p.y)

/** Punkt w widoku (z małym wcięciem od brzegu, żeby nie zależeć od zaokrągleń). */
export const insideView = (p: CutoutPoint, inset = 0): boolean =>
  p.x >= inset && p.x <= VIEW - inset && p.y >= inset && p.y <= VIEW - inset

function distanceToSegment(p: CutoutPoint, a: CutoutPoint, b: CutoutPoint): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const length2 = dx * dx + dy * dy
  const t = length2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length2))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

/** Najmniejsza odległość punktu od łamanej (odcinki między kolejnymi punktami; jeden punkt = odległość od niego). */
export function distanceToPolyline(p: CutoutPoint, points: readonly CutoutPoint[]): number {
  if (points.length === 0) return Infinity
  if (points.length === 1) return Math.hypot(p.x - points[0].x, p.y - points[0].y)
  let best = Infinity
  for (let i = 0; i + 1 < points.length; i += 1) best = Math.min(best, distanceToSegment(p, points[i], points[i + 1]))
  return best
}

/** Punkty nieba na linii siatki (gęsto), rzutowane na widok; tylko te w widoku (wcięcie 0,5) i < 90° od środka. */
export function samplesOnLine(line: Pick<GridLine, 'kind' | 'valueDeg'>, cut: SkyCutout): CutoutPoint[] {
  const out: CutoutPoint[] = []
  const n = 6000
  for (let i = 0; i <= n; i += 1) {
    const sky =
      line.kind === 'ra'
        ? { raDeg: line.valueDeg, decDeg: -89.99 + (179.98 * i) / n }
        : { raDeg: (360 * i) / n, decDeg: line.valueDeg }
    if (angularSeparation(cut.center, sky) >= 89.9) continue
    const p = skyToCutout(cut, sky)
    if (isFinitePoint(p) && insideView(p, 0.5)) out.push(p)
  }
  return out
}

const DEG = Math.PI / 180

export function angularSeparation(a: { raDeg: number; decDeg: number }, b: { raDeg: number; decDeg: number }): number {
  const cos =
    Math.sin(a.decDeg * DEG) * Math.sin(b.decDeg * DEG) +
    Math.cos(a.decDeg * DEG) * Math.cos(b.decDeg * DEG) * Math.cos((a.raDeg - b.raDeg) * DEG)
  return Math.acos(Math.max(-1, Math.min(1, cos))) / DEG
}

/**
 * Linia przebiega tam, gdzie wynika z rzutu TAN: każdy punkt nieba tej linii widoczny w widoku leży ±tol od łamanej,
 * a każdy punkt łamanej w widoku leży na tej linii nieba (±tol jednostek przeliczone na kąt w środku widoku).
 */
export function expectLineFollowsSky(line: GridLine, cut: SkyCutout, tol = 1): void {
  const what = `linia ${line.kind} ${line.valueDeg} („${line.label}”)`
  const samples = samplesOnLine(line, cut)
  expect(samples.length, `${what}: przebiega przez widok`).toBeGreaterThan(0)
  for (const p of samples) {
    const d = distanceToPolyline(p, line.points)
    expect(d, `${what}: punkt nieba (${p.x.toFixed(1)}; ${p.y.toFixed(1)}) odległy o ${d.toFixed(2)} od łamanej`).toBeLessThanOrEqual(tol)
  }
  const angleTol = (tol * 1.5 * 2 * Math.atan(Math.tan((cut.fovDeg * DEG) / 2))) / DEG / VIEW
  for (const p of line.points.filter((point) => insideView(point, 0.5))) {
    const sky = cutoutToSky(cut, p)
    const off =
      line.kind === 'dec'
        ? Math.abs(sky.decDeg - line.valueDeg)
        : Math.abs(Math.asin(Math.sin((sky.raDeg - line.valueDeg) * DEG) * Math.cos(sky.decDeg * DEG)) / DEG)
    expect(off, `${what}: punkt łamanej (${p.x.toFixed(1)}; ${p.y.toFixed(1)}) leży ${off}° obok linii`).toBeLessThanOrEqual(angleTol)
  }
}

/** P13: dwa kolejne punkty linii, oba w widoku, dzieli najwyżej 20 jednostek. */
export function expectDense(lines: readonly GridLine[]): void {
  for (const line of lines) {
    for (let i = 0; i + 1 < line.points.length; i += 1) {
      const [a, b] = [line.points[i], line.points[i + 1]]
      if (!insideView(a) || !insideView(b)) continue
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      expect(d, `linia „${line.label}”: punkty ${i} i ${i + 1} w widoku dzieli ${d.toFixed(1)}`).toBeLessThanOrEqual(20)
    }
  }
}

/** Żadnej współrzędnej NaN ani nieskończoności (punkty linii i punkty zaczepienia). */
export function expectGridFinite(lines: readonly GridLine[]): void {
  for (const line of lines) {
    expect(Number.isFinite(line.valueDeg), `wartość linii „${line.label}”`).toBe(true)
    expect(line.points.length, `linia „${line.label}” ma punkty`).toBeGreaterThan(0)
    expect(line.points.every(isFinitePoint), `linia „${line.label}”: punkty bez NaN i nieskończoności`).toBe(true)
    if (line.labelAnchor) expect(isFinitePoint(line.labelAnchor), `zaczepienie „${line.label}”`).toBe(true)
  }
}

export const linesOf = (lines: readonly GridLine[], kind: GridLine['kind']): GridLine[] => lines.filter((line) => line.kind === kind)

export const labelsOf = (lines: readonly GridLine[], kind: GridLine['kind']): string[] =>
  linesOf(lines, kind)
    .map((line) => line.label)
    .sort()

export function lineByLabel(lines: readonly GridLine[], label: string): GridLine {
  const found = lines.filter((line) => line.label === label)
  expect(found, `jedna linia z opisem „${label}” (są: ${lines.map((line) => line.label).join(', ')})`).toHaveLength(1)
  return found[0]
}

/**
 * Krok siatki z wartości linii: najmniejsza różnica kolejnych wartości (RA rozwinięte wokół środka).
 * Linii leżących dokładnie na brzegu widoku testy nie liczą, a krok nie zależy od tego, czy je narysowano.
 */
export function stepOf(lines: readonly GridLine[], kind: GridLine['kind'], centerRaDeg = 0): number {
  const values = linesOf(lines, kind)
    .map((line) => (kind === 'ra' ? ((((line.valueDeg - centerRaDeg + 540) % 360) + 360) % 360) - 180 : line.valueDeg))
    .sort((a, b) => a - b)
  expect(values.length, `co najmniej dwie linie ${kind}`).toBeGreaterThanOrEqual(2)
  let best = Infinity
  for (let i = 0; i + 1 < values.length; i += 1) best = Math.min(best, values[i + 1] - values[i])
  return best
}

/** Kroki z listy spec [°]. */
export const ARCMIN = 1 / 60
export const RA_SEC = 15 / 3600
export const RA_MIN = 15 / 60
export const RA_HOUR = 15

/** Gwiazdy na siatce wokół środka (0; 0) przy polu 2° (wszystkie w widoku): i-ta gwiazda ma własne położenie. */
export function gridStar(i: number, mag: number): Star {
  const col = i % 60
  const row = Math.floor(i / 60)
  return star((col - 30) * 0.03, (row - 25) * 0.035, mag)
}

export const key = (p: CutoutPoint): string => `${Math.round(p.x * 10)},${Math.round(p.y * 10)}`
