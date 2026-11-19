// Obserwatorium 3D: obiekty zdjęcia (gwiazdy Gaia i wycinki katalogowe) na wspólnej osi linii widzenia.
// Czysta logika bez three.js: pozycje, skala logarytmiczna odległości, histogram i filtry.
import type { ObjectType } from './catalog'
import type { DistanceScope } from './distance'
import { cutsInThreeD, type PhotoCatalogKind, type PhotoProject } from './photo'

export type ObservatoryCategory = 'stars' | 'nebulae' | 'galaxies'
export type CategoryFilter = ObservatoryCategory | 'all'
export const PHOTO_UNFOLD_MS = 2000
export const CATEGORY_LABELS: Record<CategoryFilter, string> = { all: 'Wszystko', stars: 'Gwiazdy', nebulae: 'Mgławice i gromady', galaxies: 'Galaktyki' }

export interface ObservatoryItem {
  id: string
  kind: 'star' | 'object'
  category: ObservatoryCategory
  /** Typ katalogowy wycinka; null dla gwiazd. */
  type: ObjectType | null
  catalogKind?: PhotoCatalogKind
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
  /** Źródło odległości (publikacja lub katalog), metoda, bibcode i zakres; gwiazdy: Gaia DR3 i Bailer-Jones. */
  source: string
  method: string
  ref: string
  scope: DistanceScope
}

/** Dłuższy bok płaszczyzny zdjęcia i długość osi w jednostkach sceny. */
export const PLANE_WIDTH = 100
export const AXIS_LENGTH = 400
export const AXIS_DASH = 2
export const GAIA_SOURCE = 'Gaia DR3; odległość: Bailer-Jones i in. 2021 (geometryczna)'

/** Wymiary płaszczyzny zdjęcia w scenie (dłuższy bok = PLANE_WIDTH) i skala piksel → jednostka sceny. */
export function planeSize(image: { width: number; height: number }): { width: number; height: number; scale: number } {
  const max = Math.max(image.width, image.height)
  const scale = max > 0 ? PLANE_WIDTH / max : 0
  return { width: image.width * scale, height: image.height * scale, scale }
}

export function categoryOf(type: ObjectType): ObservatoryCategory {
  return type === 'G' || type === 'GG' ? 'galaxies' : 'nebulae'
}

/** Włączone wycinki z ustaloną odległością i gwiazdy Gaia z odległością jako jedna lista. Obiektów bez odległości
 *  nie ma w Obserwatorium: ani w scenie, ani na liście. */
export function observatoryItems(project: PhotoProject): ObservatoryItem[] {
  const cuts = cutsInThreeD(project.cuts).map((cut): ObservatoryItem => ({
    id: cut.id, kind: 'object', category: categoryOf(cut.type), type: cut.type, catalogKind: cut.catalogMatch?.kind, x: cut.x, y: cut.y, radius: cut.radius,
    distLy: cut.distLy, distLoLy: cut.distLy !== null && cut.uncertaintyLy !== null ? cut.distLy - cut.uncertaintyLy : null,
    distHiLy: cut.distLy !== null && cut.uncertaintyLy !== null ? cut.distLy + cut.uncertaintyLy : null,
    gMag: null, bpRp: null, parallaxOverError: null, raDeg: cut.raDeg, decDeg: cut.decDeg,
    source: cut.distanceSource, method: cut.distanceMethod, ref: cut.distanceRef, scope: cut.distanceScope,
  }))
  const stars = (project.stars?.stars ?? []).filter((star) => star.distLy !== null && star.distLy > 0).map((star): ObservatoryItem => ({
    id: star.id, kind: 'star', category: 'stars', type: null, x: star.x, y: star.y, radius: 0,
    distLy: star.distLy, distLoLy: star.distLoLy, distHiLy: star.distHiLy, gMag: star.gMag, bpRp: star.bpRp,
    parallaxOverError: star.parallaxOverError, raDeg: star.raDeg, decDeg: star.decDeg,
    source: GAIA_SOURCE, method: 'paralaksa Gaia DR3 (ϖ/σ ≥ 5)', ref: '2021AJ....161..147B', scope: 'object',
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
 * progress 0: płaszczyzna zdjęcia (piksel → punkt płaszczyzny); 1: głębia z odległości.
 */
export function observatoryPosition(pixel: { x: number; y: number }, image: { width: number; height: number }, distLy: number | null, domain: LogDomain, progress: number): [number, number, number] {
  const { scale } = planeSize(image)
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
export interface HistogramStop { offset: number; color: string }
export interface HistogramCurve { linePath: string; areaPath: string; stops: HistogramStop[] }

export const HISTOGRAM_HEIGHT = 40
export const HISTOGRAM_TOP = 3
export const HISTOGRAM_BOTTOM = 39
const HISTOGRAM_MIN_VISIBLE = 2.5

/** Histogram w koszykach logarytmicznych; edges ma bins + 1 granic w latach świetlnych. */
export function distanceHistogram(distances: (number | null)[], domain: LogDomain, bins = 48): Histogram {
  const counts = new Array<number>(bins).fill(0)
  for (const d of distances) {
    if (d === null || !(d > 0) || d < domain.minLy || d > domain.maxLy) continue
    counts[Math.min(bins - 1, Math.floor(depthFraction(d, domain) * bins))]++
  }
  return { edges: Array.from({ length: bins + 1 }, (_, i) => distanceAt(i / bins, domain)), counts }
}

/** Kolor wykresu dla znormalizowanej wartości [0..1]: zielony (mało) → bursztyn → czerwony (dużo). */
export function histogramColor(intensity: number): string {
  const v = Math.max(0, Math.min(1, intensity))
  if (v <= 0) return 'var(--ok)'
  if (v >= 1) return 'var(--bad)'
  if (v < 0.5) {
    const p = Math.round(v * 200)
    return p === 0 ? 'var(--ok)' : p === 100 ? 'var(--warn)' : `color-mix(in srgb, var(--warn) ${p}%, var(--ok))`
  }
  const p = Math.round((v - 0.5) * 200)
  return p === 0 ? 'var(--warn)' : p === 100 ? 'var(--bad)' : `color-mix(in srgb, var(--bad) ${p}%, var(--warn))`
}

/** Gładka krzywa monotoniczna (splajn Hermite'a Fritsch–Carlson) oraz gradientowe stopnie kolorów wzdłuż osi X. */
export function histogramCurve(counts: number[]): HistogramCurve {
  const bins = counts.length
  const max = counts.reduce((a, b) => Math.max(a, b), 0)
  if (bins === 0 || max <= 0) return { linePath: '', areaPath: '', stops: [] }

  const plotH = HISTOGRAM_BOTTOM - HISTOGRAM_TOP
  const yAt = (count: number) => count <= 0 ? HISTOGRAM_BOTTOM : HISTOGRAM_BOTTOM - (HISTOGRAM_MIN_VISIBLE + (plotH - HISTOGRAM_MIN_VISIBLE) * (count / max))
  const intensityAt = (y: number) => Math.max(0, Math.min(1, (HISTOGRAM_BOTTOM - y - HISTOGRAM_MIN_VISIBLE) / (plotH - HISTOGRAM_MIN_VISIBLE)))

  const xs = [0, ...Array.from({ length: bins }, (_, i) => i + 0.5), bins]
  const ys = [yAt(counts[0]), ...counts.map(yAt), yAt(counts[bins - 1])]
  const n = xs.length
  const dx = new Array<number>(n - 1)
  const sec = new Array<number>(n - 1)
  for (let k = 0; k < n - 1; k++) {
    dx[k] = xs[k + 1] - xs[k]
    sec[k] = (ys[k + 1] - ys[k]) / dx[k]
  }

  const m = new Array<number>(n).fill(0)
  m[0] = sec[0]
  m[n - 1] = sec[n - 2]
  for (let k = 1; k < n - 1; k++) {
    if (sec[k - 1] * sec[k] <= 0) m[k] = 0
    else {
      const w1 = 2 * dx[k] + dx[k - 1]
      const w2 = dx[k] + 2 * dx[k - 1]
      m[k] = (w1 + w2) / (w1 / sec[k - 1] + w2 / sec[k])
    }
  }
  for (let k = 0; k < n - 1; k++) {
    if (sec[k] === 0) {
      m[k] = 0
      m[k + 1] = 0
    } else {
      const a = m[k] / sec[k]
      const b = m[k + 1] / sec[k]
      const s = a * a + b * b
      if (s > 9) {
        const tau = 3 / Math.sqrt(s)
        m[k] = tau * a * sec[k]
        m[k + 1] = tau * b * sec[k]
      }
    }
  }

  const fmt = (v: number) => Number(v.toFixed(3))
  const parts = [`M0 ${fmt(ys[0])}`]
  const raw: HistogramStop[] = [{ offset: 0, color: histogramColor(intensityAt(ys[0])) }]

  for (let k = 0; k < n - 1; k++) {
    const x0 = xs[k], x1 = xs[k + 1]
    const y0 = ys[k], y1 = ys[k + 1]
    const h = dx[k]
    if (y0 === y1 && m[k] === 0 && m[k + 1] === 0) {
      parts.push(`L${fmt(x1)} ${fmt(y1)}`)
      raw.push({ offset: x1 / bins, color: histogramColor(intensityAt(y1)) })
    } else {
      const c1x = x0 + h / 3
      const c1y = y0 + (m[k] * h) / 3
      const c2x = x1 - h / 3
      const c2y = y1 - (m[k + 1] * h) / 3
      parts.push(`C${fmt(c1x)} ${fmt(c1y)} ${fmt(c2x)} ${fmt(c2y)} ${fmt(x1)} ${fmt(y1)}`)

      const t0 = intensityAt(y0)
      const t1 = intensityAt(y1)
      const steps = Math.max(2, Math.ceil(Math.abs(t1 - t0) / 0.1))
      for (let j = 1; j <= steps; j++) {
        const u = j / steps
        const om = 1 - u
        const xu = x0 + u * h
        const yu = om ** 3 * y0 + 3 * om * om * u * c1y + 3 * om * u * u * c2y + u ** 3 * y1
        raw.push({ offset: xu / bins, color: histogramColor(intensityAt(yu)) })
      }
    }
  }

  const stops = raw.filter((s, i) => i === 0 || i === raw.length - 1 || raw[i - 1].color !== s.color || raw[i + 1].color !== s.color)
  const linePath = parts.join(' ')
  const areaPath = `${linePath} L${bins} ${HISTOGRAM_BOTTOM} L0 ${HISTOGRAM_BOTTOM} Z`
  return { linePath, areaPath, stops }
}

export interface ObservatoryFilter {
  category: CategoryFilter
  /** Zakres odległości [od, do] w lś; null: bez ograniczenia. */
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

/** Ziemia przed płaszczyzną zdjęcia (umownie: oś jest logarytmiczna, zero nie ma na niej miejsca). */
export const EARTH_Z = 70
/** Pionowe pole widzenia kamery Obserwatorium w stopniach. */
export const OBSERVATORY_FOV = 40

/** Odległość kamery, przy której prostokąt (szerokość × wysokość w płaszczyźnie ekranu) mieści się w kadrze. */
export function fitDistance(width: number, height: number, aspect: number): number {
  const v = OBSERVATORY_FOV * Math.PI / 360
  const h = Math.atan(Math.tan(v) * aspect)
  return Math.max(height / 2 / Math.tan(v), width / 2 / Math.tan(h)) * 1.12
}

/** Widok „Z Ziemi”: blisko za Ziemią, lekko nad osią; jednakowy dla każdych proporcji zdjęcia. */
export function earthViewPose(aspect: number): { position: Vec3; target: Vec3 } {
  const z = Math.max(EARTH_Z + 15, fitDistance(PLANE_WIDTH, PLANE_WIDTH, aspect) * 0.96)
  const y = Math.min(0.14 * (z - EARTH_Z) * (z / EARTH_Z), 0.22 * z)
  return {
    target: [0, 0, 0],
    position: [0, y, z],
  }
}

/**
 * Widok „Struktura” (i szew nurkowania z Drogi Mlecznej): skos z przodu i z góry na całość po pełnym rozłożeniu:
 * płaszczyznę zdjęcia, Ziemię i obiekty z odległością. Nie zależy od proporcji płótna (dopasowanie w pionie).
 */
export function structureViewPose(items: Pick<ObservatoryItem, 'x' | 'y' | 'distLy'>[], image: { width: number; height: number }, domain: LogDomain): { position: Vec3; target: Vec3 } {
  const { width: w, height: h } = planeSize(image)
  const min: Vec3 = [-w / 2, -h / 2, 0], max: Vec3 = [w / 2, h / 2, EARTH_Z]
  for (const item of items) {
    if (item.distLy === null) continue
    const p = observatoryPosition(item, image, item.distLy, domain, 1)
    for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], p[i]); max[i] = Math.max(max[i], p[i]) }
  }
  const target: Vec3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2]
  const radius = Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]) / 2
  const distance = radius / Math.sin(OBSERVATORY_FOV * Math.PI / 360) * 0.9
  const dir = [1.05, 0.62, 0.9], n = Math.hypot(...dir)
  return { target, position: [target[0] + dir[0] / n * distance, target[1] + dir[1] / n * distance, target[2] + dir[2] / n * distance] }
}

export interface CutoutLabelPlacement {
  x: number
  y: number
  box: { left: number; top: number; right: number; bottom: number }
}

/** Położenie podpisu wycinka na ekranie poza okręgiem wycinka i pierścieniem zaznaczenia (z zapasem przy krawędziach kadru). */
export function placeCutoutLabel(opts: {
  cx: number
  cy: number
  radius: number
  labelWidth: number
  labelHeight: number
  dx: number
  dy: number
  viewportWidth: number
  viewportHeight: number
  byMarker: boolean
}): CutoutLabelPlacement {
  const { cx, cy, radius, labelWidth, labelHeight, dx, dy, viewportWidth, viewportHeight, byMarker } = opts
  const gap = 8
  const pad = 4
  const clamp = (v: number, lo: number, hi: number) => hi < lo ? lo : Math.max(lo, Math.min(hi, v))
  const make = (left: number, top: number): CutoutLabelPlacement => ({
    x: left - dx,
    y: top - dy,
    box: { left, top, right: left + labelWidth, bottom: top + labelHeight },
  })

  if (!byMarker) {
    const aboveTop = cy - radius + dy
    const aboveRightLeft = cx + dx
    if (aboveTop >= pad && aboveRightLeft >= pad && aboveRightLeft + labelWidth <= viewportWidth - pad) {
      return make(aboveRightLeft, aboveTop)
    }
    const aboveLeftLeft = cx - dx - labelWidth
    if (aboveTop >= pad && aboveLeftLeft >= pad && aboveLeftLeft + labelWidth <= viewportWidth - pad) {
      return make(aboveLeftLeft, aboveTop)
    }
    const sideTop = clamp(cy - labelHeight / 2, pad, viewportHeight - pad - labelHeight)
    const rightLeft = cx + radius + gap
    if (rightLeft + labelWidth <= viewportWidth - pad) return make(rightLeft, sideTop)
    const leftLeft = cx - radius - gap - labelWidth
    if (leftLeft >= pad) return make(leftLeft, sideTop)
    const belowTop = cy + radius + gap
    if (belowTop + labelHeight <= viewportHeight - pad) {
      return make(clamp(cx + dx, pad, viewportWidth - pad - labelWidth), belowTop)
    }
    return make(aboveRightLeft, aboveTop)
  }

  const sideOffset = Math.max(dx, radius + gap)
  const rightLeft = cx + sideOffset
  const rightTop = cy + dy
  if (rightLeft + labelWidth <= viewportWidth - pad && rightTop >= pad && rightTop + labelHeight <= viewportHeight - pad) {
    return make(rightLeft, rightTop)
  }
  const leftLeft = cx - sideOffset - labelWidth
  const leftTop = clamp(cy + dy, pad, viewportHeight - pad - labelHeight)
  if (leftLeft >= pad) return make(leftLeft, leftTop)
  const centeredLeft = clamp(cx - labelWidth / 2, pad, viewportWidth - pad - labelWidth)
  const aboveTop = cy - radius - gap - labelHeight
  if (aboveTop >= pad) return make(centeredLeft, aboveTop)
  const belowTop = cy + radius + gap
  if (belowTop + labelHeight <= viewportHeight - pad) return make(centeredLeft, belowTop)
  return make(rightLeft, rightTop)
}
