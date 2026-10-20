// Źródła zdjęć nieba (zrodla-zdjec): adresy, warstwy, pole wycinka, klucz pamięci podręcznej
// i decyzja o nowym wycinku. Czyste funkcje i dane, bez sieci, zegara ani przeglądarki.
// ZAŚLEPKA: funkcje rzucają NotImplementedError; implementację dopisuje implementer.
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
import type { EquatorialDeg } from '../astroMath'
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

function notImplemented(name: string, ...args: unknown[]): never {
  const error = new Error(`${name}: not implemented (${args.length})`)
  error.name = 'NotImplementedError'
  throw error
}

export function skyImageSources(): SkyImageSource[] {
  return notImplemented('skyImageSources')
}

export function layersForFov(fovDeg: number): SkyImageLayer[] {
  return notImplemented('layersForFov', fovDeg)
}

export function effectiveLayer(layerId: SkyImageLayerId, fovDeg: number): SkyImageLayerId {
  return notImplemented('effectiveLayer', layerId, fovDeg)
}

export function cutoutFovDeg(size: MosaicSize): number {
  return notImplemented('cutoutFovDeg', size)
}

export function planCutout(frameCenter: EquatorialDeg, size: MosaicSize, layerId: SkyImageLayerId): SkyImageRequest {
  return notImplemented('planCutout', frameCenter, size, layerId)
}

export function skyImageUrl(sourceId: SkyImageSourceId, request: SkyImageRequest): string {
  return notImplemented('skyImageUrl', sourceId, request)
}

export function skyImageCacheKey(sourceId: SkyImageSourceId, request: SkyImageRequest): string | null {
  return notImplemented('skyImageCacheKey', sourceId, request)
}

export function stsciCoveredFovDeg(fovDeg: number): number {
  return notImplemented('stsciCoveredFovDeg', fovDeg)
}

export function stsciScaleArcsecPerPx(fovDeg: number, naturalWidthPx: number): number {
  return notImplemented('stsciScaleArcsecPerPx', fovDeg, naturalWidthPx)
}

export function needsNewCutout(cutout: CutoutState, frame: FrameState): boolean {
  return notImplemented('needsNewCutout', cutout, frame)
}
