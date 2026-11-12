// Rzut stereograficzny kopuły. Widok ustawiony na kierunek (azymut, wysokość) z polem widzenia `fovDeg`.
import { DEG, mulMat, mulVec, type Mat3, type Vec3 } from './astro'

export interface View {
  azDeg: number
  altDeg: number
  fovDeg: number
}

export const FULL_DOME: View = { azDeg: 180, altDeg: 90, fovDeg: 184 }

/** Macierz układ horyzontalny (N, E, Zenit) → układ widoku (prawo, góra, przód). */
export function viewMatrix(v: View): Mat3 {
  const az = v.azDeg * DEG
  const alt = v.altDeg * DEG
  const f: Vec3 = [Math.cos(alt) * Math.cos(az), Math.cos(alt) * Math.sin(az), Math.sin(alt)]
  const r: Vec3 = [-Math.sin(az), Math.cos(az), 0]
  const u: Vec3 = [f[1] * r[2] - f[2] * r[1], f[2] * r[0] - f[0] * r[2], f[0] * r[1] - f[1] * r[0]]
  return [...r, ...u, ...f] as Mat3
}

/** Skala [px] taka, że połowa pola widzenia sięga `radiusPx`. */
export function projectionScale(fovDeg: number, radiusPx: number): number {
  return radiusPx / (2 * Math.tan((fovDeg / 4) * DEG))
}

export interface Projector {
  /** Macierz J2000 → widok. */
  eqToView: Mat3
  /** Macierz horyzontalny → widok. */
  horToView: Mat3
  scale: number
  cx: number
  cy: number
  /** Punkt ekranu dla wektora w układzie widoku; null za obserwatorem. */
  project(v: Vec3): [number, number] | null
  eq(v: Vec3): [number, number] | null
  hor(v: Vec3): [number, number] | null
  unprojectView(x: number, y: number, out: Vec3): Vec3
  /** Odwrotność: punkt ekranu → wektor horyzontalny. */
  unprojectHor(x: number, y: number): Vec3
}

export function makeProjector(horMatrix: Mat3, view: View, cx: number, cy: number, radiusPx: number): Projector {
  const horToView = viewMatrix(view)
  const eqToView = mulMat(horToView, horMatrix)
  const scale = projectionScale(view.fovDeg, radiusPx)
  const project = (v: Vec3): [number, number] | null => {
    const d = 1 + v[2]
    if (d < 1e-3) return null
    return [cx + (2 * scale * v[0]) / d, cy - (2 * scale * v[1]) / d]
  }
  const unprojectView = (x: number, y: number, out: Vec3): Vec3 => {
    const X = (x - cx) / scale, Y = (cy - y) / scale
    const rr = (X * X + Y * Y) / 4
    const k = 1 / (1 + rr)
    out[0] = X * k; out[1] = Y * k; out[2] = (1 - rr) * k
    return out
  }
  return {
    eqToView,
    horToView,
    scale,
    cx,
    cy,
    project,
    eq: (v) => project(mulVec(eqToView, v)),
    hor: (v) => project(mulVec(horToView, v)),
    unprojectView,
    unprojectHor(x, y) {
      const vView = unprojectView(x, y, [0, 0, 0])
      // Macierz widoku jest ortogonalna: odwrotność = transpozycja.
      const m = horToView
      return [
        m[0] * vView[0] + m[3] * vView[1] + m[6] * vView[2],
        m[1] * vView[0] + m[4] * vView[1] + m[7] * vView[2],
        m[2] * vView[0] + m[5] * vView[1] + m[8] * vView[2],
      ]
    },
  }
}

/** Transformacja afiniczna z trzech par punktów (obraz → ekran) jako [a, b, c, d, e, f] dla setTransform. */
export function affineFrom3(src: [number, number][], dst: [number, number][]): [number, number, number, number, number, number] | null {
  const [[x0, y0], [x1, y1], [x2, y2]] = src
  const det = x0 * (y1 - y2) + x1 * (y2 - y0) + x2 * (y0 - y1)
  if (Math.abs(det) < 1e-9) return null
  const solve = (u0: number, u1: number, u2: number) => {
    const a = (u0 * (y1 - y2) + u1 * (y2 - y0) + u2 * (y0 - y1)) / det
    const b = (u0 * (x2 - x1) + u1 * (x0 - x2) + u2 * (x1 - x0)) / det
    const c = (u0 * (x1 * y2 - x2 * y1) + u1 * (x2 * y0 - x0 * y2) + u2 * (x0 * y1 - x1 * y0)) / det
    return [a, b, c]
  }
  const [a, c, e] = solve(dst[0][0], dst[1][0], dst[2][0])
  const [b, d, f] = solve(dst[0][1], dst[1][1], dst[2][1])
  // Canvas: x' = a·x + c·y + e, y' = b·x + d·y + f.
  return [a, b, c, d, e, f]
}
