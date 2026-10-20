// Czysty model zakładki Kadr (zakladka-kadr): przesuwanie tła, odczyt pól PA i zakładki mozaiki, kadr przy zmianie
// obiektu i dane kadru.
//
// - `VIEW_SIZE` = 1000 – układ współrzędnych widoku (`viewBox="0 0 1000 1000"`), środek w (500; 500).
// - `dragFraming(start, pointer, fovDeg, renderedWidthPx)` – przesuwanie tła [Z11]: przesunięcie wskaźnika od początku
//   przeciągania (piksele ekranu × VIEW_SIZE / szerokość widoku na ekranie) → nowy środek to punkt nieba pod pikselem
//   (500 − dx; 500 − dy) widoku ze środkiem w środku z chwili rozpoczęcia (`cutoutToSky`). PA i mozaika bez zmian.
// - `readPaInput` / `readOverlapInput` – pola liczbowe (przecinek albo kropka); zły tekst → komunikat, wartość bez zmian.
import { formatDeg } from '../../services/format'
import { normalizeDeg } from '../../services/astroMath'
import { parseDecimal } from '../../services/equipment'
import { cutoutToSky, mosaicSizeDeg, type SkyCutout } from '../../services/framing'
import { cutoutFovDeg } from '../../services/skyImage/sources'
import { profilePreview, profileToForm } from '../equipment/profileForm'
import type { DsoObject, EquipmentProfile, Framing } from '../../types'

/** Rozmiar widoku w jednostkach `viewBox` (kwadrat). */
export const VIEW_SIZE = 1000

// ---------- Zoom widoku (zoom-kadru) ----------
// Nazwy, których spec nie podaje (wybrane przez test-author):
// - `ZOOM_STEP` = 1,5 – krok „+”/„−” i jednego ząbka kółka.
// - `MAX_VIEW_FOV_DEG` = 60 – największe pole widoku.
// - `ZoomBounds` / `zoomBounds(profile, framing)` – granice zoomu dla profilu i kadru:
//   `fitDeg` = pole „Dopasuj” = `cutoutFovDeg(mosaicSizeDeg(profile, framing))` (jak dotąd, np. 3,05° przy 1×1
//   i 4,45° przy 2×1 dla „Mój zestaw”), `minDeg` = 1,2 × przekątna JEDNEGO kadru (`Math.hypot` z `mosaicSizeDeg`
//   dla mozaiki 1×1 tego profilu, ok. 1,833° dla „Mój zestaw”, także przy mozaice), `maxDeg` = `MAX_VIEW_FOV_DEG`.
// - `zoomIn(fovDeg, bounds)` / `zoomOut(fovDeg, bounds)` – „+” (pole / 1,5) i „−” (pole × 1,5), przycięte do
//   [minDeg, maxDeg].
// - `canZoomIn(fovDeg, bounds)` / `canZoomOut(fovDeg, bounds)` – czy „+” / „−” jest aktywny: false, gdy pole leży
//   na granicy, inaczej true (testy sprawdzają pole równe granicy i pola co najmniej 0,01° od niej; tolerancję
//   porównania wybiera implementer).
// - `wheelZoom(fovDeg, deltaY, deltaMode, bounds)` – kółko myszy (`WheelEvent.deltaY`, `deltaMode`: 0 = piksele,
//   1 = linie): 100 px albo 3 linie = jeden krok ×1,5; deltaY < 0 (od siebie) przybliża, > 0 oddala; ułamek ząbka
//   (np. gładzik, −50 px) = ułamek kroku w skali logarytmicznej (pole × 1,5^(deltaY/100)). Wynik przycięty jak wyżej.
//   Tryb stron (`deltaMode` = 2) spec nie opisuje i testy go nie sprawdzają.
// - `pinchZoom(startFovDeg, startDistancePx, distancePx, bounds)` – szczypanie: pole z chwili dotknięcia drugim
//   palcem × odległość początkowa / bieżąca, przycięte jak wyżej.
// - `fovReadout(fovDeg)` – odczyt „Pole widoku: 3,05°” (pl-PL, przecinek, 2 miejsca po przecinku).
//
// Zakładka (FramingTab, nazwy wybrane przez test-author):
// - przyciski zoomu rozpoznawane po tekście, `aria-label` albo `title` równym „+”, „−” (albo „-”) i „Dopasuj”;
//   nieaktywny przycisk ma `disabled`;
// - odczyt „Pole widoku: …” gdzieś w tekście zakładki;
// - kółko: nasłuch `wheel` dodany przez `addEventListener(..., { passive: false })` na elemencie widoku (svg widoku
//   albo jego przodku, który nie obejmuje list wyboru zakładki), z `preventDefault()`;
// - szczypanie i przeciąganie: obsługa `onPointerDown` / `onPointerMove` / `onPointerUp` (jak dotąd) na svg widoku
//   albo jego przodku;
// - hak `useSkyImage` dostaje pole widoku w `fovDeg` (zob. useSkyImage.ts).

/** Krok zoomu przyciskami i jednym ząbkiem kółka. */
export const ZOOM_STEP = 1.5
/** Największe pole widoku [°]. */
export const MAX_VIEW_FOV_DEG = 60

/** Granice zoomu widoku [°]. */
export interface ZoomBounds {
  /** Pole „Dopasuj” (pole wycinka kadru albo mozaiki). */
  fitDeg: number
  /** 1,2 × przekątna jednego kadru. */
  minDeg: number
  /** 60°. */
  maxDeg: number
}

export function zoomBounds(profile: EquipmentProfile, framing: Framing): ZoomBounds {
  const single = mosaicSizeDeg(profile, { ...framing, mosaic: { ...framing.mosaic, cols: 1, rows: 1 } })
  return {
    fitDeg: cutoutFovDeg(mosaicSizeDeg(profile, framing)),
    minDeg: 1.2 * Math.hypot(single.widthDeg, single.heightDeg),
    maxDeg: MAX_VIEW_FOV_DEG,
  }
}

/** Tolerancja porównania pola z granicą [°]. */
const BOUND_EPS_DEG = 1e-6

const clampFov = (fovDeg: number, bounds: ZoomBounds) => Math.min(bounds.maxDeg, Math.max(bounds.minDeg, fovDeg))

export function zoomIn(fovDeg: number, bounds: ZoomBounds): number {
  return clampFov(fovDeg / ZOOM_STEP, bounds)
}

export function zoomOut(fovDeg: number, bounds: ZoomBounds): number {
  return clampFov(fovDeg * ZOOM_STEP, bounds)
}

export function canZoomIn(fovDeg: number, bounds: ZoomBounds): boolean {
  return fovDeg > bounds.minDeg + BOUND_EPS_DEG
}

export function canZoomOut(fovDeg: number, bounds: ZoomBounds): boolean {
  return fovDeg < bounds.maxDeg - BOUND_EPS_DEG
}

/** Jeden ząbek kółka: 100 px (`deltaMode` 0), 3 linie (1) albo 1 strona (2). */
const WHEEL_TICK = [100, 3, 1]

export function wheelZoom(fovDeg: number, deltaY: number, deltaMode: number, bounds: ZoomBounds): number {
  const ticks = deltaY / (WHEEL_TICK[deltaMode] ?? WHEEL_TICK[0])
  if (!Number.isFinite(ticks)) return clampFov(fovDeg, bounds)
  return clampFov(fovDeg * ZOOM_STEP ** ticks, bounds)
}

export function pinchZoom(startFovDeg: number, startDistancePx: number, distancePx: number, bounds: ZoomBounds): number {
  if (!(startDistancePx > 0) || !(distancePx > 0)) return clampFov(startFovDeg, bounds)
  return clampFov((startFovDeg * startDistancePx) / distancePx, bounds)
}

export function fovReadout(fovDeg: number): string {
  return `Pole widoku: ${fixed2(fovDeg)}°`
}

const fixed2 = (value: number) =>
  new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false }).format(value)

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

export const PA_ERROR = 'PA: wpisz liczbę'
export const OVERLAP_ERROR = 'Zakładka: wpisz liczbę'
const OVERLAP_MIN = 10
const OVERLAP_MAX = 30

/** Kadr startowy (P6): PA 0°, mozaika 1×1, zakładka 20%. */
export const DEFAULT_MOSAIC: Framing['mosaic'] = { cols: 1, rows: 1, overlapPct: 20 }

/** Wycinek TAN widoku: środek kadru w środku, VIEW_SIZE × VIEW_SIZE jednostek. */
export function viewCutout(framing: Framing, fovDeg: number): SkyCutout {
  return {
    center: { raDeg: framing.centerRaDeg, decDeg: framing.centerDecDeg },
    fovDeg,
    widthPx: VIEW_SIZE,
    heightPx: VIEW_SIZE,
  }
}

export function dragFraming(start: DragStart, pointer: ScreenPoint, fovDeg: number, renderedWidthPx: number): Framing {
  const unitsPerPx = renderedWidthPx > 0 && Number.isFinite(renderedWidthPx) ? VIEW_SIZE / renderedWidthPx : 1
  const dx = (pointer.x - start.pointer.x) * unitsPerPx
  const dy = (pointer.y - start.pointer.y) * unitsPerPx
  const half = VIEW_SIZE / 2
  const sky = cutoutToSky(viewCutout(start.framing, fovDeg), { x: half - dx, y: half - dy })
  if (!Number.isFinite(sky.raDeg) || !Number.isFinite(sky.decDeg)) return start.framing
  return {
    ...start.framing,
    centerRaDeg: normalizeDeg(sky.raDeg),
    centerDecDeg: Math.min(90, Math.max(-90, sky.decDeg)),
  }
}

export function readPaInput(text: string, currentPaDeg: number): PaInputResult {
  const value = parseDecimal(text)
  if (value === null || !Number.isFinite(value)) return { paDeg: currentPaDeg, error: PA_ERROR }
  return { paDeg: normalizeDeg(value), error: null }
}

export function readOverlapInput(text: string, currentPct: number): OverlapInputResult {
  const value = parseDecimal(text)
  if (value === null || !Number.isFinite(value)) return { overlapPct: currentPct, error: OVERLAP_ERROR }
  return { overlapPct: Math.min(OVERLAP_MAX, Math.max(OVERLAP_MIN, value)), error: null }
}

/** Kadr ze środkiem w obiekcie; PA i mozaika z `rest` (bez niego: PA 0°, 1×1, 20%). */
export function centeredOn(object: Pick<DsoObject, 'raDeg' | 'decDeg'>, rest: Framing | null): Framing {
  return {
    paDeg: rest?.paDeg ?? 0,
    mosaic: rest?.mosaic ?? DEFAULT_MOSAIC,
    centerRaDeg: object.raDeg,
    centerDecDeg: object.decDeg,
  }
}

/**
 * Kadr pokazywany w zakładce: zapisany, gdy wyśrodkowano go na tym samym obiekcie; inny obiekt (albo brak kadru)
 * przenosi środek na obiekt, a PA i mozaika zostają (P4, P5).
 */
export function effectiveFraming(object: DsoObject, stored: Framing | null, storedUid: string | null): Framing {
  return stored !== null && storedUid === object.uid ? stored : centeredOn(object, stored)
}

/** Odczyt środka: „RA 83,8187°, Dec −5,3897°”. */
export function centerReadout(frame: Framing): string {
  return `RA ${formatDeg(frame.centerRaDeg, 4)}, Dec ${formatDeg(frame.centerDecDeg, 4)}`
}

const numberText = (value: number, digits: number) =>
  new Intl.NumberFormat('pl-PL', { maximumFractionDigits: digits, useGrouping: false }).format(value)

/** Liczba w polu tekstowym (przecinek dziesiętny), np. 30,25 → „30,25”. */
export function fieldText(value: number): string {
  return numberText(value, 4)
}

export interface FramingFacts {
  /** „1,080° × 1,080° (64,8′ × 64,8′)”. */
  fov: string
  /** „1,293″/px”. */
  scale: string
  sampling: string
  oscNote: string | null
  /** „9,668° × 3,597°” przy mozaice większej niż 1×1, inaczej null. */
  mosaic: string | null
}

const fixed3 = (value: number) =>
  new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 3, maximumFractionDigits: 3, useGrouping: false }).format(value)

/** Dane kadru (P17): optyka profilu jak w podglądzie profilu, a przy mozaice jej rozmiar. */
export function framingFacts(profile: EquipmentProfile, mosaic: Framing['mosaic'], seeingArcsec: number): FramingFacts {
  const preview = profilePreview(profileToForm(profile), seeingArcsec)
  const isMosaic = mosaic.cols * mosaic.rows > 1
  const size = isMosaic ? mosaicSizeDeg(profile, { centerRaDeg: 0, centerDecDeg: 0, paDeg: 0, mosaic }) : null
  return {
    fov: `${preview.fieldOfViewDeg} (${preview.fieldOfViewArcmin})`,
    scale: preview.scale,
    sampling: preview.sampling,
    oscNote: preview.oscNote,
    mosaic: size ? `${fixed3(size.widthDeg)}° × ${fixed3(size.heightDeg)}°` : null,
  }
}
