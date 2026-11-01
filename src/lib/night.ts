// Noc obserwacyjna: granice faz zmierzchu, próbki wysokości obiektu, górowanie i okna widoczności.
import {
  DAY_MS,
  altAz,
  HOUR_MS,
  horizontalMatrix,
  mulVec,
  nextTransitMs,
  riseSetMs,
  sunCrossingMs,
  unitVector,
  vecToHorizontal,
  type Equatorial,
  type Mat3,
  type Site,
} from './astro'
import { horizonAltitude, type HorizonPoint } from './horizon'

export interface NightPhases {
  /** Data lokalnego wieczoru (RRRR-MM-DD) identyfikująca noc. */
  date: string
  /** Początek i koniec wykresu (wczesny wieczór, rano). */
  startMs: number
  endMs: number
  sunset: number | null
  civilDusk: number | null
  nauticalDusk: number | null
  astroDusk: number | null
  astroDawn: number | null
  nauticalDawn: number | null
  civilDawn: number | null
  sunrise: number | null
  /** Środek nocy (dolne górowanie Słońca w przybliżeniu: połowa między zachodem i wschodem). */
  midnight: number
}

/** Północ lokalna strefy `timeZone` dla daty `date` (RRRR-MM-DD) jako ms UTC. */
export function zonedMidnightMs(date: string, timeZone: string): number {
  const [y, m, d] = date.split('-').map(Number)
  const guess = Date.UTC(y, m - 1, d)
  return guess - tzOffsetMs(guess, timeZone)
}

/** Przesunięcie strefy w chwili t: czas lokalny − UTC [ms]. */
export function tzOffsetMs(t: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(t))
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return asUtc - Math.floor(t / 1000) * 1000
}

/** Data lokalnego wieczoru dla chwili t: przed 12:00 lokalnie to noc rozpoczęta poprzedniego dnia. */
export function nightDateOf(t: number, timeZone: string): string {
  const local = new Date(t + tzOffsetMs(t, timeZone) - 12 * HOUR_MS)
  return local.toISOString().slice(0, 10)
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

export function nightPhases(date: string, site: Site, timeZone: string): NightPhases {
  const noon = zonedMidnightMs(date, timeZone) + 12 * HOUR_MS
  const nextNoon = noon + DAY_MS
  const within = (t: number | null) => (t !== null && t < nextNoon ? t : null)
  const down = (alt: number) => within(sunCrossingMs(site, -1, alt, noon, 1))
  const sunset = within(riseSetMs('sun', site, -1, noon, 1))
  const civilDusk = down(-6)
  const nauticalDusk = down(-12)
  const astroDusk = down(-18)
  const from = astroDusk ?? nauticalDusk ?? civilDusk ?? sunset ?? noon
  const up = (alt: number) => within(sunCrossingMs(site, +1, alt, from, 1))
  const astroDawn = astroDusk === null ? null : up(-18)
  const nauticalDawn = nauticalDusk === null ? null : up(-12)
  const civilDawn = civilDusk === null ? null : up(-6)
  const sunrise = sunset === null ? null : within(riseSetMs('sun', site, +1, from, 1))
  const startMs = sunset !== null ? sunset - HOUR_MS : noon + 6 * HOUR_MS
  const endMs = sunrise !== null ? sunrise + HOUR_MS : nextNoon - 6 * HOUR_MS
  const midnight = sunset !== null && sunrise !== null ? (sunset + sunrise) / 2 : noon + 12 * HOUR_MS
  return { date, startMs, endMs, sunset, civilDusk, nauticalDusk, astroDusk, astroDawn, nauticalDawn, civilDawn, sunrise, midnight }
}

/** Okno „ciemnej nocy”: noc astronomiczna, a gdy jej brak (lato), żeglarska, potem cywilna. */
export function darkWindow(n: NightPhases): [number, number] {
  if (n.astroDusk !== null && n.astroDawn !== null) return [n.astroDusk, n.astroDawn]
  if (n.nauticalDusk !== null && n.nauticalDawn !== null) return [n.nauticalDusk, n.nauticalDawn]
  if (n.civilDusk !== null && n.civilDawn !== null) return [n.civilDusk, n.civilDawn]
  return [n.startMs, n.endMs]
}

export type PhaseKind = 'day' | 'civil' | 'nautical' | 'astro' | 'night'

/** Faza w chwili t (do koloru tła wykresu). */
export function phaseAt(n: NightPhases, t: number): PhaseKind {
  const before = (x: number | null) => x !== null && t < x
  const after = (x: number | null) => x !== null && t >= x
  if (before(n.sunset) || after(n.sunrise)) return 'day'
  if (before(n.civilDusk) || after(n.civilDawn)) return 'civil'
  if (before(n.nauticalDusk) || after(n.nauticalDawn)) return 'nautical'
  if (before(n.astroDusk) || after(n.astroDawn)) return 'astro'
  if (n.astroDusk === null) return n.nauticalDusk === null ? (n.civilDusk === null ? 'day' : 'civil') : 'nautical'
  return 'night'
}

/** Macierze horyzontalne próbek nocy liczone raz i współdzielone przez wszystkie obiekty. */
export interface NightGrid {
  times: number[]
  matrices: Mat3[]
}

export function nightGrid(n: NightPhases, site: Site, stepMin = 5): NightGrid {
  const times: number[] = []
  for (let t = n.startMs; t < n.endMs; t += stepMin * 60_000) times.push(t)
  if (times[times.length - 1] !== n.endMs) times.push(n.endMs)
  return { times, matrices: times.map((t) => horizontalMatrix(t, site)) }
}

export interface AltSample {
  t: number
  alt: number
  az: number
}

export function altitudeTrack(eq: Equatorial, grid: NightGrid): AltSample[] {
  const v = unitVector(eq.raDeg, eq.decDeg)
  return grid.times.map((t, i) => {
    const h = vecToHorizontal(mulVec(grid.matrices[i], v))
    return { t, alt: h.altDeg, az: h.azDeg }
  })
}

export interface Visibility {
  maxAlt: number
  /** Chwila najwyższej wysokości w ciemnym oknie. */
  bestMs: number
  /** Górowanie (przejście przez południk) w obrębie wykresu lub null. */
  transitMs: number | null
  transitAlt: number
  /** Godziny w ciemnym oknie powyżej limitu wysokości i horyzontu. */
  hoursUsable: number
  /** Pierwszy przedział ciemnego okna, w którym obiekt jest użyteczny. */
  windowStart: number | null
  windowEnd: number | null
}

export function visibility(
  eq: Equatorial,
  track: AltSample[],
  n: NightPhases,
  site: Site,
  minAltDeg: number,
  horizon: readonly HorizonPoint[],
): Visibility {
  const [darkStart, darkEnd] = darkWindow(n)
  let maxAlt = -90
  let bestMs = darkStart
  let usable = 0
  let windowStart: number | null = null
  let windowEnd: number | null = null
  let windowClosed = false
  for (let i = 0; i < track.length; i++) {
    const s = track[i]
    if (s.t >= darkStart && s.t <= darkEnd && s.alt > maxAlt) {
      maxAlt = s.alt
      bestMs = s.t
    }
    const start = Math.max(s.t, darkStart)
    const end = Math.min(track[i + 1]?.t ?? s.t, darkEnd)
    if (end <= start) continue
    const ok = s.alt >= minAltDeg && s.alt >= horizonAltitude(horizon, s.az)
    if (ok) {
      usable += end - start
      if (!windowClosed) {
        windowStart ??= start
        windowEnd = end
      }
    } else if (windowStart !== null) windowClosed = true
  }
  const transit = nextTransitMs(eq, n.startMs, site)
  const transitMs = transit <= n.endMs ? transit : null
  const transitAlt = altAz(eq, transit, site).altDeg
  return { maxAlt, bestMs, transitMs, transitAlt, hoursUsable: usable / HOUR_MS, windowStart, windowEnd }
}
