export interface Exposure {
  filter: string
  count: number
  seconds: number
}

/** Starsze plany zawierają wyłącznie nazwy filtrów; liczby klatek trzeba uzupełnić. */
export function planExposures(plan: { filters: string; exposures?: Exposure[] }): Exposure[] {
  return plan.exposures ?? plan.filters.split(/[,;]+/).map((filter) => filter.trim()).filter(Boolean)
    .map((filter) => ({ filter, count: 0, seconds: 180 }))
}

export function validExposure(e: Exposure): boolean {
  return e.filter.trim().length > 0 && Number.isSafeInteger(e.count) && e.count >= 0
    && Number.isFinite(e.seconds) && e.seconds > 0
}

export function exposureSeconds(exposures: readonly Exposure[]): number {
  return exposures.reduce((sum, e) => sum + (validExposure(e) ? e.count * e.seconds : 0), 0)
}

/** Zachowuje proporcje filtrów; zaokrąglenie w dół nie przekracza dostępnego okna. */
export function fitExposures(exposures: readonly Exposure[], availableSeconds: number): Exposure[] {
  const total = exposureSeconds(exposures)
  if (total <= 0 || availableSeconds <= 0 || exposures.some((e) => !validExposure(e))) return [...exposures]
  return exposures.map((e) => ({ ...e, count: Math.floor(e.count * availableSeconds / total) }))
}
