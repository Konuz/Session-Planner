import { useId, useMemo, useRef, useState } from 'react'
import { HISTOGRAM_BOTTOM, HISTOGRAM_HEIGHT, HISTOGRAM_TOP, depthFraction, distanceAt, histogramCurve, type Histogram, type LogDomain } from '../../lib/observatory'
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
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const gradId = `${uid}-grad`
  const fadeId = `${uid}-fade`

  const bins = histogram.counts.length
  const curve = useMemo(() => histogramCurve(histogram.counts), [histogram.counts])
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
    <svg ref={svgRef} viewBox={`0 0 ${bins} ${HISTOGRAM_HEIGHT}`} preserveAspectRatio="none" aria-hidden="true"
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setDrag(fraction(e.clientX)) }}
      onPointerMove={(e) => { if (drag !== null && Math.abs(fraction(e.clientX) - drag) > 0.005) select(drag, fraction(e.clientX)) }}
      onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)}
      onDoubleClick={() => onRange(null)}>
      <defs>
        <linearGradient id={gradId} x1={0} y1={0} x2={bins} y2={0} gradientUnits="userSpaceOnUse">
          {curve.stops.map((s, i) => <stop key={i} offset={`${(s.offset * 100).toFixed(2)}%`} style={{ stopColor: s.color }} />)}
        </linearGradient>
        <linearGradient id={fadeId} x1={0} y1={HISTOGRAM_TOP} x2={0} y2={HISTOGRAM_BOTTOM} gradientUnits="userSpaceOnUse">
          <stop offset="0%" style={{ stopColor: 'var(--bg-deep)' }} stopOpacity={0.18} />
          <stop offset="68%" style={{ stopColor: 'var(--bg-deep)' }} stopOpacity={0.52} />
          <stop offset="100%" style={{ stopColor: 'var(--bg-deep)' }} stopOpacity={0.78} />
        </linearGradient>
      </defs>
      <line className="obs-histogram-base" x1={0} x2={bins} y1={HISTOGRAM_BOTTOM} y2={HISTOGRAM_BOTTOM} vectorEffect="non-scaling-stroke" />
      {curve.linePath && <>
        <path d={curve.areaPath} fill={`url(#${gradId})`} />
        <path d={curve.areaPath} fill={`url(#${fadeId})`} />
        <path className="obs-histogram-line" d={curve.linePath} stroke={`url(#${gradId})`} vectorEffect="non-scaling-stroke" />
      </>}
      {range && <>
        <rect className="obs-histogram-scrim" x={0} y={0} width={Math.max(0, lo * bins)} height={HISTOGRAM_HEIGHT} />
        <rect className="obs-histogram-scrim" x={hi * bins} y={0} width={Math.max(0, (1 - hi) * bins)} height={HISTOGRAM_HEIGHT} />
        <line className="obs-histogram-bound" x1={lo * bins} x2={lo * bins} y1={0} y2={HISTOGRAM_HEIGHT} vectorEffect="non-scaling-stroke" />
        <line className="obs-histogram-bound" x1={hi * bins} x2={hi * bins} y1={0} y2={HISTOGRAM_HEIGHT} vectorEffect="non-scaling-stroke" />
      </>}
      {marker !== null && <line className="obs-histogram-marker" x1={depthFraction(marker, domain) * bins} x2={depthFraction(marker, domain) * bins} y1={0} y2={HISTOGRAM_HEIGHT} vectorEffect="non-scaling-stroke" />}
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
