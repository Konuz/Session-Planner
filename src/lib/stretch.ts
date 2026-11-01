// Rozciąganie zdjęcia kadru: najpierw „poziomy” (punkt czerni, punkt bieli 0–255, gamma środka; > 1 rozjaśnia),
// potem własna krzywa przez punkty ustawione na wykresie (gładka, bez przestrzeleń: monotoniczny splajn Hermite’a).

/** Punkt krzywej: [wejście, wyjście] w 0–1; wejście to wartość po poziomach, więc punkt „jedzie” razem z suwakami. */
export type CurvePoint = [number, number]

export interface Levels {
  black: number
  white: number
  gamma: number
  /** Punkty własnej krzywej bez końców (0,0) i (1,1); brak = krzywa prosta. */
  points?: CurvePoint[]
}

export const DEFAULT_LEVELS: Levels = { black: 0, white: 255, gamma: 1 }
export const GAMMA_MIN = 0.2
export const GAMMA_MAX = 5
export const MAX_POINTS = 14
// Najmniejszy odstęp bieli od czerni, żeby krzywa nie dzieliła przez zero.
const MIN_GAP = 1
// Najmniejszy odstęp punktów krzywej w poziomie (także od końców 0 i 1).
export const MIN_POINT_GAP = 0.01

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/** Porządkuje punkty krzywej: liczby w 0–1, rosnące wejście z odstępem, bez końców, najwyżej MAX_POINTS. */
export function normalizePoints(points: unknown): CurvePoint[] {
  if (!Array.isArray(points)) return []
  const ok = points
    .filter((p): p is CurvePoint => Array.isArray(p) && p.length === 2 && p.every((v) => typeof v === 'number' && Number.isFinite(v)))
    .map(([u, y]) => [clamp01(u), clamp01(y)] as CurvePoint)
    .sort((a, b) => a[0] - b[0])
  const out: CurvePoint[] = []
  for (const p of ok) {
    const prev = out.length ? out[out.length - 1][0] : 0
    if (p[0] - prev >= MIN_POINT_GAP && 1 - p[0] >= MIN_POINT_GAP && out.length < MAX_POINTS) out.push(p)
  }
  return out
}

/** Poprawia zapisane wartości: czerń i biel w 0–255 z odstępem, gamma w dozwolonym zakresie, punkty uporządkowane. */
export function normalizeLevels(l: Partial<Levels> | undefined): Levels {
  const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d)
  const black = Math.min(255 - MIN_GAP, Math.max(0, num(l?.black, DEFAULT_LEVELS.black)))
  const white = Math.min(255, Math.max(black + MIN_GAP, num(l?.white, DEFAULT_LEVELS.white)))
  const gamma = Math.min(GAMMA_MAX, Math.max(GAMMA_MIN, num(l?.gamma, DEFAULT_LEVELS.gamma)))
  const points = normalizePoints(l?.points)
  return points.length ? { black, white, gamma, points } : { black, white, gamma }
}

export function isDefaultLevels(l: Levels): boolean {
  return l.black === DEFAULT_LEVELS.black && l.white === DEFAULT_LEVELS.white && l.gamma === DEFAULT_LEVELS.gamma && !l.points?.length
}

/** Same poziomy: wartość 0–1 dla wejścia 0–255. */
export function baseAt(l: Levels, x: number): number {
  return clamp01((x - l.black) / (l.white - l.black)) ** (1 / l.gamma)
}

/** Odwrotność poziomów: wejście 0–255, dla którego poziomy dają u (0–1). */
export function baseInverse(l: Levels, u: number): number {
  return l.black + (l.white - l.black) * clamp01(u) ** l.gamma
}

/** Krzywa przez (0,0), punkty i (1,1): splajn Hermite’a z nachyleniami Fritscha–Carlsona (bez przestrzeleń). */
export function makeCurve(points: CurvePoint[] | undefined): (u: number) => number {
  const xs = [0, ...(points ?? []).map((p) => p[0]), 1]
  const ys = [0, ...(points ?? []).map((p) => p[1]), 1]
  const n = xs.length
  const d = xs.slice(1).map((x, k) => (ys[k + 1] - ys[k]) / (x - xs[k]))
  const m = xs.map((_, k) => (k === 0 ? d[0] : k === n - 1 ? d[n - 2] : d[k - 1] * d[k] <= 0 ? 0 : (d[k - 1] + d[k]) / 2))
  for (let k = 0; k < n - 1; k++) {
    if (d[k] === 0) {
      m[k] = m[k + 1] = 0
      continue
    }
    const a = m[k] / d[k]
    const b = m[k + 1] / d[k]
    const s = a * a + b * b
    if (s > 9) {
      const t = 3 / Math.sqrt(s)
      m[k] = t * a * d[k]
      m[k + 1] = t * b * d[k]
    }
  }
  return (u) => {
    const x = clamp01(u)
    let k = 0
    while (k < n - 2 && x > xs[k + 1]) k++
    const h = xs[k + 1] - xs[k]
    const t = (x - xs[k]) / h
    const t2 = t * t
    const t3 = t2 * t
    return clamp01((2 * t3 - 3 * t2 + 1) * ys[k] + (t3 - 2 * t2 + t) * h * m[k] + (-2 * t3 + 3 * t2) * ys[k + 1] + (t3 - t2) * h * m[k + 1])
  }
}

/** Cała krzywa przejścia: wejście 0–255 → wyjście 0–1 (poziomy, potem krzywa). */
export function makeTransfer(levels: Partial<Levels> | undefined): (x: number) => number {
  const l = normalizeLevels(levels)
  const curve = makeCurve(l.points)
  return (x) => curve(baseAt(l, x))
}

/** Tablica 256 wartości 0–255 (do testów i rysowania krzywej). */
export function levelsLut(levels: Partial<Levels> | undefined): Uint8Array {
  const f = makeTransfer(levels)
  const lut = new Uint8Array(256)
  for (let x = 0; x < 256; x++) lut[x] = Math.round(f(x) * 255)
  return lut
}

/** Wartości `tableValues` dla `feFuncR/G/B type="table"`: n punktów krzywej w 0–1 (filtr interpoluje między nimi). */
export function tableValues(levels: Partial<Levels> | undefined, n = 256): string {
  const f = makeTransfer(levels)
  const out: string[] = []
  for (let k = 0; k < n; k++) out.push(f((k / (n - 1)) * 255).toFixed(4))
  return out.join(' ')
}

/** Histogram jasności (luminancja Rec. 709 z kanałów sRGB) z pikseli RGBA; przezroczyste piksele pomijane. */
export function histogram(rgba: Uint8ClampedArray | Uint8Array): Uint32Array {
  const bins = new Uint32Array(256)
  for (let k = 0; k + 3 < rgba.length; k += 4) {
    if (rgba[k + 3] === 0) continue
    bins[Math.round(0.2126 * rgba[k] + 0.7152 * rgba[k + 1] + 0.0722 * rgba[k + 2])]++
  }
  return bins
}

// Suwak gammy w skali logarytmicznej: pozycja 0–1000, środek (500) to gamma 1.
const LOG_SPAN = Math.log(GAMMA_MAX)
export const gammaToSlider = (g: number) => Math.round(500 + (Math.log(g) / LOG_SPAN) * 500)
export const sliderToGamma = (s: number) => Math.round(Math.exp(((s - 500) / 500) * LOG_SPAN) * 100) / 100
