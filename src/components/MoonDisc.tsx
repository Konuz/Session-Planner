import { useId } from 'react'

/**
 * Tarcza Księżyca ze zdjęcia z nałożoną fazą (półkula N: przybywający oświetlony z prawej).
 * Dla ubywającego zdjęcie jest odbite, żeby jego cieniowanie zgadzało się ze stroną oświetloną.
 */
export function MoonDisc({ illumination, waxing, size = 72 }: { illumination: number; waxing: boolean; size?: number }) {
  const id = 'moon' + useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const r = size / 2 - 1
  const c = size / 2
  const rx = Math.abs(1 - 2 * illumination) * r
  const lit = waxing ? 1 : 0
  // Oświetlona półtarcza + elipsa terminatora (wybrzuszona dla garbu, wklęsła dla sierpu).
  const gibbous = illumination > 0.5
  const path = `M ${c} ${c - r} A ${r} ${r} 0 0 ${lit} ${c} ${c + r} A ${rx} ${r} 0 0 ${gibbous ? lit : 1 - lit} ${c} ${c - r} Z`
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Księżyc oświetlony w ${Math.round(illumination * 100)}%`}>
      <defs>
        <clipPath id={`${id}-disc`}>
          <circle cx={c} cy={c} r={r} />
        </clipPath>
        <filter id={`${id}-soft`} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation={size / 90} />
        </filter>
        <mask id={`${id}-unlit`}>
          <circle cx={c} cy={c} r={r} fill="#fff" />
          <path d={path} fill="#000" filter={`url(#${id}-soft)`} />
        </mask>
      </defs>
      <g clipPath={`url(#${id}-disc)`}>
        <image href="/icons/moon.webp" x={0} y={0} width={size} height={size} transform={waxing ? undefined : `matrix(-1 0 0 1 ${size} 0)`} preserveAspectRatio="xMidYMid slice" />
        {/* Nieoświetlona część z lekkim światłem popielatym. */}
        <circle cx={c} cy={c} r={r} fill="#04060c" opacity="0.86" mask={`url(#${id}-unlit)`} />
      </g>
    </svg>
  )
}
