// Miniatury obiektów (katalog, nagłówek zakładki Noc): mały wycinek DSS2 z CDS hips2fits wokół obiektu.
// Katalog bierze DSS2 czerwony (mono), na którym lepiej widać słabe i ciemne obiekty; nagłówek Noc DSS2 kolor.
// Czysta funkcja adresu, bez sieci; pobiera przeglądarka (element <img>), a pamięć podręczną trzyma jej cache HTTP.
import type { DsoObject } from '../../types'
import { skyImageUrl, type SkyImageLayerId } from './sources'

/** Rozmiar przyjmowany dla obiektów bez rozmiaru w katalogu [′]. */
const DEFAULT_SIZE_ARCMIN = 12
/** Pole miniatury: obiekt z marginesem, w granicach [°]. */
const FOV_MARGIN = 1.6
const MIN_FOV_DEG = 0.2
const MAX_FOV_DEG = 8

/** Pole widoku miniatury obiektu [°]: wielka oś × 1,6, od 0,2° do 8°. */
export function thumbnailFovDeg(object: Pick<DsoObject, 'sizeMajorArcmin'>): number {
  const sizeDeg = (object.sizeMajorArcmin ?? DEFAULT_SIZE_ARCMIN) / 60
  return Math.min(MAX_FOV_DEG, Math.max(MIN_FOV_DEG, sizeDeg * FOV_MARGIN))
}

/** Adres kwadratowej miniatury `sizePx` × `sizePx` z serwera alaskybis (domyślnie DSS2 kolor). */
export function thumbnailUrl(
  object: Pick<DsoObject, 'raDeg' | 'decDeg' | 'sizeMajorArcmin'>,
  sizePx: number,
  layerId: SkyImageLayerId = 'dss2-color',
): string {
  return skyImageUrl('alaskybis', {
    center: { raDeg: object.raDeg, decDeg: object.decDeg },
    fovDeg: thumbnailFovDeg(object),
    sizePx,
    layerId,
  })
}
