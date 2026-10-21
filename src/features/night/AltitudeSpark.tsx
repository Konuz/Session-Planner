// Mini-wykres wysokości obiektu (karta katalogu): pasy zmierzchu nocy, h_min i tor obiektu jak na wykresie nocy (7C),
// w małym formacie bez osi. Oś X to oś wykresu nocy (od zachodu − 1 h do wschodu + 1 h), oś Y 0–90°.
import type { NightFrame, ObjectTrack } from '../../services/nightChart'
import { BAND_FILL } from './chartGeometry'

const WIDTH = 240
const HEIGHT = 72

interface AltitudeSparkProps {
  frame: NightFrame
  track: ObjectTrack
  minAltitudeDeg: number
  cursorMs: number
}

export function AltitudeSpark({ frame, track, minAltitudeDeg, cursorMs }: AltitudeSparkProps) {
  const { startMs, endMs } = frame.axis
  const x = (timeMs: number) => ((timeMs - startMs) / (endMs - startMs)) * WIDTH
  const y = (altDeg: number) => HEIGHT - (Math.min(90, Math.max(0, altDeg)) / 90) * HEIGHT
  const point = (timeMs: number, altDeg: number) => `${x(timeMs).toFixed(1)},${y(altDeg).toFixed(1)}`

  // Fragmenty toru: widoczny (gruba linia) albo nie; sąsiednie fragmenty mają wspólny punkt, jak na wykresie nocy.
  const runs: { visible: boolean; points: string[] }[] = []
  for (const sample of track.samples) {
    const visible = sample.state === 'visible'
    const last = runs.at(-1)
    const p = point(sample.timeMs, sample.altDeg)
    if (last?.visible === visible) last.points.push(p)
    else {
      last?.points.push(p)
      runs.push({ visible, points: [p] })
    }
  }
  const outline = track.samples.map((sample) => point(sample.timeMs, sample.altDeg))
  const area = `M0,${HEIGHT}L${outline.join('L')}L${WIDTH},${HEIGHT}Z`
  const cursorInAxis = cursorMs >= startMs && cursorMs <= endMs

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" aria-hidden className="block h-18 w-full">
      {frame.bands.map((band) => (
        <rect key={band.band} x={x(band.startMs)} y={0} width={Math.max(0, x(band.endMs) - x(band.startMs))} height={HEIGHT} className={BAND_FILL[band.band]} />
      ))}
      <line
        x1={0}
        x2={WIDTH}
        y1={y(minAltitudeDeg)}
        y2={y(minAltitudeDeg)}
        className="stroke-muted"
        strokeDasharray="2 3"
        vectorEffect="non-scaling-stroke"
      />
      <path d={area} className="fill-accent" fillOpacity={0.1} />
      {runs.map((run, i) => (
        <polyline
          key={i}
          points={run.points.join(' ')}
          fill="none"
          className={run.visible ? 'stroke-accent' : 'stroke-foreground'}
          strokeOpacity={run.visible ? 1 : 0.35}
          strokeWidth={run.visible ? 2 : 1.25}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {cursorInAxis && (
        <line
          x1={x(cursorMs)}
          x2={x(cursorMs)}
          y1={0}
          y2={HEIGHT}
          className="stroke-parchment"
          strokeOpacity={0.8}
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  )
}
