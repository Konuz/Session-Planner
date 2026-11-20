// Własne zdjęcie obiektu: siatka punktów kontrolnych z WCS (liczona przez most Skyshota)
// i trójkąty, którymi zdjęcie wkleja się w obraz nieba w rzucie TAN (N u góry, E po lewej).
import { DEG } from './astro'
import { gnomonic, tangentToPixel } from './framing'
import type { PhotoProject } from './photo'
import { affineFrom3 } from './projection'

/** Punkty wierszami; punkt (i, j) leży w pikselu (i·width/(cols−1), j·height/(rows−1)); [raDeg, decDeg]. */
export interface PhotoGrid { cols: number; rows: number; sky: [number, number][] }

/** Odpowiedź `/api/photo/solve?object=…`; obraz i maska jako adresy `data:`. */
export interface OwnPhotoSolved {
  objectId: string
  photoId: string
  name: string
  image: string
  mask: string | null
  width: number
  height: number
  createdAt: number
  astrometry: PhotoProject['astrometry']
  grid: PhotoGrid
}

export interface OwnPhotoRecord extends Omit<OwnPhotoSolved, 'image' | 'mask'> { image: Blob; mask: Blob | null }

/** Obraz nieba w rzucie TAN: środek, pole (bok) i rozmiar kwadratu w pikselach. */
export interface TanView { raDeg: number; decDeg: number; fovDeg: number; sizePx: number }

export type Pt = [number, number]
export interface WarpTriangle { src: [Pt, Pt, Pt]; dst: [Pt, Pt, Pt] }

/** Trójkąty zdjęcie → widok; pomija wierzchołki za płaszczyzną styczną i trójkąty poza obrazem. */
export function warpTriangles(grid: PhotoGrid, width: number, height: number, view: TanView): WarpTriangle[] {
  const { cols, rows, sky } = grid
  const d0 = view.decDeg * DEG
  const dst = sky.map(([raDeg, decDeg]): Pt | null => {
    const d = decDeg * DEG
    const cosC = Math.sin(d0) * Math.sin(d) + Math.cos(d0) * Math.cos(d) * Math.cos((raDeg - view.raDeg) * DEG)
    if (cosC <= 1e-6) return null
    return tangentToPixel(gnomonic(view, { raDeg, decDeg }), view.fovDeg, view.sizePx)
  })
  const src = (i: number, j: number): Pt => [(i * width) / (cols - 1), (j * height) / (rows - 1)]
  const out: WarpTriangle[] = []
  const push = (s: [Pt, Pt, Pt], t: (Pt | null)[]) => {
    if (t.some((p) => !p)) return
    const d = t as [Pt, Pt, Pt]
    const xs = d.map((p) => p[0])
    const ys = d.map((p) => p[1])
    if (Math.max(...xs) < 0 || Math.min(...xs) > view.sizePx || Math.max(...ys) < 0 || Math.min(...ys) > view.sizePx) return
    out.push({ src: s, dst: d })
  }
  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < cols - 1; i++) {
      const k = j * cols + i
      push([src(i, j), src(i + 1, j), src(i + 1, j + 1)], [dst[k], dst[k + 1], dst[k + cols + 1]])
      push([src(i, j), src(i + 1, j + 1), src(i, j + 1)], [dst[k], dst[k + cols + 1], dst[k + cols]])
    }
  }
  return out
}

/** Przekształcenie src → dst w kolejności `setTransform(a, b, c, d, e, f)`: x′ = a·x + c·y + e, y′ = b·x + d·y + f. */
export function affineFromTriangles(src: [Pt, Pt, Pt], dst: [Pt, Pt, Pt]): [number, number, number, number, number, number] {
  return affineFrom3(src, dst) ?? [0, 0, 0, 0, 0, 0]
}

/** Każdy wierzchołek odsunięty od środka ciężkości o `px`: zakładka zasłania szwy między trójkątami. */
export function expandTriangle(t: [Pt, Pt, Pt], px: number): [Pt, Pt, Pt] {
  const gx = (t[0][0] + t[1][0] + t[2][0]) / 3
  const gy = (t[0][1] + t[1][1] + t[2][1]) / 3
  return t.map(([x, y]) => {
    const len = Math.hypot(x - gx, y - gy) || 1
    return [x + ((x - gx) / len) * px, y + ((y - gy) / len) * px]
  }) as [Pt, Pt, Pt]
}
