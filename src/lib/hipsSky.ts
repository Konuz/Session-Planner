// Wygląd nieba na kopule: domyślny (Droga Mleczna z konturów i gwiazdy katalogu) albo przegląd NSNS true-color z kafelków
// HiPS. Tu tylko geometria bez WebGL: dobór rzędu do skali ekranu, kafelki w polu widzenia i siatki kafelków
// (kierunki J2000 + współrzędne tekstury); rzut stereograficzny liczy shader warstwy (`hipsSkyGL.ts`), jak dla gwiazd.
import { DEG, type Mat3, type Vec3 } from './astro'
import { faceXYToVec, nestToFaceXY } from './healpix'
import { tileOrderFor, tilePixelArcsec, type SurveyId } from './hips'

export type SkyLook = 'default' | 'nsns' | 'nsnsRgb' | 'nsnsOhs' | 'nsnsSho'

/** `survey`: przegląd HiPS wyglądu (null: domyślne niebo bez kafelków). */
export const SKY_LOOKS: { id: SkyLook; label: string; survey: SurveyId | null }[] = [
  { id: 'default', label: 'Domyślny', survey: null },
  { id: 'nsns', label: 'NSNS true-color (DR0.1)', survey: 'nsns' },
  { id: 'nsnsRgb', label: 'NSNS bez Hα (DR0.2)', survey: 'nsnsRgb' },
  { id: 'nsnsOhs', label: 'NSNS OHS (DR0.2)', survey: 'nsnsOhs' },
  { id: 'nsnsSho', label: 'NSNS SHO (DR0.2)', survey: 'nsnsOhs' },
]

export function skyLookSurvey(look: SkyLook): SurveyId | null {
  return SKY_LOOKS.find((l) => l.id === look)?.survey ?? null
}

export function isSkyLook(value: unknown): value is SkyLook {
  return SKY_LOOKS.some((l) => l.id === value)
}

/** Granica pokrycia NSNS przyjęta na kopule: na północ obraz zamiast gwiazd katalogu, na południe dotychczasowe tło. */
export const NSNS_EDGE_DEC = -16

/** Podkład z Allsky: kafelki rzędu 3 po 64 px, 27 w wierszu. */
export const ALLSKY_ORDER = 3
export const ALLSKY_TILE_PX = 64
export const ALLSKY_COLUMNS = 27
// Piksel Allsky ma ok. 412″: przy grubszej skali ekranu kafelki szczegółowe nic nie dodają.
const ALLSKY_ENOUGH_ARCSEC = 400
const ARCSEC_PER_RAD = 206264.806

/** Rząd kafelków szczegółowych dla skali ekranu [″/px]; null, gdy wystarcza sam podkład Allsky. */
export function detailOrder(arcsecPerPx: number, maxOrder: number): number | null {
  return arcsecPerPx >= ALLSKY_ENOUGH_ARCSEC ? null : tileOrderFor(arcsecPerPx, maxOrder)
}

/** Skala rzutu na granicy, przy której zaczyna być potrzebny podany poziom szczegółów. */
export function detailOrderScale(order: number): number {
  return ARCSEC_PER_RAD / Math.min(ALLSKY_ENOUGH_ARCSEC, tilePixelArcsec(order - 1))
}

/** Prostokąt ekranu w rzucie stereograficznym i obejmujące go koło na sferze. */
export function tileView({ eqToView: m, scale, cx, cy, width, height }: { eqToView: Mat3; scale: number; cx: number; cy: number; width: number; height: number }) {
  const maxScreenRadiusPx = Math.hypot(Math.max(cx, width - cx), Math.max(cy, height - cy))
  // Środek rzutu to +Z układu widoku: trzeci wiersz macierzy J2000 → widok. Promień najwyżej 140°: dalej kafelki
  // zbliżają się do punktu przeciwnego, gdzie rzut stereograficzny rozciąga trójkąty przez cały ekran.
  const radiusDeg = Math.min(140, (2 * Math.atan(maxScreenRadiusPx / (2 * scale))) / DEG)
  const centre: Vec3 = [m[6], m[7], m[8]]
  const twiceScale = 2 * scale
  const planeNorm = Math.hypot(twiceScale, Math.max(cx, width - cx, cy, height - cy))
  return {
    centre, radiusDeg, arcsecPerPx: ARCSEC_PER_RAD / scale,
    intersectsScreen(x: number, y: number, z: number, depth: number, radius: number) {
      // Po pomnożeniu przez depth = 1 + Z każda krawędź ekranu jest płaszczyzną.
      // Cięciwa od środka do brzegu kafelka daje bezpieczny margines dla wszystkich czterech płaszczyzn.
      const margin = planeNorm * 2 * Math.sin(radius * DEG / 2)
      const px = twiceScale * (m[0] * x + m[1] * y + m[2] * z)
      const py = twiceScale * (m[3] * x + m[4] * y + m[5] * z)
      return px >= -cx * depth - margin && px <= (width - cx) * depth + margin &&
        py >= -(height - cy) * depth - margin && py <= cy * depth + margin
    },
  }
}

interface TileGrid {
  /** Środki kafelków, po 3 składowe. */
  centres: Float64Array
  /** Największy kąt od środka do narożnika [°]. */
  radiusDeg: Float64Array
  maxRadiusDeg: number
}

const grids = new Map<number, TileGrid>()

const EDGE_SAMPLES = [[0, 0], [1, 0], [0, 1], [1, 1], [0.5, 0], [0, 0.5], [1, 0.5], [0.5, 1]]

function tileGrid(order: number): TileGrid {
  let grid = grids.get(order)
  if (grid) return grid
  const nside = 2 ** order
  const n = 12 * nside * nside
  grid = { centres: new Float64Array(n * 3), radiusDeg: new Float64Array(n), maxRadiusDeg: 0 }
  for (let p = 0; p < n; p++) {
    const [face, ix, iy] = nestToFaceXY(order, p)
    const c = faceXYToVec(face, (ix + 0.5) / nside, (iy + 0.5) / nside)
    grid.centres.set(c, p * 3)
    let minDot = 1
    // Narożniki i środki boków: na rzędzie 0 boki kafelka są zakrzywione.
    for (const [dx, dy] of EDGE_SAMPLES) {
      const [x, y, z] = faceXYToVec(face, (ix + dx) / nside, (iy + dy) / nside)
      minDot = Math.min(minDot, c[0] * x + c[1] * y + c[2] * z)
    }
    const r = Math.acos(Math.max(-1, minDot)) / DEG
    grid.radiusDeg[p] = r
    grid.maxRadiusDeg = Math.max(grid.maxRadiusDeg, r)
  }
  grids.set(order, grid)
  return grid
}

/**
 * Kafelki rzędu `order` w prostokącie widoku, od najbliższego środka. Pomija kafelki
 * w całości na południe od `minDecDeg` albo w całości pod horyzontem (`zenith` w J2000).
 */
export function visibleTiles(order: number, view: ReturnType<typeof tileView>, zenith: Vec3, minDecDeg: number): number[] {
  const { centre, radiusDeg } = view
  const { centres, radiusDeg: tileR, maxRadiusDeg } = tileGrid(order)
  const minDot = Math.cos(Math.min(180, radiusDeg + maxRadiusDeg) * DEG)
  const found: { p: number; d: number }[] = []
  // Na rzędzie 6 jest 49 152 kafelków; kąt liczymy tylko dla kandydatów w polu.
  for (let p = 0; p < tileR.length; p++) {
    const x = centres[p * 3], y = centres[p * 3 + 1], z = centres[p * 3 + 2]
    const r = tileR[p]
    const dot = x * centre[0] + y * centre[1] + z * centre[2]
    if (dot < minDot - 1e-12) continue
    const d = Math.acos(Math.max(-1, Math.min(1, dot))) / DEG
    if (d > radiusDeg + r) continue
    if (!view.intersectsScreen(x, y, z, 1 + dot, r)) continue
    if (Math.asin(z) / DEG + r < minDecDeg) continue
    if (Math.asin(Math.max(-1, Math.min(1, x * zenith[0] + y * zenith[1] + z * zenith[2]))) / DEG < -r - 2) continue
    found.push({ p, d })
  }
  return found.sort((a, b) => a.d - b.d).map((f) => f.p)
}

export interface TileMesh {
  /** Wektory jednostkowe J2000 wierzchołków, po 3. */
  dirs: Float32Array
  /** Współrzędne tekstury, po 2. */
  uv: Float32Array
  indices: Uint16Array
}

/** Podział boku kafelka na odcinki: duże kafelki gęściej, żeby łuki na kopule nie łamały się w widoczne odcinki. */
export function segmentsFor(order: number): number {
  return order <= 1 ? 16 : order === 2 ? 8 : order === 3 ? 4 : 2
}

/**
 * Siatka kafelka. Obraz kafelka HiPS ma kolumny wzdłuż y ściany i wiersze wzdłuż x (`hips.ts`), więc wierzchołek
 * (x, y) dostaje u = y, v = x (wiersz 0 obrazu na górze tekstury), przeniesione do prostokąta `uvRect` [u0, v0, du, dv].
 */
export function tileMesh(order: number, npix: number, segments: number, uvRect: [number, number, number, number] = [0, 0, 1, 1]): TileMesh {
  const nside = 2 ** order
  const [face, ix, iy] = nestToFaceXY(order, npix)
  const k = segments + 1
  const dirs = new Float32Array(k * k * 3)
  const uv = new Float32Array(k * k * 2)
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      const a = i / segments
      const b = j / segments
      const v = i * k + j
      dirs.set(faceXYToVec(face, (ix + a) / nside, (iy + b) / nside), v * 3)
      uv[v * 2] = uvRect[0] + b * uvRect[2]
      uv[v * 2 + 1] = uvRect[1] + a * uvRect[3]
    }
  }
  const indices = new Uint16Array(segments * segments * 6)
  let o = 0
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < segments; j++) {
      const v = i * k + j
      indices.set([v, v + 1, v + k, v + 1, v + k + 1, v + k], o)
      o += 6
    }
  }
  return { dirs, uv, indices }
}

/** Prostokąt kafelka rzędu 3 w obrazie Allsky, cofnięty o pół teksela od sąsiadów (bez przecieków przy filtrowaniu). */
export function allskyUvRect(npix: number, width: number, height: number): [number, number, number, number] {
  const col = npix % ALLSKY_COLUMNS
  const row = Math.floor(npix / ALLSKY_COLUMNS)
  return [(col * ALLSKY_TILE_PX + 0.5) / width, (row * ALLSKY_TILE_PX + 0.5) / height, (ALLSKY_TILE_PX - 1) / width, (ALLSKY_TILE_PX - 1) / height]
}
