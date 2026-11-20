import { describe, expect, it } from 'vitest'
import { arcsecPerPixel, layoutTan, paintSizeFor, paintTan, SURVEYS, tileOrderFor, tilePixelArcsec, tileUrl } from './hips'

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
    const sho = paintTan(l, new Map([[5, tile]]), 'swap-rb')!
    expect([...sho.slice(4, 8)]).toEqual([10, 50, 200, 255])
    expect(sho.slice(0, 4)).toEqual(color.slice(0, 4))
    expect(paintTan(l, new Map([[5, null]]), 'color')).toBeNull()
  })
  it('NSNS: rząd 5 (12,9″), malowanie w rozdzielczości kafelka tylko na najwyższym rzędzie', () => {
    expect(tilePixelArcsec(5)).toBeCloseTo(12.88, 2)
    // Kadr 800 px na 1° (4,5″/px): NSNS kończy się na rzędzie 5, obraz malowany na 280 px i powiększany.
    const scale = arcsecPerPixel(1, 800)
    expect(tileOrderFor(scale, SURVEYS.nsns.maxOrder)).toBe(5)
    expect(paintSizeFor(scale, 5, SURVEYS.nsns, 800)).toBe(280)
    // DSS2 ma drobniejsze kafelki (rząd 7): bez zmian. Piksel kafelka nie większy niż obrazu: bez zmian.
    expect(paintSizeFor(scale, tileOrderFor(scale, 9), SURVEYS.dss2, 800)).toBe(800)
    expect(paintSizeFor(arcsecPerPixel(4, 800), 5, SURVEYS.nsns, 800)).toBe(800)
    expect(SURVEYS.nsns.mirrors).toEqual(['/api/hips/nsns-tc8'])
    expect(SURVEYS.nsnsRgb.mirrors).toEqual(['/api/hips/nsns-rgb8'])
    expect(tileOrderFor(scale, SURVEYS.nsnsOhs.maxOrder)).toBe(6)
    expect(tilePixelArcsec(6)).toBeCloseTo(6.44, 2)
    expect(paintSizeFor(scale, 6, SURVEYS.nsnsOhs, 800)).toBe(559)
  })
})
