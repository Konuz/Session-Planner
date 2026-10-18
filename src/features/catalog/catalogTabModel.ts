// Model widoku zakładki „Katalog” (7A): czyste funkcje: lista po filtrach i sortowaniu, liczba wyników, komunikaty,
// stan liczenia i żądania do wysłania do Workera.
import { filterCatalog, referenceNightDate, type CatalogFilterState } from '../../services/catalogFilters'
import type { CatalogNightParams, ObjectNightSummary } from '../../services/catalogNight'
import { sortCatalog, type CatalogSortKey } from '../../services/catalogSort'
import { darknessNote } from '../../services/nightChart'
import type { DsoObject, EquipmentProfile, ObserverLocation, PlanningSettings } from '../../types'
import { buildCatalogRequest, type ErrorResponse, type ResultResponse } from '../../workers/catalogMessages'

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

const COUNT_FORMAT = new Intl.NumberFormat('pl-PL')

function statusOf(catalog: CatalogLoad, tonight: NightResponse | null): string | null {
  if (catalog.status === 'loading') return 'Wczytywanie katalogu…'
  if (catalog.status === 'error') return `Nie udało się wczytać katalogu: ${catalog.message}`
  if (tonight === null) return 'Liczenie widoczności…'
  if (tonight.type === 'error') return `Nie udało się policzyć widoczności: ${tonight.message}`
  return null
}

/** Model widoku zakładki: lista, liczba wyników, stan i komunikaty. */
export function catalogView(input: CatalogViewInput): CatalogView {
  const { catalog, filters, sort, nightDate, settings, profile, tonight, reference } = input
  const all = catalog.status === 'ready' ? catalog.objects : []
  const results = tonight?.type === 'result' ? tonight.objects : null
  const referenceResults = reference?.type === 'result' ? reference.objects : null
  const filtered = filterCatalog(all, filters, { results, settings, profile, nightDate, referenceResults })
  const objects = sortCatalog(filtered, sort, { results, settings, profile })
  const ready = catalog.status === 'ready'
  return {
    objects,
    results,
    count: ready ? `${COUNT_FORMAT.format(objects.length)} z ${COUNT_FORMAT.format(all.length)} obiektów` : null,
    status: statusOf(catalog, tonight),
    retry: catalog.status === 'error',
    darknessNote:
      tonight?.type === 'result'
        ? darknessNote({ darkness: tonight.darkness, requestedThresholdDeg: settings.darknessThresholdDeg })
        : null,
    emptyNote: ready && objects.length === 0 ? 'Żaden obiekt nie spełnia filtrów.' : null,
  }
}

/** Klucz żądania „licz”: równe parametry dają ten sam klucz (kolejność pól z `buildCatalogRequest`). */
export function requestKey(params: CatalogNightParams): string {
  return JSON.stringify(params)
}

/** Żądania potrzebne w stanie `state`: noc D i przy włączonym „Polecane na miesiąc” noc odniesienia, jeśli jest inna. */
function requestsOf({ location, nightDate, settings, filters }: CatalogTabState): CatalogNightParams[] {
  const reference = referenceNightDate(nightDate)
  const nights = filters.recommendedThisMonth && reference !== nightDate ? [nightDate, reference] : [nightDate]
  return nights.map((night) => buildCatalogRequest({ location, nightDate: night, settings }))
}

/**
 * Żądania „licz” do wysłania po zmianie stanu z `previous` na `next` (`previous` null = pierwsze żądania zakładki).
 * Żądanie o noc D zawsze, a przy włączonym „Polecane na miesiąc” także o noc odniesienia (`buildCatalogRequest`).
 * Wysyła się tylko żądania, których w stanie `previous` nie było.
 */
export function requestsToSend(previous: CatalogTabState | null, next: CatalogTabState): CatalogNightParams[] {
  const sent = new Set((previous ? requestsOf(previous) : []).map(requestKey))
  return requestsOf(next).filter((params) => !sent.has(requestKey(params)))
}
