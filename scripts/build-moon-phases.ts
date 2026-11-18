// node scripts/build-moon-phases.ts
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'

// Zdjęcie sondy Galileo PIA00405, NASA/JPL/USGS, wycentrowane na tarczy.
// https://science.nasa.gov/photojournal/earths-moon/
// Kadr 1502×1502 od (22, 32) z wersji 1536×1536, zapisany w rozdzielczości 768×768.
const source = join(import.meta.dirname, 'moon-full-reference.webp')
const out = join(import.meta.dirname, '..', 'public', 'icons', 'moon-phases')
const size = 512
const center = size / 2
const radius = center - 1
const alpha = Buffer.alloc(size * size)

for (let y = 0; y < size; y++) {
  for (let x = 0; x < size; x++) {
    const distance = Math.hypot(x + 0.5 - center, y + 0.5 - center)
    const edge = Math.max(0, Math.min(1, (radius + 1 - distance) / 3))
    alpha[y * size + x] = Math.round(255 * edge * edge * (3 - 2 * edge))
  }
}

mkdirSync(out, { recursive: true })
await sharp(source)
  .resize(size, size)
  .joinChannel(alpha, { raw: { width: size, height: size, channels: 1 } })
  .webp({ quality: 92, alphaQuality: 100 })
  .toFile(join(out, 'moon-full.webp'))
