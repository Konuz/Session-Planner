import { moonPhasePath } from './moonPhase'

interface GlyphProps {
  cx: number
  cy: number
  r: number
  illuminatedFraction: number
  waxing: boolean
}

/** Tarcza Księżyca z oświetloną częścią, do osadzenia w wykresie SVG. */
export function MoonPhaseGlyph({ cx, cy, r, illuminatedFraction, waxing }: GlyphProps) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} className="fill-background stroke-muted" strokeWidth={1} />
      <path d={moonPhasePath(cx, cy, r, illuminatedFraction, waxing)} className="fill-foreground" />
    </g>
  )
}

export function MoonPhaseIcon({ size, illuminatedFraction, waxing, label }: Omit<GlyphProps, 'cx' | 'cy' | 'r'> & { size: number; label: string }) {
  const r = size / 2 - 1
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} className="inline-block shrink-0">
      <MoonPhaseGlyph cx={size / 2} cy={size / 2} r={r} illuminatedFraction={illuminatedFraction} waxing={waxing} />
    </svg>
  )
}
