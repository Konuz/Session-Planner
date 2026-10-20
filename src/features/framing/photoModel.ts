// Model warstwy zdjęcia w zakładce Kadr (zdjecie-w-kadrze): podpisy, komunikaty, listy wyboru, tryb wywołania
// pobierania, przycisk offline, decyzja o nowym pobraniu i prostokąt zdjęcia w jednostkach widoku.
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
import { skyToCutout, type MosaicSize } from '../../services/framing'
import type {
  SkyImageAttempt,
  SkyImageLoadOptions,
  SkyImageLoadResult,
  SkyImageShown,
  SkyImageView,
} from '../../services/skyImage/loader'
import {
  cutoutFovDeg,
  effectiveLayer,
  layersForFov,
  needsNewCutout,
  planCutout,
  skyImageSources,
  stsciCoveredFovDeg,
  type SkyImageLayerId,
  type SkyImageRequest,
  type SkyImageSourceId,
} from '../../services/skyImage/sources'
import { VIEW_SIZE } from './framingModel'

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

/**
 * Kadr dla warstwy zdjęcia: środek kadru i rozmiar kadru lub mozaiki.
 *
 * zoom-kadru (nazwy wybrał test-author): `fovDeg` – pole widoku po zoomie.
 * Gdy podane, zastępuje `cutoutFovDeg(size)` w liście warstw i progu Hα (`frameFov()`), w `nextPhotoRequest`
 * (pole planowane, `planCutout`/`needsNewCutout` z polem planowanym) i w `reload` (`chooseSource`/`chooseLayer`).
 * `setFrame(frame, dragging)` z `dragging` = false i `fovDeg` różnym od pola bieżącego wycinka (≥ 1e-6°) → jedno
 * pobranie wycinka o polu `fovDeg` wokół środka kadru. Z `dragging` = true (przeciąganie, szczypanie, kółko przed
 * 300 ms ciszy) nic się nie pobiera. Bez `fovDeg` wszystko działa jak dotąd. Gdy zmienił się rozmiar kadru (mozaika,
 * profil), a nie pole widoku, decyduje dawna reguła (`needsNewCutout` z polem planowanym), jak przy „Dopasuj”.
 */
export interface PhotoFrame {
  center: EquatorialDeg
  size: MosaicSize
  fovDeg?: number
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

const LOADING_TEXT = 'Pobieram zdjęcie…'
const MISSING_TEXT = 'Brak zdjęcia — pokazuję zarysy obiektów'
const OFFLINE_LABEL = 'Zapisz podgląd do pracy offline'
const SAVING_LABEL = 'Zapisuję…'
const SAVED_TEXT = 'Zapisano podgląd do pracy offline'
const SAVE_FAILED_TEXT = 'Nie udało się zapisać podglądu do pracy offline'
const OUTLINES_LICENSE = 'Licencja: zarysy obiektów — Stellarium (GPL-2.0)'
const PHOTO_LICENSE: Record<'hips2fits' | 'hips2fits-halpha' | 'skyview' | 'stsci', string> = {
  hips2fits: 'Licencja: zdjęcie — CDS Strasbourg (hips2fits), dane DSS © STScI/AURA',
  'hips2fits-halpha': 'Licencja: zdjęcie — CDS Strasbourg (hips2fits), mapa Hα: Finkbeiner (ODbL)',
  skyview: 'Licencja: zdjęcie — NASA/GSFC SkyView, dane DSS © STScI/AURA',
  stsci: 'Licencja: zdjęcie — Digitized Sky Survey © STScI/AURA',
}
/** Najmniejsza zmiana pola widoku, po której zoom pobiera nowy wycinek [°]. */
const FOV_CHANGE_EPS_DEG = 1e-6
/** Pole wycinka, gdy kadr nie jest jeszcze znany (wszystkie warstwy dostępne). */
const UNKNOWN_FOV_DEG = 60

const SOURCES = skyImageSources()
const LAYER_NAMES = Object.fromEntries(layersForFov(UNKNOWN_FOV_DEG).map((layer) => [layer.id, layer.name])) as Record<
  SkyImageLayerId,
  string
>

function sourceName(id: SkyImageSourceId): string {
  return SOURCES.find((source) => source.id === id)?.name ?? id
}

const isHips2fits = (id: SkyImageSourceId) => id === 'alaskybis' || id === 'alasky'

/** Warstwa naprawdę użyta dla wycinka. */
const requestLayer = (request: SkyImageRequest) => effectiveLayer(request.layerId, request.fovDeg)

export function sourceChoices(): Choice<SourceChoice>[] {
  return [{ value: 'auto', label: 'Automatycznie' }, ...SOURCES.map((source) => ({ value: source.id, label: source.name }))]
}

export function layerChoices(fovDeg: number): Choice<SkyImageLayerId>[] {
  return layersForFov(fovDeg).map((layer) => ({ value: layer.id, label: layer.name }))
}

export function loadOptions(source: SourceChoice, layerId: SkyImageLayerId): SkyImageLoadOptions {
  if (source !== 'auto') return { sourceId: source }
  return { sourceId: layerId === 'dss2-color' ? null : 'alaskybis' }
}

export function photoCaption(photo: ShownPhoto): string {
  const { sourceId, fromCache } = photo.image
  const layer = isHips2fits(sourceId) ? `, ${LAYER_NAMES[requestLayer(photo.request)]}` : ''
  return `Zdjęcie: ${sourceName(sourceId)}${layer}${fromCache ? ', z pamięci' : ''}`
}

export function attemptLines(attempts: readonly SkyImageAttempt[]): string[] {
  return attempts.map((attempt) => `${sourceName(attempt.sourceId)}: ${attempt.reason}`)
}

export function licenseLines(photo: ShownPhoto | null): string[] {
  if (!photo) return [OUTLINES_LICENSE]
  const { sourceId } = photo.image
  const kind = isHips2fits(sourceId) ? (requestLayer(photo.request) === 'halpha' ? 'hips2fits-halpha' : 'hips2fits') : sourceId
  return [OUTLINES_LICENSE, PHOTO_LICENSE[kind]]
}

export function photoRect(photo: ShownPhoto, frameCenter: EquatorialDeg, viewFovDeg: number): ViewRect {
  const { request } = photo
  const covered = photo.image.sourceId === 'stsci' ? stsciCoveredFovDeg(request.fovDeg) : request.fovDeg
  const halfTan = (fovDeg: number) => Math.tan((fovDeg * Math.PI) / 360)
  const side = (VIEW_SIZE * halfTan(covered)) / halfTan(viewFovDeg)
  const center = skyToCutout({ center: frameCenter, fovDeg: viewFovDeg, widthPx: VIEW_SIZE, heightPx: VIEW_SIZE }, request.center)
  return { x: center.x - side / 2, y: center.y - side / 2, width: side, height: side }
}

/** Pole widoku kadru: po zoomie `fovDeg`, inaczej pole wycinka kadru. */
const viewFov = (frame: PhotoFrame) => frame.fovDeg ?? cutoutFovDeg(frame.size)

const sameSize = (a: MosaicSize, b: MosaicSize) => a.widthDeg === b.widthDeg && a.heightDeg === b.heightDeg

/**
 * `zoomed` – pole widoku zmieniono zoomem (domyślnie tak); wtedy każda różnica pola widoku i pola `previous` daje nowy
 * wycinek. Bez zoomu (np. zmiana mozaiki albo profilu) decyduje `needsNewCutout` z polem planowanym, jak dotąd.
 */
export function nextPhotoRequest(
  previous: SkyImageRequest | null,
  frame: PhotoFrame,
  layerId: SkyImageLayerId,
  dragging: boolean,
  zoomed = true,
): SkyImageRequest | null {
  if (dragging) return null
  const fovDeg = viewFov(frame)
  const layer = effectiveLayer(layerId, fovDeg)
  const stale =
    previous === null ||
    requestLayer(previous) !== layer ||
    (zoomed && frame.fovDeg !== undefined && Math.abs(fovDeg - previous.fovDeg) >= FOV_CHANGE_EPS_DEG) ||
    needsNewCutout({ center: previous.center, fovDeg: previous.fovDeg }, frame, frame.fovDeg)
  return stale ? planCutout(frame.center, frame.size, layer, frame.fovDeg) : null
}

export function createPhotoLayer(loader: PhotoLoaderPort): PhotoLayer {
  let source: SourceChoice = 'auto'
  let chosenLayer: SkyImageLayerId = 'dss2-color'
  let frame: PhotoFrame | null = null
  let lastRequest: SkyImageRequest | null = null
  /** Pole widoku zmieniono zoomem od ostatniego sprawdzenia po zakończonym geście. */
  let zoomPending = false
  let lastOptions: SkyImageLoadOptions = {}
  let loadSeq = 0
  let loading = false
  let photo: ShownPhoto | null = null
  let attempts: string[] | null = null
  let saving = false
  let saveMessage: string | null = null
  let cached: PhotoLayerView | null = null
  const listeners = new Set<() => void>()

  const frameFov = () => (frame ? viewFov(frame) : UNKNOWN_FOV_DEG)
  const currentLayer = () => effectiveLayer(chosenLayer, frameFov())

  function changed(): void {
    cached = null
    for (const listener of [...listeners]) listener()
  }

  function load(request: SkyImageRequest, options: SkyImageLoadOptions): void {
    loadSeq += 1
    const seq = loadSeq
    lastRequest = request
    lastOptions = options
    loading = true
    saveMessage = null
    changed()
    void loader.load(request, options).then((result) => {
      if (result.kind === 'superseded' || seq !== loadSeq) return
      loading = false
      if (result.kind === 'image') {
        photo = { image: result, request }
        attempts = null
      } else {
        photo = null
        attempts = attemptLines(result.attempts)
      }
      changed()
    })
  }

  /** Nowe pobranie dla bieżącego kadru po zmianie wyboru źródła lub warstwy. */
  function reload(): void {
    if (!frame) {
      changed()
      return
    }
    const layer = currentLayer()
    load(planCutout(frame.center, frame.size, layer, frame.fovDeg), loadOptions(source, layer))
  }

  function buildView(): PhotoLayerView {
    const offline = photo && !loading ? { label: saving ? SAVING_LABEL : OFFLINE_LABEL, disabled: saving } : null
    return {
      source,
      sourceOptions: sourceChoices(),
      layer: currentLayer(),
      layerOptions: layerChoices(frameFov()),
      photo,
      caption: photo ? photoCaption(photo) : null,
      loadingText: loading ? LOADING_TEXT : null,
      missing: !loading && attempts ? { message: MISSING_TEXT, attempts } : null,
      offline,
      saveMessage,
      licenses: licenseLines(photo),
    }
  }

  return {
    view() {
      cached ??= buildView()
      return cached
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    setFrame(next, dragging) {
      const before = frameFov()
      const previousFrame = frame
      frame = { center: { ...next.center }, size: { ...next.size }, ...(next.fovDeg === undefined ? {} : { fovDeg: next.fovDeg }) }
      const layer = currentLayer()
      if (previousFrame && !sameSize(previousFrame.size, frame.size)) zoomPending = false
      else if (previousFrame && viewFov(previousFrame) !== viewFov(frame)) zoomPending = true
      const request = nextPhotoRequest(lastRequest, frame, layer, dragging, zoomPending)
      if (!dragging) zoomPending = false
      if (request) load(request, loadOptions(source, layer))
      else if (frameFov() !== before) changed()
    },
    chooseSource(next) {
      source = next
      reload()
    },
    chooseLayer(layerId) {
      chosenLayer = layerId
      reload()
    },
    retry() {
      if (lastRequest) load(lastRequest, lastOptions)
    },
    async saveOffline() {
      if (saving || !photo || loading) return
      saving = true
      saveMessage = null
      changed()
      const result = await loader.saveOffline()
      saving = false
      if (result === 'saved') {
        const current = loader.current()
        if (photo && !loading && current?.kind === 'image') photo = { image: current, request: photo.request }
        saveMessage = SAVED_TEXT
      } else {
        saveMessage = SAVE_FAILED_TEXT
      }
      changed()
    },
  }
}
