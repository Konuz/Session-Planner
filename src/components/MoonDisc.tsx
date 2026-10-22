/** Tarcza Księżyca z terminatorem (półkula N: przybywający oświetlony z prawej). */
export function MoonDisc({ illumination, waxing, size = 72 }: { illumination: number; waxing: boolean; size?: number }) {
  const r = size / 2 - 2
  const c = size / 2
  const rx = Math.abs(1 - 2 * illumination) * r
  const lit = waxing ? 1 : 0
  // Oświetlona półtarcza + elipsa terminatora (wybrzuszona dla garbu, wklęsła dla sierpu).
  const gibbous = illumination > 0.5
  const path = `M ${c} ${c - r} A ${r} ${r} 0 0 ${lit} ${c} ${c + r} A ${rx} ${r} 0 0 ${gibbous ? lit : 1 - lit} ${c} ${c - r} Z`
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <defs>
        <radialGradient id="moon-lit" cx="45%" cy="40%" r="65%">
          <stop offset="0" stopColor="#f4f6fa" />
          <stop offset="1" stopColor="#9aa3b2" />
        </radialGradient>
        <filter id="moon-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
      </defs>
      <circle cx={c} cy={c} r={r} fill="#161a24" />
      <path d={path} fill="url(#moon-lit)" />
      <path d={path} fill="#ffffff" opacity="0.18" filter="url(#moon-glow)" />
      <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(255,255,255,0.12)" />
      {/* Kilka mórz dla charakteru. */}
      <g fill="#000" opacity="0.14">
        <circle cx={c - r * 0.25} cy={c - r * 0.3} r={r * 0.2} />
        <circle cx={c + r * 0.2} cy={c - r * 0.1} r={r * 0.16} />
        <circle cx={c - r * 0.05} cy={c + r * 0.3} r={r * 0.14} />
      </g>
    </svg>
  )
}
