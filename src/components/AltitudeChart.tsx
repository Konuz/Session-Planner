// Wykres wysokości obiektu w nocy: tło w fazach zmierzchu, limit wysokości, własny horyzont na torze obiektu,
// Księżyc, kulminacja i południk, pas zachmurzenia i przeciągany kursor czasu.
import { Clock, Moon, Mountain, Timer } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { bodyAltAz, moonInfo } from '../lib/astro'
import type { DSO } from '../lib/catalog'
import { fmtDate, fmtDuration, fmtTime } from '../lib/format'
import { horizonAltitude } from '../lib/horizon'
import { altitudeTrack, darkWindow, localHourTicks, nightGrid, visibility } from '../lib/night'
import { useNight, useSelected, useSite, useTime, useWeather } from '../state/data'
import { useStore } from '../state/store'
import { MoonDisc } from './MoonDisc'

const H = 250
const PAD = { l: 44, r: 14, t: 30, b: 34 }
const ALT_MIN = 0
const ALT_MAX = 90

const y = (alt: number) => PAD.t + ((ALT_MAX - Math.max(ALT_MIN, Math.min(ALT_MAX, alt))) / (ALT_MAX - ALT_MIN)) * (H - PAD.t - PAD.b)

function visibleAltitudeSegments(points: { t: number; alt: number }[]) {
  const segments: { t: number; alt: number }[][] = []
  let segment: { t: number; alt: number }[] = []
  const crossing = (a: { t: number; alt: number }, b: { t: number; alt: number }) => {
    const fraction = a.alt / (a.alt - b.alt)
    return { t: a.t + fraction * (b.t - a.t), alt: 0 }
  }

  for (let i = 0; i < points.length; i++) {
    const point = points[i]
    if (i === 0) {
      if (point.alt >= 0) segment = [{ t: point.t, alt: point.alt }]
      continue
    }

    const previous = points[i - 1]
    if (previous.alt < 0 && point.alt < 0) continue
    if (previous.alt < 0 && point.alt >= 0) {
      segment = [crossing(previous, point)]
      if (point.alt > 0) segment.push({ t: point.t, alt: point.alt })
      continue
    }
    if (previous.alt >= 0 && point.alt < 0) {
      if (segment.length === 0) segment.push({ t: previous.t, alt: previous.alt })
      const end = crossing(previous, point)
      if (end.t > segment[segment.length - 1].t) segment.push(end)
      segments.push(segment)
      segment = []
      continue
    }
    if (point.alt >= 0) {
      if (segment.length === 0) segment.push({ t: previous.t, alt: previous.alt })
      if (point.t > segment[segment.length - 1].t) segment.push({ t: point.t, alt: point.alt })
    }
  }

  if (segment.length > 0) segments.push(segment)
  return segments.filter((part) => part.length > 1 && part.some((point) => point.alt > 0))
}

interface AltitudeChartProps {
  object?: DSO
  slot?: { startMs: number; endMs: number; conflict?: boolean } | null
  title?: string
  toolbar?: ReactNode
}

export function AltitudeChart({ object, slot, title = 'Widoczność obiektu', toolbar }: AltitudeChartProps = {}) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(1200)
  const [hoverT, setHoverT] = useState<number | null>(null)
  const dragging = useRef(false)
  const night = useNight()
  const site = useSite()
  const time = useTime()
  const selected = useSelected()
  const o = object ?? selected
  const tz = useStore((s) => s.location.timeZone)
  const minAlt = useStore((s) => s.minAltDeg)
  const horizon = useStore((s) => s.horizon)
  const setTime = useStore((s) => s.setTime)
  const { hours: weather } = useWeather()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(320, e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const grid = useMemo(() => nightGrid(night, site, 5), [night, site])
  const track = useMemo(() => (o ? altitudeTrack(o, grid) : []), [o, grid])
  const vis = useMemo(() => (o ? visibility(o, track, night, site, minAlt, horizon) : null), [o, track, night, site, minAlt, horizon])
  const moonTrack = useMemo(() => grid.times.filter((_, i) => i % 3 === 0).map((t) => ({ t, alt: bodyAltAz('moon', t, site).altDeg })), [grid, site])

  const x = useCallback((t: number) => PAD.l + ((t - night.startMs) / (night.endMs - night.startMs)) * (width - PAD.l - PAD.r), [night.startMs, night.endMs, width])
  const tAt = (px: number) => night.startMs + ((px - PAD.l) / (width - PAD.l - PAD.r)) * (night.endMs - night.startMs)

  // Pasma faz nocy.
  const n = night
  const bands: { from: number | null; to: number | null; fill: string; label: string }[] = [
    { from: n.startMs, to: n.sunset, fill: 'url(#g-day-l)', label: 'Dzień' },
    { from: n.sunset, to: n.civilDusk, fill: 'url(#g-dusk-civil)', label: 'Zmierzch' },
    { from: n.civilDusk, to: n.nauticalDusk, fill: 'url(#g-dusk-nautical)', label: 'żeglarski' },
    { from: n.nauticalDusk, to: n.astroDusk, fill: 'url(#g-dusk-astro)', label: 'astronomiczny' },
    { from: n.astroDusk, to: n.astroDawn, fill: 'url(#g-night)', label: 'Noc astronomiczna' },
    { from: n.astroDawn, to: n.nauticalDawn, fill: 'url(#g-dawn-astro)', label: '' },
    { from: n.nauticalDawn, to: n.civilDawn, fill: 'url(#g-dawn-nautical)', label: '' },
    { from: n.civilDawn, to: n.sunrise, fill: 'url(#g-dawn-civil)', label: 'Świt' },
    { from: n.sunrise, to: n.endMs, fill: 'url(#g-day-r)', label: 'Dzień' },
  ]
  // Bez nocy astronomicznej: najciemniejsza faza wypełnia środek.
  if (n.astroDusk === null && n.nauticalDusk !== null) bands[4] = { from: n.nauticalDusk, to: n.nauticalDawn, fill: 'rgba(22, 40, 84, 0.6)', label: 'Noc żeglarska (brak astronomicznej)' }
  // Dzień polarny: Słońce nie zachodzi, cały wykres to dzień (bez tego tło wyglądałoby jak noc).
  if (n.polarDay) bands.splice(0, bands.length, { from: n.startMs, to: n.endMs, fill: 'rgba(150, 90, 40, 0.55)', label: 'Dzień polarny' })

  const hourTicks = useMemo(() => localHourTicks(night.startMs, night.endMs, tz), [night.startMs, night.endMs, tz])
  const everyN = width < 700 ? 2 : 1

  const { objPath, areaPath, obstaclePath, moonPath } = useMemo(() => {
    const linePath = (pts: { t: number; alt: number }[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.alt).toFixed(1)}`).join('')
    const segments = visibleAltitudeSegments(track)
    const paths = segments.map(linePath)
    const obstaclePath = track.length && horizon.length
      ? `${linePath(track.map((s) => ({ t: s.t, alt: horizonAltitude(horizon, s.az) })))}L${x(night.endMs)},${y(ALT_MIN)}L${x(night.startMs)},${y(ALT_MIN)}Z`
      : ''
    return {
      objPath: paths.join(''),
      areaPath: segments.map((part, i) => `${paths[i]}L${x(part[part.length - 1].t)},${y(0)}L${x(part[0].t)},${y(0)}Z`).join(''),
      obstaclePath,
      moonPath: linePath(moonTrack),
    }
  }, [track, moonTrack, horizon, x, night.startMs, night.endMs])

  const cursorT = hoverT ?? time
  const cursorAlt = track.length ? track.reduce((b, s) => (Math.abs(s.t - cursorT) < Math.abs(b.t - cursorT) ? s : b)).alt : null
  const moonCursor = useMemo(() => ({ ...bodyAltAz('moon', cursorT, site), info: moonInfo(cursorT) }), [cursorT, site])
  const moonCursorLineY = moonTrack.length === 0 ? null : (() => {
    const nextIndex = moonTrack.findIndex((point) => point.t >= cursorT)
    const rightIndex = nextIndex < 0 ? moonTrack.length - 1 : nextIndex
    const leftIndex = Math.max(0, rightIndex - 1)
    const left = moonTrack[leftIndex]
    const right = moonTrack[rightIndex]
    const progress = right.t === left.t ? 0 : Math.max(0, Math.min(1, (cursorT - left.t) / (right.t - left.t)))
    return y(left.alt) + (y(right.alt) - y(left.alt)) * progress
  })()
  const moonCursorInRange = cursorT >= night.startMs && cursorT <= night.endMs && moonCursor.altDeg >= 0 && moonCursorLineY !== null
  const [darkStart, darkEnd] = darkWindow(night)
  const transitIn = vis?.transitMs != null && vis.transitMs >= night.startMs && vis.transitMs <= night.endMs ? vis.transitMs : null
  const transitLabelOnLeft = transitIn !== null && x(transitIn) > width - 185
  const toTransit = transitIn !== null ? (transitIn - time) / 3_600_000 : null

  const onPointer = (e: React.PointerEvent<SVGSVGElement>, commit: boolean) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * width
    const t = Math.max(night.startMs, Math.min(night.endMs, tAt(px)))
    setHoverT(t)
    if (commit) setTime(Math.round(t / 60_000) * 60_000)
  }

  const nightLabel = `${fmtDate(night.startMs + 3_600_000, tz, { day: 'numeric' })}/${fmtDate(night.endMs, tz, { day: 'numeric', month: 'short' })}`

  return (
    <section className="card span-all">
      <h2 className="panel-title">
        {title} <span className="sub">- noc {nightLabel}</span>
        <span className="spacer" />
        {o && <span className="sub">{o.id}</span>}
      </h2>
      {toolbar}
      <div ref={ref} className="chart-wrap">
        <svg
          viewBox={`0 0 ${width} ${H}`}
          height={H}
          onPointerMove={(e) => onPointer(e, dragging.current)}
          onPointerDown={(e) => {
            dragging.current = true
            e.currentTarget.setPointerCapture(e.pointerId)
            onPointer(e, true)
          }}
          onPointerUp={() => (dragging.current = false)}
          onPointerLeave={() => !dragging.current && setHoverT(null)}
          style={{ cursor: 'col-resize', touchAction: 'none' }}
          role="img"
          aria-label="Wykres wysokości obiektu w nocy"
        >
          <defs>
            <linearGradient id="g-day-l" x1="0" x2="1"><stop offset="0" stopColor="rgba(150, 90, 40, 0.55)" /><stop offset="1" stopColor="rgba(255, 118, 58, 0.43)" /></linearGradient>
            <linearGradient id="g-day-r" x1="0" x2="1"><stop offset="0" stopColor="rgba(232, 162, 102, 0.47)" /><stop offset="1" stopColor="rgba(150, 90, 40, 0.55)" /></linearGradient>
            <linearGradient id="g-dusk-civil" x1="0" x2="1"><stop offset="0" stopColor="rgba(255, 118, 58, 0.43)" /><stop offset="1" stopColor="rgba(205, 68, 112, 0.4)" /></linearGradient>
            <linearGradient id="g-dusk-nautical" x1="0" x2="1"><stop offset="0" stopColor="rgba(205, 68, 112, 0.4)" /><stop offset="1" stopColor="rgba(54, 66, 137, 0.46)" /></linearGradient>
            <linearGradient id="g-dusk-astro" x1="0" x2="1"><stop offset="0" stopColor="rgba(54, 66, 137, 0.46)" /><stop offset="1" stopColor="rgba(18, 33, 78, 0.55)" /></linearGradient>
            <linearGradient id="g-dawn-astro" x1="0" x2="1"><stop offset="0" stopColor="rgba(29, 43, 63, 0.6)" /><stop offset="1" stopColor="rgba(67, 92, 126, 0.48)" /></linearGradient>
            <linearGradient id="g-dawn-nautical" x1="0" x2="1"><stop offset="0" stopColor="rgba(67, 92, 126, 0.48)" /><stop offset="1" stopColor="rgba(154, 106, 131, 0.4)" /></linearGradient>
            <linearGradient id="g-dawn-civil" x1="0" x2="1"><stop offset="0" stopColor="rgba(154, 106, 131, 0.4)" /><stop offset="1" stopColor="rgba(232, 162, 102, 0.47)" /></linearGradient>
            <linearGradient id="g-night" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="rgba(18, 33, 78, 0.55)" /><stop offset="22%" stopColor="rgba(12, 24, 56, 0.82)" /><stop offset="50%" stopColor="rgba(2, 4, 12, 0.96)" /><stop offset="78%" stopColor="rgba(15, 27, 54, 0.82)" /><stop offset="100%" stopColor="rgba(29, 43, 63, 0.6)" /></linearGradient>
            <linearGradient id="g-obj" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="rgba(0, 224, 255, 0.28)" /><stop offset="1" stopColor="rgba(0, 224, 255, 0)" /></linearGradient>
            <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0v6" stroke="rgba(245, 165, 36, 0.45)" strokeWidth="1.5" /></pattern>
            <filter id="glow"><feGaussianBlur stdDeviation="2.2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>

          {bands.map((b, i) =>
            b.from !== null && b.to !== null && b.to > b.from ? (
              <g key={i}>
                <rect x={x(b.from)} y={PAD.t} width={Math.max(0, x(b.to) - x(b.from))} height={H - PAD.t - PAD.b} fill={b.fill} />
                {b.label && x(b.to) - x(b.from) > (b.label === 'Zmierzch' ? 34 : b.label.length * 6.2) && (
                  <text x={(x(b.from) + x(b.to)) / 2} y={PAD.t + 16} textAnchor="middle" fill="rgba(220, 228, 240, 0.75)" fontSize="11.5">{b.label}</text>
                )}
              </g>
            ) : null,
          )}

          {[0, 20, 40, 60, 80].map((a) => (
            <g key={a}>
              <line x1={PAD.l} x2={width - PAD.r} y1={y(a)} y2={y(a)} stroke={a === 0 ? 'rgba(200, 210, 230, 0.35)' : 'rgba(200, 210, 230, 0.09)'} />
              <text x={PAD.l - 8} y={y(a) + 4} textAnchor="end" fill="rgba(200, 210, 230, 0.7)" fontSize="11.5" fontFamily="var(--mono)">{a}°</text>
            </g>
          ))}

          {hourTicks.map((t, i) => (
            <g key={t}>
              <line x1={x(t)} x2={x(t)} y1={H - PAD.b} y2={H - PAD.b + 4} stroke="rgba(200, 210, 230, 0.4)" />
              {i % everyN === 0 && <text x={x(t)} y={H - PAD.b + 17} textAnchor="middle" fill="rgba(200, 210, 230, 0.7)" fontSize="11" fontFamily="var(--mono)">{fmtTime(t, tz)}</text>}
            </g>
          ))}

          {/* Pas zachmurzenia. */}
          {weather
            .filter((w) => w.t >= night.startMs - 1_800_000 && w.t <= night.endMs)
            .map((w) => (
              <rect key={w.t} x={x(Math.max(night.startMs, w.t - 1_800_000))} y={H - PAD.b + 22} width={Math.max(0, x(Math.min(night.endMs, w.t + 1_800_000)) - x(Math.max(night.startMs, w.t - 1_800_000)))} height={5} fill={`rgba(200, 210, 230, ${0.08 + (w.cloud / 100) * 0.7})`}>
                <title>{`${fmtTime(w.t, tz)} - zachmurzenie ${Math.round(w.cloud)}%`}</title>
              </rect>
            ))}

          {/* Limit wysokości. */}
          <line x1={PAD.l} x2={width - PAD.r} y1={y(minAlt)} y2={y(minAlt)} stroke="rgba(245, 165, 36, 0.55)" strokeDasharray="4 5" />
          <text x={width - PAD.r - 4} y={y(minAlt) - 5} textAnchor="end" fill="rgba(245, 165, 36, 0.8)" fontSize="10.5" fontFamily="var(--mono)">limit {minAlt}°</text>

          {obstaclePath && <path d={obstaclePath} fill="url(#hatch)" stroke="rgba(245, 165, 36, 0.6)" strokeWidth="1" />}

          {/* Księżyc. */}
          <path d={moonPath} fill="none" stroke="rgba(220, 225, 235, 0.38)" strokeDasharray="2 4" strokeWidth="1.2" />

          {o && objPath && (
            <>
              <path d={areaPath} fill="url(#g-obj)" />
              <path d={objPath} fill="none" stroke="#00e0ff" strokeWidth="2" filter="url(#glow)" />
              {transitIn !== null && vis && (
                <g>
                  <line x1={x(transitIn)} x2={x(transitIn)} y1={PAD.t} y2={H - PAD.b} stroke="#f5a524" strokeDasharray="4 4" />
                  <line x1={PAD.l} x2={width - PAD.r} y1={y(vis.transitAlt)} y2={y(vis.transitAlt)} stroke="rgba(200, 210, 230, 0.22)" strokeDasharray="6 6" />
                  <circle cx={x(transitIn)} cy={y(vis.transitAlt)} r="5" fill="#0b0d17" stroke="#00e0ff" strokeWidth="2" />
                  <text x={x(transitIn) + (transitLabelOnLeft ? -8 : 8)} y={PAD.t - 14} textAnchor={transitLabelOnLeft ? 'end' : 'start'} fill="#00e0ff" fontSize="12">Kulminacja · południk</text>
                  <text x={x(transitIn) + (transitLabelOnLeft ? -8 : 8)} y={PAD.t - 1} textAnchor={transitLabelOnLeft ? 'end' : 'start'} fill="#e6edf7" fontSize="12" fontFamily="var(--mono)">
                    {fmtTime(transitIn, tz)} · {Math.round(vis.transitAlt)}°
                  </text>
                </g>
              )}
            </>
          )}

          {/* Granice zaplanowanego okna w planerze. */}
          {slot && slot.endMs > slot.startMs && [slot.startMs, slot.endMs].map((t, i) => (
            <g key={i}>
              <title>{i ? 'Koniec' : 'Początek'} planowanego okna: {fmtTime(t, tz)}</title>
              <line x1={x(t)} x2={x(t)} y1={PAD.t} y2={H - PAD.b} stroke={slot.conflict ? 'var(--bad)' : 'var(--accent)'} strokeWidth="1.5" strokeDasharray="5 5" />
            </g>
          ))}

          {/* Kursor czasu. */}
          <line x1={x(cursorT)} x2={x(cursorT)} y1={PAD.t} y2={H - PAD.b} stroke={hoverT !== null ? 'rgba(255,255,255,0.6)' : '#00e0ff'} strokeWidth="1" />
          {cursorAlt !== null && <circle cx={x(cursorT)} cy={y(cursorAlt)} r="4" fill="#fff" />}
          {moonCursorInRange && moonCursorLineY !== null && (
            <g pointerEvents="none">
              <MoonDisc illumination={moonCursor.info.illumination} waxing={moonCursor.info.waxing} phaseName={moonCursor.info.name} size={18} x={x(cursorT) - 9} y={moonCursorLineY - 9} />
            </g>
          )}
          <g transform={`translate(${Math.min(width - 110, Math.max(PAD.l, x(cursorT) + 6))}, ${H - PAD.b - 22})`}>
            <rect width="100" height="18" fill="rgba(0,0,0,0.75)" stroke="rgba(0,224,255,0.4)" />
            <text x="6" y="13" fill="#e6edf7" fontSize="11" fontFamily="var(--mono)">
              {fmtTime(cursorT, tz)}{cursorAlt !== null ? ` · ${Math.round(cursorAlt)}°` : ''}
            </text>
          </g>
        </svg>
      </div>
      <div className="chart-footer">
        <span>
          <Moon size={15} />
          {night.polarDay ? <>Dzień polarny: <b>brak ciemnej nocy</b></> : <>{night.astroDusk !== null ? 'Noc astronomiczna' : 'Najciemniej'} <b>{fmtTime(darkStart, tz)}–{fmtTime(darkEnd, tz)}</b></>}
        </span>
        {o && vis && (
          <span>
            <Timer size={15} />
            Okno ≥ {minAlt}° <b>{vis.windowStart !== null ? `${fmtTime(vis.windowStart, tz)}–${fmtTime(vis.windowEnd, tz)} (${fmtDuration(vis.hoursUsable)})` : 'brak'}</b>
          </span>
        )}
        {toTransit !== null && (
          <span>
            <Clock size={15} />
            {toTransit >= 0 ? 'Do kulminacji' : 'Od kulminacji'} <b>{fmtDuration(Math.abs(toTransit))}</b>
          </span>
        )}
        <span style={{ marginLeft: 'auto' }}>
          <Mountain size={15} />
          Horyzont: <b>{horizon.length ? `własny (${horizon.length} pkt)` : 'bez przeszkód'}</b>
        </span>
      </div>
    </section>
  )
}
