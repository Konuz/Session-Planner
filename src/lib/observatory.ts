// Obserwatorium 3D: obiekty zdjęcia (gwiazdy Gaia i wycinki katalogowe) na wspólnej osi linii widzenia.
// Czysta logika bez three.js: pozycje, skala logarytmiczna odległości, histogram i filtry.
import type { ObjectType } from './catalog'
import type { PhotoProject } from './photo'

export type ObservatoryCategory = 'stars' | 'nebulae' | 'galaxies'
export type CategoryFilter = ObservatoryCategory | 'all'
export const CATEGORY_LABELS: Record<CategoryFilter, string> = { all: 'Wszystko', stars: 'Gwiazdy', nebulae: 'Mgławice i gromady', galaxies: 'Galaktyki' }

export interface ObservatoryItem {
  id: string
  kind: 'star' | 'object'
  category: ObservatoryCategory
  /** Typ katalogowy wycinka; null dla gwiazd. */
  type: ObjectType | null
  /** Piksel zdjęcia (środek wycinka lub gwiazdy) i promień wycinka w pikselach (0 dla gwiazd). */
  x: number
  y: number
  radius: number
  distLy: number | null
  distLoLy: number | null
  distHiLy: number | null
  gMag: number | null
  bpRp: number | null
  /** ϖ/σ paralaksy Gaia (tylko gwiazdy). */
  parallaxOverError: number | null
  raDeg: number
  decDeg: number
  source: string
}

/** Szerokość płaszczyzny zdjęcia i długość osi w jednostkach sceny. */
export const PLANE_WIDTH = 100
export const AXIS_LENGTH = 400
export const GAIA_SOURCE = 'Gaia DR3; odległość: Bailer-Jones i in. 2021 (geometryczna)'

export function categoryOf(type: ObjectType): ObservatoryCategory {
  return type === 'G' || type === 'GG' ? 'galaxies' : 'nebulae'
}

/** Włączone wycinki i gwiazdy Gaia zdjęcia jako jedna lista. */
export function observatoryItems(project: PhotoProject): ObservatoryItem[] {
  const cuts = project.cuts.filter((cut) => cut.enabled).map((cut): ObservatoryItem => ({
    id: cut.id, kind: 'object', category: categoryOf(cut.type), type: cut.type, x: cut.x, y: cut.y, radius: cut.radius,
    distLy: cut.distLy, distLoLy: cut.distLy !== null && cut.uncertaintyLy !== null ? cut.distLy - cut.uncertaintyLy : null,
    distHiLy: cut.distLy !== null && cut.uncertaintyLy !== null ? cut.distLy + cut.uncertaintyLy : null,
    gMag: null, bpRp: null, parallaxOverError: null, raDeg: cut.raDeg, decDeg: cut.decDeg, source: cut.distanceSource,
  }))
  const stars = (project.stars?.stars ?? []).map((star): ObservatoryItem => ({
    id: star.id, kind: 'star', category: 'stars', type: null, x: star.x, y: star.y, radius: 0,
    distLy: star.distLy, distLoLy: star.distLoLy, distHiLy: star.distHiLy, gMag: star.gMag, bpRp: star.bpRp,
    parallaxOverError: star.parallaxOverError, raDeg: star.raDeg, decDeg: star.decDeg, source: GAIA_SOURCE,
  }))
  return [...cuts, ...stars]
}

export interface LogDomain { minLy: number; maxLy: number }

/** Zakres osi: pełne dekady obejmujące wszystkie znane odległości (co najmniej jedna dekada). */
export function distanceDomain(distances: (number | null)[]): LogDomain {
  const known = distances.filter((d): d is number => d !== null && Number.isFinite(d) && d > 0)
  if (!known.length) return { minLy: 10, maxLy: 1e4 }
  const lo = Math.floor(Math.log10(Math.min(...known)))
  const hi = Math.max(lo + 1, Math.ceil(Math.log10(Math.max(...known))))
  return { minLy: 10 ** lo, maxLy: 10 ** hi }
}

/** Położenie odległości na osi: 0 przy płaszczyźnie zdjęcia, 1 na końcu osi. */
export function depthFraction(distLy: number, domain: LogDomain): number {
  const t = (Math.log10(distLy) - Math.log10(domain.minLy)) / (Math.log10(domain.maxLy) - Math.log10(domain.minLy))
  return Math.max(0, Math.min(1, t))
}

/** Odwrotność depthFraction (oś histogramu i suwaka zakresu). */
export function distanceAt(fraction: number, domain: LogDomain): number {
  return 10 ** (Math.log10(domain.minLy) + Math.max(0, Math.min(1, fraction)) * (Math.log10(domain.maxLy) - Math.log10(domain.minLy)))
}

const smooth = (progress: number) => {
  const t = Math.max(0, Math.min(1, progress))
  return t * t * (3 - 2 * t)
}

/**
 * Pozycja w scenie: x w prawo, y w górę, linia widzenia wzdłuż −z (obserwator po stronie +z).
 * progress 0: płaszczyzna zdjęcia (piksel → punkt płaszczyzny); 1: głębia z odległości. Bez odległości obiekt zostaje na zdjęciu.
 */
export function observatoryPosition(pixel: { x: number; y: number }, image: { width: number; height: number }, distLy: number | null, domain: LogDomain, progress: number): [number, number, number] {
  const scale = PLANE_WIDTH / image.width
  const x = (pixel.x - image.width / 2) * scale
  const y = (image.height / 2 - pixel.y) * scale
  const depth = distLy !== null && distLy > 0 ? depthFraction(distLy, domain) * AXIS_LENGTH : 0
  return [x, y, -depth * smooth(progress)]
}

type Vec3 = [number, number, number]

/** Położenie kamery względem celu w chwili e (0–1) przelotu: promień, kąt od pionu (+y) i azymut atan2(x, z),
 *  jak w OrbitControls, zmieniają się razem, azymut najkrótszą drogą. Przy liniowym przesuwaniu pozycji azymut
 *  stał do ostatniej klatki, więc nad osią pionową (widok z góry) obraz obracał się skokiem na końcu. */
export function orbitOffset(from: Vec3, to: Vec3, e: number): Vec3 {
  const spherical = ([x, y, z]: Vec3) => {
    const r = Math.hypot(x, y, z)
    return { r, phi: r ? Math.acos(Math.max(-1, Math.min(1, y / r))) : 0, theta: Math.atan2(x, z) }
  }
  const a = spherical(from), b = spherical(to)
  const turn = ((b.theta - a.theta) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI
  const r = a.r + (b.r - a.r) * e, phi = a.phi + (b.phi - a.phi) * e, theta = a.theta + turn * e
  return [r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.cos(theta)]
}

export interface Histogram { edges: number[]; counts: number[] }

/** Histogram w koszykach logarytmicznych; edges ma bins + 1 granic w latach świetlnych. */
export function distanceHistogram(distances: (number | null)[], domain: LogDomain, bins = 48): Histogram {
  const counts = new Array<number>(bins).fill(0)
  for (const d of distances) {
    if (d === null || !(d > 0) || d < domain.minLy || d > domain.maxLy) continue
    counts[Math.min(bins - 1, Math.floor(depthFraction(d, domain) * bins))]++
  }
  return { edges: Array.from({ length: bins + 1 }, (_, i) => distanceAt(i / bins, domain)), counts }
}

export interface ObservatoryFilter {
  category: CategoryFilter
  /** Zakres odległości [od, do] w lś; null: bez ograniczenia (także obiekty bez odległości). */
  range: [number, number] | null
}

export function matchesFilter(item: ObservatoryItem, filter: ObservatoryFilter): boolean {
  if (filter.category !== 'all' && item.category !== filter.category) return false
  if (!filter.range) return true
  return item.distLy !== null && item.distLy >= filter.range[0] && item.distLy <= filter.range[1]
}

export function categoryCounts(items: ObservatoryItem[]): Record<CategoryFilter, number> {
  const counts: Record<CategoryFilter, number> = { all: items.length, stars: 0, nebulae: 0, galaxies: 0 }
  for (const item of items) counts[item.category]++
  return counts
}

/** Rosnąco wg odległości; bez odległości na końcu, potem wg jasności. */
export function byDistance(a: ObservatoryItem, b: ObservatoryItem): number {
  if (a.distLy === null || b.distLy === null) return a.distLy === b.distLy ? (a.gMag ?? -99) - (b.gMag ?? -99) : a.distLy === null ? 1 : -1
  return a.distLy - b.distLy
}

/** Przybliżona barwa gwiazdy z BP−RP (od niebieskobiałej do pomarańczowoczerwonej), składowe 0–1. */
export function starColor(bpRp: number | null): [number, number, number] {
  const stops: [number, [number, number, number]][] = [
    [-0.3, [0.62, 0.72, 1]], [0.3, [0.85, 0.9, 1]], [0.8, [1, 0.96, 0.88]], [1.3, [1, 0.85, 0.62]], [2.2, [1, 0.66, 0.42]], [3.5, [1, 0.5, 0.35]],
  ]
  const v = bpRp ?? 0.8
  if (v <= stops[0][0]) return stops[0][1]
  for (let i = 1; i < stops.length; i++) {
    const [x1, c1] = stops[i]
    if (v <= x1) {
      const [x0, c0] = stops[i - 1]
      const t = (v - x0) / (x1 - x0)
      return [c0[0] + (c1[0] - c0[0]) * t, c0[1] + (c1[1] - c0[1]) * t, c0[2] + (c1[2] - c0[2]) * t]
    }
  }
  return stops[stops.length - 1][1]
}

/** Średnica punktu gwiazdy w pikselach ekranu: od 1,5 px przy granicy jasności do 9 px dla najjaśniejszych. */
export function starSize(gMag: number | null, faintest: number): number {
  const delta = Math.max(0, faintest - (gMag ?? faintest))
  return Math.min(9, 1.5 + delta * 0.9)
}

/** Średnia średnica kątowa Księżyca w stopniach (31′). */
export const MOON_DEG = 0.518

/** Rozmiar pola z macierzy CD zapisanego WCS (skala w centrum, bez dystorsji). */
export function fieldOfView(wcs: unknown, width: number, height: number): { widthDeg: number; heightDeg: number; moons: number } | null {
  const cd = (wcs as { cd?: number[][] } | null)?.cd
  if (!Array.isArray(cd) || cd.length !== 2 || cd.some((row) => !Array.isArray(row) || row.length !== 2 || row.some((v) => !Number.isFinite(v)))) return null
  const scale = Math.sqrt(Math.abs(cd[0][0] * cd[1][1] - cd[0][1] * cd[1][0]))
  if (!(scale > 0)) return null
  const widthDeg = width * scale, heightDeg = height * scale
  return { widthDeg, heightDeg, moons: Math.max(widthDeg, heightDeg) / MOON_DEG }
}
