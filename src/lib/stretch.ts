// Rozciąganie zdjęcia kadru „poziomami”: punkt czerni, punkt bieli (0–255) i gamma środka (> 1 rozjaśnia).

export interface Levels {
  black: number
  white: number
  gamma: number
}

export const DEFAULT_LEVELS: Levels = { black: 0, white: 255, gamma: 1 }
export const GAMMA_MIN = 0.2
export const GAMMA_MAX = 5
// Najmniejszy odstęp bieli od czerni, żeby krzywa nie dzieliła przez zero.
const MIN_GAP = 1

/** Poprawia zapisane wartości: czerń i biel w 0–255 z odstępem, gamma w dozwolonym zakresie. */
export function normalizeLevels(l: Partial<Levels> | undefined): Levels {
  const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d)
  const black = Math.min(255 - MIN_GAP, Math.max(0, num(l?.black, DEFAULT_LEVELS.black)))
  const white = Math.min(255, Math.max(black + MIN_GAP, num(l?.white, DEFAULT_LEVELS.white)))
  const gamma = Math.min(GAMMA_MAX, Math.max(GAMMA_MIN, num(l?.gamma, DEFAULT_LEVELS.gamma)))
  return { black, white, gamma }
}

export function isDefaultLevels(l: Levels): boolean {
  return l.black === DEFAULT_LEVELS.black && l.white === DEFAULT_LEVELS.white && l.gamma === DEFAULT_LEVELS.gamma
}

/** Wartość wyjściowa 0–1 dla wejścia 0–255. */
export function levelsAt(l: Levels, x: number): number {
  const t = Math.min(1, Math.max(0, (x - l.black) / (l.white - l.black)))
  return t ** (1 / l.gamma)
}

/** Tablica 256 wartości 0–255 (do testów i rysowania krzywej). */
export function levelsLut(levels: Partial<Levels> | undefined): Uint8Array {
  const l = normalizeLevels(levels)
  const lut = new Uint8Array(256)
  for (let x = 0; x < 256; x++) lut[x] = Math.round(levelsAt(l, x) * 255)
  return lut
}

/** Wartości `tableValues` dla `feFuncR/G/B type="table"`: n punktów krzywej w 0–1 (filtr interpoluje między nimi). */
export function tableValues(levels: Partial<Levels> | undefined, n = 256): string {
  const l = normalizeLevels(levels)
  const out: string[] = []
  for (let k = 0; k < n; k++) out.push(levelsAt(l, (k / (n - 1)) * 255).toFixed(4))
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
