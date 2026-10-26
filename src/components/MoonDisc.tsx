const PHASE_ASSETS = ['new', 'waxing-crescent', 'first-quarter', 'waxing-gibbous', 'full', 'waning-gibbous', 'last-quarter', 'waning-crescent'] as const

export function moonPhaseImageSrc(phaseIndex: number) {
  const phase = PHASE_ASSETS[phaseIndex]
  return `/icons/moon-phases/moon-${phase}.webp`
}

/** Wybiera najbliższy z ośmiu obrazów; progi co 45° wypadają w połowie między fazami. */
export function moonPhaseImageIndex(phaseDeg: number) {
  const normalized = ((phaseDeg % 360) + 360) % 360
  return Math.round(normalized / 45) % PHASE_ASSETS.length
}

export function MoonDisc({ phaseIndex, phaseName, size = 72 }: { phaseIndex: number; phaseName: string; size?: number }) {
  return <img src={moonPhaseImageSrc(phaseIndex)} width={size} height={size} alt={`Księżyc: ${phaseName}`} />
}
