import { expect, it } from 'vitest'
import { blackBorderMask } from './blackBorderMask'

/** Obraz RGB (lub RGBA) wypełniony szarością 120, z pikselami ustawionymi przez `paint`. */
function image(width: number, height: number, paint: (x: number, y: number) => number | null, channels = 3) {
  const pixels = new Uint8Array(width * height * channels)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const v = paint(x, y) ?? 120
      const i = (y * width + x) * channels
      pixels[i] = v
      pixels[i + 1] = v
      pixels[i + 2] = v
      if (channels === 4) pixels[i + 3] = 255
    }
  }
  return pixels
}

const wedge = (x: number, y: number) => (x + y < 10 ? 0 : null)

it('klin w narożniku jest wycięty', () => {
  const mask = blackBorderMask(image(40, 30, wedge), 40, 30, 3)
  expect(mask).not.toBeNull()
  expect(mask![0]).toBe(0)
  expect(mask![2 * 40 + 5]).toBe(0)
  expect(mask![15 * 40 + 20]).toBe(255)
})

it('czarny obszar we wnętrzu zostaje', () => {
  const inner = (x: number, y: number) => (x >= 17 && x < 23 && y >= 12 && y < 18 ? 0 : null)
  expect(blackBorderMask(image(40, 30, inner), 40, 30, 3)).toBeNull()
})

it('obraz bez czarnych brzegów daje null', () => {
  expect(blackBorderMask(image(40, 30, () => null), 40, 30, 3)).toBeNull()
})

it('erozja wcina się w zdjęcie o erodePx', () => {
  const band = (x: number) => (x < 5 ? 0 : null)
  const mask = blackBorderMask(image(40, 30, band), 40, 30, 3, { erodePx: 2 })!
  const row = 15 * 40
  for (let x = 0; x <= 6; x++) expect(mask[row + x]).toBe(0)
  expect(mask[row + 7]).toBe(255)
})

it('szum JPEG do progu też jest tłem', () => {
  // Pas 6 px przy lewej krawędzi z wartościami 0–8; w wierszu 15 piksel x = 2 ma 9 i przerywa zalewanie w tym wierszu.
  const noisy = (x: number, y: number) => (x < 6 ? (y === 15 && x === 2 ? 9 : (x + y) % 9) : null)
  const mask = blackBorderMask(image(40, 30, noisy), 40, 30, 3, { erodePx: 0 })!
  expect(mask[10 * 40 + 4]).toBe(0)
  expect(mask[15 * 40 + 2]).toBe(255)
})

it('kanał alfa jest ignorowany', () => {
  const mask = blackBorderMask(image(40, 30, wedge, 4), 40, 30, 4)
  expect(mask).not.toBeNull()
  expect(mask![0]).toBe(0)
  expect(mask![15 * 40 + 20]).toBe(255)
})
