import { useId } from 'react'

// Tarcza w układzie build-moon-phases.ts (512 px), żeby rozmycie i zanik brzegu pasowały do tekstury z tego skryptu.
const SIZE = 512
const C = SIZE / 2
const R = SIZE / 2 - 1
const SHADOW_R = R + 1

// Oświetlony obszar wychodzi poza tarczę, żeby rozmycie miękczyło tylko terminator, a nie brzeg przy biegunach.
const OUTER_R = SHADOW_R + 48

/** Obszar oświetlony: łuk po stronie Słońca poza tarczą i elipsa terminatora o półosi |cos(kąta fazy)| = |1 − 2k|. */
export function moonLitPath(illumination: number, waxing: boolean) {
  const k = Math.max(0, Math.min(1, illumination))
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
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={size} height={size} x={x} y={y} role="img" aria-label={label} style={{ display: 'block', flex: 'none' }}>
      <title>{label}</title>
      <defs>
        <filter id={`${id}s`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="8" /></filter>
        {/* Część nieoświetlona: cała tarcza bez rozmytego obszaru oświetlonego. */}
        <mask id={`${id}u`}>
          <circle cx={C} cy={C} r={SHADOW_R} fill="white" />
          <path d={moonLitPath(illumination, waxing)} fill="black" filter={`url(#${id}s)`} />
        </mask>
        <radialGradient id={`${id}g`} cx={C} cy={C} r={R} gradientUnits="userSpaceOnUse">
          <stop offset={(R - 8) / R} stopColor="black" stopOpacity="0" />
          <stop offset="1" stopColor="black" stopOpacity="1" />
        </radialGradient>
        {/* Ciemny brzeg łagodnie przechodzi w tło po stronie cienia; wąski pas, żeby nie zmniejszał tarczy. */}
        <mask id={`${id}f`}>
          <rect width={SIZE} height={SIZE} fill="white" />
          <circle cx={C} cy={C} r={SHADOW_R} fill={`url(#${id}g)`} mask={`url(#${id}u)`} />
        </mask>
      </defs>
      <g mask={`url(#${id}f)`}>
        <image href="/icons/moon-phases/moon-full.webp" width={SIZE} height={SIZE} />
        <circle cx={C} cy={C} r={SHADOW_R} fill="#04060c" opacity="0.98" mask={`url(#${id}u)`} />
      </g>
    </svg>
  )
}
