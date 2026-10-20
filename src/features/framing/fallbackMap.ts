// Mapa zastępcza z zarysami obiektów (mapa-zastepcza): czyste funkcje, bez Reacta i bez sieci.
// ZAŚLEPKA: funkcja rzuca NotImplementedError; implementację dopisuje implementer.
//
// Nazwy, których spec nie podaje (wybrane przez test-author):
// - `fallbackMap(catalog, polygonsByUid, cutout)` – obiekty katalogu (`loadCatalog`), zestawienie
//   „uid → wielokąty” (`assignOutlines(...).polygonsByUid` z `services/outlines.ts`) i wycinek TAN
//   (`SkyCutout` z `services/framing.ts`) → lista obiektów mapy w kolejności katalogu.
// - `FallbackMapObject`:
//   - `uid` – uid obiektu katalogu;
//   - `kind` – 'polygon' (zarys ze Stellarium), 'ellipse' albo 'circle' (z rozmiaru);
//   - `lineStyle` – 'solid' (wielokąt) albo 'dashed' (elipsa, okrąg);
//   - `shapes` – kształty w pikselach wycinka: wielokąty w kolejności z pliku (punkty jak w pliku;
//     odcinek ostatni → pierwszy też należy do konturu) albo jeden kształt elipsy/okręgu z 72 punktów;
//   - `label` – `text` („oznaczenie (pierwsza nazwa)” albo samo oznaczenie) i `position` (piksel pozycji
//     z katalogu albo null, gdy leży poza wycinkiem).
import type { EquatorialDeg } from '../../services/astroMath'
import type { CutoutPoint, SkyCutout } from '../../services/framing'
import type { DsoObject } from '../../types'

export type MapShapeKind = 'polygon' | 'ellipse' | 'circle'
export type MapLineStyle = 'solid' | 'dashed'

export interface MapLabel {
  /** „M 42 (Great Orion Nebula)” albo samo oznaczenie, np. „NGC 1975”. */
  text: string
  /** Pozycja z katalogu w pikselach albo null, gdy leży poza wycinkiem. */
  position: CutoutPoint | null
}

export interface FallbackMapObject {
  uid: string
  kind: MapShapeKind
  lineStyle: MapLineStyle
  /** Kształty w pikselach wycinka (bez obcinania do brzegu). */
  shapes: CutoutPoint[][]
  label: MapLabel
}

function notImplemented(name: string, ...args: unknown[]): never {
  const error = new Error(`${name}: not implemented (${args.length})`)
  error.name = 'NotImplementedError'
  throw error
}

export function fallbackMap(
  catalog: readonly DsoObject[],
  polygonsByUid: ReadonlyMap<string, EquatorialDeg[][]>,
  cutout: SkyCutout,
): FallbackMapObject[] {
  return notImplemented('fallbackMap', catalog, polygonsByUid, cutout)
}
