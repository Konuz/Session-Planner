// Rekomendacje filtrów według Księżyca (7A, [Z12]): dane Księżyca w oknie efektywnym obiektu i kolor każdego filtra.
import type { DsoType, FilterId, MoonRuleThresholds } from '../types'

/** Stan rekomendacji filtra: zielony, żółty albo czerwony (tabela z 7A). */
export type FilterAdviceColor = 'green' | 'yellow' | 'red'

/** Rekomendacja jednego filtra aktywnego zestawu. */
export interface FilterAdvice {
  filter: FilterId
  color: FilterAdviceColor
}

/** Próbka okna ciemności (krok siatki katalogu) z danymi Księżyca. */
export interface MoonSample {
  /** Chwila próbki tᵢ (UTC) [ms]. */
  timeMs: number
  /** Czas trwania próbki [ms]: [tᵢ, min(tᵢ + Δt, koniec okna)). */
  durationMs: number
  /** Czy obiekt jest widoczny: nad h_min i nad horyzontem lokalnym (ok(tᵢ) z sekcji 4). */
  objectVisible: boolean
  /** Wysokość geometryczna środka tarczy Księżyca [°], bez refrakcji; „nad horyzontem” = wysokość > 0°. */
  moonAltDeg: number
  /** Oświetlona część tarczy Księżyca, 0–1. */
  moonIllumination: number
  /** Separacja obiekt–Księżyc [°]: współrzędne daty obiektu i topocentryczna pozycja Księżyca. */
  moonSeparationDeg: number
}

/** Dane Księżyca obiektu w jego oknie efektywnym (próbki z widocznym obiektem). */
export interface MoonConditions {
  /** Udział okna efektywnego (czasu trwania próbek) z Księżycem pod horyzontem, 0–1. */
  moonDownFraction: number
  /**
   * Oświetlenie Księżyca (0–1) z próbki najbliższej środka okna efektywnego; środek to połowa między początkiem
   * pierwszej a końcem ostatniej widocznej próbki, także przy oknie z przerwą.
   */
  illumination: number
  /** Najmniejsza separacja [°] w oknie efektywnym, także z próbek z Księżycem pod horyzontem. */
  minSeparationDeg: number
}

/** Dane Księżyca z próbek okna ciemności; null, gdy obiekt nie jest widoczny w żadnej próbce (brak czasu efektywnego). */
export function moonConditions(samples: readonly MoonSample[]): MoonConditions | null {
  const visible = samples.filter((item) => item.objectVisible)
  if (visible.length === 0) return null
  let totalMs = 0
  let downMs = 0
  for (const item of visible) {
    totalMs += item.durationMs
    if (!(item.moonAltDeg > 0)) downMs += item.durationMs
  }
  const last = visible[visible.length - 1]
  const midMs = (visible[0].timeMs + last.timeMs + last.durationMs) / 2
  // Próbka najbliższa środka spośród wszystkich próbek okna; przy remisie wcześniejsza.
  const nearest = samples.reduce((best, item) => (Math.abs(item.timeMs - midMs) < Math.abs(best.timeMs - midMs) ? item : best))
  return {
    moonDownFraction: downMs / totalMs,
    illumination: nearest.moonIllumination,
    minSeparationDeg: Math.min(...visible.map((item) => item.moonSeparationDeg)),
  }
}

type FilterGroup = 'broadband' | 'hydrogenSulfur' | 'oxygen'

const FILTER_GROUPS: Record<FilterId, FilterGroup> = {
  L: 'broadband',
  R: 'broadband',
  G: 'broadband',
  B: 'broadband',
  OSC: 'broadband',
  Ha: 'hydrogenSulfur',
  SII: 'hydrogenSulfur',
  OIII: 'oxygen',
  DualBand: 'oxygen',
}

/** Wiersze 2 i 3 tabeli z 7A (Księżyc obecny): kolor grupy z oświetlenia i najmniejszej separacji. */
function presentMoonColor(group: FilterGroup, type: DsoType, rules: MoonRuleThresholds, illum: number, sep: number): FilterAdviceColor {
  if (group === 'hydrogenSulfur') {
    const { greenMinSepDeg, yellowMinSepDeg } = rules.hydrogenSulfur
    return sep >= greenMinSepDeg ? 'green' : sep >= yellowMinSepDeg ? 'yellow' : 'red'
  }
  if (group === 'oxygen') {
    const { greenMinSepDeg, greenMaxIllum, yellowMinSepDeg } = rules.oxygen
    return sep >= greenMinSepDeg && illum < greenMaxIllum ? 'green' : sep >= yellowMinSepDeg ? 'yellow' : 'red'
  }
  if (type === 'reflection_nebula' || type === 'dark_nebula') {
    return illum < rules.broadbandFaintNebula.greenMaxIllum ? 'green' : 'red'
  }
  const { greenMaxIllum, yellowMaxIllum, yellowMinSepDeg } = rules.broadband
  return illum < greenMaxIllum ? 'green' : illum < yellowMaxIllum && sep >= yellowMinSepDeg ? 'yellow' : 'red'
}

/**
 * Kolor każdego filtra aktywnego zestawu według tabeli z 7A i progów `MoonRuleThresholds`, w kolejności `filters`.
 * Grupy: L, R, G, B, OSC → `broadband` (dla `reflection_nebula` i `dark_nebula` → `broadbandFaintNebula`);
 * Ha, SII → `hydrogenSulfur`; OIII, DualBand → `oxygen`. Pola `*Max` są wyłączne, pola `*Min` włączne.
 * `moon` null (obiekt bez czasu efektywnego) → brak rekomendacji, czyli pusta lista.
 */
export function filterAdvice(
  moon: MoonConditions | null,
  type: DsoType,
  rules: MoonRuleThresholds,
  filters: readonly FilterId[],
): FilterAdvice[] {
  if (!moon) return []
  const moonDown = moon.moonDownFraction >= rules.moonDownMinFraction
  return filters.map((filter) => ({
    filter,
    color: moonDown ? 'green' : presentMoonColor(FILTER_GROUPS[filter], type, rules, moon.illumination, moon.minSeparationDeg),
  }))
}
