// Wybrany zestaw Vista Aero A: wycięcie arkusza, usunięcie tła i eksport WebP.
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import sharp from 'sharp'

const ROOT = join(import.meta.dirname, '..')
const IDS = ['sky', 'catalog', 'planner', 'equipment', 'horizon']

export async function buildTabIcons() {
  const source = join(ROOT, 'output', 'icons-3d', 'vista-a', 'source.png')
  const out = join(ROOT, 'public', 'icons')
  mkdirSync(out, { recursive: true })
  const { width = 0, height = 0 } = await sharp(source).metadata()
  const bg = [6, 13, 23]
  for (const [i, id] of IDS.entries()) {
    for (const [row, state] of ['off', 'on'].entries()) {
      const left = Math.round(i * width / 5)
      const top = Math.round(row * height / 2)
      const { data, info } = await sharp(source)
        .extract({ left, top, width: Math.round((i + 1) * width / 5) - left, height: Math.round((row + 1) * height / 2) - top })
        .resize(112, 112, { fit: 'contain', background: '#060d17' })
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })
      const rgba = Buffer.alloc(info.width * info.height * 4)
      for (let p = 0; p < info.width * info.height; p++) {
        const lift = Math.max(...bg.map((b, c) => data[p * 3 + c] - b))
        const alpha = Math.max(0, Math.min(1, (lift - 6) / 48))
        for (let c = 0; c < 3; c++) {
          rgba[p * 4 + c] = alpha > 0 ? Math.round(Math.max(0, Math.min(255, (data[p * 3 + c] - (1 - alpha) * bg[c]) / alpha))) : 0
        }
        rgba[p * 4 + 3] = Math.round(alpha * 255)
      }
      await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
        .extend({ top: 8, bottom: 8, left: 8, right: 8, background: '#00000000' })
        .webp({ quality: 90, alphaQuality: 100 })
        .toFile(join(out, `tab-${id}-${state}.webp`))
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await buildTabIcons()
}
