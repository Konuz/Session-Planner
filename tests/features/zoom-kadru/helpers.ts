// Wspólne dane i narzędzia testów funkcji „zoom-kadru” (spec: .autoloop/features/zoom-kadru/spec.md).
//
// Nazwy, których spec nie podaje (wybrane przez test-author; opis także w zaślepkach):
// - `src/features/framing/framingModel.ts`: `ZOOM_STEP`, `MAX_VIEW_FOV_DEG`, `ZoomBounds`, `zoomBounds(profile, framing)`
//   (`fitDeg`, `minDeg`, `maxDeg`), `zoomIn`, `zoomOut`, `canZoomIn`, `canZoomOut`, `wheelZoom(fov, deltaY, deltaMode,
//   bounds)`, `pinchZoom(startFov, startDistancePx, distancePx, bounds)`, `fovReadout(fov)`;
// - `src/services/skyImage/sources.ts`: `planCutout(…, plannedFovDeg?)`, `needsNewCutout(…, plannedFovDeg?)`;
// - `src/features/framing/photoModel.ts`: `PhotoFrame.fovDeg?` (pole widoku dla `setFrame` i `nextPhotoRequest`);
// - `src/features/framing/useSkyImage.ts`: `SkyImageHookInput.fovDeg?`.
// Atrapa pobierania skopiowana z tests/features/zdjecie-w-kadrze/helpers.ts (bez wiązania testów różnych funkcji);
// tu kończy obietnice bez `setTimeout`, żeby działała także przy podmienionych zegarach.
import { DEMO_PROFILES } from '../../../src/data/demo'
import type { EquatorialDeg } from '../../../src/services/astroMath'
import { mosaicPanels, mosaicSizeDeg, skyToCutout, type CutoutPoint, type MosaicSize } from '../../../src/services/framing'
import type { SkyImageLoadOptions, SkyImageLoadResult, SkyImageShown, SkyImageView } from '../../../src/services/skyImage/loader'
import { skyImageSources, type SkyImageRequest, type SkyImageSourceId } from '../../../src/services/skyImage/sources'
import type { PhotoLoaderPort } from '../../../src/features/framing/photoModel'
import type { EquipmentProfile, Framing } from '../../../src/types'
import { expect } from 'vitest'

// ---------- Dane ----------

/** M 42 (NGC1976) z katalogu: RA 83,81867°, Dec −5,38967°. */
export const M42_CENTER: EquatorialDeg = { raDeg: 83.81866666666666, decDeg: -5.389666666666667 }
/** Środek kadru z przykładów przeciągania (`zakladka-kadr` P8–P13): RA 83,8221°, Dec −5,3911°. */
export const DRAG_CENTER: EquatorialDeg = { raDeg: 83.8221, decDeg: -5.3911 }

export const MY_SET_ID = 'demo-moj-zestaw'
export const ESPRIT_ID = 'demo-esprit100-asi6200mm'
export const NEWTON200_ID = 'demo-newton200-asi533mm'

export function profile(id: string): EquipmentProfile {
  const found = DEMO_PROFILES.find((entry) => entry.id === id)
  if (!found) throw new Error(`Brak profilu ${id}`)
  return structuredClone(found)
}

export const mySet = (): EquipmentProfile => profile(MY_SET_ID)

export function framing(center: EquatorialDeg = M42_CENTER, cols = 1, rows = 1, paDeg = 0): Framing {
  return { centerRaDeg: center.raDeg, centerDecDeg: center.decDeg, paDeg, mosaic: { cols, rows, overlapPct: 20 } }
}

/** Rozmiar kadru albo mozaiki (`geometria-kadru`). */
export function sizeOf(p: EquipmentProfile, cols = 1, rows = 1): MosaicSize {
  return mosaicSizeDeg(p, framing(M42_CENTER, cols, rows))
}

/** Przekątna jednego kadru liczona jak w `zrodla-zdjec` (hypot rozmiaru kadru 1×1). */
export function singleDiagonal(p: EquipmentProfile): number {
  const size = sizeOf(p)
  return Math.hypot(size.widthDeg, size.heightDeg)
}

/** Najmniejsze pole widoku: 1,2 × przekątna jednego kadru (dla „Mój zestaw” ok. 1,833°). */
export const minFov = (p: EquipmentProfile): number => 1.2 * singleDiagonal(p)

/** Pole „Dopasuj” z zamrożonych testów `zakladka-kadr`: 3,05° przy 1×1, 4,45° przy 2×1. */
export const FIT_1x1 = 3.05
export const FIT_2x1 = 4.45

export const FOV_TOL = 0.001

export function expectNear(actual: number, expected: number, tol: number, what = ''): void {
  expect(Math.abs(actual - expected), `${what}: ${actual} zamiast ${expected} ±${tol}`).toBeLessThanOrEqual(tol)
}

export const expectFov = (actual: number, expected: number, what = 'pole'): void => expectNear(actual, expected, FOV_TOL, what)

/** Narożniki ramki (panel 1) w jednostkach widoku: rzut z `geometria-kadru` na widok o danym polu. */
export function expectedCorners(p: EquipmentProfile, frame: Framing, fovDeg: number): CutoutPoint[] {
  const cutout = { center: { raDeg: frame.centerRaDeg, decDeg: frame.centerDecDeg }, fovDeg, widthPx: 1000, heightPx: 1000 }
  return mosaicPanels(p, frame)[0].corners.map((corner) => skyToCutout(cutout, corner))
}

/** Punkty z atrybutu `points` („x,y x,y …”). */
export function parsePoints(text: string): CutoutPoint[] {
  const numbers = (text.match(/[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g) ?? []).map(Number)
  const points: CutoutPoint[] = []
  for (let i = 0; i + 1 < numbers.length; i += 2) points.push({ x: numbers[i], y: numbers[i + 1] })
  return points
}

export function expectCorners(actual: readonly CutoutPoint[], expected: readonly CutoutPoint[], tol = 1, what = 'ramka'): void {
  expect(actual, `${what}: liczba narożników`).toHaveLength(expected.length)
  expected.forEach((point, i) => {
    expectNear(actual[i].x, point.x, tol, `${what} [${i}] x`)
    expectNear(actual[i].y, point.y, tol, `${what} [${i}] y`)
  })
}

export const width = (points: readonly CutoutPoint[]): number =>
  Math.max(...points.map((p) => p.x)) - Math.min(...points.map((p) => p.x))

// ---------- Atrapa pobierania ----------

export const SOURCE_NAME: Record<SkyImageSourceId, string> = Object.fromEntries(
  skyImageSources().map((source) => [source.id, source.name]),
) as Record<SkyImageSourceId, string>

export function image(sourceId: SkyImageSourceId, fromCache = false): SkyImageShown {
  return { kind: 'image', sourceId, sourceName: SOURCE_NAME[sourceId], data: `${sourceId}-data`, fromCache, saved: true }
}

export interface LoadCall {
  request: SkyImageRequest
  sourceId: SkyImageSourceId | null
}

/** Kilka obrotów kolejki mikrozadań (bez zegara). */
export async function settle(times = 20): Promise<void> {
  for (let i = 0; i < times; i += 1) await Promise.resolve()
}

export class FakeLoader implements PhotoLoaderPort {
  calls: LoadCall[] = []
  private pending: ((value: SkyImageLoadResult) => void)[] = []
  private shown: SkyImageView | null = null

  load = (request: SkyImageRequest, options?: SkyImageLoadOptions): Promise<SkyImageLoadResult> => {
    this.calls.push({ request: structuredClone(request), sourceId: options?.sourceId ?? null })
    return new Promise<SkyImageLoadResult>((resolve) => {
      this.pending.push(resolve)
    })
  }

  saveOffline = (): Promise<'saved' | 'failed'> => Promise.resolve('failed')

  current = (): SkyImageView | null => this.shown

  get lastCall(): LoadCall {
    const call = this.calls.at(-1)
    if (!call) throw new Error('Pobieranie nie zostało wywołane')
    return call
  }

  /** Rozstrzyga ostatnie wywołanie `load`; starsze dostają `superseded`. */
  async finish(result: SkyImageView): Promise<void> {
    const last = this.pending.pop()
    if (!last) throw new Error('Brak trwającego pobierania')
    for (const older of this.pending) older({ kind: 'superseded' })
    this.pending = []
    this.shown = result
    last(result)
    await settle()
  }
}
