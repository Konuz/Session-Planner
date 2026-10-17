// Okna ciemności, obniżanie progu, czas efektywny, górowanie i przerzut (sekcje 4 i 11).
import type { HorizonPoint, Mount } from '../types'
import {
  bodyPosition,
  horizonAltitudeDeg,
  horizontalAt,
  horizontalFromHourAngle,
  hourAngleDeg,
  localSiderealTimeDeg,
  normalizeDeg,
  riseSetMs,
  sunAltitudeCrossingMs,
  sunLowerCulminationMs,
  type EquatorialDeg,
  type GeoPosition,
} from './astroMath'
import { addDays, localNoonMs } from './time'

const MINUTE_MS = 60_000
const HOUR_MS = 3_600_000
const DAY_MS = 86_400_000
/** Tempo zmiany czasu gwiazdowego we wzorze na górowanie [°/doba] (sekcja 4). */
const SIDEREAL_DEG_PER_DAY = 360.9856

export interface TimeRange {
  startMs: number
  endMs: number
}

export type DarknessThresholdDeg = -18 | -15 | -12

/** Progi sprawdzane kolejno przy automatycznym obniżaniu [Z6]. */
const DARKNESS_THRESHOLDS: readonly DarknessThresholdDeg[] = [-18, -15, -12]

export type Darkness =
  | { kind: 'window'; window: TimeRange; thresholdDeg: DarknessThresholdDeg; lowered: boolean }
  | { kind: 'none'; thresholdDeg: DarknessThresholdDeg }

export interface TimedAltitude {
  timeMs: number
  altDeg: number
}

/** Noc D: od lokalnego południa dnia D do lokalnego południa dnia D+1. */
export function nightRange(nightDate: string, timeZone: string): TimeRange {
  return { startMs: localNoonMs(nightDate, timeZone), endMs: localNoonMs(addDays(nightDate, 1), timeZone) }
}

export interface NightSun {
  sunsetMs: number | null
  sunriseMs: number | null
  /** Oś wykresu nocy: od zachodu − 1 h do wschodu + 1 h; bez zachodu lub wschodu – granica nocy D. */
  axis: TimeRange
}

/** Zachód i wschód Słońca w nocy D oraz oś wykresu nocy (7C). */
export function nightSun(site: GeoPosition, night: TimeRange): NightSun {
  const sunsetMs = riseSetMs('sun', site, 'set', night.startMs, night.endMs)
  const sunriseMs = riseSetMs('sun', site, 'rise', sunsetMs ?? night.startMs, night.endMs)
  return {
    sunsetMs,
    sunriseMs,
    axis: {
      startMs: sunsetMs === null ? night.startMs : sunsetMs - HOUR_MS,
      endMs: sunriseMs === null ? night.endMs : sunriseMs + HOUR_MS,
    },
  }
}

/** Część nocy D, w której Słońce jest poniżej altitudeDeg: od zejścia do wzejścia przez tę wysokość. */
export function sunBelowAltitude(site: GeoPosition, night: TimeRange, altitudeDeg: number): TimeRange | null {
  const startMs = sunAltitudeCrossingMs(site, 'descending', altitudeDeg, night.startMs, night.endMs)
  if (startMs === null) return null
  const endMs = sunAltitudeCrossingMs(site, 'ascending', altitudeDeg, startMs, night.endMs)
  return { startMs, endMs: endMs ?? night.endMs }
}

/** Okno ciemności z obniżaniem progu −18° → −15° → −12° [Z6]; 'none' = brak okna przy ostatnim sprawdzonym progu. */
export function darknessWindow(
  site: GeoPosition,
  night: TimeRange,
  thresholdDeg: DarknessThresholdDeg,
  autoLower: boolean,
): Darkness {
  const thresholds = autoLower ? DARKNESS_THRESHOLDS.filter((t) => t >= thresholdDeg) : [thresholdDeg]
  for (const t of thresholds) {
    const window = sunBelowAltitude(site, night, t)
    if (window) return { kind: 'window', window, thresholdDeg: t, lowered: t !== thresholdDeg }
  }
  return { kind: 'none', thresholdDeg: thresholds[thresholds.length - 1] }
}

/** Najniższe położenie Słońca w nocy D: dolne górowanie i wysokość geometryczna [T3]. */
export function sunLowestPoint(site: GeoPosition, night: TimeRange): TimedAltitude {
  const timeMs = sunLowerCulminationMs(site, night.startMs)
  return { timeMs, altDeg: bodyPosition('sun', site, timeMs).altDeg }
}

/** Górowanie analityczne: pierwsza chwila po t0, w której LST równa się RA na epokę daty (sekcja 4). */
export function transitMs(raOfDateDeg: number, lonDegEast: number, t0Ms: number): number {
  const lst0 = localSiderealTimeDeg(t0Ms, lonDegEast)
  return t0Ms + (normalizeDeg(raOfDateDeg - lst0) / SIDEREAL_DEG_PER_DAY) * DAY_MS
}

/** Najwyższe położenie w oknie: w górowaniu, a gdy górowanie wypada poza oknem – na wyższym brzegu okna. */
export function highestPoint(
  target: EquatorialDeg,
  site: GeoPosition,
  window: TimeRange,
  transit: number,
): TimedAltitude {
  const times = transit >= window.startMs && transit <= window.endMs ? [transit] : [window.startMs, window.endMs]
  return times
    .map((timeMs) => ({ timeMs, altDeg: horizontalAt(target, site, timeMs).altDeg }))
    .reduce((best, point) => (point.altDeg > best.altDeg ? point : best))
}

/** Przerzut przez południk: górowanie + flipMinutesAfterMeridian, tylko dla montażu GEM [Z10]. */
export function meridianFlipMs(transit: number, mount: Mount): number | null {
  return mount.type === 'gem' ? transit + mount.flipMinutesAfterMeridian * MINUTE_MS : null
}

/** Próbki okna (sekcja 4): tᵢ = początek + i·Δt, dopóki tᵢ < koniec; czas gwiazdowy liczony raz na krok. */
export interface SampleGrid {
  timesMs: number[]
  lstDeg: number[]
  /** Długość [tᵢ, min(tᵢ + Δt, koniec)); ostatni przedział jest przycięty do końca okna. */
  durationsMs: number[]
}

export function sampleGrid(window: TimeRange, stepMin: number, lonDegEast: number): SampleGrid {
  const stepMs = stepMin * MINUTE_MS
  const grid: SampleGrid = { timesMs: [], lstDeg: [], durationsMs: [] }
  for (let i = 0; window.startMs + i * stepMs < window.endMs; i++) {
    const t = window.startMs + i * stepMs
    grid.timesMs.push(t)
    grid.lstDeg.push(localSiderealTimeDeg(t, lonDegEast))
    grid.durationsMs.push(Math.min(t + stepMs, window.endMs) - t)
  }
  return grid
}

/** ok(tᵢ) z sekcji 4: przy czasie gwiazdowym lstDeg obiekt ma h > max(h_min, horyzont(az)). */
export function visibleAt(
  target: EquatorialDeg,
  site: GeoPosition,
  lstDeg: number,
  minAltDeg: number,
  horizon: readonly HorizonPoint[],
): boolean {
  const { altDeg, azDeg } = horizontalFromHourAngle(hourAngleDeg(lstDeg, target.raDeg), target.decDeg, site.latDeg)
  return altDeg > Math.max(minAltDeg, horizonAltitudeDeg(horizon, azDeg))
}

/** Czas efektywny [min]: suma przedziałów z h > max(h_min, horyzont(az)), zaokrąglona do pełnych minut. */
export function effectiveMinutes(
  target: EquatorialDeg,
  site: GeoPosition,
  grid: SampleGrid,
  minAltDeg: number,
  horizon: readonly HorizonPoint[],
): number {
  let totalMs = 0
  grid.lstDeg.forEach((lstDeg, i) => {
    if (visibleAt(target, site, lstDeg, minAltDeg, horizon)) totalMs += grid.durationsMs[i]
  })
  return Math.round(totalMs / MINUTE_MS)
}
