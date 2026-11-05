import { expect, it } from 'vitest'
import { DEG, horizontalMatrix, horizontalToVec, mulVec, transpose, unitVector, vecToEquatorial, vecToHorizontal, type Mat3, type Site, type Vec3 } from './astro'
import { gnomonicInverse } from './framing'
import type { OwnPhotoRecord, PhotoGrid } from './ownPhoto'
import { drawOrder, evictionOrder, projectMesh, skyMesh, skyPhotos, textureLevel, type ProjectedMesh, type SkyMesh } from './ownPhotoSky'
import { FULL_DOME, makeProjector, type Projector, type View } from './projection'

const SITE: Site = { latDeg: 51.09, lonDeg: 17.29, elevationM: 130 }
const TIME = Date.UTC(2026, 9, 1)
const HOR = horizontalMatrix(TIME, SITE)

interface Photo { center: { raDeg: number; decDeg: number }; degPerPx: number; width: number; height: number; rotDeg?: number; flip?: boolean }

/** RA/Dec piksela idealnego zdjęcia TAN: N u góry, E po lewej, obrócone o rotDeg (flip: odbicie lustrzane). */
function skyOfPixel(p: Photo, x: number, y: number): { raDeg: number; decDeg: number } {
  const r = (p.rotDeg ?? 0) * DEG
  const dx = x - p.width / 2
  const dy = y - p.height / 2
  const rx = Math.cos(r) * dx - Math.sin(r) * dy
  const ry = Math.sin(r) * dx + Math.cos(r) * dy
  return gnomonicInverse(p.center, { xi: (p.flip ? 1 : -1) * rx * p.degPerPx * DEG, eta: -ry * p.degPerPx * DEG })
}

function gridOf(p: Photo, n = 17): PhotoGrid {
  const sky: [number, number][] = []
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const s = skyOfPixel(p, (i * p.width) / (n - 1), (j * p.height) / (n - 1))
      sky.push([s.raDeg, s.decDeg])
    }
  }
  return { cols: n, rows: n, sky }
}

function eqFromHor(hor: Mat3, altDeg: number, azDeg: number) {
  return vecToEquatorial(mulVec(transpose(hor), horizontalToVec({ altDeg, azDeg })))
}

const angleDeg = (a: Vec3, b: Vec3) => Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) / DEG

/** Punkt ekranu piksela zdjęcia interpolowany liniowo w trójkącie siatki (to, co rysuje GPU). */
function interpolated(mesh: SkyMesh, pm: ProjectedMesh, width: number, height: number, x: number, y: number): [number, number] {
  const i = Math.min(mesh.cols - 2, Math.floor((x / width) * (mesh.cols - 1)))
  const j = Math.min(mesh.rows - 2, Math.floor((y / height) * (mesh.rows - 1)))
  const base = (j * (mesh.cols - 1) + i) * 6
  for (let t = 0; t < 2; t++) {
    const v = [0, 1, 2].map((k) => mesh.indices[base + t * 3 + k])
    const [p0, p1, p2] = v.map((k) => [mesh.uv[2 * k] * width, mesh.uv[2 * k + 1] * height])
    const det = (p1[0] - p0[0]) * (p2[1] - p0[1]) - (p2[0] - p0[0]) * (p1[1] - p0[1])
    const b1 = ((x - p0[0]) * (p2[1] - p0[1]) - (p2[0] - p0[0]) * (y - p0[1])) / det
    const b2 = ((p1[0] - p0[0]) * (y - p0[1]) - (x - p0[0]) * (p1[1] - p0[1])) / det
    const b0 = 1 - b1 - b2
    if (b0 < -1e-9 || b1 < -1e-9 || b2 < -1e-9) continue
    const w = [b0, b1, b2]
    return [0, 1].map((c) => v.reduce((sum, k, n) => sum + w[n] * pm.xy[2 * k + c], 0)) as [number, number]
  }
  throw new Error(`piksel ${x}, ${y} poza trójkątami komórki`)
}

/** 40 punktów wewnątrz komórek (stałe, nie na wierzchołkach siatki). */
function interiorPixels(width: number, height: number): [number, number][] {
  let seed = 12345
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648)
  return Array.from({ length: 40 }, () => [(0.02 + 0.96 * rnd()) * width, (0.02 + 0.96 * rnd()) * height])
}

function maxError(photo: Photo, proj: Projector): number {
  const mesh = skyMesh(gridOf(photo))!
  const pm = projectMesh(mesh, proj, HOR, [], 1000, 1000)
  expect(pm).not.toBeNull()
  let worst = 0
  for (const [x, y] of interiorPixels(photo.width, photo.height)) {
    const s = skyOfPixel(photo, x, y)
    const exact = proj.eq(unitVector(s.raDeg, s.decDeg))!
    const got = interpolated(mesh, pm!, photo.width, photo.height, x, y)
    worst = Math.max(worst, Math.hypot(got[0] - exact[0], got[1] - exact[1]))
  }
  return worst
}

const projector = (view: View) => makeProjector(HOR, view, 500, 500, 480)

it('siatka 17 × 17: 289 wierzchołków, 1536 indeksów, UV narożników, promień obejmuje wszystkie punkty', () => {
  const mesh = skyMesh(gridOf({ center: { raDeg: 202.47, decDeg: 47.2 }, degPerPx: 0.001, width: 1500, height: 1500 }))!
  expect(mesh.dirs).toHaveLength(289)
  expect(mesh.indices).toHaveLength(16 * 16 * 6)
  const uv = (k: number) => [mesh.uv[2 * k], mesh.uv[2 * k + 1]]
  expect(uv(0)).toEqual([0, 0])
  expect(uv(16)).toEqual([1, 0])
  expect(uv(272)).toEqual([0, 1])
  expect(uv(288)).toEqual([1, 1])
  for (const d of mesh.dirs) expect(angleDeg(mesh.centre, d)).toBeLessThanOrEqual(mesh.radiusDeg + 1e-9)
  expect(Math.abs(mesh.radiusDeg - 1.06)).toBeLessThan(0.02)
})

it('piksel wewnątrz komórki trafia w rzut swojego RA/Dec z dokładnością 0,5 px', () => {
  const cases: { alt: number; az: number; fov: number; field: number; rot: number; flip: boolean }[] = [
    { alt: 85, az: 0, fov: 8, field: 1.5, rot: 0, flip: false },
    { alt: 12, az: 300, fov: 8, field: 1.5, rot: 30, flip: false },
    { alt: 45, az: 135, fov: 30, field: 6, rot: 110, flip: false },
    { alt: 40, az: 70, fov: 8, field: 1.5, rot: 0, flip: true },
  ]
  for (const c of cases) {
    const photo: Photo = { center: eqFromHor(HOR, c.alt, c.az), degPerPx: c.field / 1500, width: 1500, height: 1200, rotDeg: c.rot, flip: c.flip }
    expect(maxError(photo, projector({ altDeg: c.alt, azDeg: c.az, fovDeg: c.fov }))).toBeLessThan(0.5)
  }
  const dome: Photo = { center: eqFromHor(HOR, 60, 200), degPerPx: 0.001, width: 1500, height: 1200 }
  expect(maxError(dome, projector(FULL_DOME))).toBeLessThan(0.5)
})

it('zdjęcie na granicy RA 0°/360° i przy biegunie leży w całości i w granicach 0,5 px', () => {
  for (const center of [{ raDeg: 0.1, decDeg: 30 }, { raDeg: 50, decDeg: 88.5 }]) {
    const h = vecToHorizontal(mulVec(HOR, unitVector(center.raDeg, center.decDeg)))
    expect(h.altDeg).toBeGreaterThan(10)
    const photo: Photo = { center, degPerPx: 0.001, width: 1500, height: 1500 }
    const proj = projector({ altDeg: h.altDeg, azDeg: h.azDeg, fovDeg: 8 })
    const pm = projectMesh(skyMesh(gridOf(photo))!, proj, HOR, [], 1000, 1000)
    expect(pm).not.toBeNull()
    expect(pm!.longSidePx).toBeGreaterThan(100)
    expect(maxError(photo, proj)).toBeLessThan(0.5)
  }
})

it('punkt siatki niebędący liczbą odrzuca zdjęcie', () => {
  const grid = gridOf({ center: { raDeg: 202.47, decDeg: 47.2 }, degPerPx: 0.001, width: 1500, height: 1500 })
  grid.sky[100] = [NaN, 47]
  expect(skyMesh(grid)).toBeNull()
})

it('krycie wierzchołków z własnego horyzontu', () => {
  const horizon = [{ azDeg: 0, altDeg: 20 }]
  const at = (alt: number, field: number) => {
    const photo: Photo = { center: eqFromHor(HOR, alt, 150), degPerPx: field / 1500, width: 1500, height: 1500 }
    return projectMesh(skyMesh(gridOf(photo))!, projector({ altDeg: alt, azDeg: 150, fovDeg: 30 }), HOR, horizon, 1000, 1000)
  }
  expect(at(15, 1.5)).toBeNull()
  const high = at(30, 1.5)!
  expect([...high.alpha].every((a) => a === 1)).toBe(true)
  const edge = at(20, 3)!
  expect([...edge.alpha].some((a) => a === 0)).toBe(true)
  expect([...edge.alpha].some((a) => a === 1)).toBe(true)
})

it('zdjęcie za obserwatorem albo daleko poza ekranem jest pomijane', () => {
  const proj = projector({ altDeg: 10, azDeg: 0, fovDeg: 30 })
  for (const az of [180, 60]) {
    const photo: Photo = { center: eqFromHor(HOR, 10, az), degPerPx: 0.001, width: 1500, height: 1500 }
    expect(projectMesh(skyMesh(gridOf(photo))!, proj, HOR, [], 1000, 1000)).toBeNull()
  }
})

it('długi bok zdjęcia na ekranie odpowiada skali rzutu', () => {
  const proj = projector({ altDeg: 50, azDeg: 220, fovDeg: 8 })
  const photo: Photo = { center: eqFromHor(HOR, 50, 220), degPerPx: 0.001, width: 1500, height: 1000 }
  const pm = projectMesh(skyMesh(gridOf(photo))!, proj, HOR, [], 1000, 1000)!
  const expected = 4 * proj.scale * Math.tan(0.375 * DEG)
  expect(Math.abs(pm.longSidePx / expected - 1)).toBeLessThan(0.02)
})

it('poziom tekstury rośnie z wielkością na ekranie i nie przekracza zdjęcia ani GPU', () => {
  expect(textureLevel(5, 3000, 16384)).toBe(256)
  expect(textureLevel(300, 3000, 16384)).toBe(512)
  expect(textureLevel(1500, 3000, 16384)).toBe(2048)
  expect(textureLevel(9000, 9000, 16384)).toBe(2048)
  expect(textureLevel(1500, 900, 16384)).toBe(900)
  expect(textureLevel(1500, 3000, 1024)).toBe(1024)
  expect(textureLevel(5, 200, 16384)).toBe(200)
})

it('limit pamięci zwalnia najdawniej rysowane, nigdy rysowane w tej klatce', () => {
  const e = [{ key: 'a', bytes: 60, lastDrawn: 1 }, { key: 'b', bytes: 60, lastDrawn: 3 }, { key: 'c', bytes: 60, lastDrawn: 2 }]
  expect(evictionOrder(e, 130, new Set())).toEqual(['a'])
  expect(evictionOrder(e, 50, new Set(['a']))).toEqual(['c', 'b'])
  expect(evictionOrder(e, 500, new Set())).toEqual([])
})

function record(objectId: string, photoId: string, photo: Photo): OwnPhotoRecord {
  return {
    objectId, photoId, name: `${objectId}.jpg`, width: photo.width, height: photo.height, createdAt: 0,
    astrometry: {} as OwnPhotoRecord['astrometry'], grid: gridOf(photo), image: new Blob(), mask: null,
  }
}

it('to samo zdjęcie u dwóch obiektów rysowane raz; uszkodzona siatka pomijana', () => {
  const photo: Photo = { center: { raDeg: 202.47, decDeg: 47.2 }, degPerPx: 0.001, width: 1500, height: 1500 }
  const broken = record('M 101', 'zly', photo)
  broken.grid.sky[3] = [NaN, NaN]
  const out = skyPhotos([record('M 51', 'abc', photo), record('NGC 5195', 'abc', photo), broken])
  expect(out).toHaveLength(1)
  expect(out[0].key).toBe('abc')
  expect(out[0].objectIds).toEqual(['M 51', 'NGC 5195'])
})

it('wybrany obiekt na wierzchu, poza nim większe pole niżej', () => {
  const at = (id: string, field: number) => record(id, id, { center: { raDeg: 83.8, decDeg: -5.4 }, degPerPx: field / 1500, width: 1500, height: 1500 })
  const photos = skyPhotos([at('a', 3 * Math.SQRT2), at('b', 1 * Math.SQRT2), at('c', 2 * Math.SQRT2)])
  expect(drawOrder(photos, null).map((p) => p.key)).toEqual(['a', 'c', 'b'])
  expect(drawOrder(photos, 'a').map((p) => p.key)).toEqual(['c', 'b', 'a'])
})
