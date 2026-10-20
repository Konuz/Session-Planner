// Tło mapy w widoku kadru (tlo-mapy): gwiazdy Tycho-2 jako kropki i siatka RA/Dec z opisami. Czysty model, bez sieci.
//
// Nazwy, których spec nie podaje (wybrane przez test-author):
// - `mapBackground(stars, cutout)` – wejście: gwiazdy (`Star` z `services/stars.ts`: `raDeg`, `decDeg`, `mag` = V)
//   i wycinek widoku (`viewCutout`, 1000 × 1000 jednostek); wyjście `{ stars, grid }` w jednostkach widoku.
//   - `stars`: kropki `{ x, y, radius }` w kolejności rysowania (od najsłabszej do najjaśniejszej), najwyżej
//     `MAX_BACKGROUND_STARS` najjaśniejszych gwiazd w widoku (brzegi wliczone); punkt ≥ 90° od środka nie ma położenia.
//   - `grid`: linie `{ kind, valueDeg, label, points, labelAnchor }`; `kind` 'ra' = południk (`valueDeg` = RA w [0, 360)),
//     'dec' = równoleżnik (`valueDeg` = Dec); `points` = kolejne punkty linii w jednostkach widoku (mogą wychodzić poza
//     widok, bez NaN i nieskończoności); `labelAnchor` = punkt wejścia linii w widok (południk z południa na północ,
//     równoleżnik ze wschodu na zachód); null tylko dla linii, która nigdzie nie wchodzi w widok przez brzeg
//     (np. okrąg wokół bieguna leżący cały w widoku) – takich punktów testy nie sprawdzają.
// - `starRadius(mag)` – promień kropki `1 + 0,6·(10 − V)`, przycięty do [1, 8].
// - `MAX_BACKGROUND_STARS` = 3000.
//
// Siatka: wartości linii liczone w liczbach całkowitych (RA w sekundach czasu, Dec w minutach łuku), zakres RA i Dec
// widoku z gęstych próbek brzegu (biegun w widoku = pełne RA aż do ±90°). Linie próbkowane co ok. 5 jednostek widoku.
import { angularSeparationDeg, type EquatorialDeg } from '../../services/astroMath'
import { cutoutToSky, skyToCutout, type CutoutPoint, type SkyCutout } from '../../services/framing'
import type { Star } from '../../services/stars'

/** Najwięcej kropek gwiazd w widoku. */
export const MAX_BACKGROUND_STARS = 3000

/** Kropka gwiazdy w jednostkach widoku. */
export interface StarDot {
  x: number
  y: number
  radius: number
}

/** 'ra' = południk (stałe RA), 'dec' = równoleżnik (stała Dec). */
export type GridLineKind = 'ra' | 'dec'

export interface GridLine {
  kind: GridLineKind
  /** RA w [0, 360) albo Dec [°]. */
  valueDeg: number
  /** „0h 00m”, „5h 35m 10s”, „+5°”, „−0°30′” itd. */
  label: string
  points: CutoutPoint[]
  labelAnchor: CutoutPoint | null
}

export interface MapBackground {
  stars: StarDot[]
  grid: GridLine[]
}

const DEG = Math.PI / 180
/** Kroki Dec [′] i RA [s czasu] z listy spec. */
const DEC_STEPS_ARCMIN = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800]
const RA_STEPS_SEC = [5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200]
const DAY_SEC = 86400
const EPS = 1e-9
/** Odstęp próbek linii siatki [jednostki widoku w środku]. */
const SAMPLE_UNITS = 5
/** Próbki na bok widoku przy szukaniu zakresu RA i Dec. */
const EDGE_SAMPLES = 200

export function starRadius(mag: number): number {
  return Math.min(8, Math.max(1, 1 + 0.6 * (10 - mag)))
}

const inside = (cutout: SkyCutout, p: CutoutPoint): boolean =>
  p.x >= 0 && p.x <= cutout.widthPx && p.y >= 0 && p.y <= cutout.heightPx

/** Piksel punktu nieba albo null, gdy punkt leży 90° lub dalej od środka (jak w `mapa-zastepcza`). */
function project(cutout: SkyCutout, point: EquatorialDeg): CutoutPoint | null {
  if (angularSeparationDeg(cutout.center, point) >= 90) return null
  const p = skyToCutout(cutout, point)
  return Number.isFinite(p.x) && Number.isFinite(p.y) ? p : null
}

function backgroundStars(stars: readonly Star[], cutout: SkyCutout): StarDot[] {
  const sorted = [...stars].sort((a, b) => a.mag - b.mag)
  const dots: StarDot[] = []
  for (const star of sorted) {
    if (dots.length >= MAX_BACKGROUND_STARS) break
    const p = project(cutout, star)
    if (p && inside(cutout, p)) dots.push({ x: p.x, y: p.y, radius: starRadius(star.mag) })
  }
  return dots.reverse()
}

/** Kąt odpowiadający jednej jednostce widoku w środku [°]. */
const unitDeg = (cutout: SkyCutout) =>
  (2 * Math.tan((cutout.fovDeg * DEG) / 2)) / Math.max(cutout.widthPx, cutout.heightPx) / DEG

const relativeRa = (raDeg: number, centerRaDeg: number) => ((((raDeg - centerRaDeg + 540) % 360) + 360) % 360) - 180

interface SkyRange {
  decMin: number
  decMax: number
  /** RA względem środka [°]; pełne koło = [−180, 180]. */
  raLo: number
  raHi: number
  fullRa: boolean
}

function poleInView(cutout: SkyCutout, decDeg: number): boolean {
  const p = project(cutout, { raDeg: cutout.center.raDeg, decDeg })
  return p !== null && inside(cutout, p)
}

/** Zakres Dec i RA widoku z próbek brzegu; biegun w widoku rozszerza Dec do ±90° i RA do pełnego koła. */
function skyRange(cutout: SkyCutout): SkyRange {
  const { widthPx: w, heightPx: h } = cutout
  let decMin = Infinity
  let decMax = -Infinity
  let raLo = Infinity
  let raHi = -Infinity
  for (let i = 0; i <= EDGE_SAMPLES; i += 1) {
    const t = i / EDGE_SAMPLES
    for (const p of [{ x: t * w, y: 0 }, { x: t * w, y: h }, { x: 0, y: t * h }, { x: w, y: t * h }]) {
      const sky = cutoutToSky(cutout, p)
      decMin = Math.min(decMin, sky.decDeg)
      decMax = Math.max(decMax, sky.decDeg)
      const ra = relativeRa(sky.raDeg, cutout.center.raDeg)
      raLo = Math.min(raLo, ra)
      raHi = Math.max(raHi, ra)
    }
  }
  const north = poleInView(cutout, 90)
  const south = poleInView(cutout, -90)
  if (north) decMax = 90
  if (south) decMin = -90
  const fullRa = north || south || raHi - raLo >= 360
  return fullRa ? { decMin, decMax, raLo: -180, raHi: 180, fullRa } : { decMin, decMax, raLo, raHi, fullRa }
}

export function decStepArcmin(fovDeg: number): number {
  return DEC_STEPS_ARCMIN.find((step) => step / 60 >= fovDeg / 6 - EPS) ?? DEC_STEPS_ARCMIN[DEC_STEPS_ARCMIN.length - 1]
}

export function raStepSec(fovDeg: number, centerDecDeg: number): number {
  const cos = Math.cos(centerDecDeg * DEG)
  return RA_STEPS_SEC.find((step) => (step / 240) * cos >= fovDeg / 6 - EPS) ?? RA_STEPS_SEC[RA_STEPS_SEC.length - 1]
}

const pad = (value: number) => String(value).padStart(2, '0')

function raLabel(sec: number, stepSec: number): string {
  const text = `${Math.floor(sec / 3600)}h ${pad(Math.floor((sec % 3600) / 60))}m`
  return stepSec < 60 ? `${text} ${pad(sec % 60)}s` : text
}

function decLabel(arcmin: number, stepArcmin: number): string {
  const sign = arcmin > 0 ? '+' : arcmin < 0 ? '−' : ''
  const abs = Math.abs(arcmin)
  return stepArcmin >= 60 ? `${sign}${abs / 60}°` : `${sign}${Math.floor(abs / 60)}°${pad(abs % 60)}′`
}

/** Punkty linii dla parametru od `from` do `to` (włącznie), co najwyżej co `step`; punkty bez położenia odpadają. */
function sampleLine(cutout: SkyCutout, from: number, to: number, step: number, point: (t: number) => EquatorialDeg): CutoutPoint[] {
  const count = Math.min(20000, Math.max(1, Math.ceil(Math.abs(to - from) / step)))
  const points: CutoutPoint[] = []
  for (let i = 0; i <= count; i += 1) {
    const p = project(cutout, point(from + ((to - from) * i) / count))
    if (p) points.push(p)
  }
  return points
}

/** Punkt wejścia łamanej w widok (pierwsze przejście z zewnątrz do środka) albo null. */
function entryPoint(cutout: SkyCutout, points: readonly CutoutPoint[]): CutoutPoint | null {
  for (let i = 1; i < points.length; i += 1) {
    let outer = points[i - 1]
    let inner = points[i]
    if (inside(cutout, outer) || !inside(cutout, inner)) continue
    for (let k = 0; k < 40; k += 1) {
      const mid = { x: (outer.x + inner.x) / 2, y: (outer.y + inner.y) / 2 }
      if (inside(cutout, mid)) inner = mid
      else outer = mid
    }
    return inner
  }
  return null
}

function gridLines(cutout: SkyCutout): GridLine[] {
  const range = skyRange(cutout)
  const sample = SAMPLE_UNITS * unitDeg(cutout)
  const margin = 3 * sample
  const center = cutout.center
  const lines: GridLine[] = []

  const decStep = decStepArcmin(cutout.fovDeg)
  const decFrom = Math.ceil((range.decMin * 60) / decStep - EPS)
  const decTo = Math.floor((range.decMax * 60) / decStep + EPS)
  for (let k = decFrom; k <= decTo; k += 1) {
    const arcmin = k * decStep
    if (Math.abs(arcmin) >= 90 * 60) continue
    const decDeg = arcmin / 60
    const cos = Math.max(Math.cos(decDeg * DEG), 1e-9)
    const raMargin = margin / cos
    const hi = range.fullRa ? 180 : Math.min(range.raHi + raMargin, 180)
    const lo = range.fullRa ? -180 : Math.max(range.raLo - raMargin, -180)
    // Ze wschodu na zachód = malejące RA.
    const points = sampleLine(cutout, hi, lo, sample / cos, (t) => ({ raDeg: center.raDeg + t, decDeg }))
    if (points.length === 0) continue
    lines.push({ kind: 'dec', valueDeg: decDeg, label: decLabel(arcmin, decStep), points, labelAnchor: entryPoint(cutout, points) })
  }

  const raStep = raStepSec(cutout.fovDeg, center.decDeg)
  const centerSec = center.raDeg * 240
  const seen = new Set<number>()
  const raFrom = range.fullRa ? 0 : Math.ceil((centerSec + range.raLo * 240) / raStep - EPS)
  const raTo = range.fullRa ? DAY_SEC / raStep - 1 : Math.floor((centerSec + range.raHi * 240) / raStep + EPS)
  const decLo = Math.max(-90, range.decMin - margin)
  const decHi = Math.min(90, range.decMax + margin)
  for (let k = raFrom; k <= raTo; k += 1) {
    const sec = (((k * raStep) % DAY_SEC) + DAY_SEC) % DAY_SEC
    if (seen.has(sec)) continue
    seen.add(sec)
    const raDeg = sec / 240
    // Z południa na północ = rosnąca Dec.
    const points = sampleLine(cutout, decLo, decHi, sample, (t) => ({ raDeg, decDeg: t }))
    if (points.length === 0) continue
    lines.push({ kind: 'ra', valueDeg: raDeg, label: raLabel(sec, raStep), points, labelAnchor: entryPoint(cutout, points) })
  }
  return lines
}

export function mapBackground(stars: readonly Star[], cutout: SkyCutout): MapBackground {
  return { stars: backgroundStars(stars, cutout), grid: gridLines(cutout) }
}
