// Wczytanie katalogu gwiazd w aplikacji (katalog-gwiazd, P19–P20), dla zakładki Kadr (`tlo-mapy`).
// ZAŚLEPKA: `loadStarCatalog` rzuca NotImplementedError; implementację dopisuje implementer.
//
// Nazwy wybrał test-author: `loadStarCatalog()` pobiera `${import.meta.env.BASE_URL}catalog/stars.v1.bin`
// globalnym `fetch` (jak `loadCatalog`), odczytuje plik `decodeStarFile` i zwraca gotowy indeks `buildStarIndex`.
// Drugie wywołanie zwraca ten sam obiekt bez ponownego pobierania. Błąd HTTP → `Error` z komunikatem
// „Nie udało się wczytać katalogu gwiazd (HTTP <kod>)”; błąd nie jest zapamiętywany (następne wywołanie pobiera od nowa).
import type { StarIndex } from '../services/stars.ts'

export function loadStarCatalog(): Promise<StarIndex> {
  return Promise.reject(new Error('NotImplementedError: loadStarCatalog'))
}
