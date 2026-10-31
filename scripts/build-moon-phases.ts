// Tworzy teksturę pełni (moon-full.webp) z jednej tarczy Księżyca; fazy cieniuje na bieżąco MoonDisc.
// Uruchom po build-assets: node scripts/build-moon-phases.ts
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'

const ROOT = join(import.meta.dirname, '..')
const SIZE = 512
const SOURCE = join(ROOT, 'public', 'icons', 'moon.webp')
const FULL_REFERENCE = join(ROOT, 'scripts', 'moon-full-reference.webp')
const OUT = join(ROOT, 'public', 'icons', 'moon-phases')
const PHASES = [{ name: 'full', illumination: 1, waxing: false }] as const

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

async function main() {
  mkdirSync(OUT, { recursive: true })
  const { data: source } = await sharp(SOURCE).resize(SIZE, SIZE, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const reference = await sharp(FULL_REFERENCE).resize(SIZE, SIZE, { fit: 'fill' }).removeAlpha().raw().toBuffer()

  // Zachowaj dokładną teksturę obecnego obrazu po stronie już oświetlonej;
  // neutralna referencja uzupełnia wyłącznie cień fazy wbudowany w źródło.
  const delta = Buffer.alloc(SIZE * SIZE)
  const cx = SIZE / 2
  const cy = SIZE / 2
  const r = SIZE / 2 - 1
  let baselineSum = 0
  let baselineCount = 0
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const p = (y * SIZE + x) * 3
      const lumSource = source[p] * 0.2126 + source[p + 1] * 0.7152 + source[p + 2] * 0.0722
      const lumReference = reference[p] * 0.2126 + reference[p + 1] * 0.7152 + reference[p + 2] * 0.0722
      const d = lumReference - lumSource
      delta[y * SIZE + x] = clamp(Math.round(d + 128), 0, 255)
      if (x > cx + 18 && (x - cx) ** 2 + (y - cy) ** 2 < (r * 0.88) ** 2) {
        baselineSum += d
        baselineCount++
      }
    }
  }
  const baseline = baselineCount ? baselineSum / baselineCount : 0
  const smoothed = await sharp(delta, { raw: { width: SIZE, height: SIZE, channels: 1 } }).blur(24).extractChannel(0).raw().toBuffer()
  const neutral = Buffer.alloc(SIZE * SIZE * 4)
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const p = (y * SIZE + x) * 3
      const q = (y * SIZE + x) * 4
      const distance = Math.hypot(x + 0.5 - cx, y + 0.5 - cy)
      const alpha = 1 - smoothstep(r - 2, r + 1, distance)
      const blend = smoothstep(14, 48, smoothed[y * SIZE + x] - 128 - baseline)
      for (let c = 0; c < 3; c++) neutral[q + c] = Math.round(source[p + c] * (1 - blend) + reference[p + c] * blend)
      neutral[q + 3] = Math.round(alpha * 255)
    }
  }
  for (const phase of PHASES) {
    const lit = phase.waxing ? 1 : 0
    const gibbous = phase.illumination > 0.5
    const rx = Math.max(0.01, Math.abs(1 - 2 * phase.illumination) * r)
    const shadowRadius = r + 1
    const terminatorSweep = gibbous ? lit : 1 - lit
    const path = `M ${cx} ${cy - shadowRadius} A ${shadowRadius} ${shadowRadius} 0 0 ${lit} ${cx} ${cy + shadowRadius} A ${rx} ${shadowRadius} 0 0 ${terminatorSweep} ${cx} ${cy - shadowRadius} Z`
    const overlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">
      <defs>
        <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="8"/></filter>
        <mask id="unlit"><circle cx="${cx}" cy="${cy}" r="${shadowRadius}" fill="white"/><path d="${path}" fill="black" filter="url(#soft)"/></mask>
      </defs>
      <circle cx="${cx}" cy="${cy}" r="${shadowRadius}" fill="#04060c" opacity="0.98" mask="url(#unlit)"/>
    </svg>`)
    const { data: shadow } = await sharp(overlay).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const shaded = Buffer.from(neutral)
    for (let i = 0; i < shaded.length; i += 4) {
      const amount = shadow[i + 3] / 255
      const pixel = i / 4
      const x = pixel % SIZE
      const y = Math.floor(pixel / SIZE)
      const distance = Math.hypot(x + 0.5 - cx, y + 0.5 - cy)
      const darkLimbFade = smoothstep(r - 24, r - 7, distance) * amount
      shaded[i] = Math.round(shaded[i] * (1 - amount) + 4 * amount)
      shaded[i + 1] = Math.round(shaded[i + 1] * (1 - amount) + 6 * amount)
      shaded[i + 2] = Math.round(shaded[i + 2] * (1 - amount) + 12 * amount)
      shaded[i + 3] = Math.round(shaded[i + 3] * (1 - darkLimbFade))
    }
    await sharp(shaded, { raw: { width: SIZE, height: SIZE, channels: 4 } })
      .webp({ quality: 90, alphaQuality: 100 })
      .toFile(join(OUT, `moon-${phase.name}.webp`))
  }
}

await main()
