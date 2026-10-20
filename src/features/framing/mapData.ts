// Dane mapy zastępczej dla zakładki Kadr: zarysy Stellarium z `src/data/outlines.dat` (surowy import Vite),
// przypisane do katalogu raz na katalog, i ostatni wynik `fallbackMap` (przerysowania bez zmiany widoku go nie liczą).
import outlinesText from '../../data/outlines.dat?raw'
import type { EquatorialDeg } from '../../services/astroMath'
import type { SkyCutout } from '../../services/framing'
import { assignOutlines, parseOutlines } from '../../services/outlines'
import type { DsoObject } from '../../types'
import { fallbackMap, type FallbackMapObject } from './fallbackMap'

const outlines = parseOutlines(outlinesText)
const polygonsByCatalog = new WeakMap<readonly DsoObject[], ReadonlyMap<string, EquatorialDeg[][]>>()

function catalogPolygons(catalog: readonly DsoObject[]): ReadonlyMap<string, EquatorialDeg[][]> {
  let polygons = polygonsByCatalog.get(catalog)
  if (!polygons) {
    polygons = assignOutlines(outlines, catalog).polygonsByUid
    polygonsByCatalog.set(catalog, polygons)
  }
  return polygons
}

let last: { catalog: readonly DsoObject[]; key: string; objects: FallbackMapObject[] } | null = null

/** Obiekty mapy zastępczej w wycinku widoku (piksele wycinka = jednostki widoku). */
export function viewMapObjects(catalog: readonly DsoObject[], cutout: SkyCutout): FallbackMapObject[] {
  const key = JSON.stringify(cutout)
  if (last?.catalog !== catalog || last.key !== key) {
    last = { catalog, key, objects: fallbackMap(catalog, catalogPolygons(catalog), cutout) }
  }
  return last.objects
}
