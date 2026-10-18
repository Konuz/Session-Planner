// Model widoku zakładki „Katalog” (7A): czyste funkcje: lista po filtrach i sortowaniu, liczba wyników, komunikaty,
// stan liczenia i żądania do wysłania do Workera.
// ZAŚLEPKA funkcji „zakladka-katalog”: catalogView i requestsToSend zgłaszają NotImplementedError.
import type { CatalogFilterState } from '../../services/catalogFilters'
import type { CatalogNightParams, ObjectNightSummary } from '../../services/catalogNight'
import type { CatalogSortKey } from '../../services/catalogSort'
import type { DsoObject, EquipmentProfile, ObserverLocation, PlanningSettings } from '../../types'
import type { ErrorResponse, ResultResponse } from '../../workers/catalogMessages'

/** Katalog z `loadCatalog` w kontenerze zakładki: wczytywanie, błąd z przyczyną albo obiekty. */
export type CatalogLoad =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; objects: readonly DsoObject[] }

/** Odpowiedź Workera na żądanie o jedną noc: „wynik” albo „błąd”. */
export type NightResponse = ResultResponse | ErrorResponse

/** Dane wejściowe modelu widoku zakładki. */
export interface CatalogViewInput {
  /** Katalog (`loadCatalog`). */
  catalog: CatalogLoad
  /** Stan filtrów z panelu. */
  filters: CatalogFilterState
  /** Klucz sortowania z panelu. */
  sort: CatalogSortKey
  /** Noc D jako 'RRRR-MM-DD'. */
  nightDate: string
  /** Parametry planowania: wybrany próg (komunikat o progu), minimum godzin, zakres „Pasuje do kadru”. */
  settings: PlanningSettings
  /** Aktywny zestaw (kadr do filtra i sortowania). */
  profile: EquipmentProfile
  /** Odpowiedź Workera na ostatnie żądanie o noc D; null, dopóki nie przyszła. */
  tonight: NightResponse | null
  /**
   * Odpowiedź Workera na ostatnie żądanie o noc odniesienia „Polecane na miesiąc” (noc z 15. dnia miesiąca nocy D);
   * null, dopóki nie przyszła albo gdy tego żądania nie wysłano.
   */
  reference: NightResponse | null
}

/** Gotowe dane i teksty zakładki. */
export interface CatalogView {
  /** Obiekty listy po filtrach (`filterCatalog`) i sortowaniu (`sortCatalog`); pusta lista przed wczytaniem katalogu. */
  objects: DsoObject[]
  /** Wyniki nocy D do kart (`ResultResponse.objects`); null, dopóki nie przyszedł „wynik” o noc D. */
  results: readonly ObjectNightSummary[] | null
  /** Liczba wyników „N z M obiektów” w formacie pl-PL, np. „2137 z 16 516 obiektów”; null przed wczytaniem katalogu. */
  count: string | null
  /**
   * Stan zakładki: „Wczytywanie katalogu…”, komunikat z przyczyną błędu wczytania katalogu, „Liczenie widoczności…”
   * (Worker jeszcze nie odpowiedział) albo „Nie udało się policzyć widoczności: …” z treścią błędu Workera;
   * null, gdy katalog jest wczytany, a noc D policzona.
   */
  status: string | null
  /** Czy pokazać przycisk „Spróbuj ponownie” (błąd wczytania katalogu). */
  retry: boolean
  /** Komunikat o obniżonym progu albo braku okna (`darknessNote`, stan nocy z „wyniku” o noc D); null bez komunikatu. */
  darknessNote: string | null
  /** „Żaden obiekt nie spełnia filtrów.”, gdy po filtrach nic nie zostaje; inaczej null. */
  emptyNote: string | null
}

/** Stan aplikacji, od którego zależą żądania do Workera: lokalizacja, noc D, parametry, zestaw, filtry i sortowanie. */
export interface CatalogTabState {
  /** Aktywna lokalizacja (z horyzontem). */
  location: ObserverLocation
  /** Noc D jako 'RRRR-MM-DD'. */
  nightDate: string
  settings: PlanningSettings
  /** Aktywny zestaw. */
  profile: EquipmentProfile
  filters: CatalogFilterState
  sort: CatalogSortKey
}

function notImplemented(name: string): never {
  throw new Error(`NotImplementedError: ${name}`)
}

/** Model widoku zakładki: lista, liczba wyników, stan i komunikaty. */
export function catalogView(input: CatalogViewInput): CatalogView {
  void input
  return notImplemented('catalogView')
}

/**
 * Żądania „licz” do wysłania po zmianie stanu z `previous` na `next` (`previous` null = pierwsze żądania zakładki).
 * Żądanie o noc D zawsze, a przy włączonym „Polecane na miesiąc” także o noc odniesienia (`buildCatalogRequest`).
 * Wysyła się tylko żądania, których w stanie `previous` nie było.
 */
export function requestsToSend(previous: CatalogTabState | null, next: CatalogTabState): CatalogNightParams[] {
  void previous
  void next
  return notImplemented('requestsToSend')
}
