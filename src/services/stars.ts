// Katalog gwiazd Tycho-2 do V ≤ 10 (katalog-gwiazd): jasność V, odczyt odpowiedzi CSV z TAP VizieR, zapis i odczyt
// pliku binarnego `stars.v1.bin`, indeks i wybór gwiazd w polu. Czyste funkcje, bez sieci.
// ZAŚLEPKA: funkcje rzucają NotImplementedError; implementację dopisuje implementer.
//
// Nazwy, których spec nie podaje (wybrane przez test-author):
// - `Star` = pozycja J2000 (`raDeg`, `decDeg`, jak `EquatorialDeg`) + jasność V w `mag`.
// - `visualMagnitude({ bt, vt })` – V ze wzoru 6.7; null, gdy brak obu jasności.
// - `parseStarsCsv(text)` – odpowiedź CSV z kolumnami `ra`, `dec`, `bt`, `vt` (dowolna kolejność, LF albo CRLF) →
//   `{ stars, rows, skipped }`: `stars` = gwiazdy z V ≤ 10 (`STAR_MAG_LIMIT`) w kolejności odpowiedzi,
//   `rows` = liczba wierszy danych (bez nagłówka i pustej linii na końcu), `skipped` = wiersze pominięte
//   (brak obu jasności albo zła liczba). Testy nie zakładają, czy gwiazda z V > 10 liczy się do `skipped`.
// - `encodeStarFile(stars)` / `decodeStarFile(bytes)` – plik binarny. Nagłówek ma 64 B:
//     bajty 0–3: znacznik ASCII `STAR`,
//     bajty 4–5: wersja, uint16 little-endian (= 1),
//     bajty 6–7: zero,
//     bajty 8–11: liczba gwiazd, uint32 little-endian,
//     bajty 12–63: zero (zapas).
//   Od bajtu 64: 10 B na gwiazdę, w kolejności listy (układ rekordu wybiera implementer; testy sprawdzają tylko
//   odczyt po zapisie: pozycja ±0,1″, jasność ±0,01 mag, RA po odczycie w [0, 360)).
//   Błędy odczytu (`Error` z komunikatem): „To nie jest plik katalogu gwiazd”, „Nieobsługiwana wersja pliku gwiazd: N”,
//   „Plik katalogu gwiazd jest niepełny”.
// - `buildStarIndex(stars)` – indeks przygotowywany raz; `starsInField(index, center, radiusDeg)` – gwiazdy
//   z `angularSeparationDeg(center, gwiazda) ≤ radiusDeg + 1e-6`, od najjaśniejszej (mniejsze `mag` pierwsze),
//   przy równej jasności w kolejności listy podanej do `buildStarIndex`.
import type { EquatorialDeg } from './astroMath.ts'

/** Gwiazda katalogu: pozycja J2000 [°] i jasność V [mag]. */
export interface Star extends EquatorialDeg {
  mag: number
}

/** Do pliku trafiają gwiazdy z V ≤ 10 (brzeg się liczy). */
export const STAR_MAG_LIMIT = 10
/** Długość nagłówka pliku gwiazd [B]. */
export const STAR_FILE_HEADER_BYTES = 64
/** Wersja zapisywanego pliku. */
export const STAR_FILE_VERSION = 1

/** Jasność V z jasności Tycho: `V = VT − 0,090·(BT − VT)`; brak BT → VT, brak VT → BT, brak obu → null. */
export function visualMagnitude(magnitudes: { bt: number | null; vt: number | null }): number | null {
  void magnitudes
  throw new Error('NotImplementedError: visualMagnitude')
}

export interface StarsCsv {
  /** Gwiazdy z V ≤ 10 w kolejności odpowiedzi. */
  stars: Star[]
  /** Liczba wierszy danych (bez nagłówka i pustej linii na końcu). */
  rows: number
  /** Wiersze pominięte: brak obu jasności albo zła liczba. */
  skipped: number
}

/** Odczyt odpowiedzi CSV z TAP (kolumny `ra`, `dec`, `bt`, `vt` po nazwach; puste pole = brak wartości). */
export function parseStarsCsv(text: string): StarsCsv {
  void text
  throw new Error('NotImplementedError: parseStarsCsv')
}

/** Zapis pliku `stars.v1.bin`: nagłówek 64 B + 10 B na gwiazdę. */
export function encodeStarFile(stars: readonly Star[]): Uint8Array<ArrayBuffer> {
  void stars
  throw new Error('NotImplementedError: encodeStarFile')
}

/** Odczyt pliku `stars.v1.bin`; zły plik → `Error` z komunikatem ze spec (P9). */
export function decodeStarFile(data: ArrayBuffer | Uint8Array): Star[] {
  void data
  throw new Error('NotImplementedError: decodeStarFile')
}

/** Indeks gwiazd do szybkiego wyboru w polu (przygotowywany raz). */
export interface StarIndex {
  /** Gwiazdy w kolejności podanej do `buildStarIndex`. */
  readonly stars: readonly Star[]
}

export function buildStarIndex(stars: readonly Star[]): StarIndex {
  void stars
  throw new Error('NotImplementedError: buildStarIndex')
}

/** Gwiazdy odległe od środka o najwyżej `radiusDeg` (tolerancja 1e-6°), od najjaśniejszej; remis → kolejność listy. */
export function starsInField(index: StarIndex, center: EquatorialDeg, radiusDeg: number): Star[] {
  void index
  void center
  void radiusDeg
  throw new Error('NotImplementedError: starsInField')
}
