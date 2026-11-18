import { useId } from 'react'

// Środek i promień tarczy odpowiadają teksturze z build-moon-phases.ts.
const SIZE = 512
const C = SIZE / 2
const R = SIZE / 2 - 1
const SHADOW_R = R + 1
const TEXTURE = `${import.meta.env.BASE_URL}icons/moon-phases/moon-full.webp`

// Oświetlony obszar wychodzi poza tarczę, żeby rozmycie miękczyło tylko terminator, a nie brzeg przy biegunach.
const OUTER_R = SHADOW_R + 48

/** Obszar oświetlony: łuk po stronie Słońca poza tarczą i elipsa terminatora o półosi |cos(kąta fazy)| = |1 − 2k|. */
export function moonLitPath(illumination: number, waxing: boolean) {
  const k = Math.max(0, Math.min(1, illumination))
  if (k === 0) return ''
  const lit = waxing ? 1 : 0
  const rx = Math.abs(1 - 2 * k) * R
  const terminatorSweep = k > 0.5 ? lit : 1 - lit
  return `M ${C} ${C - OUTER_R} A ${OUTER_R} ${OUTER_R} 0 0 ${lit} ${C} ${C + OUTER_R} L ${C} ${C + SHADOW_R} A ${rx} ${SHADOW_R} 0 0 ${terminatorSweep} ${C} ${C - SHADOW_R} Z`
}

export function MoonDisc({ illumination, waxing, phaseName, size = 72, x, y }: {
  illumination: number
  waxing: boolean
  phaseName: string
  size?: number
  /** Położenie, gdy tarcza jest zagnieżdżona w innym SVG. */
  x?: number
  y?: number
}) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const label = `Księżyc: ${phaseName}`
  const shadowed = illumination < 1
  const litPath = moonLitPath(illumination, waxing)
  const softness = Math.min(5, Math.min(illumination, 1 - illumination) * R)
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={size} height={size} x={x} y={y} role="img" aria-label={label} style={{ display: 'block', flex: 'none' }}>
      <title>{label}</title>
      {shadowed && <>
        <defs>
          <filter id={`${id}s`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={softness} /></filter>
          <mask id={`${id}l`}>
            <rect width={SIZE} height={SIZE} fill="#141414" />
            {litPath && <path d={litPath} fill="white" filter={`url(#${id}s)`} />}
          </mask>
          <radialGradient id={`${id}g`}>
            <stop offset="0.94" stopColor="#04060c" />
            <stop offset="1" stopColor="#04060c" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx={C} cy={C} r={R} fill={`url(#${id}g)`} />
      </>}
      <image href={TEXTURE} width={SIZE} height={SIZE} mask={shadowed ? `url(#${id}l)` : undefined} />
    </svg>
  )
}
