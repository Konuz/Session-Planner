import { Download, Mountain, Trash2, Upload } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { altitudeTrack, nightGrid } from '../lib/night'
import { exportHorizon, horizonAltitude, normalizeHorizon, parseHorizon, type HorizonPoint } from '../lib/horizon'
import { download } from '../lib/nina'
import { useNight, useSelected, useSite } from '../state/data'
import { useStore } from '../state/store'

const W = 1100
const H = 380
const PAD = { l: 44, r: 16, t: 16, b: 34 }
const ALT_MAX = 90
const ALT_MIN = -5

const PRESETS: { label: string; points: HorizonPoint[] }[] = [
  { label: 'Bez przeszkód', points: [] },
  { label: 'Płaski 10°', points: [{ azDeg: 0, altDeg: 10 }, { azDeg: 180, altDeg: 10 }] },
  { label: 'Ogród (przykład)', points: [{ azDeg: 0, altDeg: 22 }, { azDeg: 40, altDeg: 30 }, { azDeg: 80, altDeg: 14 }, { azDeg: 130, altDeg: 8 }, { azDeg: 180, altDeg: 6 }, { azDeg: 230, altDeg: 12 }, { azDeg: 275, altDeg: 25 }, { azDeg: 320, altDeg: 18 }] },
]

export default function HorizonView() {
  const horizon = useStore((s) => s.horizon)
  const setHorizon = useStore((s) => s.setHorizon)
  const minAlt = useStore((s) => s.minAltDeg)
  const location = useStore((s) => s.location)
  const o = useSelected()
  const night = useNight()
  const site = useSite()
  const [message, setMessage] = useState('')
  const svgRef = useRef<SVGSVGElement>(null)
  const dragIndex = useRef<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const x = (az: number) => PAD.l + (az / 360) * (W - PAD.l - PAD.r)
  const y = (alt: number) => PAD.t + ((ALT_MAX - alt) / (ALT_MAX - ALT_MIN)) * (H - PAD.t - PAD.b)
  const fromSvg = (e: React.PointerEvent | React.MouseEvent) => {
    const r = svgRef.current!.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * W
    const py = ((e.clientY - r.top) / r.height) * H
    return {
      azDeg: Math.round(Math.max(0, Math.min(359.9, ((px - PAD.l) / (W - PAD.l - PAD.r)) * 360))),
      altDeg: Math.round(Math.max(ALT_MIN, Math.min(ALT_MAX, ALT_MAX - ((py - PAD.t) / (H - PAD.t - PAD.b)) * (ALT_MAX - ALT_MIN)))),
    }
  }

  const profile = useMemo(() => {
    const pts: string[] = []
    for (let az = 0; az <= 360; az += 1) pts.push(`${x(az).toFixed(1)},${y(horizonAltitude(horizon, az)).toFixed(1)}`)
    return `M${x(0)},${y(ALT_MIN)}L${pts.join('L')}L${x(360)},${y(ALT_MIN)}Z`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horizon])

  const track = useMemo(() => (o ? altitudeTrack(o, nightGrid(night, site, 10)).filter((s) => s.alt > ALT_MIN) : []), [o, night, site])

  return (
    <div className="col">
      <section className="card">
        <h2 className="panel-title">
          <Mountain size={20} /> Mój horyzont <span className="sub">— {location.name}</span>
          <span className="spacer" />
          <span className="sub">{horizon.length ? `${horizon.length} punktów` : 'bez przeszkód'}</span>
        </h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {PRESETS.map((p) => (
            <button key={p.label} className="button small" onClick={() => setHorizon(normalizeHorizon(p.points))}>{p.label}</button>
          ))}
          <span style={{ flex: 1 }} />
          <button className="button small" onClick={() => fileRef.current?.click()}><Upload size={13} /> Import pliku</button>
          <button className="button small" onClick={() => download(`horyzont-${location.name.replace(/\s+/g, '-')}.hrz`, exportHorizon(horizon, location.name), 'text/plain')} disabled={horizon.length < 2}>
            <Download size={13} /> Eksport (N.I.N.A.)
          </button>
          <button className="button small" onClick={() => setHorizon([])} disabled={!horizon.length}><Trash2 size={13} /> Wyczyść</button>
          <input
            ref={fileRef}
            type="file"
            accept=".hrz,.txt,.csv"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0]
              if (!f) return
              const parsed = parseHorizon(await f.text())
              if (parsed.error) setMessage(parsed.error)
              else {
                setHorizon(parsed.points)
                setMessage(`Wczytano ${parsed.points.length} punktów${parsed.rejected.length ? `, pominięto linie: ${parsed.rejected.join(', ')}` : ''}.`)
              }
              e.target.value = ''
            }}
          />
        </div>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: '100%', display: 'block', touchAction: 'none', cursor: 'crosshair', background: 'linear-gradient(#071226, #0b1f3d)' }}
          onPointerDown={(e) => {
            if (e.button !== 0 || dragIndex.current !== null) return
            const p = fromSvg(e)
            const next = normalizeHorizon([...horizon, p])
            setHorizon(next)
            dragIndex.current = next.findIndex((q) => q.azDeg === p.azDeg)
            svgRef.current!.setPointerCapture(e.pointerId)
          }}
          onPointerMove={(e) => {
            if (dragIndex.current === null) return
            const p = fromSvg(e)
            const pts = [...horizon]
            pts[dragIndex.current] = p
            const next = normalizeHorizon(pts)
            dragIndex.current = next.findIndex((q) => q.azDeg === p.azDeg)
            setHorizon(next)
          }}
          onPointerUp={() => (dragIndex.current = null)}
        >
          {[0, 15, 30, 45, 60, 75, 90].map((a) => (
            <g key={a}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(a)} y2={y(a)} stroke="rgba(200,210,230,0.12)" />
              <text x={PAD.l - 8} y={y(a) + 4} fill="rgba(200,210,230,0.7)" fontSize="11" textAnchor="end" fontFamily="var(--mono)">{a}°</text>
            </g>
          ))}
          {[0, 45, 90, 135, 180, 225, 270, 315, 360].map((az) => (
            <g key={az}>
              <line x1={x(az)} x2={x(az)} y1={PAD.t} y2={H - PAD.b} stroke="rgba(200,210,230,0.08)" />
              <text x={x(az)} y={H - PAD.b + 18} fill="rgba(200,210,230,0.8)" fontSize="12" textAnchor="middle" fontFamily="var(--mono)">
                {({ 0: 'N', 90: 'E', 180: 'S', 270: 'W', 360: 'N' } as Record<number, string>)[az] ?? `${az}°`}
              </text>
            </g>
          ))}
          <line x1={PAD.l} x2={W - PAD.r} y1={y(minAlt)} y2={y(minAlt)} stroke="rgba(245,165,36,0.6)" strokeDasharray="5 5" />
          <path d={profile} fill="rgba(2,4,8,0.85)" />
          <path d={profile.replace(/^M[^L]*L/, 'M').replace(/L[^L]*Z$/, '')} fill="none" stroke="#f5a524" strokeWidth="1.5" />
          {track.length > 0 && (
            <g>
              {track.map((s, i) => {
                const blocked = s.alt < horizonAltitude(horizon, s.az)
                return <circle key={i} cx={x(s.az)} cy={y(s.alt)} r="2.2" fill={blocked ? '#f43f5e' : '#00e0ff'} opacity={s.alt < 0 ? 0.3 : 0.9} />
              })}
              <text x={x(track[0].az) + 6} y={y(track[0].alt) - 6} fill="#00e0ff" fontSize="12" fontFamily="var(--mono)">{o?.id}</text>
            </g>
          )}
          {horizon.map((p, i) => (
            <circle
              key={`${p.azDeg}-${i}`}
              cx={x(p.azDeg)}
              cy={y(p.altDeg)}
              r="6"
              fill="#0a222e"
              stroke="#00e0ff"
              strokeWidth="2"
              style={{ cursor: 'grab' }}
              onPointerDown={(e) => {
                e.stopPropagation()
                dragIndex.current = i
                svgRef.current!.setPointerCapture(e.pointerId)
              }}
              onContextMenu={(e) => {
                e.preventDefault()
                setHorizon(horizon.filter((_, k) => k !== i))
              }}
            >
              <title>{`Az ${p.azDeg}°, wysokość ${p.altDeg}° — prawy klik usuwa`}</title>
            </circle>
          ))}
        </svg>
        <p className="dim" style={{ fontSize: 12, marginTop: 10 }}>
          Kliknij, aby dodać punkt; przeciągnij, aby przesunąć; prawy klik usuwa. Między punktami horyzont jest interpolowany liniowo (także przez N). Kropki to tor wybranego obiektu tej nocy: czerwone są zasłonięte. Plik: pary „azymut wysokość” w stopniach, jak w N.I.N.A.
        </p>
        {message && <div className="accent mono" style={{ fontSize: 12 }}>{message}</div>}
      </section>
    </div>
  )
}
