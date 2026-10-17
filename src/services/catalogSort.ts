// Sortowanie listy katalogu (7A): czas efektywny (domyślnie), godzina górowania, rozmiar, jasność, dopasowanie do kadru.
import type { DsoObject, EquipmentProfile, PlanningSettings } from '../types'
import { formatDesignation } from './catalog/records'
import { frameRange } from './catalogFilters'
import type { ObjectNightSummary } from './catalogNight'

/**
 * Klucz sortowania listy katalogu:
 * - 'effectiveTime': czas efektywny w noc D, od najdłuższego;
 * - 'transit': godzina górowania w kolejności nocy, od wieczora;
 * - 'size': wielka oś (`sizeMajorArcmin`), od największej;
 * - 'magnitude': jasność `magV`, od najjaśniejszego (najmniejsza wartość mag);
 * - 'frameFit': dopasowanie do kadru aktywnego zestawu, od najlepszego (wielka oś najbliżej środka zakresu `fitRange`).
 * Remisy i brak wartości rozstrzyga oznaczenie główne w porządku naturalnym; obiekty bez wartości są zawsze na końcu.
 */
export type CatalogSortKey = 'effectiveTime' | 'transit' | 'size' | 'magnitude' | 'frameFit'

/** Sortowanie domyślne: czas efektywny. */
export const DEFAULT_CATALOG_SORT: CatalogSortKey = 'effectiveTime'

/** Dane spoza listy obiektów: wyniki nocy D z Workera, zakres „Pasuje do kadru” i aktywny zestaw. */
export interface CatalogSortContext {
  /** Podsumowania obiektów w noc D (`ObjectNightSummary`, dopasowanie po uid); null = wynik jeszcze się liczy. */
  results: readonly ObjectNightSummary[] | null
  /** Zakres „Pasuje do kadru” [Z21] jako części krótszego boku kadru. */
  settings: Pick<PlanningSettings, 'fitRange'>
  /** Aktywny zestaw; kadr z `computeOptics` (krótszy bok FOV). */
  profile: EquipmentProfile
}

/** Ranga obiektu: mniejsza wcześniej; null = brak wartości (na końcu). */
type Rank = (object: DsoObject) => number | null

/** Ranga z wyników nocy D (po uid); brak wyniku albo wynik się liczy = brak wartości. */
function fromResults(context: CatalogSortContext, value: (summary: ObjectNightSummary) => number | null): Rank {
  const byUid = new Map((context.results ?? []).map((summary) => [summary.uid, value(summary)]))
  return (object) => byUid.get(object.uid) ?? null
}

const negated = (value: number | null): number | null => (value === null ? null : -value)

const RANKS: Record<CatalogSortKey, (context: CatalogSortContext) => Rank> = {
  effectiveTime: (context) => fromResults(context, (summary) => negated(summary.effectiveMinutes)),
  transit: (context) => fromResults(context, (summary) => summary.transitMs),
  size: () => (object) => negated(object.sizeMajorArcmin),
  magnitude: () => (object) => object.magV,
  frameFit: ({ profile, settings }) => {
    const { min, max } = frameRange(profile, settings.fitRange)
    const center = (min + max) / 2
    return (object) => (object.sizeMajorArcmin === null ? null : Math.abs(object.sizeMajorArcmin - center))
  },
}

const DESIGNATION_ORDER = new Intl.Collator('pl', { numeric: true })

/** Nowa lista obiektów w kolejności klucza `key`; wejście się nie zmienia. */
export function sortCatalog(objects: readonly DsoObject[], key: CatalogSortKey, context: CatalogSortContext): DsoObject[] {
  const rank = RANKS[key](context)
  const entries = objects.map((object) => ({ object, rank: rank(object), name: formatDesignation(object.primary) }))
  entries.sort((a, b) => {
    if (a.rank !== b.rank) {
      if (a.rank === null) return 1
      if (b.rank === null) return -1
      return a.rank - b.rank
    }
    return DESIGNATION_ORDER.compare(a.name, b.name)
  })
  return entries.map((entry) => entry.object)
}
