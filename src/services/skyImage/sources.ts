// Źródła zdjęć nieba (zrodla-zdjec): adresy, warstwy, pole wycinka, klucz pamięci podręcznej
// i decyzja o nowym wycinku. Czyste funkcje i dane, bez sieci, zegara ani przeglądarki.
//
// Nazwy, których spec nie podaje (wybrane przez test-author):
// - `skyImageSources()` – lista źródeł w stałej kolejności [Z28] (`SkyImageSource`: id, nazwa, zapis offline).
// - `layersForFov(fovDeg)` – warstwy dostępne dla pola wycinka (Hα od 3°), w kolejności kolor, czerwony, Hα.
// - `effectiveLayer(layerId, fovDeg)` – warstwa naprawdę używana (Hα poniżej progu → DSS2 kolor).
// - `cutoutFovDeg(size)` – pole wycinka: 2 × przekątna kadru lub mozaiki (`MosaicSize` z `services/framing.ts`),
//   zaokrąglone do 0,01°, najwyżej 60°.
// - `planCutout(frameCenter, size, layerId)` – wycinek do pobrania: środek kadru zaokrąglony jak w adresie
//   (RA sprowadzone do [0, 360)), pole z `cutoutFovDeg`, 1000 px, warstwa.
// - `skyImageUrl(sourceId, request)` – adres zdjęcia (`SkyImageRequest`: środek, pole planowane, rozmiar px, warstwa).
// - `skyImageCacheKey(sourceId, request)` – klucz w pamięci podręcznej (ścieżka) albo null dla SkyView.
// - `stsciCoveredFovDeg(fovDeg)` – pole naprawdę pokryte przez obraz STScI (najwyżej 1°).
// - `stsciScaleArcsecPerPx(fovDeg, naturalWidthPx)` – skala obrazu STScI z pola planowanego wycinka.
// - `needsNewCutout(cutout, frame)` – czy po przesunięciu lub zmianie kadru trzeba pobrać nowy wycinek.
import { angularSeparationDeg, type EquatorialDeg } from '../astroMath'
import type { MosaicSize } from '../framing'

export type SkyImageSourceId = 'alaskybis' | 'alasky' | 'skyview' | 'stsci'
export type SkyImageLayerId = 'dss2-color' | 'dss2-red' | 'halpha'

export interface SkyImageSource {
  id: SkyImageSourceId
  /** Np. „CDS hips2fits (alaskybis)”. */
  name: string
  /** Czy wycinek z tego źródła wolno zapisać do pracy offline. */
  offline: boolean
}

export interface SkyImageLayer {
  id: SkyImageLayerId
  /** „DSS2 kolor”, „DSS2 czerwony” albo „Hα (Finkbeiner)”. */
  name: string
}

/** Domyślny rozmiar wycinka (kwadratowego) w pikselach. */
export const CUTOUT_SIZE_PX = 1000

/** Wycinek do pobrania: środek, pole planowane [°] (przed przycięciem STScI), bok w px, wybrana warstwa. */
export interface SkyImageRequest {
  center: EquatorialDeg
  fovDeg: number
  sizePx: number
  layerId: SkyImageLayerId
}

/** Pobrany wycinek, z którym porównuje się kadr: środek i pole planowane [°]. */
export interface CutoutState {
  center: EquatorialDeg
  fovDeg: number
}

/** Bieżący kadr: środek i rozmiar kątowy kadru lub całej mozaiki. */
export interface FrameState {
  center: EquatorialDeg
  size: MosaicSize
}

/** Różnica mniejsza niż ta liczy się jako równość [°]. */
const EPS_DEG = 1e-6
/** Największe pole wycinka [°]. */
const MAX_CUTOUT_FOV_DEG = 60
/** Najmniejsze pole wycinka, przy którym dostępna jest warstwa Hα [°]. */
const HALPHA_MIN_FOV_DEG = 3
/** Największe pole obrazu STScI DSS [°]. */
const STSCI_MAX_FOV_DEG = 1
const CACHE_PREFIX = '/sky-image-cache'

const SOURCES: readonly SkyImageSource[] = [
  { id: 'alaskybis', name: 'CDS hips2fits (alaskybis)', offline: true },
  { id: 'alasky', name: 'CDS hips2fits (alasky)', offline: true },
  { id: 'skyview', name: 'NASA SkyView', offline: false },
  { id: 'stsci', name: 'STScI DSS', offline: true },
]

const LAYERS: readonly SkyImageLayer[] = [
  { id: 'dss2-color', name: 'DSS2 kolor' },
  { id: 'dss2-red', name: 'DSS2 czerwony' },
  { id: 'halpha', name: 'Hα (Finkbeiner)' },
]

/** Identyfikator HiPS (zakodowany do adresu) dla każdej warstwy. */
const HIPS_ID: Record<SkyImageLayerId, string> = {
  'dss2-color': 'CDS%2FP%2FDSS2%2Fcolor',
  'dss2-red': 'CDS%2FP%2FDSS2%2Fred',
  halpha: 'CDS%2FP%2FFinkbeiner',
}

/** Zaokrąglenie do 4 miejsc po przecinku, bez −0. */
function round4(value: number): number {
  const rounded = Math.round(value * 1e4) / 1e4
  return rounded === 0 ? 0 : rounded
}

/** RA sprowadzone do [0, 360) i zaokrąglone jak w adresie. */
function roundRa(raDeg: number): number {
  const ra = round4(((raDeg % 360) + 360) % 360)
  return ra >= 360 ? 0 : ra
}

/** Liczba w adresie lub kluczu: kropka, najwyżej 4 miejsca, bez zbędnych zer. */
function num(value: number): string {
  return String(round4(value))
}

export function skyImageSources(): SkyImageSource[] {
  return SOURCES.map((source) => ({ ...source }))
}

export function layersForFov(fovDeg: number): SkyImageLayer[] {
  return LAYERS.filter((layer) => effectiveLayer(layer.id, fovDeg) === layer.id).map((layer) => ({ ...layer }))
}

export function effectiveLayer(layerId: SkyImageLayerId, fovDeg: number): SkyImageLayerId {
  return layerId === 'halpha' && fovDeg < HALPHA_MIN_FOV_DEG - EPS_DEG ? 'dss2-color' : layerId
}

export function cutoutFovDeg(size: MosaicSize): number {
  const fov = Math.round(2 * Math.hypot(size.widthDeg, size.heightDeg) * 100) / 100
  return Math.min(MAX_CUTOUT_FOV_DEG, fov)
}

/**
 * zoom-kadru: `plannedFovDeg` – pole widoku po zoomie; gdy podane, jest polem wycinka bez zaokrąglania do 0,01° (adres
 * i klucz i tak mają najwyżej 4 miejsca). Bez niego `cutoutFovDeg(size)` jak dotąd.
 */
export function planCutout(
  frameCenter: EquatorialDeg,
  size: MosaicSize,
  layerId: SkyImageLayerId,
  plannedFovDeg?: number,
): SkyImageRequest {
  return {
    center: { raDeg: roundRa(frameCenter.raDeg), decDeg: round4(frameCenter.decDeg) },
    fovDeg: plannedFovDeg ?? cutoutFovDeg(size),
    sizePx: CUTOUT_SIZE_PX,
    layerId,
  }
}

export function skyImageUrl(sourceId: SkyImageSourceId, request: SkyImageRequest): string {
  const ra = num(roundRa(request.center.raDeg))
  const dec = num(request.center.decDeg)
  const fov = num(request.fovDeg)
  const size = num(request.sizePx)
  switch (sourceId) {
    case 'alaskybis':
    case 'alasky': {
      const hips = HIPS_ID[effectiveLayer(request.layerId, request.fovDeg)]
      return (
        `https://${sourceId}.cds.unistra.fr/hips-image-services/hips2fits?hips=${hips}` +
        `&width=${size}&height=${size}&fov=${fov}&ra=${ra}&dec=${dec}&projection=TAN&format=jpg`
      )
    }
    case 'skyview':
      return (
        'https://skyview.gsfc.nasa.gov/current/cgi/runquery.pl?Survey=dss2r' +
        `&Position=${ra},${dec}&Size=${fov}&Pixels=${size}&Return=JPG`
      )
    case 'stsci': {
      const sideArcmin = num(stsciCoveredFovDeg(request.fovDeg) * 60)
      return (
        `https://archive.stsci.edu/cgi-bin/dss_search?format=GIF&r=${ra}&d=${dec}&e=J2000` +
        `&w=${sideArcmin}&h=${sideArcmin}&v=1`
      )
    }
  }
}

export function skyImageCacheKey(sourceId: SkyImageSourceId, request: SkyImageRequest): string | null {
  const ra = num(roundRa(request.center.raDeg))
  const dec = num(request.center.decDeg)
  switch (sourceId) {
    case 'alaskybis':
    case 'alasky': {
      const hips = HIPS_ID[effectiveLayer(request.layerId, request.fovDeg)]
      return `${CACHE_PREFIX}/hips2fits/${hips}/${ra}/${dec}/${num(request.fovDeg)}/${num(request.sizePx)}`
    }
    case 'stsci':
      return `${CACHE_PREFIX}/stsci/dss/${ra}/${dec}/${num(stsciCoveredFovDeg(request.fovDeg))}/0`
    case 'skyview':
      return null
  }
}

export function stsciCoveredFovDeg(fovDeg: number): number {
  return Math.min(STSCI_MAX_FOV_DEG, fovDeg)
}

export function stsciScaleArcsecPerPx(fovDeg: number, naturalWidthPx: number): number {
  return (stsciCoveredFovDeg(fovDeg) * 3600) / naturalWidthPx
}

/**
 * zoom-kadru: `plannedFovDeg` – pole planowane (pole widoku po
 * zoomie) zamiast `cutoutFovDeg(frame.size)`; reguły (większe, mniej niż połowa, przesunięcie > ¼ pola wycinka) bez
 * zmian. Bez niego jak dotąd.
 */
export function needsNewCutout(cutout: CutoutState, frame: FrameState, plannedFovDeg?: number): boolean {
  const planned = plannedFovDeg ?? cutoutFovDeg(frame.size)
  if (planned > cutout.fovDeg + EPS_DEG) return true
  if (planned < cutout.fovDeg / 2 - EPS_DEG) return true
  return angularSeparationDeg(cutout.center, frame.center) > cutout.fovDeg / 4 + EPS_DEG
}
