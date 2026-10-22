// Model widoku sfery (7D): rzut azymutalny równoodległościowy [Z17] w jednostkach widoku SVG. Bez rysowania.
import {
  bodyPosition,
  horizonAltitudeDeg,
  horizontalAt,
  moonIlluminatedFraction,
  moonPhaseAngleDeg,
  normalizeDeg,
  toEquatorOfDate,
  type EquatorialDeg,
  type HorizontalDeg,
} from '../../services/astroMath'
import { trackState, type CursorReadout, type NightFrame, type TrackState, type TwilightBand } from '../../services/nightChart'
import { fullLocalHoursMs, localTimeParts } from '../../services/time'
import type { TimeRange } from '../../services/visibility'
import type { HorizonPoint } from '../../types'

const MINUTE_MS = 60_000
const RING_ALTITUDES_DEG = [0, 30, 60]
/** Odstęp liter N, E, S, W od brzegu tarczy [jednostki widoku]. */
const CARDINAL_OFFSET = 16
/** Odsunięcie opisu pełnej godziny od trajektorii [jednostki widoku]. */
const HOUR_LABEL_OFFSET = 11
/** Kierunek trajektorii przy opisie godziny: położenia o tyle minut wcześniej i później. */
const TANGENT_MIN = 5
/** Kierunek trajektorii przy znaczniku obiektu: próbki o tyle wcześniej i później. */
const TANGENT_SAMPLES = 5
/** Odsunięcie opisu znacznika obiektu od jego środka [jednostki widoku]; znacznik ma promień 12. */
const MARKER_LABEL_OFFSET = 20
/** Znacznik dalej od trajektorii niż tyle jednostek widoku nie leży na niej (kursor poza jej zakresem). */
const MARKER_TRACK_TOLERANCE = 3

export interface Dome {
  cx: number
  cy: number
  radius: number
}

export interface DomePoint {
  x: number
  y: number
}

/** Widok 400 × 400 z tarczą o promieniu 168: wokół brzegu zostaje miejsce na litery kierunków świata. */
export const DOME_VIEW_SIZE = 400
export const DOME: Dome = { cx: 200, cy: 200, radius: 168 }

/** Odległość od zenitu: r = R·(90° − h)/90°; wysokości ujemne leżą poza tarczą. */
export function domeRadius(altDeg: number, dome: Dome): number {
  return (dome.radius * (90 - altDeg)) / 90
}

/** x = cx − r·sin(az), y = cy − r·cos(az): zenit w środku, N u góry, E po lewej (widok w niebo). */
export function domePoint({ altDeg, azDeg }: HorizontalDeg, dome: Dome): DomePoint {
  const r = domeRadius(altDeg, dome)
  const az = (azDeg * Math.PI) / 180
  return { x: dome.cx - r * Math.sin(az), y: dome.cy - r * Math.cos(az) }
}

const round = (value: number) => Math.round(value * 10) / 10
const coords = ({ x, y }: DomePoint) => `${round(x)},${round(y)}`

function linePath(points: readonly DomePoint[]): string {
  return points.map((point, i) => `${i === 0 ? 'M' : 'L'}${coords(point)}`).join('')
}

/** Okrąg jako zamknięta ścieżka z dwóch łuków, do pierścieni z regułą evenodd. */
function circlePath({ cx, cy }: Dome, r: number): string {
  const arc = `A${round(r)},${round(r)} 0 1 0`
  return `M${round(cx)},${round(cy - r)}${arc} ${round(cx)},${round(cy + r)}${arc} ${round(cx)},${round(cy - r)}Z`
}

/**
 * Obrys własnego horyzontu: punkt co 1° azymutu i w każdym wierzchołku (ostre narożniki zostają), wysokość z interpolacji
 * [T10] przycięta do 0–90°, bo tarcza kończy się na 0°. Pusta lista, gdy nic nie wystaje ponad 0°.
 */
export function horizonOutline(horizon: readonly HorizonPoint[]): HorizontalDeg[] {
  const azimuths = new Set(Array.from({ length: 360 }, (_, azDeg) => azDeg))
  for (const point of horizon) azimuths.add(normalizeDeg(point.azDeg))
  const outline = [...azimuths]
    .sort((a, b) => a - b)
    .map((azDeg) => ({ azDeg, altDeg: Math.min(90, Math.max(0, horizonAltitudeDeg(horizon, azDeg))) }))
  return outline.some((point) => point.altDeg > 0) ? outline : []
}

export interface DomeLayers {
  /** Okręgi wysokości 0°, 30° i 60°. */
  rings: { altDeg: number; r: number }[]
  minAltitude: { altDeg: number; r: number }
  /** Południk N–S przez zenit. */
  meridian: { from: DomePoint; to: DomePoint }
  cardinals: { label: 'N' | 'E' | 'S' | 'W'; x: number; y: number }[]
  /** Pierścień „za nisko” między okręgiem h_min a brzegiem tarczy (reguła evenodd); '' przy h_min ≤ 0°. */
  lowZonePath: string
  /** Przeszkody: obszar między brzegiem tarczy a linią horyzontu (reguła evenodd); '' bez przeszkód. */
  horizonPath: string
}

/** Wszystko, co na widoku sfery zależy tylko od horyzontu lokalizacji i h_min. */
export function domeLayers(horizon: readonly HorizonPoint[], minAltDeg: number, dome: Dome): DomeLayers {
  const { cx, cy, radius } = dome
  const edge = radius + CARDINAL_OFFSET
  const outline = horizonOutline(horizon)
  const minAltitudeR = domeRadius(minAltDeg, dome)
  return {
    rings: RING_ALTITUDES_DEG.map((altDeg) => ({ altDeg, r: domeRadius(altDeg, dome) })),
    minAltitude: { altDeg: minAltDeg, r: minAltitudeR },
    meridian: { from: domePoint({ altDeg: 0, azDeg: 0 }, dome), to: domePoint({ altDeg: 0, azDeg: 180 }, dome) },
    cardinals: [
      { label: 'N', x: cx, y: cy - edge },
      { label: 'E', x: cx - edge, y: cy },
      { label: 'S', x: cx, y: cy + edge },
      { label: 'W', x: cx + edge, y: cy },
    ],
    lowZonePath: minAltDeg > 0 ? `${circlePath(dome, radius)}${circlePath(dome, minAltitudeR)}` : '',
    horizonPath:
      outline.length > 0 ? `${circlePath(dome, radius)}${linePath(outline.map((point) => domePoint(point, dome)))}Z` : '',
  }
}

export interface DomeSample extends HorizontalDeg {
  timeMs: number
  state: TrackState
  point: DomePoint
}

export interface DomeHour {
  timeMs: number
  /** Godzina „HH”; przy zmianie czasu ze skrótem strefy, np. „02 CEST” i „02 CET” [T5]. */
  label: string
  altDeg: number
  point: DomePoint
  /** Miejsce opisu: odsunięte od trajektorii w stronę brzegu tarczy. */
  labelPoint: DomePoint
}

export interface DomeTrack {
  /** Okno ciemności, a gdy go nie ma – cała oś wykresu nocy. */
  range: TimeRange
  inDarkness: boolean
  /** Próbki co krok szczegółowy [Z8] od początku zakresu; ostatnia dokładnie na jego końcu. */
  samples: DomeSample[]
  /** Przebiegi widoczne (ponad max(h_min, horyzont)) i pozostałe; sąsiednie mają wspólny punkt. */
  runs: { visible: boolean; path: string }[]
  /** Pełne godziny lokalne, w których obiekt jest nad horyzontem matematycznym. */
  hours: DomeHour[]
}

/** Trajektoria obiektu (współrzędne J2000) w oknie ciemności nocy D ze znacznikami pełnych godzin. */
export function domeTrack(
  frame: NightFrame,
  target: EquatorialDeg,
  horizon: readonly HorizonPoint[],
  minAltDeg: number,
  dome: Dome,
): DomeTrack {
  const { startMs, endMs } = frame.darkness.kind === 'window' ? frame.darkness.window : frame.axis
  const ofDate = toEquatorOfDate(target, frame.precession)
  const position = (timeMs: number) => horizontalAt(ofDate, frame.site, timeMs)

  const times: number[] = []
  for (let t = startMs; t < endMs; t += frame.stepMin * MINUTE_MS) times.push(t)
  times.push(endMs)
  const samples = times.map((timeMs): DomeSample => {
    const { altDeg, azDeg } = position(timeMs)
    const state = trackState(altDeg, horizonAltitudeDeg(horizon, azDeg), minAltDeg)
    return { timeMs, altDeg, azDeg, state, point: domePoint({ altDeg, azDeg }, dome) }
  })

  const runs: { visible: boolean; points: DomePoint[] }[] = []
  for (const sample of samples) {
    const visible = sample.state === 'visible'
    const last = runs.at(-1)
    if (last?.visible === visible) {
      last.points.push(sample.point)
    } else {
      last?.points.push(sample.point) // wspólny punkt łączy sąsiednie przebiegi
      runs.push({ visible, points: [sample.point] })
    }
  }

  const ticks = fullLocalHoursMs({ startMs, endMs }, frame.timeZone)
  const parts = ticks.map((timeMs) => localTimeParts(timeMs, frame.timeZone))
  const hours = ticks.flatMap((timeMs, i): DomeHour[] => {
    const here = position(timeMs)
    if (here.altDeg <= 0) return []
    const { time, zone } = parts[i]
    const nearZoneChange = [parts[i - 1], parts[i + 1]].some((other) => other !== undefined && other.zone !== zone)
    const point = domePoint(here, dome)
    const before = domePoint(position(timeMs - TANGENT_MIN * MINUTE_MS), dome)
    const after = domePoint(position(timeMs + TANGENT_MIN * MINUTE_MS), dome)
    // Normalna do trajektorii, zwrócona od środka tarczy; bez ruchu – kierunek od środka (w zenicie – ku N).
    const outward = { x: point.x - dome.cx, y: point.y - dome.cy }
    let normal = { x: before.y - after.y, y: after.x - before.x }
    if (Math.hypot(normal.x, normal.y) === 0) normal = Math.hypot(outward.x, outward.y) === 0 ? { x: 0, y: -1 } : outward
    const sign = normal.x * outward.x + normal.y * outward.y < 0 ? -1 : 1
    const scale = (sign * HOUR_LABEL_OFFSET) / Math.hypot(normal.x, normal.y)
    return [
      {
        timeMs,
        label: nearZoneChange ? `${time.slice(0, 2)} ${zone}` : time.slice(0, 2),
        altDeg: here.altDeg,
        point,
        labelPoint: { x: point.x + normal.x * scale, y: point.y + normal.y * scale },
      },
    ]
  })

  return {
    range: { startMs, endMs },
    inDarkness: frame.darkness.kind === 'window',
    samples,
    runs: runs.map(({ visible, points }) => ({ visible, path: linePath(points) })),
    hours,
  }
}

export interface DomeLabel extends DomePoint {
  anchor: 'start' | 'middle' | 'end'
}

/**
 * Opis znacznika obiektu: po stronie trajektorii zwróconej ku środkowi tarczy, czyli naprzeciw opisów pełnych godzin.
 * Bez trajektorii albo z dala od niej (kursor poza zakresem trajektorii) – w stronę środka tarczy, a w zenicie – w górę.
 */
export function markerLabel(point: DomePoint, track: DomeTrack | null, dome: Dome): DomeLabel {
  const inward = { x: dome.cx - point.x, y: dome.cy - point.y }
  let direction = Math.hypot(inward.x, inward.y) === 0 ? { x: 0, y: -1 } : inward
  const samples = track?.samples ?? []
  const distanceTo = (sample: DomeSample) => Math.hypot(sample.point.x - point.x, sample.point.y - point.y)
  const nearest = samples.reduce((best, sample, i) => (best < 0 || distanceTo(sample) < distanceTo(samples[best]) ? i : best), -1)
  if (nearest >= 0 && distanceTo(samples[nearest]) <= MARKER_TRACK_TOLERANCE) {
    const before = samples[Math.max(0, nearest - TANGENT_SAMPLES)].point
    const after = samples[Math.min(samples.length - 1, nearest + TANGENT_SAMPLES)].point
    const normal = { x: before.y - after.y, y: after.x - before.x }
    if (Math.hypot(normal.x, normal.y) > 0) {
      const sign = normal.x * inward.x + normal.y * inward.y < 0 ? -1 : 1
      direction = { x: sign * normal.x, y: sign * normal.y }
    }
  }
  const length = Math.hypot(direction.x, direction.y)
  const unit = { x: direction.x / length, y: direction.y / length }
  return {
    x: point.x + unit.x * MARKER_LABEL_OFFSET,
    y: point.y + unit.y * MARKER_LABEL_OFFSET,
    anchor: unit.x > 0.5 ? 'start' : unit.x < -0.5 ? 'end' : 'middle',
  }
}

export interface DomeCursor {
  object: (NonNullable<CursorReadout['object']> & { point: DomePoint }) | null
  moon: HorizontalDeg & { aboveHorizon: boolean; illuminatedFraction: number; waxing: boolean; point: DomePoint }
  /** Pas nieba w chwili kursora, jak tło wykresu nocy; poza osią wykresu – dzień. */
  band: TwilightBand
}

/** Obiekt (z odczytu kursora), Księżyc z fazą i pas nieba w chwili kursora czasu. */
export function domeCursor(frame: NightFrame, object: CursorReadout['object'], cursorMs: number, dome: Dome): DomeCursor {
  const moon = bodyPosition('moon', frame.site, cursorMs)
  // Pasy są zagnieżdżone (dzień ⊃ zmierzch cywilny ⊃ … ⊃ noc), więc wygrywa ostatni pas zawierający kursor.
  let band: TwilightBand = 'day'
  for (const segment of frame.bands) if (cursorMs >= segment.startMs && cursorMs <= segment.endMs) band = segment.band
  return {
    object: object ? { ...object, point: domePoint(object, dome) } : null,
    moon: {
      altDeg: moon.altDeg,
      azDeg: moon.azDeg,
      aboveHorizon: moon.altDeg > 0,
      illuminatedFraction: moonIlluminatedFraction(cursorMs),
      waxing: moonPhaseAngleDeg(cursorMs) < 180,
      point: domePoint(moon, dome),
    },
    band,
  }
}
