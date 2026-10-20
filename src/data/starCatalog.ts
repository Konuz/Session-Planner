// Wczytanie katalogu gwiazd w aplikacji (katalog-gwiazd, P19–P20), dla zakładki Kadr (`tlo-mapy`).
// `loadStarCatalog()` pobiera `${BASE_URL}catalog/stars.v1.bin` raz (jak `loadCatalog`) i zwraca gotowy indeks;
// błąd nie jest zapamiętywany, więc następne wywołanie pobiera plik od nowa.
import { buildStarIndex, decodeStarFile, type StarIndex } from '../services/stars.ts'

let starRequest: Promise<StarIndex> | null = null

export function loadStarCatalog(): Promise<StarIndex> {
  starRequest ??= fetch(`${import.meta.env.BASE_URL}catalog/stars.v1.bin`)
    .then(async (response) => {
      if (!response.ok) throw new Error(`Nie udało się wczytać katalogu gwiazd (HTTP ${response.status})`)
      return buildStarIndex(decodeStarFile(await response.arrayBuffer()))
    })
    .catch((error: unknown) => {
      starRequest = null
      throw error
    })
  return starRequest
}
