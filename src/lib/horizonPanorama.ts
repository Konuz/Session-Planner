import { normDeg } from './astro'
import type { HorizonPoint } from './horizon'

interface PanoramaPoint {
  x: number
  y: number
}

export interface PanoramaCalibration {
  zeroRow: number
  verticalFov: number
  leftAz: number
}

export function fromPanoramaPoint(point: PanoramaPoint, calibration: PanoramaCalibration): HorizonPoint {
  return {
    azDeg: normDeg(Math.round((calibration.leftAz + point.x * 360) * 100) / 100),
    altDeg: (calibration.zeroRow - point.y) * calibration.verticalFov,
  }
}

export function toPanoramaPoint(point: HorizonPoint, calibration: PanoramaCalibration): PanoramaPoint {
  return {
    x: normDeg(point.azDeg - calibration.leftAz) / 360,
    y: calibration.zeroRow - point.altDeg / calibration.verticalFov,
  }
}

export function detectPanoramaOutline(rgba: Uint8ClampedArray, width: number, height: number): PanoramaPoint[] {
  const mask = new Uint8Array(width * height)
  for (let i = 0; i < mask.length; i++) {
    const r = rgba[i * 4]
    const g = rgba[i * 4 + 1]
    const b = rgba[i * 4 + 2]
    const blue = b >= 55 && b >= g + 5 && b >= r + 1
    const brightNeutral = Math.min(r, g, b) >= 112 && Math.max(r, g, b) - Math.min(r, g, b) <= 58 && b >= g - 27 && g >= r - 23
    mask[i] = blue || brightNeutral ? 0 : 1
  }

  // Keep foreground connected to the bottom. Isolated clouds and holes in the
  // canopy do not move the upper boundary of the resulting horizon profile.
  const queue = new Int32Array(mask.length)
  let end = 0
  const visit = (i: number) => {
    if (mask[i] !== 1) return
    mask[i] = 2
    queue[end++] = i
  }
  for (let i = mask.length - width; i < mask.length; i++) visit(i)
  const top = new Uint16Array(width).fill(height)
  for (let start = 0; start < end; start++) {
    const i = queue[start]
    const x = i % width
    const y = Math.floor(i / width)
    top[x] = Math.min(top[x], y)
    const row = y * width
    visit(row + (x + width - 1) % width)
    visit(row + (x + 1) % width)
    visit(i - width)
    visit(i + width)
  }

  const step = Math.max(1, Math.round(width / 360))
  const sample = (x: number) => {
    const rows = [-2, -1, 0, 1, 2].map((dx) => top[(x + dx + width) % width]).sort((a, b) => a - b)
    return { x: x / width, y: rows[2] / height }
  }
  const samples: PanoramaPoint[] = []
  for (let x = 0; x < width - 1; x += step) samples.push(sample(x))
  samples.push(sample(width - 1))

  const outline = [samples[0]]
  const simplify = (start: number, end: number) => {
    const a = samples[start]
    const b = samples[end]
    let error = 0.0155
    let split = -1
    for (let i = start + 1; i < end; i++) {
      const p = samples[i]
      const y = a.y + (b.y - a.y) * (p.x - a.x) / (b.x - a.x)
      const delta = Math.abs(p.y - y)
      if (delta > error) {
        error = delta
        split = i
      }
    }
    if (split === -1) outline.push(b)
    else {
      simplify(start, split)
      simplify(split, end)
    }
  }
  simplify(0, samples.length - 1)
  return outline
}

export async function readHorizonPanorama(file: File) {
  const image = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  const scale = Math.min(1, 1080 / image.width, 540 / image.height)
  canvas.width = Math.max(2, Math.round(image.width * scale))
  canvas.height = Math.max(2, Math.round(image.height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    image.close()
    throw new Error('Brak kontekstu Canvas')
  }
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
  image.close()
  const { width, height } = canvas
  return {
    url: canvas.toDataURL('image/jpeg', 0.91),
    outline: detectPanoramaOutline(ctx.getImageData(0, 0, width, height).data, width, height),
    calibration: { zeroRow: 0.5, verticalFov: Math.min(180, Math.round(360 * height / width)), leftAz: 0 },
  }
}
