// Wykres wysokości obiektu w nocy: tło w fazach zmierzchu, limit wysokości, własny horyzont na torze obiektu,
// Księżyc, kulminacja i południk, pas zachmurzenia i przeciągany kursor czasu.
import { Activity, Clock, Moon, Mountain, Timer } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { bodyAltAz } from '../lib/astro'
import { fmtDate, fmtDuration, fmtTime } from '../lib/format'
import { horizonAltitude } from '../lib/horizon'
import { altitudeTrack, darkWindow, nightGrid, visibility } from '../lib/night'
import { useNight, useSelected, useSite, useTime, useWeather } from '../state/data'
import { useStore } from '../state/store'

const H = 250
const PAD = { l: 44, r: 14, t: 30, b: 34 }
const ALT_MIN = -5
const ALT_MAX = 90

export function AltitudeChart() {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(1200)
  const [hoverT, setHoverT] = useState<number | null>(null)
  const dragging = useRef(false)
  const night = useNight()
  const site = useSite()
  const time = useTime()
  const o = useSelected()
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

  const x = (t: number) => PAD.l + ((t - night.startMs) / (night.endMs - night.startMs)) * (width - PAD.l - PAD.r)
  const y = (alt: number) => PAD.t + ((ALT_MAX - Math.max(ALT_MIN, Math.min(ALT_MAX, alt))) / (ALT_MAX - ALT_MIN)) * (H - PAD.t - PAD.b)
  const tAt = (px: number) => night.startMs + ((px - PAD.l) / (width - PAD.l - PAD.r)) * (night.endMs - night.startMs)

  // Pasma faz nocy.
  const n = night
  const bands: { from: number | null; to: number | null; fill: string; label: string }[] = [
    { from: n.startMs, to: n.sunset, fill: 'url(#g-day-l)', label: 'Dzień' },
    { from: n.sunset, to: n.civilDusk, fill: 'rgba(120, 72, 40, 0.42)', label: 'Zmierzch cywilny' },
    { from: n.civilDusk, to: n.nauticalDusk, fill: 'rgba(44, 46, 78, 0.55)', label: 'żeglarski' },
    { from: n.nauticalDusk, to: n.astroDusk, fill: 'rgba(22, 40, 84, 0.6)', label: 'astronomiczny' },
    { from: n.astroDusk, to: n.astroDawn, fill: 'url(#g-night)', label: 'Noc astronomiczna' },
    { from: n.astroDawn, to: n.nauticalDawn, fill: 'rgba(22, 40, 84, 0.6)', label: '' },
    { from: n.nauticalDawn, to: n.civilDawn, fill: 'rgba(44, 46, 78, 0.55)', label: '' },
    { from: n.civilDawn, to: n.sunrise, fill: 'rgba(120, 72, 40, 0.42)', label: 'Świt' },
    { from: n.sunrise, to: n.endMs, fill: 'url(#g-day-r)', label: 'Dzień' },
  ]
  // Bez nocy astronomicznej: najciemniejsza faza wypełnia środek.
  if (n.astroDusk === null && n.nauticalDusk !== null) bands[4] = { from: n.nauticalDusk, to: n.nauticalDawn, fill: 'rgba(22, 40, 84, 0.6)', label: 'Noc żeglarska (brak astronomicznej)' }

  const hourTicks: number[] = []
  const firstHour = Math.ceil(night.startMs / 3_600_000) * 3_600_000
  for (let t = firstHour; t <= night.endMs; t += 3_600_000) hourTicks.push(t)
  const everyN = width < 700 ? 2 : 1

  const linePath = (pts: { t: number; alt: number }[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.alt).toFixed(1)}`).join('')
  const objPath = linePath(track)
  const areaPath = track.length ? `${objPath}L${x(track[track.length - 1].t)},${y(ALT_MIN)}L${x(track[0].t)},${y(ALT_MIN)}Z` : ''
  // Przeszkody własnego horyzontu na azymucie obiektu w danej chwili.
  const obstaclePath = o && horizon.length
    ? `${linePath(track.map((s) => ({ t: s.t, alt: horizonAltitude(horizon, s.az) })))}L${x(night.endMs)},${y(ALT_MIN)}L${x(night.startMs)},${y(ALT_MIN)}Z`
    : ''

  const cursorT = hoverT ?? time
  const cursorAlt = track.length ? track.reduce((b, s) => (Math.abs(s.t - cursorT) < Math.abs(b.t - cursorT) ? s : b)).alt : null
  const [darkStart, darkEnd] = darkWindow(night)
  const transitIn = vis?.transitMs != null && vis.transitMs >= night.startMs && vis.transitMs <= night.endMs ? vis.transitMs : null
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
        <Activity size={20} /> Widoczność obiektu <span className="sub">— noc {nightLabel}</span>
        <span className="spacer" />
        {o && <span className="sub">{o.id}</span>}
      </h2>
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
            <linearGradient id="g-day-l" x1="0" x2="1"><stop offset="0" stopColor="rgba(150, 90, 40, 0.55)" /><stop offset="1" stopColor="rgba(130, 80, 40, 0.45)" /></linearGradient>
            <linearGradient id="g-day-r" x1="0" x2="1"><stop offset="0" stopColor="rgba(130, 80, 40, 0.45)" /><stop offset="1" stopColor="rgba(150, 90, 40, 0.55)" /></linearGradient>
            <linearGradient id="g-night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="rgba(7, 14, 34, 0.92)" /><stop offset="1" stopColor="rgba(2, 4, 12, 0.96)" /></linearGradient>
            <linearGradient id="g-obj" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="rgba(0, 224, 255, 0.28)" /><stop offset="1" stopColor="rgba(0, 224, 255, 0)" /></linearGradient>
            <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0v6" stroke="rgba(245, 165, 36, 0.45)" strokeWidth="1.5" /></pattern>
            <filter id="glow"><feGaussianBlur stdDeviation="2.2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>

          {bands.map((b, i) =>
            b.from !== null && b.to !== null && b.to > b.from ? (
              <g key={i}>
                <rect x={x(b.from)} y={PAD.t} width={Math.max(0, x(b.to) - x(b.from))} height={H - PAD.t - PAD.b} fill={b.fill} />
                {b.label && x(b.to) - x(b.from) > b.label.length * 6.2 && (
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
                <title>{`${fmtTime(w.t, tz)} — zachmurzenie ${Math.round(w.cloud)}%`}</title>
              </rect>
            ))}

          {/* Limit wysokości. */}
          <line x1={PAD.l} x2={width - PAD.r} y1={y(minAlt)} y2={y(minAlt)} stroke="rgba(245, 165, 36, 0.55)" strokeDasharray="4 5" />
          <text x={width - PAD.r - 4} y={y(minAlt) - 5} textAnchor="end" fill="rgba(245, 165, 36, 0.8)" fontSize="10.5" fontFamily="var(--mono)">limit {minAlt}°</text>

          {obstaclePath && <path d={obstaclePath} fill="url(#hatch)" stroke="rgba(245, 165, 36, 0.6)" strokeWidth="1" />}

          {/* Księżyc. */}
          <path d={linePath(moonTrack)} fill="none" stroke="rgba(220, 225, 235, 0.38)" strokeDasharray="2 4" strokeWidth="1.2" />

          {o && track.length > 0 && (
            <>
              <path d={areaPath} fill="url(#g-obj)" />
              <path d={objPath} fill="none" stroke="#00e0ff" strokeWidth="2" filter="url(#glow)" />
              {transitIn !== null && vis && (
                <g>
                  <line x1={x(transitIn)} x2={x(transitIn)} y1={PAD.t} y2={H - PAD.b} stroke="#f5a524" strokeDasharray="4 4" />
                  <line x1={PAD.l} x2={width - PAD.r} y1={y(vis.transitAlt)} y2={y(vis.transitAlt)} stroke="rgba(200, 210, 230, 0.22)" strokeDasharray="6 6" />
                  <circle cx={x(transitIn)} cy={y(vis.transitAlt)} r="5" fill="#0b0d17" stroke="#00e0ff" strokeWidth="2" />
                  <text x={x(transitIn) + 8} y={PAD.t - 14} fill="#00e0ff" fontSize="12">Kulminacja · południk</text>
                  <text x={x(transitIn) + 8} y={PAD.t - 1} fill="#e6edf7" fontSize="12" fontFamily="var(--mono)">
                    {fmtTime(transitIn, tz)} · {Math.round(vis.transitAlt)}°
                  </text>
                </g>
              )}
            </>
          )}

          {/* Kursor czasu. */}
          <line x1={x(cursorT)} x2={x(cursorT)} y1={PAD.t} y2={H - PAD.b} stroke={hoverT !== null ? 'rgba(255,255,255,0.6)' : '#00e0ff'} strokeWidth="1" />
          {cursorAlt !== null && <circle cx={x(cursorT)} cy={y(cursorAlt)} r="4" fill="#fff" />}
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
          {night.astroDusk !== null ? 'Noc astronomiczna' : 'Najciemniej'} <b>{fmtTime(darkStart, tz)}–{fmtTime(darkEnd, tz)}</b>
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
