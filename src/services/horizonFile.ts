// Plik horyzontu (7C): pary „azymut wysokość”, zgodny z plikiem horyzontu N.I.N.A. (CustomHorizon.cs).
import type { HorizonPoint } from '../types'
import { horizonAltitudeDeg, normalizeDeg } from './astroMath'

export const HORIZON_ALT_MIN_DEG = -5
export const HORIZON_ALT_MAX_DEG = 90

export interface RejectedLine {
  line: number // numer linii w pliku, od 1
  text: string
  reason: string
}

export interface HorizonFileResult {
  points: HorizonPoint[] // posortowane po azymucie, bez powtórzeń
  rejected: RejectedLine[]
  error: string | null // błąd całego pliku: mniej niż 2 poprawne punkty
}

const NUMBER = /^[+-]?(\d+\.?\d*|\.\d+)$/

/** Azymut w [0, 360), sortowanie po azymucie; przy powtórzonym azymucie wygrywa ostatni wpis. */
export function normalizeHorizon(points: readonly HorizonPoint[]): HorizonPoint[] {
  const byAzimuth = new Map<number, number>()
  for (const { azDeg, altDeg } of points) byAzimuth.set(normalizeDeg(azDeg), altDeg)
  return [...byAzimuth.entries()].sort(([a], [b]) => a - b).map(([azDeg, altDeg]) => ({ azDeg, altDeg }))
}

function readLine(content: string): HorizonPoint | string {
  const tokens = content.split(/[\s,;]+/).filter((token) => token !== '')
  if (tokens.length !== 2) {
    // Przecinek rozdziela kolumny (jak w N.I.N.A.), więc „127,5 31,5” daje 4 kolumny.
    if (/\d,\d/.test(content)) return 'Przecinek rozdziela kolumny: liczby dziesiętne zapisz z kropką (np. 127.5)'
    return `Oczekiwano dwóch liczb „azymut wysokość”, jest ${tokens.length}`
  }
  const notNumber = tokens.find((token) => !NUMBER.test(token))
  if (notNumber !== undefined) return `„${notNumber}” nie jest liczbą`
  const [azDeg, altDeg] = tokens.map(Number)
  if (altDeg < HORIZON_ALT_MIN_DEG || altDeg > HORIZON_ALT_MAX_DEG) {
    return `Wysokość ${tokens[1]}° poza zakresem ${HORIZON_ALT_MIN_DEG}…${HORIZON_ALT_MAX_DEG}°`.replaceAll('-', '−')
  }
  return { azDeg, altDeg }
}

/** Parser pliku horyzontu: separatory spacja, tabulator, „,” i „;”; „#” rozpoczyna komentarz; puste linie pomijane. */
export function parseHorizonFile(text: string): HorizonFileResult {
  const accepted: HorizonPoint[] = []
  const rejected: RejectedLine[] = []
  text
    .replace(/^\uFEFF/, '')
    .split(/\r\n|\r|\n/)
    .forEach((raw, index) => {
      const content = raw.split('#')[0].trim()
      if (content === '') return
      const result = readLine(content)
      if (typeof result === 'string') rejected.push({ line: index + 1, text: raw.trim(), reason: result })
      else accepted.push(result)
    })
  const points = normalizeHorizon(accepted)
  const found = points.length === 0 ? 'Plik nie zawiera poprawnych punktów' : 'Plik zawiera tylko 1 poprawny punkt'
  return { points, rejected, error: points.length < 2 ? `${found}; potrzebne są co najmniej 2` : null }
}

/** Liczba z kropką dziesiętną (InvariantCulture w N.I.N.A.), najwyżej 2 miejsca po przecinku. */
function formatNumber(value: number): string {
  return String(Math.round(value * 100) / 100)
}

/**
 * Eksport w tym samym formacie, z nagłówkiem-komentarzem. N.I.N.A. przy braku punktu 0° (i 360°) kopiuje na granicę
 * wysokość najbliższego punktu, zamiast interpolować przez 360° → 0° jak T10, więc eksport dopisuje wtedy punkt 0°.
 */
export function exportHorizonFile(points: readonly HorizonPoint[], title: string): string {
  const horizon = normalizeHorizon(points)
  if (horizon.length < 2) throw new Error('Plik horyzontu wymaga co najmniej 2 punktów')
  const lines = [`# Horyzont: ${title.replace(/\s+/g, ' ').trim()}`]
  if (horizon[0].azDeg !== 0) {
    horizon.unshift({ azDeg: 0, altDeg: horizonAltitudeDeg(horizon, 0) })
    lines.push('# Punkt 0° dopisany przy eksporcie (interpolacja przez 360° → 0°, jak w aplikacji)')
  }
  lines.push('# Az Alt', ...horizon.map(({ azDeg, altDeg }) => `${formatNumber(azDeg)} ${formatNumber(altDeg)}`))
  return `${lines.join('\n')}\n`
}
