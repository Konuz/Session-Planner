// Model wykresu nocy (7C): oś czasu, pasy zmierzchów, okno ciemności, Księżyc i tor obiektu. Bez rysowania.
import type { HorizonPoint, Mount } from '../types'
import {
  bodyPosition,
  horizonAltitudeDeg,
  horizontalAt,
  moonIlluminatedFraction,
  moonPhaseAngleDeg,
  precessionMatrix,
  riseSetMs,
  toEquatorOfDate,
  type EquatorialDeg,
  type GeoPosition,
  type PrecessionMatrix,
} from './astroMath'
import { fullLocalHoursMs, localMidnightMs } from './time'
import {
  darknessWindow,
  effectiveMinutes,
  meridianFlipMs,
  nightRange,
  nightSun,
  sampleGrid,
  sunBelowAltitude,
  sunLowestPoint,
  transitMs,
  type Darkness,
  type DarknessThresholdDeg,
  type SampleGrid,
  type TimedAltitude,
  type TimeRange,
} from './visibility'

const MINUTE_MS = 60_000
/** Krok próbek Księżyca na wykresie: krzywa przerywana nie potrzebuje kroku minutowego. */
const MOON_STEP_MIN = 10

/** Parametry planowania używane przez wykres nocy (część PlanningSettings). */
export interface NightSettings {
  darknessThresholdDeg: DarknessThresholdDeg // [Z6]
  autoLowerThreshold: boolean // [Z6]
  detailStepMin: number // [Z8]
}

export type TwilightBand = 'day' | 'civil' | 'nautical' | 'astronomical' | 'night'

/** Pas tła wykresu; pasy są zagnieżdżone i rysowane po kolei, każdy przycięty do osi. */
export interface BandSegment extends TimeRange {
  band: TwilightBand
}

/** Dolne granice pasów: zmierzch żeglarski od −6°, astronomiczny od −12°, noc od −18°. */
const TWILIGHT_LIMITS: readonly (readonly [TwilightBand, number])[] = [
  ['nautical', -6],
  ['astronomical', -12],
  ['night', -18],
]

export interface MoonReference extends TimedAltitude {
  illuminatedFraction: number
  waxing: boolean
}

export interface NightFrame {
  site: GeoPosition
  timeZone: string
  nightDate: string
  stepMin: number
  night: TimeRange
  sunsetMs: number | null
  sunriseMs: number | null
  /** Oś X: od zachodu Słońca − 1 h do wschodu + 1 h. */
  axis: TimeRange
  bands: BandSegment[]
  requestedThresholdDeg: DarknessThresholdDeg
  darkness: Darkness
  /** Siatka próbek okna ciemności (sekcja 4), wspólna dla wszystkich obiektów. */
  windowGrid: SampleGrid | null
  sunLowest: TimedAltitude
  hourTicksMs: number[]
  /** Macierz precesji liczona raz na noc. */
  precession: PrecessionMatrix
  moon: {
    samples: TimedAltitude[]
    riseMs: number | null
    setMs: number | null
    /** Chwila ikony fazy: najwyższe położenie nad horyzontem, a gdy Księżyca nie ma – środek osi. */
    reference: MoonReference
  }
}

/** Chwile od początku do końca przedziału co stepMin; koniec przedziału jest ostatnią próbką. */
function sampleTimes(range: TimeRange, stepMin: number): number[] {
  const times: number[] = []
  for (let t = range.startMs; t < range.endMs; t += stepMin * MINUTE_MS) times.push(t)
  times.push(range.endMs)
  return times
}

function clip(range: TimeRange, axis: TimeRange): TimeRange {
  return { startMs: Math.max(range.startMs, axis.startMs), endMs: Math.min(range.endMs, axis.endMs) }
}

/** Próbka Księżyca do ikony fazy: najwyżej położona nad horyzontem, inaczej najbliższa środka osi. */
export function moonReference(samples: readonly TimedAltitude[], axis: TimeRange): TimedAltitude {
  const highest = samples.reduce((best, sample) => (sample.altDeg > best.altDeg ? sample : best))
  if (highest.altDeg > 0) return highest
  const middle = (axis.startMs + axis.endMs) / 2
  return samples.reduce((best, sample) =>
    Math.abs(sample.timeMs - middle) < Math.abs(best.timeMs - middle) ? sample : best,
  )
}

/** Wszystko, co na wykresie nocy zależy tylko od miejsca, nocy D i progu ciemności. */
export function buildNightFrame(site: GeoPosition, timeZone: string, nightDate: string, settings: NightSettings): NightFrame {
  const night = nightRange(nightDate, timeZone)
  const { sunsetMs, sunriseMs, axis } = nightSun(site, night)
  const bands: BandSegment[] = [{ band: 'day', ...axis }]
  if (sunsetMs !== null) bands.push({ band: 'civil', ...clip({ startMs: sunsetMs, endMs: sunriseMs ?? night.endMs }, axis) })
  for (const [band, altitudeDeg] of TWILIGHT_LIMITS) {
    const below = sunBelowAltitude(site, night, altitudeDeg)
    if (below) bands.push({ band, ...clip(below, axis) })
  }
  const darkness = darknessWindow(site, night, settings.darknessThresholdDeg, settings.autoLowerThreshold)
  const moonSamples = sampleTimes(axis, MOON_STEP_MIN).map((timeMs) => ({
    timeMs,
    altDeg: bodyPosition('moon', site, timeMs).altDeg,
  }))
  const reference = moonReference(moonSamples, axis)
  return {
    site,
    timeZone,
    nightDate,
    stepMin: settings.detailStepMin,
    night,
    sunsetMs,
    sunriseMs,
    axis,
    bands,
    requestedThresholdDeg: settings.darknessThresholdDeg,
    darkness,
    windowGrid: darkness.kind === 'window' ? sampleGrid(darkness.window, settings.detailStepMin, site.lonDegEast) : null,
    sunLowest: sunLowestPoint(site, night),
    hourTicksMs: fullLocalHoursMs(axis, timeZone),
    precession: precessionMatrix((axis.startMs + axis.endMs) / 2),
    moon: {
      samples: moonSamples,
      riseMs: riseSetMs('moon', site, 'rise', axis.startMs, axis.endMs),
      setMs: riseSetMs('moon', site, 'set', axis.startMs, axis.endMs),
      reference: {
        ...reference,
        illuminatedFraction: moonIlluminatedFraction(reference.timeMs),
        waxing: moonPhaseAngleDeg(reference.timeMs) < 180,
      },
    },
  }
}

/** Kursor po zmianie nocy (7.0): środek okna ciemności, a gdy okna nie ma – lokalna północ. */
export function defaultCursorMs({ darkness, nightDate, timeZone }: Pick<NightFrame, 'darkness' | 'nightDate' | 'timeZone'>): number {
  if (darkness.kind === 'window') return (darkness.window.startMs + darkness.window.endMs) / 2
  return localMidnightMs(nightDate, timeZone)
}

const formatDeg = (value: number) => `${value}°`.replace('-', '−')

/** Komunikat o obniżonym progu albo o braku okna ciemności [T6]; null, gdy okno jest przy wybranym progu. */
export function darknessNote({ darkness, requestedThresholdDeg }: NightFrame): string | null {
  if (darkness.kind === 'window') {
    if (!darkness.lowered) return null
    return `Brak okna przy progu ${formatDeg(requestedThresholdDeg)}; użyto progu ${formatDeg(darkness.thresholdDeg)}.`
  }
  const even = darkness.thresholdDeg === requestedThresholdDeg ? '' : 'nawet '
  return `Brak okna ciemności ${even}przy progu ${formatDeg(darkness.thresholdDeg)}.`
}

/** Widoczny = powyżej max(h_min, horyzont); „za przeszkodą” = nie wyżej niż horyzont; „za nisko” = nie wyżej niż h_min. */
export type TrackState = 'visible' | 'obstructed' | 'low'

/** Gdy obiekt jest jednocześnie pod horyzontem i pod h_min, przyczyną jest przeszkoda. */
export function trackState(altDeg: number, horizonDeg: number, minAltDeg: number): TrackState {
  if (altDeg <= horizonDeg) return 'obstructed'
  return altDeg > minAltDeg ? 'visible' : 'low'
}

export interface TrackSample extends TimedAltitude {
  azDeg: number
  /** Horyzont lokalny wzdłuż azymutu obiektu, horyzont(az(t)). */
  horizonDeg: number
  state: TrackState
}

export interface TrackOptions {
  horizon: readonly HorizonPoint[]
  minAltitudeDeg: number
  mount: Mount
}

export interface ObjectTrack {
  samples: TrackSample[]
  /** Górowanie na osi wykresu; null, gdy obiekt góruje w dzień. */
  transit: TimedAltitude | null
  /** Przerzut GEM na osi wykresu. */
  flipMs: number | null
  /** Czas efektywny [min] w oknie ciemności; null bez okna. */
  effectiveMinutes: number | null
}

export interface CursorReadout {
  object: { altDeg: number; azDeg: number; horizonDeg: number; state: TrackState } | null
  moon: { altDeg: number; illuminatedFraction: number }
}

/** Położenie obiektu (J2000) i Księżyca w chwili kursora czasu. */
export function cursorReadout(
  frame: NightFrame,
  target: EquatorialDeg | null,
  horizon: readonly HorizonPoint[],
  minAltDeg: number,
  timeMs: number,
): CursorReadout {
  const moon = { altDeg: bodyPosition('moon', frame.site, timeMs).altDeg, illuminatedFraction: moonIlluminatedFraction(timeMs) }
  if (!target) return { object: null, moon }
  const { altDeg, azDeg } = horizontalAt(toEquatorOfDate(target, frame.precession), frame.site, timeMs)
  const horizonDeg = horizonAltitudeDeg(horizon, azDeg)
  return { object: { altDeg, azDeg, horizonDeg, state: trackState(altDeg, horizonDeg, minAltDeg) }, moon }
}

/** Tor obiektu (współrzędne J2000) na osi wykresu, z krokiem szczegółowym [Z8]. */
export function buildObjectTrack(frame: NightFrame, target: EquatorialDeg, options: TrackOptions): ObjectTrack {
  const ofDate = toEquatorOfDate(target, frame.precession)
  const samples = sampleTimes(frame.axis, frame.stepMin).map((timeMs) => {
    const { altDeg, azDeg } = horizontalAt(ofDate, frame.site, timeMs)
    const horizonDeg = horizonAltitudeDeg(options.horizon, azDeg)
    return { timeMs, altDeg, azDeg, horizonDeg, state: trackState(altDeg, horizonDeg, options.minAltitudeDeg) }
  })
  const transitTime = transitMs(ofDate.raDeg, frame.site.lonDegEast, frame.axis.startMs)
  const transit =
    transitTime <= frame.axis.endMs ? { timeMs: transitTime, altDeg: horizontalAt(ofDate, frame.site, transitTime).altDeg } : null
  const flipMs = transit ? meridianFlipMs(transit.timeMs, options.mount) : null
  return {
    samples,
    transit,
    flipMs: flipMs !== null && flipMs <= frame.axis.endMs ? flipMs : null,
    effectiveMinutes: frame.windowGrid
      ? effectiveMinutes(ofDate, frame.site, frame.windowGrid, options.minAltitudeDeg, options.horizon)
      : null,
  }
}
