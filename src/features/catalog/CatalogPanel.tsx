// Panel filtrów i sortowania katalogu (7A). Komponent prezentacyjny: katalog, stan filtrów i sortowanie dostaje
// przez właściwości, a zmiany zgłasza przez `onFiltersChange` i `onSortChange`.
// ZAŚLEPKA funkcji „zakladka-katalog”: CatalogPanel zgłasza NotImplementedError.
import type { CatalogFilterState } from '../../services/catalogFilters'
import type { CatalogSortKey } from '../../services/catalogSort'
import type { DsoObject } from '../../types'

export interface CatalogPanelProps {
  /** Cały katalog (z `loadCatalog`), np. do listy gwiazdozbiorów. */
  catalog: readonly DsoObject[]
  /** Stan filtrów. */
  filters: CatalogFilterState
  /** Klucz sortowania. */
  sort: CatalogSortKey
  /** Nowy stan filtrów po zmianie w panelu. */
  onFiltersChange: (filters: CatalogFilterState) => void
  /** Nowy klucz sortowania po zmianie w panelu. */
  onSortChange: (sort: CatalogSortKey) => void
}

function notImplemented(name: string): never {
  throw new Error(`NotImplementedError: ${name}`)
}

export function CatalogPanel(props: CatalogPanelProps) {
  void props
  return notImplemented('CatalogPanel')
}
