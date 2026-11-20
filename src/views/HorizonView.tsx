import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useActionFeedback } from '../components/useActionFeedback'
import { altitudeTrack, nightGrid } from '../lib/night'
import { exportHorizon, horizonAltitude, normalizeHorizon, parseHorizon, type HorizonPoint } from '../lib/horizon'
import { fromPanoramaPoint, readHorizonPanorama, toPanoramaPoint, type PanoramaCalibration } from '../lib/horizonPanorama'
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
  const { feedback, confirm } = useActionFeedback()
  const [draft, setDraft] = useState<HorizonPoint[] | null>(null)
  const [panorama, setPanorama] = useState<Awaited<ReturnType<typeof readHorizonPanorama>> | null>(null)
  const [leftAzDraft, setLeftAzDraft] = useState<string | null>(null)
  const [fovDraft, setFovDraft] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [guideY, setGuideY] = useState<number | null>(null)
  const projected = useMemo(() => panorama && normalizeHorizon(panorama.outline.map((p) => fromPanoramaPoint(p, panorama.calibration))), [panorama])
  const activeHorizon = draft ?? projected ?? horizon
  const chartMin = panorama ? -45 : ALT_MIN
  const clipId = useId()
  const svgRef = useRef<SVGSVGElement>(null)
  const [chartWidth, setChartWidth] = useState(W)
  const pointDrag = useRef<{ points: HorizonPoint[]; index: number } | null>(null)
  const levelDrag = useRef<{ pointerY: number; zeroRow: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const panoramaRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setChartWidth(entry.contentRect.width))
    observer.observe(svgRef.current!)
    return () => observer.disconnect()
  }, [])

  // Keep tick labels at tab size when the SVG viewBox is enlarged.
  const axisFont = `400 ${12 * W / Math.max(W, chartWidth)}px var(--mono)`

  const x = (az: number) => PAD.l + (az / 360) * (W - PAD.l - PAD.r)
  const y = (alt: number) => PAD.t + ((ALT_MAX - alt) / (ALT_MAX - chartMin)) * (H - PAD.t - PAD.b)
  const svgPoint = (e: React.PointerEvent) => new DOMPoint(e.clientX, e.clientY).matrixTransform(svgRef.current!.getScreenCTM()!.inverse())
  const fromSvg = (e: React.PointerEvent): HorizonPoint => {
    const { x: px, y: py } = svgPoint(e)
    const precision = panorama ? 10 : 1
    return {
      azDeg: Math.max(0, Math.min(360 - 1 / precision, Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * 360 * precision) / precision)),
      altDeg: Math.round(Math.max(chartMin, Math.min(ALT_MAX, ALT_MAX - ((py - PAD.t) / (H - PAD.t - PAD.b)) * (ALT_MAX - chartMin))) * precision) / precision,
    }
  }

  const atNorth = horizonAltitude(activeHorizon, 0)
  const profile = `M${x(0)},${y(atNorth)}${activeHorizon.filter((p) => p.azDeg > 0 && p.azDeg < 360).map((p) => `L${x(p.azDeg)},${y(p.altDeg)}`).join('')}L${x(360)},${y(atNorth)}`

  const track = useMemo(() => (o ? altitudeTrack(o, nightGrid(night, site, 10)).filter((s) => s.alt > chartMin) : []), [o, night, site, chartMin])
  const calibrate = (patch: Partial<PanoramaCalibration>) => {
    setMessage('')
    setPanorama((p) => p && { ...p, calibration: { ...p.calibration, ...patch } })
  }
  const editPoints = (points: HorizonPoint[]) => {
    if (panorama) {
      setMessage('')
      setPanorama({ ...panorama, outline: points.map((p) => toPanoramaPoint(p, panorama.calibration)) })
    } else setHorizon(points)
  }
  const beginPoint = (e: React.PointerEvent, points: HorizonPoint[], index: number) => {
    pointDrag.current = { points, index }
    setDraft(points)
    svgRef.current!.setPointerCapture(e.pointerId)
  }
  const addPoint = (e: React.PointerEvent) => {
    if (e.button !== 0 || pointDrag.current || levelDrag.current) return
    const p = fromSvg(e)
    if (panorama) p.altDeg = horizonAltitude(activeHorizon, p.azDeg)
    const points = normalizeHorizon([...activeHorizon, p])
    beginPoint(e, points, points.findIndex((q) => q.azDeg === p.azDeg))
  }
  const levelAt = (e: React.PointerEvent) => {
    const drag = levelDrag.current!
    const height = y(0) - y(panorama!.calibration.verticalFov)
    return Math.max(0, Math.min(1, drag.zeroRow + (svgPoint(e).y - drag.pointerY) / height))
  }

  const zeroY = guideY ?? y(0)
  const imageTop = panorama ? y(panorama.calibration.zeroRow * panorama.calibration.verticalFov) : 0
  const imageHeight = panorama ? y(0) - y(panorama.calibration.verticalFov) : 0

  return (
    <div className="col">
      <section className="card">
        <h2 className="panel-title">
          Mój horyzont <span className="sub">- {location.name}</span>
          <span className="spacer" />
          <span className="sub">{activeHorizon.length ? `${activeHorizon.length} punktów` : 'bez przeszkód'}</span>
        </h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {PRESETS.map((p) => (
            <button key={p.label} className="button small" disabled={!!panorama} onClick={() => setHorizon(normalizeHorizon(p.points))}>{p.label}</button>
          ))}
          <span style={{ flex: 1 }} />
          <button className="button small" onClick={() => panoramaRef.current?.click()} disabled={importing}>{importing ? 'Wczytywanie…' : 'Panorama 360°'}</button>
          <button className="button small" onClick={() => fileRef.current?.click()} disabled={!!panorama}>Import pliku</button>
          <button className="button small" data-confirmed={feedback?.action === 'export' || undefined} onClick={() => {
            download(`horyzont-${location.name.replace(/\s+/g, '-')}.hrz`, exportHorizon(horizon, location.name), 'text/plain')
            confirm('export', 'Rozpoczęto pobieranie profilu horyzontu.')
          }} disabled={horizon.length < 2}>
            Eksport (N.I.N.A.)
          </button>
          <button className="button small" onClick={() => setHorizon([])} disabled={!!panorama || !horizon.length}>Wyczyść</button>
          <input
            ref={panoramaRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            hidden
            onChange={async (e) => {
              const file = e.currentTarget.files?.[0]
              e.currentTarget.value = ''
              if (!file) return
              setImporting(true)
              try {
                setPanorama(await readHorizonPanorama(file))
                setLeftAzDraft(null)
                setFovDraft(null)
                setMessage('')
              } catch {
                setMessage('Nie udało się odczytać panoramy. Wybierz zdjęcie JPG, PNG lub WebP.')
              } finally {
                setImporting(false)
              }
            }}
          />
          <input
            ref={fileRef}
            type="file"
            accept=".hrz,.txt,.csv"
            hidden
            onChange={async (e) => {
              const f = e.currentTarget.files?.[0]
              e.currentTarget.value = ''
              if (!f) return
              if (f.size > 1_048_576) {
                setMessage('Plik horyzontu przekracza limit 1 MB.')
                return
              }
              try {
                const parsed = parseHorizon(await f.text())
                if (parsed.error) setMessage(parsed.error)
                else {
                  setHorizon(parsed.points)
                  setMessage(`Wczytano ${parsed.points.length} punktów${parsed.rejected.length ? `, pominięto linie: ${parsed.rejected.join(', ')}` : ''}.`)
                }
              } catch {
                setMessage('Nie udało się odczytać pliku horyzontu.')
              }
            }}
          />
        </div>
        {panorama && (
          <div style={{ display: 'flex', alignItems: 'end', gap: '8px 12px', flexWrap: 'wrap', marginBottom: 12 }}>
            <label className="field">
              <span className="label">Azymut lewej krawędzi (°)</span>
              <input
                className="control"
                style={{ minHeight: 28 }}
                type="number"
                min="0"
                max="359.9"
                step="0.1"
                value={leftAzDraft ?? String(panorama.calibration.leftAz)}
                onChange={(e) => {
                  const raw = e.currentTarget.value
                  setLeftAzDraft(raw)
                  const value = Number(raw)
                  if (raw.trim() !== '' && Number.isFinite(value) && value >= 0 && value < 360) calibrate({ leftAz: value })
                }}
                onBlur={() => setLeftAzDraft(null)}
              />
            </label>
            <label className="field">
              <span className="label">Pionowe pole widzenia (°)</span>
              <input
                className="control"
                style={{ minHeight: 28 }}
                type="number"
                min="1"
                max="180"
                step="1"
                value={fovDraft ?? String(panorama.calibration.verticalFov)}
                onChange={(e) => {
                  const raw = e.currentTarget.value
                  setFovDraft(raw)
                  const value = Number(raw)
                  if (raw.trim() !== '' && Number.isFinite(value) && value >= 1 && value <= 180) calibrate({ verticalFov: value })
                }}
                onBlur={() => setFovDraft(null)}
              />
            </label>
            <button className="button small active" data-confirmed={feedback?.action === 'save' || undefined} disabled={activeHorizon.length < 2} onClick={() => {
              setHorizon(activeHorizon.map((p) => ({ ...p, altDeg: Math.max(ALT_MIN, Math.min(ALT_MAX, p.altDeg)) })))
              setMessage('Zapisano profil horyzontu.')
              confirm('save', 'Zapisano profil horyzontu.')
            }}>Zapisz profil</button>
            <button className="button small" onClick={() => setPanorama(null)}>Zamknij podgląd</button>
          </div>
        )}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: '100%', display: 'block', touchAction: 'none', userSelect: 'none', cursor: guideY !== null ? 'ns-resize' : panorama ? 'default' : 'crosshair', background: 'linear-gradient(#071226, #0b1f3d)' }}
          onPointerDown={(e) => {
            if (!panorama) addPoint(e)
          }}
          onPointerMove={(e) => {
            if (levelDrag.current && panorama) {
              setGuideY(y((panorama.calibration.zeroRow - levelAt(e)) * panorama.calibration.verticalFov))
              return
            }
            const drag = pointDrag.current
            if (!drag) return
            const p = fromSvg(e)
            const pts = [...drag.points]
            if (pts.some((q, index) => index !== drag.index && q.azDeg === p.azDeg)) return
            pts[drag.index] = p
            setDraft(normalizeHorizon(pts))
          }}
          onPointerUp={(e) => {
            if (levelDrag.current && panorama) calibrate({ zeroRow: levelAt(e) })
            else if (pointDrag.current && draft) editPoints(draft)
            levelDrag.current = null
            pointDrag.current = null
            setGuideY(null)
            setDraft(null)
          }}
          onPointerCancel={() => {
            levelDrag.current = null
            pointDrag.current = null
            setGuideY(null)
            setDraft(null)
          }}
        >
          <defs>
            <clipPath id={clipId}><rect x={x(0)} y={y(ALT_MAX)} width={x(360) - x(0)} height={y(chartMin) - y(ALT_MAX)} /></clipPath>
          </defs>
          {panorama && (
            <g clipPath={`url(#${clipId})`} opacity="0.5" pointerEvents="none">
              {[panorama.calibration.leftAz - 360, panorama.calibration.leftAz].map((start) => (
                <image key={start} href={panorama.url} x={x(start)} y={imageTop} width={x(360) - x(0)} height={imageHeight} preserveAspectRatio="none" />
              ))}
            </g>
          )}
          {(panorama ? [-45, -30, -15, 0, 15, 30, 45, 60, 75, 90] : [0, 15, 30, 45, 60, 75, 90]).map((a) => (
            <g key={a}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(a)} y2={y(a)} stroke="rgba(200,210,230,0.12)" />
              <text x={PAD.l - 8} y={y(a) + 4} fill="rgba(200,210,230,0.7)" textAnchor="end" style={{ font: axisFont }}>{a}°</text>
            </g>
          ))}
          {[0, 45, 90, 135, 180, 225, 270, 315, 360].map((az) => (
            <g key={az}>
              <line x1={x(az)} x2={x(az)} y1={PAD.t} y2={H - PAD.b} stroke="rgba(200,210,230,0.08)" />
              <text x={x(az)} y={H - PAD.b + 18} fill="rgba(200,210,230,0.8)" textAnchor="middle" style={{ font: axisFont }}>
                {({ 0: 'N', 90: 'E', 180: 'S', 270: 'W', 360: 'N' } as Record<number, string>)[az] ?? `${az}°`}
              </text>
            </g>
          ))}
          <line x1={PAD.l} x2={W - PAD.r} y1={y(minAlt)} y2={y(minAlt)} stroke="rgba(245,165,36,0.6)" strokeDasharray="5 5" />
          <g clipPath={`url(#${clipId})`}>
            <path d={`${profile}L${x(360)},${y(chartMin)}L${x(0)},${y(chartMin)}Z`} fill={panorama ? 'rgba(2,4,8,0.18)' : 'rgba(2,4,8,0.85)'} />
            <path d={profile} fill="none" stroke="#f5a524" strokeWidth="1.5" />
            {panorama && <path aria-label="Dodaj punkt na obrysie" d={profile} fill="none" stroke="transparent" strokeWidth="12" pointerEvents="stroke" style={{ cursor: 'crosshair' }} onPointerDown={addPoint} />}
          </g>
          {track.length > 0 && (
            <g pointerEvents="none">
              {track.map((s, i) => {
                const blocked = s.alt < horizonAltitude(activeHorizon, s.az)
                return <circle key={i} cx={x(s.az)} cy={y(s.alt)} r="2.2" fill={blocked ? '#f43f5e' : '#00e0ff'} opacity={s.alt < 0 ? 0.3 : 0.9} />
              })}
              <text x={x(track[0].az) + 6} y={y(track[0].alt) - 6} fill="#00e0ff" style={{ font: axisFont }}>{o?.id}</text>
            </g>
          )}
          {panorama && (
            <g
              transform={`translate(${x(0)},${zeroY})`}
              role="slider"
              aria-label="Poziom 0° na zdjęciu"
              aria-orientation="vertical"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(panorama.calibration.zeroRow * 100)}
              tabIndex={0}
              style={{ cursor: 'ns-resize', outline: guideY === null ? undefined : 'none' }}
              onPointerDown={(e) => {
                if (e.button !== 0 || pointDrag.current || levelDrag.current) return
                e.preventDefault()
                levelDrag.current = { pointerY: svgPoint(e).y, zeroRow: panorama.calibration.zeroRow }
                setGuideY(y(0))
                svgRef.current!.setPointerCapture(e.pointerId)
              }}
              onKeyDown={(e) => {
                if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
                e.preventDefault()
                const shift = e.key === 'ArrowUp' ? -0.01 : 0.01
                calibrate({ zeroRow: Math.max(0, Math.min(1, panorama.calibration.zeroRow + shift)) })
              }}
            >
              <title>Przeciągnij linię, aby wskazać poziom 0° na zdjęciu</title>
              <line x2={x(360) - x(0)} stroke="transparent" strokeWidth="12" pointerEvents="stroke" />
              <line x2={x(360) - x(0)} stroke="#e4eeff" strokeWidth="1.2" strokeDasharray="5 5" pointerEvents="none" />
            </g>
          )}
          {activeHorizon.filter((p) => p.altDeg >= chartMin && p.altDeg <= ALT_MAX).map((p) => (
            <circle
              key={p.azDeg}
              cx={x(p.azDeg)}
              cy={y(p.altDeg)}
              r={panorama ? 3 : 6}
              fill="#0a222e"
              stroke="#00e0ff"
              strokeWidth="2"
              style={{ cursor: 'grab' }}
              onPointerDown={(e) => {
                e.stopPropagation()
                if (e.button === 0 && !pointDrag.current && !levelDrag.current) beginPoint(e, activeHorizon, activeHorizon.indexOf(p))
              }}
              onContextMenu={(e) => {
                e.preventDefault()
                editPoints(activeHorizon.filter((q) => q !== p))
              }}
            >
              <title>{`Az ${p.azDeg}°, wysokość ${p.altDeg.toFixed(2)}°; prawy klik usuwa`}</title>
            </circle>
          ))}
        </svg>
        <p className="dim" style={{ fontSize: 12, marginTop: 10 }}>
          {panorama
            ? 'Przeciągnij białą linię, aby ustawić poziom 0° na zdjęciu. Przyjęto pełny obrót 360° i oszacowano pole pionowe z proporcji zdjęcia. Kliknij pomarańczową linię, aby dodać punkt. Przeciągnij punkt, aby poprawić obrys, lub usuń go prawym przyciskiem.'
            : 'Kliknij, aby dodać punkt; przeciągnij, aby przesunąć; prawy klik usuwa. Między punktami horyzont jest interpolowany liniowo (także przez N). Kropki to tor wybranego obiektu tej nocy: czerwone są zasłonięte. Plik: pary „azymut wysokość” w stopniach, jak w N.I.N.A.'}
        </p>
        <p className="dim" style={{ fontSize: 12, marginTop: 8 }}>
          Do wykonania zdjęcia panoramicznego 360° użyj aplikacji{' '}
          <strong><a href="https://360cam.stanford.edu/" target="_blank" rel="noopener noreferrer">VFT Photosphere Camera</a></strong>.
        </p>
        {message && <div className="accent mono" style={{ fontSize: 12 }}>{message}</div>}
        <span className="action-status" role="status">{feedback?.message}</span>
      </section>
    </div>
  )
}
