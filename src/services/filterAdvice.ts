// Rekomendacje filtrów według Księżyca (7A, [Z12]): dane Księżyca w oknie efektywnym obiektu i kolor każdego filtra.
// ZAŚLEPKA funkcji „rekomendacje-filtrow”: moonConditions i filterAdvice zgłaszają NotImplementedError.
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

function notImplemented(name: string): never {
  throw new Error(`NotImplementedError: ${name}`)
}

/** Dane Księżyca z próbek okna ciemności; null, gdy obiekt nie jest widoczny w żadnej próbce (brak czasu efektywnego). */
export function moonConditions(samples: readonly MoonSample[]): MoonConditions | null {
  void samples
  return notImplemented('moonConditions')
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
  void moon
  void type
  void rules
  void filters
  return notImplemented('filterAdvice')
}
