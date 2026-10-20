// Mapa zastępcza z zarysami obiektów (mapa-zastepcza): czyste funkcje, bez Reacta i bez sieci.
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
import { angularSeparationDeg, gnomonicUnproject, type EquatorialDeg } from '../../services/astroMath'
import { formatDesignation } from '../../services/catalog/records'
import { skyToCutout, type CutoutPoint, type SkyCutout } from '../../services/framing'
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

const DEG = Math.PI / 180
/** Wielokąt dalej niż tyle stopni od pozycji z katalogu to błąd danych (P13). */
const MAX_OUTLINE_OFFSET_DEG = 10
const ELLIPSE_POINTS = 72

function label(object: DsoObject): string {
  const name = formatDesignation(object.primary)
  return object.commonNames.length > 0 ? `${name} (${object.commonNames[0]})` : name
}

/** Piksel punktu nieba albo null, gdy punkt leży 90° lub dalej od środka wycinka. */
function project(cutout: SkyCutout, point: EquatorialDeg): CutoutPoint | null {
  if (angularSeparationDeg(cutout.center, point) >= 90) return null
  const pixel = skyToCutout(cutout, point)
  return Number.isFinite(pixel.x) && Number.isFinite(pixel.y) ? pixel : null
}

function projectShape(cutout: SkyCutout, points: readonly EquatorialDeg[]): CutoutPoint[] | null {
  const pixels: CutoutPoint[] = []
  for (const point of points) {
    const pixel = project(cutout, point)
    if (!pixel) return null
    pixels.push(pixel)
  }
  return pixels
}

function inside(cutout: SkyCutout, { x, y }: CutoutPoint): boolean {
  return x >= 0 && x <= cutout.widthPx && y >= 0 && y <= cutout.heightPx
}

/** Czy odcinek a–b ma część wspólną z prostokątem wycinka (Liang–Barsky). */
function segmentHits(cutout: SkyCutout, a: CutoutPoint, b: CutoutPoint): boolean {
  const dx = b.x - a.x
  const dy = b.y - a.y
  let t0 = 0
  let t1 = 1
  const edges: [number, number][] = [
    [-dx, a.x],
    [dx, cutout.widthPx - a.x],
    [-dy, a.y],
    [dy, cutout.heightPx - a.y],
  ]
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return false
    } else {
      const t = q / p
      if (p < 0) t0 = Math.max(t0, t)
      else t1 = Math.min(t1, t)
      if (t0 > t1) return false
    }
  }
  return true
}

function shapeHits(cutout: SkyCutout, shape: readonly CutoutPoint[]): boolean {
  return shape.some((point, i) => segmentHits(cutout, point, shape[(i + 1) % shape.length]))
}

/** 72 punkty elipsy (co 5°) na płaszczyźnie stycznej w środku obiektu; pierwszy w kierunku PA. */
function ellipsePoints(center: EquatorialDeg, majorArcmin: number, minorArcmin: number, paDeg: number): EquatorialDeg[] {
  const a = Math.tan((majorArcmin / 120) * DEG)
  const b = Math.tan((minorArcmin / 120) * DEG)
  const pa = paDeg * DEG
  const points: EquatorialDeg[] = []
  for (let k = 0; k < ELLIPSE_POINTS; k++) {
    const t = (k * 360 * DEG) / ELLIPSE_POINTS
    const u = a * Math.cos(t)
    const v = b * Math.sin(t)
    points.push(
      gnomonicUnproject(center, {
        xi: u * Math.sin(pa) + v * Math.cos(pa),
        eta: u * Math.cos(pa) - v * Math.sin(pa),
      }),
    )
  }
  return points
}

const positive = (value: number | null | undefined): number | null =>
  value != null && Number.isFinite(value) && value > 0 ? value : null

export function fallbackMap(
  catalog: readonly DsoObject[],
  polygonsByUid: ReadonlyMap<string, EquatorialDeg[][]>,
  cutout: SkyCutout,
): FallbackMapObject[] {
  const scale = (2 * Math.tan((cutout.fovDeg * DEG) / 2)) / Math.max(cutout.widthPx, cutout.heightPx)
  const halfDiagonalDeg = Math.atan((scale * Math.hypot(cutout.widthPx, cutout.heightPx)) / 2) / DEG
  const result: FallbackMapObject[] = []
  for (const object of catalog) {
    const position: EquatorialDeg = { raDeg: object.raDeg, decDeg: object.decDeg }
    const polygons = (polygonsByUid.get(object.uid) ?? []).filter(
      (polygon) => polygon.length > 0 && angularSeparationDeg(position, polygon[0]) <= MAX_OUTLINE_OFFSET_DEG,
    )
    let kind: MapShapeKind
    let skyShapes: EquatorialDeg[][]
    if (polygons.length > 0) {
      kind = 'polygon'
      skyShapes = polygons
    } else {
      const major = positive(object.sizeMajorArcmin) ?? positive(object.sizeMinorArcmin)
      if (major === null) continue
      const minor = positive(object.sizeMinorArcmin) ?? major
      if (angularSeparationDeg(cutout.center, position) - Math.max(major, minor) / 120 > halfDiagonalDeg + 1) continue
      kind = minor === major ? 'circle' : 'ellipse'
      skyShapes = [ellipsePoints(position, Math.max(major, minor), Math.min(major, minor), object.positionAngleDeg ?? 0)]
    }
    const shapes = skyShapes
      .map((shape) => projectShape(cutout, shape))
      .filter((shape): shape is CutoutPoint[] => shape !== null && shape.length >= 3)
    if (shapes.length === 0) continue
    const pixel = project(cutout, position)
    const labelPosition = pixel && inside(cutout, pixel) ? pixel : null
    if (!labelPosition && !shapes.some((shape) => shapeHits(cutout, shape))) continue
    result.push({
      uid: object.uid,
      kind,
      lineStyle: kind === 'polygon' ? 'solid' : 'dashed',
      shapes,
      label: { text: label(object), position: labelPosition },
    })
  }
  return result
}
