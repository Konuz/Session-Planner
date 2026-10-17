// Filtry katalogu (7A): katalog, typ, gwiazdozbiór, jasność, rozmiar, „Widoczne w wybraną noc”, „Pasuje do kadru” [Z7, Z21].
// ZAŚLEPKA funkcji „filtry-katalogu”: filterCatalog zgłasza NotImplementedError.
import type { CatalogId, DsoObject, DsoType, EquipmentProfile, PlanningSettings } from '../types'
import type { ObjectNightSummary } from './catalogNight'

/** Zakres wartości; obie granice włącznie. */
export interface NumberRange {
  min: number
  max: number
}

/** Stan filtrów katalogu. Filtry łączą się przez „i”, a wartości w obrębie jednego filtra przez „lub”. */
export interface CatalogFilterState {
  /** Katalogi (wiele naraz); liczy się każde oznaczenie obiektu, nie tylko główne. [] = bez ograniczenia. */
  catalogs: CatalogId[]
  /** Typy obiektów (wiele naraz). [] = bez ograniczenia. */
  types: DsoType[]
  /** Skrót IAU gwiazdozbioru, np. 'Cep'; null = bez ograniczenia. */
  constellation: string | null
  /** Jasność `magV` [mag]; null = filtr wyłączony. */
  magnitude: NumberRange | null
  /** „Pokaż obiekty bez jasności”: przy włączonym filtrze jasności obiekty bez `magV` przechodzą. */
  showWithoutMagnitude: boolean
  /** Rozmiar (wielka oś, `sizeMajorArcmin`) [′]; null = filtr wyłączony. Obiekty bez rozmiaru odpadają. */
  size: NumberRange | null
  /** „Widoczne w wybraną noc”: czas efektywny ≥ `minEffectiveHours` [Z7]. */
  visibleTonight: boolean
  /** „Pasuje do kadru” aktywnego zestawu: wielka oś w zakresie `fitRange` krótszego boku kadru [Z21]. */
  fitsFrame: boolean
}

/** Stan domyślny: żaden filtr nie jest włączony, „pokaż obiekty bez jasności” zaznaczone. */
export const DEFAULT_CATALOG_FILTERS: CatalogFilterState = {
  catalogs: [],
  types: [],
  constellation: null,
  magnitude: null,
  showWithoutMagnitude: true,
  size: null,
  visibleTonight: false,
  fitsFrame: false,
}

/** Dane spoza stanu filtrów: wyniki nocy D z Workera, parametry planowania i aktywny zestaw. */
export interface CatalogFilterContext {
  /** Podsumowania obiektów w noc D (`ObjectNightSummary`, dopasowanie po uid); null = wynik jeszcze się liczy. */
  results: readonly ObjectNightSummary[] | null
  /** Minimum godzin czasu efektywnego [Z7] i zakres „Pasuje do kadru” [Z21]. */
  settings: Pick<PlanningSettings, 'minEffectiveHours' | 'fitRange'>
  /** Aktywny zestaw; kadr z `computeOptics` (krótszy bok FOV). */
  profile: EquipmentProfile
}

function notImplemented(name: string): never {
  throw new Error(`NotImplementedError: ${name}`)
}

/** Obiekty, które przechodzą wszystkie włączone filtry, w kolejności wejścia; wejście się nie zmienia. */
export function filterCatalog(
  objects: readonly DsoObject[],
  filters: CatalogFilterState,
  context: CatalogFilterContext,
): DsoObject[] {
  void objects
  void filters
  void context
  return notImplemented('filterCatalog')
}
