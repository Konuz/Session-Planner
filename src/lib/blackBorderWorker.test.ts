import { expect, it } from 'vitest'
import { blackBorderMask } from './blackBorderMask'
import { blackBorderMaskOffThread } from '../../server/photo.ts'

it('maska w worker_threads daje to samo co na głównym wątku (audyt C09)', async () => {
  const width = 120, height = 80, channels = 3
  const pixels = new Uint8Array(width * height * channels)
  // Jasne zdjęcie z czarnym pasem 15 px z lewej (jak po obrocie i kadrowaniu stacku).
  for (let y = 0; y < height; y++) for (let x = 15; x < width; x++) pixels.fill(120 + ((x * 7 + y * 13) % 60), (y * width + x) * channels, (y * width + x + 1) * channels)
  const expected = blackBorderMask(pixels, width, height, channels)
  expect(expected).not.toBeNull()
  const offThread = await blackBorderMaskOffThread(pixels, width, height, channels)
  expect(offThread).toEqual(expected)
  // Wejście nie zostaje przeniesione do wątku (kopia), więc nadal jest czytelne.
  expect(pixels.length).toBe(width * height * channels)
})
