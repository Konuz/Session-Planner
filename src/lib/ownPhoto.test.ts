import { expect, it } from 'vitest'
import { DEG } from './astro'
import { gnomonicInverse } from './framing'
import { affineFromTriangles, expandTriangle, warpTriangles, type PhotoGrid, type Pt, type TanView } from './ownPhoto'

/** Siatka idealnego zdjęcia TAN: N u góry, E po lewej (flip: E po prawej, odbicie lustrzane). */
function gridFromTan(center: { raDeg: number; decDeg: number }, degPerPx: number, width: number, height: number, flip = false): PhotoGrid {
  const n = 17
  const sky: [number, number][] = []
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = (i * width) / (n - 1)
      const y = (j * height) / (n - 1)
      const xi = (flip ? 1 : -1) * (x - width / 2) * degPerPx * DEG
      const eta = -(y - height / 2) * degPerPx * DEG
      const p = gnomonicInverse(center, { xi, eta })
      sky.push([p.raDeg, p.decDeg])
    }
  }
  return { cols: n, rows: n, sky }
}

/** Widok TAN o tej samej skali co zdjęcie `degPerPx` i `sizePx` pikselach. */
function sameScaleView(center: { raDeg: number; decDeg: number }, degPerPx: number, sizePx: number): TanView {
  // tangentToPixel: 2·tan(fov/2)/size [rad/px] = skala płaszczyzny stycznej zdjęcia.
  return { ...center, sizePx, fovDeg: (2 * Math.atan((degPerPx * DEG * sizePx) / 2)) / DEG }
}

const det = (m: number[]) => m[0] * m[3] - m[1] * m[2]

it('idealny TAN zgodny z widokiem daje tożsamość skali', () => {
  const center = { raDeg: 83.8, decDeg: -5.4 }
  const triangles = warpTriangles(gridFromTan(center, 0.005, 200, 200), 200, 200, sameScaleView(center, 0.005, 200))
  expect(triangles).toHaveLength(2 * 16 * 16)
  for (const t of triangles) {
    for (let k = 0; k < 3; k++) {
      expect(t.dst[k][0]).toBeCloseTo(t.src[k][0], 2)
      expect(t.dst[k][1]).toBeCloseTo(t.src[k][1], 2)
    }
  }
})

it('afiniczne przekształcenie odtwarza wierzchołki', () => {
  const src: [Pt, Pt, Pt] = [[3, 7], [120, 15], [40, 190]]
  const dst: [Pt, Pt, Pt] = [[-12, 400], [310, 380.5], [55, 77]]
  const [a, b, c, d, e, f] = affineFromTriangles(src, dst)
  for (let k = 0; k < 3; k++) {
    const [x, y] = src[k]
    expect(a * x + c * y + e).toBeCloseTo(dst[k][0], 9)
    expect(b * x + d * y + f).toBeCloseTo(dst[k][1], 9)
  }
})

it('lustrzane zdjęcie ma ujemny wyznacznik', () => {
  const center = { raDeg: 10, decDeg: 41 }
  const view = sameScaleView(center, 0.005, 200)
  const normal = warpTriangles(gridFromTan(center, 0.005, 200, 200), 200, 200, view)
  const mirrored = warpTriangles(gridFromTan(center, 0.005, 200, 200, true), 200, 200, view)
  expect(normal.every((t) => det(affineFromTriangles(t.src, t.dst)) > 0)).toBe(true)
  expect(mirrored).toHaveLength(512)
  expect(mirrored.every((t) => det(affineFromTriangles(t.src, t.dst)) < 0)).toBe(true)
})

it('granica RA 0/360 bez pasa', () => {
  const center = { raDeg: 0.05, decDeg: 20 }
  const grid = gridFromTan(center, 0.005, 200, 200)
  expect(grid.sky.some(([ra]) => ra > 359)).toBe(true)
  const triangles = warpTriangles(grid, 200, 200, sameScaleView(center, 0.005, 200))
  expect(triangles).toHaveLength(512)
  const cell = 200 / 16
  for (const t of triangles) {
    const xs = t.dst.map((p) => p[0])
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(3 * cell)
  }
})

it('trójkąty za płaszczyzną styczną pominięte', () => {
  const grid = gridFromTan({ raDeg: 180, decDeg: 0 }, 0.005, 200, 200)
  expect(warpTriangles(grid, 200, 200, { raDeg: 0, decDeg: 0, fovDeg: 30, sizePx: 800 })).toEqual([])
})

it('trójkąty poza obrazem pominięte', () => {
  const grid = gridFromTan({ raDeg: 105, decDeg: 0 }, 0.005, 200, 200)
  expect(warpTriangles(grid, 200, 200, { raDeg: 100, decDeg: 0, fovDeg: 1, sizePx: 400 })).toEqual([])
})

it('biegun', () => {
  const center = { raDeg: 37, decDeg: 89.9 }
  const triangles = warpTriangles(gridFromTan(center, 0.01, 200, 200), 200, 200, sameScaleView(center, 0.01, 200))
  expect(triangles).toHaveLength(512)
  expect(triangles.every((t) => t.dst.every((p) => Number.isFinite(p[0]) && Number.isFinite(p[1])))).toBe(true)
})

it('expandTriangle powiększa o px', () => {
  const t: [Pt, Pt, Pt] = [[0, 0], [30, 0], [0, 40]]
  const g: Pt = [10, 40 / 3]
  const grown = expandTriangle(t, 1.5)
  for (let k = 0; k < 3; k++) {
    const before = Math.hypot(t[k][0] - g[0], t[k][1] - g[1])
    const after = Math.hypot(grown[k][0] - g[0], grown[k][1] - g[1])
    expect(after - before).toBeCloseTo(1.5, 9)
  }
})
