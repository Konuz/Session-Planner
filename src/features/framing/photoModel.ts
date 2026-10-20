// Model warstwy zdjęcia w zakładce Kadr (zdjecie-w-kadrze): podpisy, komunikaty, listy wyboru, tryb wywołania
// pobierania, przycisk offline, decyzja o nowym pobraniu i prostokąt zdjęcia w jednostkach widoku.
// ZAŚLEPKA: funkcje rzucają NotImplementedError; implementację dopisuje implementer.
//
// Nazwy, których spec nie podaje (wybrane przez test-author):
// - `SourceChoice` – wybór źródła: 'auto' („Automatycznie”) albo id źródła z `zrodla-zdjec`.
// - `sourceChoices()` – lista źródeł do wyboru (P8): „Automatycznie”, potem źródła w kolejności `skyImageSources()`.
// - `layerChoices(fovDeg)` – lista warstw dla pola wycinka (P10): nazwy z `layersForFov`.
// - `loadOptions(source, layerId)` – tryb wywołania `loader.load` (P12): `{ sourceId: null }` = automatycznie,
//   `{ sourceId: id }` = ręcznie. „Automatycznie” + DSS2 kolor → automatycznie; „Automatycznie” + DSS2 czerwony albo
//   Hα → ręcznie z 'alaskybis'; źródło wybrane ręcznie → ręcznie z tym źródłem (dla każdej warstwy). `layerId` to
//   warstwa naprawdę używana (po `effectiveLayer`).
// - `ShownPhoto` – pokazane zdjęcie: wynik `load` (`SkyImageShown`) razem z wycinkiem (`SkyImageRequest`), dla którego
//   je pobrano. Podpis i licencja zależą od źródła zdjęcia i od warstwy tego wycinka (`effectiveLayer(request.layerId,
//   request.fovDeg)`), a nie od bieżącego wyboru.
// - `photoCaption(photo)` – podpis (P1–P3, P13, P14): „Zdjęcie: <nazwa źródła>”; przy hips2fits (alaskybis, alasky)
//   dochodzi „, <nazwa warstwy>”; przy obrazie z pamięci (`fromCache`) na końcu „, z pamięci”. SkyView i STScI bez
//   nazwy warstwy.
// - `attemptLines(attempts)` – lista prób przy „Brak zdjęcia” (P6): „<nazwa źródła>: <powód>” w kolejności prób.
// - `licenseLines(photo)` – podpisy licencji (P25, P26): najpierw „Licencja: zarysy obiektów — Stellarium (GPL-2.0)”,
//   a przy zdjęciu druga linia zależna od źródła (i od warstwy Hα przy hips2fits).
// - `ViewRect` / `photoRect(photo, frameCenter, viewFovDeg)` – prostokąt zdjęcia w jednostkach widoku 1000 × 1000
//   (P22–P24): środek w rzucie środka wycinka (`skyToCutout` na widok o polu `viewFovDeg` ze środkiem kadru), bok ze
//   skali TAN: hips2fits i SkyView obejmują pole `request.fovDeg`, STScI pole `stsciCoveredFovDeg(request.fovDeg)`.
//   `x`, `y` to lewy górny róg.
// - `PhotoFrame` – kadr dla warstwy zdjęcia: środek kadru i rozmiar kadru lub mozaiki (`MosaicSize`).
// - `nextPhotoRequest(previous, frame, layerId, dragging)` – decyzja o nowym pobraniu (P19, P20): w trakcie
//   przeciągania null; bez poprzedniego wycinka albo przy innej warstwie naprawdę używanej albo gdy `needsNewCutout`
//   → `planCutout(frame.center, frame.size, layerId)`; inaczej null.
// - `createPhotoLayer(loader)` – stan warstwy zdjęcia (`PhotoLayer`) z wstrzykniętym pobieraniem (`PhotoLoaderPort`,
//   podzbiór `SkyImageLoader` z `pobieranie-zdjec`):
//   - `setFrame(frame, dragging)` – bieżący kadr; wywołuje `loader.load(request, loadOptions(...))`, gdy
//     `nextPhotoRequest` zwraca wycinek (nic w trakcie przeciągania; sprawdzenie po puszczeniu, czyli przy
//     `dragging` = false);
//   - `chooseSource(source)` / `chooseLayer(layerId)` – zmiana wyboru → jedno nowe wywołanie `load` dla bieżącego kadru
//     (gdy kadr jest znany); wybór nie jest nigdzie zapisywany (nowy obiekt startuje z 'auto' i DSS2 kolor);
//   - `retry()` – „Spróbuj ponownie”: `load` z tym samym wycinkiem i trybem co ostatnio;
//   - `saveOffline()` – „Zapisz podgląd do pracy offline”: `loader.saveOffline()`; po 'saved' zdjęcie to
//     `loader.current()` (np. obraz STScI po zapisie zdjęcia SkyView), wycinek bez zmian;
//   - `view()` – bieżący stan widoku (`PhotoLayerView`; ten sam obiekt, dopóki nic się nie zmieniło);
//   - `subscribe(listener)` – powiadomienie o każdej zmianie widoku; zwraca funkcję wypisania.
//   Wynik `superseded` z `load` nie zmienia widoku.
import type { EquatorialDeg } from '../../services/astroMath'
import type { MosaicSize } from '../../services/framing'
import type {
  SkyImageAttempt,
  SkyImageLoadOptions,
  SkyImageLoadResult,
  SkyImageShown,
  SkyImageView,
} from '../../services/skyImage/loader'
import type { SkyImageLayerId, SkyImageRequest, SkyImageSourceId } from '../../services/skyImage/sources'

/** Wybór źródła: „Automatycznie” albo konkretne źródło. */
export type SourceChoice = 'auto' | SkyImageSourceId

export interface Choice<T> {
  value: T
  /** Np. „Automatycznie”, „STScI DSS”, „DSS2 kolor”. */
  label: string
}

/** Pokazane zdjęcie i wycinek, dla którego je pobrano. */
export interface ShownPhoto {
  image: SkyImageShown
  request: SkyImageRequest
}

/** Prostokąt w jednostkach widoku (lewy górny róg, szerokość, wysokość). */
export interface ViewRect {
  x: number
  y: number
  width: number
  height: number
}

/** Kadr dla warstwy zdjęcia: środek kadru i rozmiar kadru lub mozaiki. */
export interface PhotoFrame {
  center: EquatorialDeg
  size: MosaicSize
}

/** Stan widoku warstwy zdjęcia. */
export interface PhotoLayerView {
  /** Zaznaczony wybór źródła (na starcie 'auto'). */
  source: SourceChoice
  sourceOptions: Choice<SourceChoice>[]
  /** Zaznaczona warstwa (naprawdę używana: Hα przy polu < 3° → DSS2 kolor). */
  layer: SkyImageLayerId
  layerOptions: Choice<SkyImageLayerId>[]
  /** Pokazane zdjęcie; null przed pierwszym zdjęciem i po porażce („Brak zdjęcia”). */
  photo: ShownPhoto | null
  /** `photoCaption(photo)` albo null bez zdjęcia. */
  caption: string | null
  /** „Pobieram zdjęcie…” w trakcie pobierania, inaczej null. */
  loadingText: string | null
  /** „Brak zdjęcia — pokazuję zarysy obiektów” z listą prób (`attemptLines`) po porażce; inaczej null. */
  missing: { message: string; attempts: string[] } | null
  /** Przycisk offline: „Zapisz podgląd do pracy offline” (aktywny) albo „Zapisuję…” (nieaktywny); null bez niego. */
  offline: { label: string; disabled: boolean } | null
  /** „Zapisano podgląd do pracy offline” / „Nie udało się zapisać podglądu do pracy offline” albo null. */
  saveMessage: string | null
  /** `licenseLines(photo)`. */
  licenses: string[]
}

/** Podzbiór `SkyImageLoader` (`pobieranie-zdjec`) używany przez warstwę zdjęcia. */
export interface PhotoLoaderPort {
  load(request: SkyImageRequest, options?: SkyImageLoadOptions): Promise<SkyImageLoadResult>
  saveOffline(): Promise<'saved' | 'failed'>
  current(): SkyImageView | null
}

export interface PhotoLayer {
  view(): PhotoLayerView
  subscribe(listener: () => void): () => void
  setFrame(frame: PhotoFrame, dragging: boolean): void
  chooseSource(source: SourceChoice): void
  chooseLayer(layerId: SkyImageLayerId): void
  retry(): void
  saveOffline(): Promise<void>
}

function notImplemented(name: string, ...args: unknown[]): never {
  const error = new Error(`${name}: not implemented (${args.length})`)
  error.name = 'NotImplementedError'
  throw error
}

export function sourceChoices(): Choice<SourceChoice>[] {
  return notImplemented('sourceChoices')
}

export function layerChoices(fovDeg: number): Choice<SkyImageLayerId>[] {
  return notImplemented('layerChoices', fovDeg)
}

export function loadOptions(source: SourceChoice, layerId: SkyImageLayerId): SkyImageLoadOptions {
  return notImplemented('loadOptions', source, layerId)
}

export function photoCaption(photo: ShownPhoto): string {
  return notImplemented('photoCaption', photo)
}

export function attemptLines(attempts: readonly SkyImageAttempt[]): string[] {
  return notImplemented('attemptLines', attempts)
}

export function licenseLines(photo: ShownPhoto | null): string[] {
  return notImplemented('licenseLines', photo)
}

export function photoRect(photo: ShownPhoto, frameCenter: EquatorialDeg, viewFovDeg: number): ViewRect {
  return notImplemented('photoRect', photo, frameCenter, viewFovDeg)
}

export function nextPhotoRequest(
  previous: SkyImageRequest | null,
  frame: PhotoFrame,
  layerId: SkyImageLayerId,
  dragging: boolean,
): SkyImageRequest | null {
  return notImplemented('nextPhotoRequest', previous, frame, layerId, dragging)
}

export function createPhotoLayer(loader: PhotoLoaderPort): PhotoLayer {
  return notImplemented('createPhotoLayer', loader)
}
