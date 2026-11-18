import { describe, expect, it } from 'vitest'
import { DEG, unitVector, type Mat3, type Vec3 } from './astro'
import { healpixFaceXY, nestIndex, nestToFaceXY } from './healpix'
import { allskyUvRect, detailOrder, isSkyLook, skyLookSurvey, tileMesh, tileView, visibleTiles } from './hipsSky'
import { viewMatrix } from './projection'

const toRaDec = (v: ArrayLike<number>, i = 0): [number, number] => [((Math.atan2(v[i + 1], v[i]) / DEG) + 360) % 360, Math.asin(v[i + 2]) / DEG]

describe('kopuła NSNS', () => {
  it('siatka kafelka: u to kolumna (y ściany), v to wiersz (x ściany), jak w obrazie kafelka HiPS', () => {
    const order = 3
    const [face, ix0, iy0] = healpixFaceXY(order, 314.7, 44.3)
    const npix = nestIndex(order, face, ix0, iy0)
    const mesh = tileMesh(order, npix, 4)
    // Wierzchołek i = 1 (x = 1/4), j = 3 (y = 3/4).
    const v = 1 * 5 + 3
    const [ra, dec] = toRaDec(mesh.dirs, v * 3)
    const [f, ix, iy] = healpixFaceXY(order + 9, ra, dec)
    expect(f).toBe(face)
    const row = ix - ix0 * 512
    const column = iy - iy0 * 512
    expect(Math.abs(column - mesh.uv[v * 2] * 512)).toBeLessThanOrEqual(1)
    expect(Math.abs(row - mesh.uv[v * 2 + 1] * 512)).toBeLessThanOrEqual(1)
    expect(mesh.indices.length).toBe(4 * 4 * 6)
    expect(Math.max(...mesh.indices)).toBe(24)
  })

  it('kafelki w polu: najpierw kafelek środka, bez kafelków spoza pokrycia i spod horyzontu', () => {
    const centre = unitVector(83.8, 30)
    const viewAt = (azDeg: number, altDeg: number, radius: number) => tileView({
      eqToView: viewMatrix({ azDeg, altDeg, fovDeg: 2 * radius }), scale: Math.SQRT2 / (2 * Math.tan(radius * DEG / 2)),
      width: 2, height: 2, cx: 1, cy: 1,
    })
    const view = viewAt(83.8, 30, 2)
    const tiles = visibleTiles(5, view, centre, -16)
    const [face, ix, iy] = healpixFaceXY(5, 83.8, 30)
    expect(tiles[0]).toBe(nestIndex(5, face, ix, iy))
    expect(tiles.length).toBeGreaterThan(3)
    expect(tiles.length).toBeLessThan(20)
    const south = unitVector(83.8, -40)
    expect(visibleTiles(5, viewAt(83.8, -40, 2), south, -16)).toEqual([])
    const nadir: Vec3 = [-centre[0], -centre[1], -centre[2]]
    expect(visibleTiles(5, view, nadir, -16)).toEqual([])
    // Kafelki tuż za granicą pokrycia zostają (część z nich ma dane).
    const edge = unitVector(200, -17)
    expect(visibleTiles(5, viewAt(200, -17, 1), edge, -16).length).toBeGreaterThan(0)
  })

  it('cała kopuła z samego Allsky, przy powiększeniu coraz drobniejsze rzędy', () => {
    expect(detailOrder(990, 5)).toBeNull()
    expect(detailOrder(256, 5)).toBe(1)
    expect(detailOrder(32, 5)).toBe(4)
    expect(detailOrder(5, 5)).toBe(5)
  })

  it('koło widoku: środek z trzeciego wiersza macierzy, promień z przekątnej ekranu, najwyżej 140°', () => {
    const m: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1]
    const viewport = { eqToView: m, width: 1600, height: 900, cx: 800, cy: 450, scale: 208 }
    const full = tileView(viewport)
    expect(full.centre).toEqual([0, 0, 1])
    expect(full.radiusDeg).toBeCloseTo(131.23, 1)
    expect(full.arcsecPerPx).toBeCloseTo(991.7, 1)
    expect(tileView({ ...viewport, scale: 50 }).radiusDeg).toBe(140)
  })

  it('Allsky: kafelek w siatce 27 kolumn, cofnięty o pół teksela', () => {
    expect(allskyUvRect(0, 1728, 1856)).toEqual([0.5 / 1728, 0.5 / 1856, 63 / 1728, 63 / 1856])
    const [u0, v0] = allskyUvRect(28, 1728, 1856)
    expect([u0 * 1728, v0 * 1856]).toEqual([64.5, 64.5])
  })

  it('wygląd z zapisu', () => {
    expect(isSkyLook('nsns')).toBe(true)
    expect(isSkyLook('nsnsRgb')).toBe(true)
    expect([skyLookSurvey('default'), skyLookSurvey('nsns'), skyLookSurvey('nsnsRgb')]).toEqual([null, 'nsns', 'nsnsRgb'])
    expect(isSkyLook('dss2')).toBe(false)
    expect(nestToFaceXY(3, 767)).toEqual([11, 7, 7])
  })
})
