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
  // Pas 6 px przy lewej krawędzi z wartościami 0–4 (próg); w wierszu 15 piksel x = 2 ma 5 i zostaje.
  const noisy = (x: number, y: number) => (x < 6 ? (y === 15 && x === 2 ? 5 : (x + y) % 5) : null)
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

it('ciemne niebo z gwiazdami przy krawędzi nie jest wycinane', () => {
  // Przetworzone zdjęcie z przyciętą czernią: niebo 0–6 sięga krawędzi, 300 gwiazd r = 2 i jasny dysk.
  let seed = 7
  const rand = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648
  const stars = Array.from({ length: 300 }, () => [Math.floor(rand() * 400), Math.floor(rand() * 300)])
  const sky = image(400, 300, (x, y) => {
    if (Math.hypot(x - 200, y - 150) < 30) return 220
    if (stars.some(([sx, sy]) => Math.hypot(x - sx, y - sy) <= 2)) return 200
    return Math.floor(rand() * 7)
  })
  expect(blackBorderMask(sky, 400, 300, 3)).toBeNull()
})

it('wycięcie ponad 75% kadru daje null', () => {
  const mostlyBlack = (x: number, y: number) => (x >= 15 && x < 25 && y >= 10 && y < 20 ? null : 0)
  expect(blackBorderMask(image(40, 30, mostlyBlack), 40, 30, 3)).toBeNull()
})

it('ciemny pas nieba z wieloma gwiazdami poniżej 75% kadru nie jest wycinany', () => {
  // Lewa połowa: czarne niebo przy krawędzi z 40 gwiazdami; prawa: jasne tło. Wycięcie ok. 50% kadru.
  const stars = Array.from({ length: 40 }, (_, k) => [4 + (k % 8) * 12, 4 + Math.floor(k / 8) * 12])
  const half = (x: number, y: number) => (x >= 100 ? null : stars.some(([sx, sy]) => Math.abs(x - sx) <= 1 && Math.abs(y - sy) <= 1) ? 200 : 0)
  expect(blackBorderMask(image(200, 60, half), 200, 60, 3)).toBeNull()
})
