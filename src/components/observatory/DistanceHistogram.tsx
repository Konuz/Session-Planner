import { useRef, useState } from 'react'
import { depthFraction, distanceAt, type Histogram, type LogDomain } from '../../lib/observatory'
import { fmtDistance } from '../../lib/format'

interface Props {
  histogram: Histogram
  domain: LogDomain
  range: [number, number] | null
  onRange(range: [number, number] | null): void
  /** Odległość zaznaczonego obiektu (znacznik nad histogramem). */
  marker: number | null
}

const STEPS = 1000

/** Rozkład odległości w skali log.; przeciągnięcie wybiera przedział, dwuklik go usuwa. Suwaki „od/do” dla klawiatury. */
export function DistanceHistogram({ histogram, domain, range, onRange, marker }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState<number | null>(null)
  const max = Math.max(1, ...histogram.counts)
  const bins = histogram.counts.length
  const [lo, hi] = range ? [depthFraction(range[0], domain), depthFraction(range[1], domain)] : [0, 1]
  const fraction = (clientX: number) => {
    const rect = svgRef.current!.getBoundingClientRect()
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  }
  const select = (a: number, b: number) => onRange([distanceAt(Math.min(a, b), domain), distanceAt(Math.max(a, b), domain)])

  return <div className="obs-histogram">
    <div className="obs-histogram-head">
      <span className="label">Rozkład odległości</span>
      <span className="faint">{range ? `${fmtDistance(range[0])} – ${fmtDistance(range[1])} · dwuklik: cały zakres` : 'bliżej → dalej · przeciągnij, aby wybrać przedział'}</span>
    </div>
    <svg ref={svgRef} viewBox={`0 0 ${bins} 40`} preserveAspectRatio="none" aria-hidden="true"
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setDrag(fraction(e.clientX)) }}
      onPointerMove={(e) => { if (drag !== null && Math.abs(fraction(e.clientX) - drag) > 0.005) select(drag, fraction(e.clientX)) }}
      onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)}
      onDoubleClick={() => onRange(null)}>
      {histogram.counts.map((count, i) => count > 0 && <rect key={i} className={(i + 0.5) / bins >= lo && (i + 0.5) / bins <= hi ? 'on' : ''} x={i + 0.12} width={0.76} y={40 - Math.max(3, count / max * 36)} height={Math.max(3, count / max * 36)} />)}
      {marker !== null && <line className="obs-histogram-marker" x1={depthFraction(marker, domain) * bins} x2={depthFraction(marker, domain) * bins} y1={0} y2={40} />}
    </svg>
    <div className="obs-histogram-scale figures"><span>{fmtDistance(domain.minLy)}</span><span>{fmtDistance(domain.maxLy)}</span></div>
    <div className="obs-range-inputs">
      <input type="range" min={0} max={STEPS} value={Math.round(lo * STEPS)} aria-label="Zakres odległości: od" aria-valuetext={fmtDistance(distanceAt(lo, domain))}
        onChange={(e) => select(Math.min(Number(e.target.value) / STEPS, hi), hi)} />
      <input type="range" min={0} max={STEPS} value={Math.round(hi * STEPS)} aria-label="Zakres odległości: do" aria-valuetext={fmtDistance(distanceAt(hi, domain))}
        onChange={(e) => select(lo, Math.max(Number(e.target.value) / STEPS, lo))} />
    </div>
  </div>
}
