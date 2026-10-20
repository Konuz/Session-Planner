// Pobieranie zdjęć nieba (pobieranie-zdjec): kolejność prób, limit 10 s, pamięć podręczna (Cache Storage),
// ostatnie działające źródło, ręczny wybór źródła i zapis do pracy offline.
// ZAŚLEPKA: `createSkyImageLoader` rzuca NotImplementedError; implementację dopisuje implementer.
//
// Nazwy, których spec nie podaje (wybrane przez test-author):
// - `createSkyImageLoader(deps)` – obiekt pobierający (`SkyImageLoader`) ze wstrzykniętymi zależnościami:
//   `fetch(url, { signal })`, `loadImage(url, signal)` (ładowanie `<img>` dla SkyView: obietnica spełnia się
//   po zdarzeniu `load` danymi obrazu, odrzuca się po zdarzeniu `error`), `caches` (Cache Storage albo null,
//   gdy przeglądarka jej nie ma), `storage` (`localStorage`) i `clock` (`setTimeout` / `clearTimeout`).
// - `load(request, { sourceId })` – pobranie wycinka; `sourceId` = ręcznie wybrane źródło, brak/null = „automatycznie”.
//   Wynik: obraz (`kind: 'image'`), „brak zdjęcia” z listą prób (`kind: 'none'`) albo `kind: 'superseded'`,
//   gdy w trakcie zaczęło się nowsze pobranie (wtedy wynik jest ignorowany i nie zmienia widoku).
// - `current()` – to, co pokazuje widok: ostatni obraz albo „brak zdjęcia” (null przed pierwszym wynikiem).
// - `saveOffline()` – „Zapisz podgląd do pracy offline”: 'saved' („zapisano”) albo 'failed' („nie udało się zapisać”).
// - Powody prób: 'limit czasu', 'błąd <kod HTTP>' (np. 'błąd 503'), 'błąd obrazu', 'błąd sieci'.
// - `SKY_SOURCE_STORAGE_KEY` – klucz `localStorage` z identyfikatorem ostatniego działającego źródła
//   (`SkyImageSourceId`, np. 'stsci').
// - Klucze pamięci to `skyImageCacheKey` z `sources.ts`; nazwę pamięci i sposób zapisu nazwy źródła razem
//   z obrazem (np. nagłówek zapisanej odpowiedzi) wybiera implementer.
import type { SkyImageRequest, SkyImageSourceId } from './sources'

/** Klucz `localStorage` z ostatnim działającym źródłem. */
export const SKY_SOURCE_STORAGE_KEY = 'astrophotography-planner-sky-source'
/** Limit czasu jednej próby sieciowej [ms]. */
export const SKY_IMAGE_TIMEOUT_MS = 10_000

export interface SkyImageClock {
  setTimeout(callback: () => void, ms: number): unknown
  clearTimeout(handle: unknown): void
}

export interface SkyImageStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/** Podzbiór `Cache` używany przez program (klucz to ścieżka z `skyImageCacheKey`). */
export interface SkyImageCache {
  match(key: string): Promise<Response | undefined>
  put(key: string, response: Response): Promise<void>
}

/** Podzbiór `CacheStorage`. */
export interface SkyImageCacheStorage {
  open(name: string): Promise<SkyImageCache>
}

export interface SkyImageLoaderDeps {
  fetch: (url: string, init: { signal: AbortSignal }) => Promise<Response>
  /** Ładowanie obrazu `<img>` (SkyView): spełnia się danymi obrazu po `load`, odrzuca po `error`. */
  loadImage: (url: string, signal: AbortSignal) => Promise<unknown>
  /** Cache Storage albo null, gdy przeglądarka jej nie ma. */
  caches: SkyImageCacheStorage | null
  storage: SkyImageStorage
  clock: SkyImageClock
}

export interface SkyImageShown {
  kind: 'image'
  sourceId: SkyImageSourceId
  /** Podpis, np. „CDS hips2fits (alasky)” – z nazwy źródła, które naprawdę dało obraz. */
  sourceName: string
  /** `Blob` dla źródeł pobieranych przez `fetch` i z pamięci; dla SkyView wynik `loadImage`. */
  data: unknown
  /** Obraz odczytany z pamięci podręcznej („z pamięci”). */
  fromCache: boolean
  /** Obraz jest w pamięci podręcznej („zapisany”). */
  saved: boolean
}

export interface SkyImageAttempt {
  sourceId: SkyImageSourceId
  /** 'limit czasu', 'błąd 503', 'błąd obrazu', 'błąd sieci'… */
  reason: string
}

export interface SkyImageMissing {
  kind: 'none'
  attempts: SkyImageAttempt[]
}

export interface SkyImageSuperseded {
  kind: 'superseded'
}

export type SkyImageView = SkyImageShown | SkyImageMissing
export type SkyImageLoadResult = SkyImageView | SkyImageSuperseded

export interface SkyImageLoadOptions {
  /** Ręcznie wybrane źródło; brak albo null = „automatycznie”. */
  sourceId?: SkyImageSourceId | null
}

export interface SkyImageLoader {
  load(request: SkyImageRequest, options?: SkyImageLoadOptions): Promise<SkyImageLoadResult>
  current(): SkyImageView | null
  saveOffline(): Promise<'saved' | 'failed'>
}

function notImplemented(name: string, ...args: unknown[]): never {
  const error = new Error(`${name}: not implemented (${args.length})`)
  error.name = 'NotImplementedError'
  throw error
}

export function createSkyImageLoader(deps: SkyImageLoaderDeps): SkyImageLoader {
  return notImplemented('createSkyImageLoader', deps)
}
