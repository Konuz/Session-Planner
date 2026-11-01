// Geometria rzutu z prawdziwych kafelków DSS2 (ESA) względem niezależnego rzutu SkyView DSS2 red.
// Dane: node scripts/build-data.ts hips (scripts/.cache/hips, poza git); bez nich test jest pomijany.
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { layoutTan, paintTan, SURVEYS, type TilePixels } from './hips'

const DIR = join('scripts', '.cache', 'hips')
const FIELDS = [
  { name: 'm27', ra: 299.9016, dec: 22.721, tiles: [51927, 51932, 51933, 51935, 52104] },
  { name: 'ngc188', ra: 12.11, dec: 85.255, tiles: [16301, 16306, 16307, 16312, 16313] },
  { name: 'ngc253', ra: 11.888, dec: -25.288, tiles: [66615, 66621, 66658, 66664] },
  { name: 'ngc7814', ra: 0.8125, dec: 16.145, tiles: [78789, 78791, 78797, 78802, 78808] },
  { name: 'ngc2070', ra: 84.676, dec: -69.101, tiles: [132377, 132378, 132379, 132382] },
]
const W = 300

/** Korelacja Pearsona obrazu przesuniętego o (dx, dy) ze wzorcem, na wycinku [5, 295)². */
function correlation(img: Float64Array, ref: Float64Array, dx: number, dy: number): number {
  const a: number[] = []
  const b: number[] = []
  for (let y = 5; y < W - 5; y++) for (let x = 5; x < W - 5; x++) {
    a.push(img[(y - dy) * W + (x - dx)])
    b.push(ref[y * W + x])
  }
  const mean = (v: number[]) => v.reduce((s, x) => s + x, 0) / v.length
  const ma = mean(a)
  const mb = mean(b)
  let sab = 0
  let saa = 0
  let sbb = 0
  for (let i = 0; i < a.length; i++) {
    sab += (a[i] - ma) * (b[i] - mb)
    saa += (a[i] - ma) ** 2
    sbb += (b[i] - mb) ** 2
  }
  return sab / Math.sqrt(saa * sbb)
}

describe.skipIf(!existsSync(DIR))('geometria na kafelkach DSS2', () => {
  for (const f of FIELDS) {
    it(`${f.name}: zgodność z SkyView, przesunięcie 0 px`, async () => {
      const layout = layoutTan({ raDeg: f.ra, decDeg: f.dec, fovDeg: 0.4, sizePx: W, order: 7 }, SURVEYS.dss2)
      expect(layout.tiles).toEqual(f.tiles)
      const tiles = new Map<number, TilePixels>()
      for (const n of f.tiles) tiles.set(n, { data: new Uint8ClampedArray(await sharp(join(DIR, `dss2-7-${n}.jpg`)).ensureAlpha().raw().toBuffer()) })
      const rgba = paintTan(layout, tiles, 'red')!
      const img = Float64Array.from({ length: W * W }, (_, p) => rgba[p * 4])
      const ref = Float64Array.from(await sharp(join(DIR, `skyview-${f.name}.jpg`)).greyscale().raw().toBuffer())
      let best = { r: -1, dx: 0, dy: 0 }
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
        const r = correlation(img, ref, dx, dy)
        if (r > best.r) best = { r, dx, dy }
      }
      expect(best.r).toBeGreaterThanOrEqual(0.75)
      expect([best.dx, best.dy]).toEqual([0, 0])
    })
  }
})
