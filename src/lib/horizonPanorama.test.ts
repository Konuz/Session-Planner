import { describe, expect, it } from 'vitest'
import { horizonAltitude, normalizeHorizon } from './horizon'
import { detectPanoramaOutline, fromPanoramaPoint, toPanoramaPoint } from './horizonPanorama'

describe('horyzont z panoramy', () => {
  it('pomija ciemną chmurę odciętą od gruntu i zachowuje koronę połączoną z pniem', () => {
    const width = 180
    const height = 90
    const pixels = new Uint8ClampedArray(width * height * 4)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tree = (x >= 55 && x < 83 && y >= 30 && y < 45) || (x >= 65 && x < 73 && y >= 45)
        const cloud = x >= 106 && x < 132 && y >= 14 && y < 24
        pixels.set(y >= 70 || tree || cloud ? [52, 68, 34, 255] : [85, 144, 205, 255], (y * width + x) * 4)
      }
    }
    const calibration = { zeroRow: 70 / height, verticalFov: 90, leftAz: 0 }
    const outline = detectPanoramaOutline(pixels, width, height)
    const profile = normalizeHorizon(outline.map((p) => fromPanoramaPoint(p, calibration)))
    expect(horizonAltitude(profile, 138)).toBeCloseTo(40, 0)
    expect(horizonAltitude(profile, 238)).toBeCloseTo(0, 0)
  })

  it('zachowuje położenie poprawionego punktu na zdjęciu przy obrocie przez północ', () => {
    const calibration = { zeroRow: 0.7, verticalFov: 100, leftAz: 320 }
    const point = { x: 1 / 6, y: 0.3 }
    const projected = fromPanoramaPoint(point, calibration)
    expect(projected.azDeg).toBe(20)
    expect(projected.altDeg).toBeCloseTo(40)
    const source = toPanoramaPoint(projected, calibration)
    expect(source.x).toBeCloseTo(point.x)
    expect(source.y).toBeCloseTo(point.y)
  })
})
