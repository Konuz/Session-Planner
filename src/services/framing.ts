// Geometria kadru, mozaiki i OAG (geometria-kadru, sekcja 7B): czyste funkcje, bez sieci.
// ZAŚLEPKA: funkcje rzucają NotImplementedError; implementację dopisuje implementer.
//
// Nazwy, których spec nie podaje (wybrane przez test-author):
// - `normalizeFraming(framing)` – przycięcie zakresów z P8 (mozaika 1–5, zakładka 10–30%, PA w [0, 360)).
// - `mosaicPanels(profile, framing)` – panele wierszami od góry, w wierszu od lewej (P3); środek, lokalny PA,
//   narożniki w kolejności: lewy górny, prawy górny, prawy dolny, lewy dolny (lewa/góra kadru, nie ekranu).
// - `oagPrisms(profile, framing)` – prostokąt pryzmatu (4 punkty nieba) przy każdym panelu; [] gdy `oag` = null.
// - `mosaicSizeDeg(profile, framing)` – rozmiar całej mozaiki (P7).
// - `skyToCutout(cutout, point)` – punkt nieba → piksel wycinka TAN; `cutoutToSky(cutout, pixel)` – odwrotnie.
// Funkcje przyjmują wartości spoza zakresu i same je przycinają (P8).
import type { EquatorialDeg } from './astroMath'
import type { EquipmentProfile, Framing } from '../types'

/** Cztery punkty nieba prostokąta. */
export type SkyQuad = [EquatorialDeg, EquatorialDeg, EquatorialDeg, EquatorialDeg]

export interface MosaicPanel {
  /** Kolumna od lewej kadru, 0…cols−1. */
  col: number
  /** Wiersz od góry kadru, 0…rows−1. */
  row: number
  center: EquatorialDeg
  /** Lokalny PA panelu (od N przez E), [0, 360). */
  paDeg: number
  /** Lewy górny, prawy górny, prawy dolny, lewy dolny (strony kadru). */
  corners: SkyQuad
}

export interface MosaicSize {
  widthDeg: number
  heightDeg: number
}

/** Wycinek zdjęcia w rzucie TAN, N u góry, E po lewej; `fovDeg` dotyczy dłuższego boku. */
export interface SkyCutout {
  center: EquatorialDeg
  fovDeg: number
  widthPx: number
  heightPx: number
}

/** Piksel wycinka: (0; 0) to lewy górny róg, x w prawo, y w dół. */
export interface CutoutPoint {
  x: number
  y: number
}

function notImplemented(name: string, ...args: unknown[]): never {
  const error = new Error(`${name}: not implemented (${args.length})`)
  error.name = 'NotImplementedError'
  throw error
}

export function normalizeFraming(framing: Framing): Framing {
  return notImplemented('normalizeFraming', framing)
}

export function mosaicPanels(profile: EquipmentProfile, framing: Framing): MosaicPanel[] {
  return notImplemented('mosaicPanels', profile, framing)
}

export function oagPrisms(profile: EquipmentProfile, framing: Framing): SkyQuad[] {
  return notImplemented('oagPrisms', profile, framing)
}

export function mosaicSizeDeg(profile: EquipmentProfile, framing: Framing): MosaicSize {
  return notImplemented('mosaicSizeDeg', profile, framing)
}

export function skyToCutout(cutout: SkyCutout, point: EquatorialDeg): CutoutPoint {
  return notImplemented('skyToCutout', cutout, point)
}

export function cutoutToSky(cutout: SkyCutout, pixel: CutoutPoint): EquatorialDeg {
  return notImplemented('cutoutToSky', cutout, pixel)
}
