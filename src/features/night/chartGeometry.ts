// Geometria wykresu nocy (7C) w pikselach: skale d3-scale i ścieżki SVG wyliczone z modelu nocy.
import { scaleLinear, type ScaleLinear } from 'd3-scale'
import type { NightFrame, ObjectTrack, TwilightBand } from '../../services/nightChart'
import { localTimeParts } from '../../services/time'

export const CHART_MARGIN = { top: 34, right: 12, bottom: 40, left: 34 }

/** Wypełnienie pasów tła tokenami rampy zmierzchu (tylko tokeny, więc działa w Red Mode); noc ma kolor tła. */
export const BAND_FILL: Record<TwilightBand, string> = {
  day: 'fill-sky-day',
  civil: 'fill-sky-civil',
  nautical: 'fill-sky-nautical',
  astronomical: 'fill-sky-astronomical',
  night: 'fill-background',
}

/** Poniżej tego odstępu między pełnymi godzinami etykieta osi to samo „HH”. */
const FULL_LABEL_MIN_SPACING_PX = 40
/** Wysokości rysowane z przycięciem: krzywe poniżej osi i tak zasłania obszar przycinania. */
const DRAW_ALT_MIN_DEG = -10
const DRAW_ALT_MAX_DEG = 95

export interface AxisTick {
  timeMs: number
  x: number
  time: string
  /** Skrót strefy przy pierwszej godzinie i po obu stronach zmiany czasu [T5]. */
  zone: string | null
}

export interface ChartGeometry {
  x: ScaleLinear<number, number>
  y: ScaleLinear<number, number>
  plot: { left: number; right: number; top: number; bottom: number }
  bands: { band: TwilightBand; x: number; width: number }[]
  ticks: AxisTick[]
  window: { x0: number; x1: number } | null
  minAltY: number
  moonPath: string
  moonIcon: { x: number; y: number } | null
  object: {
    runs: { visible: boolean; path: string }[]
    /** Obszar pod horyzontem wzdłuż azymutu obiektu: „za przeszkodą”. */
    obstaclePath: string
    horizonPath: string
    /** Obszar między horyzontem a h_min: „za nisko”. */
    lowZonePath: string
    transitX: number | null
    flipX: number | null
  } | null
}

type Point = readonly [number, number]

const round = (value: number) => Math.round(value * 10) / 10
const coords = ([px, py]: Point) => `${round(px)},${round(py)}`
const clampAlt = (altDeg: number) => Math.min(DRAW_ALT_MAX_DEG, Math.max(DRAW_ALT_MIN_DEG, altDeg))

function linePath(points: readonly Point[]): string {
  return points.map((point, i) => `${i === 0 ? 'M' : 'L'}${coords(point)}`).join('')
}

function areaPath(top: readonly Point[], bottom: readonly Point[]): string {
  return `${linePath(top)}L${[...bottom].reverse().map(coords).join('L')}Z`
}

function axisTicks(frame: NightFrame, x: ScaleLinear<number, number>, plotWidth: number): AxisTick[] {
  const parts = frame.hourTicksMs.map((timeMs) => localTimeParts(timeMs, frame.timeZone))
  const short = plotWidth / Math.max(1, parts.length) < FULL_LABEL_MIN_SPACING_PX
  return frame.hourTicksMs.map((timeMs, i) => {
    const { time, zone } = parts[i]
    const showZone = i === 0 || zone !== parts[i - 1].zone || (i + 1 < parts.length && zone !== parts[i + 1].zone)
    return { timeMs, x: x(timeMs), time: short ? time.slice(0, 2) : time, zone: showZone ? zone : null }
  })
}

function objectLayers(
  track: ObjectTrack,
  x: ScaleLinear<number, number>,
  y: ScaleLinear<number, number>,
  minAltDeg: number,
): NonNullable<ChartGeometry['object']> {
  const runs: { visible: boolean; points: Point[] }[] = []
  for (const sample of track.samples) {
    const point: Point = [x(sample.timeMs), y(clampAlt(sample.altDeg))]
    const visible = sample.state === 'visible'
    const last = runs.at(-1)
    if (last?.visible === visible) {
      last.points.push(point)
    } else {
      last?.points.push(point) // wspólny punkt łączy sąsiednie fragmenty
      runs.push({ visible, points: [point] })
    }
  }

  const ground = track.samples.map((s): Point => [x(s.timeMs), y(0)])
  const horizonTop = track.samples.map((s): Point => [x(s.timeMs), y(Math.min(90, Math.max(0, s.horizonDeg)))])
  const hasObstacle = track.samples.some((s) => s.horizonDeg > 0)
  const lowTop = track.samples.map((s): Point => [x(s.timeMs), y(minAltDeg)])
  const lowBottom = track.samples.map((s): Point => [x(s.timeMs), y(Math.min(minAltDeg, Math.max(0, s.horizonDeg)))])

  return {
    runs: runs.map(({ visible, points }) => ({ visible, path: linePath(points) })),
    obstaclePath: hasObstacle ? areaPath(horizonTop, ground) : '',
    horizonPath: hasObstacle ? linePath(horizonTop) : '',
    lowZonePath: minAltDeg > 0 ? areaPath(lowTop, lowBottom) : '',
    transitX: track.transit ? x(track.transit.timeMs) : null,
    flipX: track.flipMs === null ? null : x(track.flipMs),
  }
}

export function chartGeometry(
  frame: NightFrame,
  track: ObjectTrack | null,
  minAltDeg: number,
  size: { width: number; height: number },
): ChartGeometry {
  const plot = {
    left: CHART_MARGIN.left,
    right: Math.max(CHART_MARGIN.left + 1, size.width - CHART_MARGIN.right),
    top: CHART_MARGIN.top,
    bottom: size.height - CHART_MARGIN.bottom,
  }
  const x = scaleLinear().domain([frame.axis.startMs, frame.axis.endMs]).range([plot.left, plot.right])
  const y = scaleLinear().domain([0, 90]).range([plot.bottom, plot.top])
  const { reference } = frame.moon
  return {
    x,
    y,
    plot,
    bands: frame.bands.map(({ band, startMs, endMs }) => ({ band, x: x(startMs), width: Math.max(0, x(endMs) - x(startMs)) })),
    ticks: axisTicks(frame, x, plot.right - plot.left),
    window:
      frame.darkness.kind === 'window'
        ? { x0: x(frame.darkness.window.startMs), x1: x(frame.darkness.window.endMs) }
        : null,
    minAltY: y(minAltDeg),
    moonPath: linePath(frame.moon.samples.map((s): Point => [x(s.timeMs), y(clampAlt(s.altDeg))])),
    moonIcon: reference.altDeg > 0 ? { x: x(reference.timeMs), y: y(reference.altDeg) } : null,
    object: track ? objectLayers(track, x, y, minAltDeg) : null,
  }
}
