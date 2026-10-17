// Sortowanie listy katalogu (7A): czas efektywny (domyślnie), godzina górowania, rozmiar, jasność, dopasowanie do kadru.
// ZAŚLEPKA funkcji „sortowanie”: sortCatalog zgłasza NotImplementedError.
import type { DsoObject, EquipmentProfile, PlanningSettings } from '../types'
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

function notImplemented(name: string): never {
  throw new Error(`NotImplementedError: ${name}`)
}

/** Nowa lista obiektów w kolejności klucza `key`; wejście się nie zmienia. */
export function sortCatalog(objects: readonly DsoObject[], key: CatalogSortKey, context: CatalogSortContext): DsoObject[] {
  void objects
  void key
  void context
  return notImplemented('sortCatalog')
}
