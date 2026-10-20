// Czysty model zakładki Kadr (zakladka-kadr): przesuwanie tła, odczyt pól PA i zakładki mozaiki.
// ZAŚLEPKA: funkcje rzucają NotImplementedError; implementację dopisuje implementer.
//
// Nazwy, których spec nie podaje (wybrane przez test-author):
// - `VIEW_SIZE` = 1000 – układ współrzędnych widoku (`viewBox="0 0 1000 1000"`), środek w (500; 500).
// - `dragFraming(start, pointer, fovDeg, renderedWidthPx)` – przesuwanie tła [Z11]: `start` to kadr i położenie
//   wskaźnika (piksele ekranu) z chwili, gdy przeciąganie się zaczęło; `pointer` to bieżące położenie wskaźnika.
//   Przesunięcie w pikselach ekranu przelicza się na jednostki widoku (× VIEW_SIZE / renderedWidthPx), a nowy środek
//   to punkt nieba pod pikselem (500 − dx; 500 − dy) widoku o polu `fovDeg` ze środkiem w starym środku kadru
//   (`cutoutToSky` z `geometria-kadru` P17). Wynik: cały kadr z nowym środkiem; PA i mozaika bez zmian.
// - `readPaInput(text, currentPaDeg)` – pole PA: liczba z przecinkiem albo kropką, sprowadzona do [0, 360), bez
//   zaokrąglania do kroku suwaka; zły tekst → `error` „PA: wpisz liczbę” i PA bez zmian.
// - `readOverlapInput(text, currentPct)` – pole zakładki mozaiki [%]: liczba z przecinkiem albo kropką, przycięta do
//   10–30; zły tekst → `error` „Zakładka: wpisz liczbę” i zakładka bez zmian.
import type { Framing } from '../../types'

/** Rozmiar widoku w jednostkach `viewBox` (kwadrat). */
export const VIEW_SIZE = 1000

/** Punkt na ekranie [px] (np. `clientX`, `clientY` zdarzenia wskaźnika). */
export interface ScreenPoint {
  x: number
  y: number
}

/** Stan z chwili rozpoczęcia przeciągania. */
export interface DragStart {
  framing: Framing
  pointer: ScreenPoint
}

export interface PaInputResult {
  paDeg: number
  /** „PA: wpisz liczbę” albo null. */
  error: string | null
}

export interface OverlapInputResult {
  overlapPct: number
  /** „Zakładka: wpisz liczbę” albo null. */
  error: string | null
}

function notImplemented(name: string, ...args: unknown[]): never {
  const error = new Error(`${name}: not implemented (${args.length})`)
  error.name = 'NotImplementedError'
  throw error
}

export function dragFraming(start: DragStart, pointer: ScreenPoint, fovDeg: number, renderedWidthPx: number): Framing {
  return notImplemented('dragFraming', start, pointer, fovDeg, renderedWidthPx)
}

export function readPaInput(text: string, currentPaDeg: number): PaInputResult {
  return notImplemented('readPaInput', text, currentPaDeg)
}

export function readOverlapInput(text: string, currentPct: number): OverlapInputResult {
  return notImplemented('readOverlapInput', text, currentPct)
}
