import { describe, expect, it } from 'vitest'
import { arcsecPerPixel, layoutTan, paintTan, SURVEYS, tileOrderFor, tileUrl } from './hips'

describe('HiPS', () => {
  it('adres kafelka', () => {
    expect(tileUrl(SURVEYS.dss2.mirrors[0], 7, 51933)).toBe('https://cdn.skies.esac.esa.int/DSSColor/Norder7/Dir50000/Npix51933.jpg')
    expect(tileUrl('b', 3, 300)).toBe('b/Norder3/Dir0/Npix300.jpg')
  })
  it('rząd kafelków: piksel kafelka nie większy niż piksel obrazu', () => {
    expect(arcsecPerPixel(0.4, 300)).toBeCloseTo(4.8, 3)
    expect(tileOrderFor(4.8, 9)).toBe(7)
    expect(tileOrderFor(13.5, 9)).toBe(5)
    expect(tileOrderFor(0.45, 9)).toBe(9)
    expect(tileOrderFor(0.45, 11)).toBe(10)
    expect(tileOrderFor(270, 9)).toBe(1)
    expect(tileOrderFor(1000, 9)).toBe(0)
    expect(tileOrderFor(4.8, 9, 1)).toBe(6)
    expect(tileOrderFor(13.5, 9, 2)).toBe(3)
  })
  it('kafelki dla M 27 (0,4°, 300 px, rząd 7) jak w niezależnym rzucie z astropy', () => {
    const l = layoutTan({ raDeg: 299.9016, decDeg: 22.721, fovDeg: 0.4, sizePx: 300, order: 7 }, SURVEYS.dss2)
    expect(l.tiles).toEqual([51927, 51932, 51933, 51935, 52104])
    expect(l.tileOfPixel.every((t) => t >= 0)).toBe(true)
  })
  it('pole 60° wokół Polaris: ciągłe, najwyżej 16 kafelków', () => {
    const order = tileOrderFor(arcsecPerPixel(60, 800), 9)
    const l = layoutTan({ raDeg: 37.95456, decDeg: 89.26411, fovDeg: 60, sizePx: 800, order }, SURVEYS.dss2)
    expect(order).toBe(1)
    expect(l.tileOfPixel.every((t) => t >= 0)).toBe(true)
    expect(l.tiles.length).toBeLessThanOrEqual(16)
  })
  it('PanSTARRS: piksele na południe od −30° poza pokryciem', () => {
    const l = layoutTan({ raDeg: 100, decDeg: -30, fovDeg: 2, sizePx: 200, order: 6 }, SURVEYS.ps1)
    expect(l.tileOfPixel[0 * 200 + 100]).toBeGreaterThanOrEqual(0) // górny wiersz, δ ≈ −29°
    expect(l.tileOfPixel[199 * 200 + 100]).toBe(-1) // dolny wiersz, δ ≈ −31°
  })
  it('malowanie: kanał R z kontrastem 1,15, paski w lukach, null bez kafelków', () => {
    const l = { sizePx: 16, order: 0, tiles: [5], tileOfPixel: new Int32Array(256).fill(5), colRow: new Uint32Array(256) }
    l.tileOfPixel[0] = -1
    l.tileOfPixel[8] = -1
    const tile = { data: new Uint8ClampedArray(512 * 512 * 4) }
    tile.data.set([200, 50, 10, 255], 0) // piksel (col 0, row 0) kafelka
    const red = paintTan(l, new Map([[5, tile]]), 'red')!
    expect([...red.slice(4, 8)]).toEqual([211, 211, 211, 255]) // round((200 − 128)·1,15 + 128) = round(210,8)
    expect([...red.slice(0, 4)]).toEqual([0x0b, 0x0d, 0x17, 255]) // (0,0): pasek --card
    expect([...red.slice(32, 36)]).toEqual([0x15, 0x19, 0x2b, 255]) // (8,0): pasek --border
    const color = paintTan(l, new Map([[5, tile]]), 'color')!
    expect([...color.slice(4, 8)]).toEqual([200, 50, 10, 255])
    expect(paintTan(l, new Map([[5, null]]), 'color')).toBeNull()
  })
})
