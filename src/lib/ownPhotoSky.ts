// Własne zdjęcie na kopule: siatka punktów kontrolnych (piksel → RA/Dec z mostu Skyshota) jako siatka trójkątów
// z teksturą. Wierzchołki rzutowane tą samą funkcją co kontury (`Projector.eq`); GPU tylko interpoluje.
// Konwencja pikseli jak w `ownPhoto.ts`: punkt (i, j) leży w pikselu (i·W/(cols−1), j·H/(rows−1)), krawędź zdjęcia = 0 i W.
import { DEG, mulVec, unitVector, vecToHorizontal, type Mat3, type Vec3 } from './astro'
import { horizonAltitude, type HorizonPoint } from './horizon'
import type { OwnPhotoRecord, PhotoGrid } from './ownPhoto'
import type { Projector } from './projection'

export interface SkyMesh {
  cols: number
  rows: number
  /** Wektory jednostkowe J2000 punktów siatki, wierszami. */
  dirs: Vec3[]
  /** Współrzędne tekstury, po 2 na wierzchołek. */
  uv: Float32Array
  /** Dwa trójkąty na komórkę, ten sam podział co `warpTriangles`. */
  indices: Uint16Array
  centre: Vec3
  /** Największy kąt od środka do punktu siatki. */
  radiusDeg: number
}

export interface ProjectedMesh {
  /** Punkty ekranu w px CSS, po 2 na wierzchołek. */
  xy: Float32Array
  /** Krycie z horyzontu, po 1 na wierzchołek. */
  alpha: Float32Array
  /** Najdłuższy bok zdjęcia na ekranie (cięciwa między narożnikami) w px CSS. */
  longSidePx: number
}

/** Szerokość przejścia krycia na horyzoncie (własnym, jeśli ustawiony). */
export const HORIZON_FADE_DEG = 0.5

export function skyMesh(grid: PhotoGrid): SkyMesh | null {
  const { cols, rows, sky } = grid
  if (cols < 2 || rows < 2 || sky.length !== cols * rows) return null
  if (sky.some(([ra, dec]) => !Number.isFinite(ra) || !Number.isFinite(dec))) return null
  const dirs = sky.map(([ra, dec]) => unitVector(ra, dec))
  const uv = new Float32Array(cols * rows * 2)
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      uv[2 * (j * cols + i)] = i / (cols - 1)
      uv[2 * (j * cols + i) + 1] = j / (rows - 1)
    }
  }
  const indices = new Uint16Array((cols - 1) * (rows - 1) * 6)
  let n = 0
  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < cols - 1; i++) {
      const k = j * cols + i
      indices.set([k, k + 1, k + cols + 1, k, k + cols + 1, k + cols], n)
      n += 6
    }
  }
  const sum = dirs.reduce<Vec3>((s, d) => [s[0] + d[0], s[1] + d[1], s[2] + d[2]], [0, 0, 0])
  const len = Math.hypot(...sum) || 1
  const centre: Vec3 = [sum[0] / len, sum[1] / len, sum[2] / len]
  const radiusDeg = Math.max(...dirs.map((d) => Math.acos(Math.max(-1, Math.min(1, d[0] * centre[0] + d[1] * centre[1] + d[2] * centre[2]))) / DEG))
  return { cols, rows, dirs, uv, indices, centre, radiusDeg }
}

/** Punkty ekranu i krycie wierzchołków; `null`, gdy zdjęcia nie ma czego rysować w tym widoku. */
export function projectMesh(mesh: SkyMesh, proj: Projector, horMatrix: Mat3, horizon: readonly HorizonPoint[], width: number, height: number): ProjectedMesh | null {
  const viewRadDeg = Math.hypot(width, height) / (2 * proj.scale * DEG)
  if (mesh.radiusDeg + viewRadDeg <= 90) {
    const c = proj.eq(mesh.centre)
    if (!c) return null
    const r = mesh.radiusDeg * proj.scale * DEG
    if (c[0] < -2 * r || c[1] < -2 * r || c[0] > width + 2 * r || c[1] > height + 2 * r) return null
  }
  const n = mesh.dirs.length
  const xy = new Float32Array(2 * n)
  const alpha = new Float32Array(n)
  let visible = false
  for (let k = 0; k < n; k++) {
    const p = proj.eq(mesh.dirs[k])
    if (!p) return null
    xy[2 * k] = p[0]
    xy[2 * k + 1] = p[1]
    const h = vecToHorizontal(mulVec(horMatrix, mesh.dirs[k]))
    const a = Math.max(0, Math.min(1, (h.altDeg - horizonAltitude(horizon, h.azDeg)) / HORIZON_FADE_DEG + 0.5))
    alpha[k] = a
    if (a > 0) visible = true
  }
  if (!visible) return null
  const { cols, rows } = mesh
  const corners = [0, cols - 1, cols * rows - 1, (rows - 1) * cols]
  let longSidePx = 0
  for (let s = 0; s < 4; s++) {
    const a = corners[s]
    const b = corners[(s + 1) % 4]
    longSidePx = Math.max(longSidePx, Math.hypot(xy[2 * a] - xy[2 * b], xy[2 * a + 1] - xy[2 * b + 1]))
  }
  return { xy, alpha, longSidePx }
}

/** Dłuższy bok tekstury zdjęcia: rośnie z wielkością zdjęcia na ekranie. */
export const TEXTURE_LEVELS = [256, 512, 1024, 2048]
/** Łączna pamięć tekstur zdjęć (obraz, maska, mipmapy); po przekroczeniu zwalniane najdawniej rysowane. */
export const TEXTURE_BUDGET_BYTES = 128 * 1024 * 1024

/** Najmniejszy poziom pokrywający `neededPx` pikseli urządzenia, nie większy niż zdjęcie i limit GPU. */
export function textureLevel(neededPx: number, photoLongSide: number, maxTextureSize: number): number {
  const level = TEXTURE_LEVELS.find((l) => l >= neededPx) ?? TEXTURE_LEVELS[TEXTURE_LEVELS.length - 1]
  return Math.min(level, photoLongSide, maxTextureSize)
}

/** Pamięć tekstur RGBA (i maski R8) z mipmapami. */
export function textureBytes(width: number, height: number, hasMask: boolean): number {
  return (width * height * (4 + (hasMask ? 1 : 0)) * 4) / 3
}

/** Klucze tekstur do zwolnienia, od najdawniej rysowanej, aż suma zmieści się w `budget`; nigdy z `keep`. */
export function evictionOrder(entries: readonly { key: string; bytes: number; lastDrawn: number }[], budget: number, keep: ReadonlySet<string>): string[] {
  let total = entries.reduce((sum, e) => sum + e.bytes, 0)
  const out: string[] = []
  for (const e of [...entries].sort((a, b) => a.lastDrawn - b.lastDrawn)) {
    if (total <= budget) break
    if (keep.has(e.key)) continue
    out.push(e.key)
    total -= e.bytes
  }
  return out
}

export interface SkyPhoto {
  /** `photoId`: to samo zdjęcie przypięte do kilku obiektów rysowane jest raz. */
  key: string
  objectIds: string[]
  record: OwnPhotoRecord
  mesh: SkyMesh
}

export function skyPhotos(records: readonly OwnPhotoRecord[]): SkyPhoto[] {
  const byKey = new Map<string, SkyPhoto>()
  for (const record of records) {
    const known = byKey.get(record.photoId)
    if (known) {
      known.objectIds.push(record.objectId)
      continue
    }
    const mesh = skyMesh(record.grid)
    if (mesh) byKey.set(record.photoId, { key: record.photoId, objectIds: [record.objectId], record, mesh })
  }
  return [...byKey.values()]
}

/** Kolejność od dołu: większe pole niżej (mniejsze, zwykle szczegółowsze, wyżej), zdjęcie wybranego obiektu na wierzchu. */
export function drawOrder(photos: readonly SkyPhoto[], selectedId: string | null): SkyPhoto[] {
  const top = (p: SkyPhoto) => (selectedId !== null && p.objectIds.includes(selectedId) ? 1 : 0)
  return [...photos].sort((a, b) => top(a) - top(b) || b.mesh.radiusDeg - a.mesh.radiusDeg)
}
