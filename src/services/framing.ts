// Geometria kadru, mozaiki i OAG (geometria-kadru, sekcja 7B): czyste funkcje, bez sieci.
//
// Nazwy, których spec nie podaje (wybrane przez test-author):
// - `normalizeFraming(framing)` – przycięcie zakresów z P8 (mozaika 1–5, zakładka 10–30%, PA w [0, 360)).
// - `mosaicPanels(profile, framing)` – panele wierszami od góry, w wierszu od lewej (P3); środek, lokalny PA,
//   narożniki w kolejności: lewy górny, prawy górny, prawy dolny, lewy dolny (lewa/góra kadru, nie ekranu).
// - `oagPrisms(profile, framing)` – prostokąt pryzmatu (4 punkty nieba) przy każdym panelu; [] gdy `oag` = null.
// - `mosaicSizeDeg(profile, framing)` – rozmiar całej mozaiki (P7).
// - `skyToCutout(cutout, point)` – punkt nieba → piksel wycinka TAN; `cutoutToSky(cutout, pixel)` – odwrotnie.
// Funkcje przyjmują wartości spoza zakresu i same je przycinają (P8).
import { computeOptics, gnomonicProject, gnomonicUnproject, normalizeDeg, type EquatorialDeg } from './astroMath'
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

const DEG = Math.PI / 180

/** Wektor na płaszczyźnie stycznej (ξ ku E, η ku N) [rad]. */
type Vec = [number, number]

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min))

export function normalizeFraming(framing: Framing): Framing {
  const { cols, rows, overlapPct } = framing.mosaic
  return {
    ...framing,
    paDeg: normalizeDeg(framing.paDeg),
    mosaic: {
      cols: clamp(Math.round(cols), 1, 5),
      rows: clamp(Math.round(rows), 1, 5),
      overlapPct: clamp(overlapPct, 10, 30),
    },
  }
}

interface Layout {
  framing: Framing
  center: EquatorialDeg
  /** Wymiary matrycy [rad] i odsunięcie środków paneli w krotnościach wymiaru. */
  width: number
  height: number
  step: number
  up: Vec
  right: Vec
  /** Rozmiar w mm → rad. */
  perMm: number
}

function layout(profile: EquipmentProfile, input: Framing): Layout {
  const framing = normalizeFraming(input)
  const optics = computeOptics({ ...profile.telescope, ...profile.camera, reducerFactor: profile.reducerFactor })
  const perMm = 1 / optics.effectiveFocalLengthMm
  const theta = framing.paDeg * DEG
  return {
    framing,
    center: { raDeg: framing.centerRaDeg, decDeg: framing.centerDecDeg },
    width: optics.sensorWidthMm * perMm,
    height: optics.sensorHeightMm * perMm,
    step: 1 - framing.mosaic.overlapPct / 100,
    up: [Math.sin(theta), Math.cos(theta)],
    right: [-Math.cos(theta), Math.sin(theta)],
    perMm,
  }
}

/** Punkt płaszczyzny: base + a·right + b·up. */
function along(l: Layout, base: Vec, a: number, b: number): Vec {
  return [base[0] + a * l.right[0] + b * l.up[0], base[1] + a * l.right[1] + b * l.up[1]]
}

const toSky = (l: Layout, [xi, eta]: Vec): EquatorialDeg => gnomonicUnproject(l.center, { xi, eta })

/** Środki paneli na płaszczyźnie stycznej środka kadru, wierszami od góry, w wierszu od lewej. */
function panelOffsets(l: Layout): { col: number; row: number; offset: Vec }[] {
  const { cols, rows } = l.framing.mosaic
  const result: { col: number; row: number; offset: Vec }[] = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const dx = (col - (cols - 1) / 2) * l.step * l.width
      const dy = ((rows - 1) / 2 - row) * l.step * l.height
      result.push({ col, row, offset: along(l, [0, 0], dx, dy) })
    }
  }
  return result
}

/** Kąt pozycyjny (od N przez E) odcinka a → b na sferze, [0, 360). */
function positionAngleDeg(a: EquatorialDeg, b: EquatorialDeg): number {
  const dec1 = a.decDeg * DEG
  const dec2 = b.decDeg * DEG
  const dRa = (b.raDeg - a.raDeg) * DEG
  const y = Math.sin(dRa) * Math.cos(dec2)
  const x = Math.cos(dec1) * Math.sin(dec2) - Math.sin(dec1) * Math.cos(dec2) * Math.cos(dRa)
  return normalizeDeg(Math.atan2(y, x) / DEG)
}

/** Prostokąt o środku `base`, wymiarach a (wzdłuż right) × b (wzdłuż up): LG, PG, PD, LD. */
function rectangle(l: Layout, base: Vec, a: number, b: number): SkyQuad {
  return [
    toSky(l, along(l, base, -a / 2, b / 2)),
    toSky(l, along(l, base, a / 2, b / 2)),
    toSky(l, along(l, base, a / 2, -b / 2)),
    toSky(l, along(l, base, -a / 2, -b / 2)),
  ]
}

export function mosaicPanels(profile: EquipmentProfile, framing: Framing): MosaicPanel[] {
  const l = layout(profile, framing)
  const epsilon = 1e-6
  return panelOffsets(l).map(({ col, row, offset }) => {
    const center = toSky(l, offset)
    return {
      col,
      row,
      center,
      paDeg: positionAngleDeg(center, toSky(l, along(l, offset, 0, epsilon))),
      corners: rectangle(l, offset, l.width, l.height),
    }
  })
}

export function oagPrisms(profile: EquipmentProfile, framing: Framing): SkyQuad[] {
  const oag = profile.oag
  if (!oag) return []
  const l = layout(profile, framing)
  const angle = oag.angleDeg * DEG
  // Kierunek od środka matrycy do pryzmatu w układzie (prawo, góra): 0° = góra, zgodnie z ruchem wskazówek zegara.
  const outward = [Math.sin(angle), Math.cos(angle)]
  const offset = oag.offsetFromCenterMm * l.perMm
  const halfW = (oag.prismWidthMm * l.perMm) / 2
  const halfH = (oag.prismHeightMm * l.perMm) / 2
  // Szerokość biegnie wzdłuż krawędzi (prostopadle do kierunku na zewnątrz), wysokość od środka matrycy.
  const edge = [outward[1], -outward[0]]
  return panelOffsets(l).map(({ offset: panel }) => {
    const point = (w: number, h: number): EquatorialDeg => {
      const a = edge[0] * w + outward[0] * (offset + h)
      const b = edge[1] * w + outward[1] * (offset + h)
      return toSky(l, along(l, panel, a, b))
    }
    return [point(-halfW, halfH), point(halfW, halfH), point(halfW, -halfH), point(-halfW, -halfH)]
  })
}

export function mosaicSizeDeg(profile: EquipmentProfile, framing: Framing): MosaicSize {
  const l = layout(profile, framing)
  const { cols, rows } = l.framing.mosaic
  const angle = (size: number): number => (2 * Math.atan(size / 2)) / DEG
  return {
    widthDeg: angle(l.width * (1 + (cols - 1) * l.step)),
    heightDeg: angle(l.height * (1 + (rows - 1) * l.step)),
  }
}

/** Skala wycinka TAN w środku [rad/px]; pole dotyczy dłuższego boku. */
function cutoutScale(cutout: SkyCutout): number {
  return (2 * Math.tan((cutout.fovDeg * DEG) / 2)) / Math.max(cutout.widthPx, cutout.heightPx)
}

export function skyToCutout(cutout: SkyCutout, point: EquatorialDeg): CutoutPoint {
  const scale = cutoutScale(cutout)
  const { xi, eta } = gnomonicProject(cutout.center, point)
  return { x: cutout.widthPx / 2 - xi / scale, y: cutout.heightPx / 2 - eta / scale }
}

export function cutoutToSky(cutout: SkyCutout, pixel: CutoutPoint): EquatorialDeg {
  const scale = cutoutScale(cutout)
  return gnomonicUnproject(cutout.center, {
    xi: (cutout.widthPx / 2 - pixel.x) * scale,
    eta: (cutout.heightPx / 2 - pixel.y) * scale,
  })
}
