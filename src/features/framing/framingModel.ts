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
import { profilePreview, profileToForm } from '../equipment/profileForm'
import type { DsoObject, EquipmentProfile, Framing } from '../../types'

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
