// Kadrowanie: zdjęcie DSS2 wokół obiektu w rzucie TAN i prostokąt matrycy z obrotem (PA od N przez E).
import { Crosshair, Plus, RotateCw } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { computeOptics } from '../lib/astro'
import { fmtDec, fmtNum, fmtRa } from '../lib/format'
import { frameCorners, gnomonic, gnomonicInverse, pixelToTangent, tangentToPixel } from '../lib/framing'
import { getSkyImage } from '../lib/thumbs'
import { useSelected } from '../state/data'
import { useStore } from '../state/store'

const SIZE = 800

export function FramingPanel() {
  const o = useSelected()
  const eq = useStore((s) => s.equipment)
  const framing = useStore((s) => s.framing)
  const setFraming = useStore((s) => s.setFraming)
  const addToPlan = useStore((s) => s.addToPlan)
  const updatePlan = useStore((s) => s.updatePlan)
  const plan = useStore((s) => s.plan)
  const [layer, setLayer] = useState<'red' | 'color'>('red')
  const [img, setImg] = useState<{ key: string; url: string } | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const svgRef = useRef<SVGSVGElement>(null)
  const drag = useRef<{ kind: 'move' | 'rotate'; startX: number; startY: number; startCenter: { xi: number; eta: number }; startPa: number } | null>(null)

  const optics = useMemo(
    () => computeOptics({ apertureMm: eq.apertureMm, focalLengthMm: eq.focalLengthMm, reducer: eq.reducer, widthPx: eq.widthPx, heightPx: eq.heightPx, pixelUm: eq.pixelUm, binning: eq.binning }),
    [eq],
  )
  const diag = Math.hypot(optics.fovWdeg, optics.fovHdeg)
  const objDeg = o ? o.majArcmin / 60 : 0
  const baseFov = Math.min(30, Math.max(0.3, diag * 1.6, objDeg * 1.4))
  const imageFov = Math.round((baseFov / zoom) * 1000) / 1000
  const imageKey = o ? `${o.i}:${imageFov}:${layer}` : ''

  useEffect(() => {
    if (!o) return
    const ctrl = new AbortController()
    setErr(null)
    getSkyImage(o.raDeg, o.decDeg, imageFov, SIZE, ctrl.signal, layer === 'red' ? 'CDS/P/DSS2/red' : 'CDS/P/DSS2/color')
      .then((url) => setImg({ key: imageKey, url }))
      .catch((e: Error) => e.name !== 'AbortError' && setErr('Nie udało się pobrać zdjęcia (CDS hips2fits)'))
    return () => ctrl.abort()
  }, [o, imageFov, layer, imageKey])

  if (!o) return <div className="sky-stage empty" style={{ display: 'grid', placeItems: 'center' }}>Wybierz obiekt, aby kadrować.</div>

  const center = { raDeg: framing.raDeg ?? o.raDeg, decDeg: framing.decDeg ?? o.decDeg }
  const offset = gnomonic(o, center)
  const corners = frameCorners(offset, optics.fovWdeg, optics.fovHdeg, framing.paDeg).map((c) => tangentToPixel(c, imageFov, SIZE))
  const centerPx = tangentToPixel(offset, imageFov, SIZE)
  const topMid: [number, number] = [(corners[0][0] + corners[1][0]) / 2, (corners[0][1] + corners[1][1]) / 2]
  const handle: [number, number] = [topMid[0] + (topMid[0] - centerPx[0]) * 0.18, topMid[1] + (topMid[1] - centerPx[1]) * 0.18]
  const ratio = objDeg / Math.max(optics.fovWdeg, optics.fovHdeg)
  const coverage = ratio > 1 ? `większy niż kadr (mozaika ×${Math.ceil(ratio)})` : `${Math.round(ratio * 100)}% boku`
  const planItem = plan.find((p) => p.objectIndex === o.i)

  const toSvg = (e: React.PointerEvent) => {
    const r = svgRef.current!.getBoundingClientRect()
    return [((e.clientX - r.left) / r.width) * SIZE, ((e.clientY - r.top) / r.height) * SIZE] as [number, number]
  }
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const [px, py] = toSvg(e)
    if (d.kind === 'move') {
      const start = tangentToPixel(d.startCenter, imageFov, SIZE)
      const t = pixelToTangent(start[0] + px - d.startX, start[1] + py - d.startY, imageFov, SIZE)
      const c = gnomonicInverse(o, t)
      setFraming({ raDeg: c.raDeg, decDeg: c.decDeg })
    } else {
      // Kąt od „góry” (N) przeciwnie do ruchu wskazówek na obrazie (E po lewej): PA rośnie ku E.
      const ang = Math.atan2(-(px - centerPx[0]), -(py - centerPx[1])) * (180 / Math.PI)
      setFraming({ paDeg: Math.round(((ang % 360) + 360) % 360) })
    }
  }

  return (
    <div className="sky-stage" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 230px', background: '#000' }}>
      <div style={{ position: 'relative', display: 'grid', placeItems: 'center', overflow: 'hidden', padding: 12 }}>
        <div style={{ position: 'relative', height: '100%', aspectRatio: '1', maxWidth: '100%' }}>
          {img?.key === imageKey ? (
            <img src={img.url} alt={`${o.id} — DSS2`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', filter: layer === 'red' ? 'grayscale(1) contrast(1.15)' : undefined, animation: 'fade-in .5s' }} />
          ) : (
            <div className="thumb" style={{ position: 'absolute', inset: 0 }}>
              <div className="ph">{err ?? 'POBIERANIE ZDJĘCIA'}</div>
            </div>
          )}
          <svg
            ref={svgRef}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', touchAction: 'none' }}
            onPointerMove={onMove}
            onPointerUp={() => (drag.current = null)}
            onPointerLeave={() => (drag.current = null)}
          >
            <g stroke="rgba(255,255,255,0.25)" strokeWidth="1">
              <path d={`M${SIZE / 2 - 10} ${SIZE / 2}h20M${SIZE / 2} ${SIZE / 2 - 10}v20`} />
            </g>
            <polygon
              points={corners.map((c) => c.join(',')).join(' ')}
              fill="rgba(0,224,255,0.06)"
              stroke="#00e0ff"
              strokeWidth="2.5"
              style={{ cursor: 'move', filter: 'drop-shadow(0 0 6px rgba(0,224,255,0.6))' }}
              onPointerDown={(e) => {
                ;(e.target as Element).setPointerCapture(e.pointerId)
                const [x, y] = toSvg(e)
                drag.current = { kind: 'move', startX: x, startY: y, startCenter: offset, startPa: framing.paDeg }
              }}
            />
            <line x1={topMid[0]} y1={topMid[1]} x2={handle[0]} y2={handle[1]} stroke="#00e0ff" strokeWidth="2" />
            <circle
              cx={handle[0]}
              cy={handle[1]}
              r="14"
              fill="#0a222e"
              stroke="#00e0ff"
              strokeWidth="2"
              style={{ cursor: 'grab' }}
              onPointerDown={(e) => {
                ;(e.target as Element).setPointerCapture(e.pointerId)
                const [x, y] = toSvg(e)
                drag.current = { kind: 'rotate', startX: x, startY: y, startCenter: offset, startPa: framing.paDeg }
              }}
            />
            <circle cx={centerPx[0]} cy={centerPx[1]} r="4" fill="#00e0ff" />
            <text x="18" y="34" fill="#fff" fontSize="22" fontFamily="var(--mono)">N ↑</text>
            <text x="18" y="62" fill="#fff" fontSize="22" fontFamily="var(--mono)">← E</text>
            <text x={SIZE - 18} y={SIZE - 20} fill="rgba(255,255,255,0.6)" fontSize="18" textAnchor="end" fontFamily="var(--mono)">
              pole zdjęcia {fmtNum(imageFov, 2)}° · DSS2 {layer === 'red' ? 'czerwony' : 'kolor'} · CDS hips2fits
            </text>
          </svg>
        </div>
      </div>
      <div style={{ borderLeft: '1px solid var(--border)', padding: 14, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
        <div className="label">Kadr</div>
        <div className="stat"><div className="label">Pole widzenia</div><div className="v" style={{ fontSize: 15 }}>{fmtNum(optics.fovWdeg, 2)}° × {fmtNum(optics.fovHdeg, 2)}°</div></div>
        <div className="stat"><div className="label">Obiekt w kadrze</div><div className="v" style={{ fontSize: 15 }}>{coverage}</div></div>
        <div className="field">
          <span className="label">Kąt pozycyjny (PA)</span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="range" min={0} max={359} value={framing.paDeg} onChange={(e) => setFraming({ paDeg: Number(e.target.value) })} style={{ flex: 1 }} />
            <input className="control figures" style={{ width: 64 }} type="number" min={0} max={359} value={framing.paDeg} onChange={(e) => setFraming({ paDeg: ((Number(e.target.value) % 360) + 360) % 360 })} />
          </div>
        </div>
        <div className="field">
          <span className="label">Środek kadru (J2000)</span>
          <span className="mono" style={{ fontSize: 12.5 }}>RA {fmtRa(center.raDeg)}</span>
          <span className="mono" style={{ fontSize: 12.5 }}>Dec {fmtDec(center.decDeg)}</span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button className="button small" onClick={() => setFraming({ raDeg: null, decDeg: null })}><Crosshair size={13} /> Wyśrodkuj</button>
          <button className="button small" onClick={() => setFraming({ paDeg: (framing.paDeg + 90) % 360 })}><RotateCw size={13} /> +90°</button>
        </div>
        <div className="field">
          <span className="label">Warstwa</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className={`toggle-chip${layer === 'red' ? ' on' : ''}`} onClick={() => setLayer('red')}>Czarno-biała</button>
            <button className={`toggle-chip${layer === 'color' ? ' on' : ''}`} onClick={() => setLayer('color')}>Kolor</button>
          </div>
        </div>
        <div className="field">
          <span className="label">Powiększenie zdjęcia</span>
          <input type="range" min={0.5} max={4} step={0.1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
        </div>
        <button
          className="button primary"
          onClick={() => {
            if (planItem) updatePlan(planItem.key, { framing })
            else addToPlan(o.i, o.id)
          }}
        >
          <Plus size={14} /> {planItem ? 'Zapisz kadr w planie' : 'Dodaj do planu'}
        </button>
        <p className="dim" style={{ fontSize: 11.5, margin: 0 }}>Przeciągnij prostokąt, aby przesunąć kadr; uchwyt nad kadrem obraca go. Powiększenie zmienia suwak.</p>
      </div>
    </div>
  )
}
