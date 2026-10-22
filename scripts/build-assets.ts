// Przygotowuje grafiki interfejsu w public/icons z obrazów źródłowych (domyślnie folder icons/ w katalogu głównym):
// - telescope.webp: kadr teleskopu (zanikanie krawędzi robi CSS),
// - moon.webp: tarcza Księżyca przycięta do koła (faza nakładana w SVG),
// - tab-<id>-on.webp / tab-<id>-off.webp: ikony zakładek (świecące = aktywna, srebrne = nieaktywna)
//   z kanałem alfa wyliczonym z jasności względem ciemnego tła arkusza.
//
// Uruchom: node scripts/build-assets.ts [katalog-źródeł]
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'

const ROOT = join(import.meta.dirname, '..')
const SRC = process.argv[2] ?? join(ROOT, 'icons')
const OUT = join(ROOT, 'public', 'icons')
mkdirSync(OUT, { recursive: true })

const MOON = 'Gemini_Generated_Image_3pafp3pafp3pafp3.jpg'
const TELESCOPE = 'Gemini_Generated_Image_mcenj6mcenj6mcen.jpg'
const TABS_ON = 'Gemini_Generated_Image_nw9fxjnw9fxjnw9f (1).jpg'
const TABS_OFF = 'Gemini_Generated_Image_nw9fxjnw9fxjnw9f.jpg'
const TAB_IDS = ['sky', 'catalog', 'planner', 'equipment', 'horizon']

// Teleskop: kadr wokół instrumentu (statyw sięga dolnej krawędzi zdjęcia).
await sharp(join(SRC, TELESCOPE))
  .extract({ left: 150, top: 60, width: 2200, height: 1636 })
  .resize(720)
  .webp({ quality: 78 })
  .toFile(join(OUT, 'telescope.webp'))

// Księżyc: kwadrat opisany na tarczy (środek i promień zmierzone na obrazie 2048 px).
const MOON_CX = 1024
const MOON_CY = 1023
const MOON_R = 876
await sharp(join(SRC, MOON))
  .extract({ left: MOON_CX - MOON_R, top: MOON_CY - MOON_R, width: 2 * MOON_R, height: 2 * MOON_R })
  .resize(256)
  .webp({ quality: 82 })
  .toFile(join(OUT, 'moon.webp'))

/**
 * Ikony: kwadrat wokół środka każdej z 5 ikon arkusza; alfa z najjaśniejszego kanału ponad tło,
 * kolor odzyskany z mieszania z tłem (P = a·F + (1 − a)·B).
 */
async function tabIcons(file: string, centersX: number[], centerY: number, softness: number, floor: number, suffix: 'on' | 'off') {
  const side = 540
  for (const [i, cx] of centersX.entries()) {
    const { data, info } = await sharp(join(SRC, file))
      .extract({ left: Math.round(cx - side / 2), top: Math.round(centerY - side / 2), width: side, height: side })
      .resize(96)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    const bg = [11, 14, 22]
    const rgba = Buffer.alloc(info.width * info.height * 4)
    for (let p = 0; p < info.width * info.height; p++) {
      const px = [data[p * 3], data[p * 3 + 1], data[p * 3 + 2]]
      const lift = Math.max(px[0] - bg[0], px[1] - bg[1], px[2] - bg[2])
      // Poświata obcięta brzegiem kadru wygasa w pasie 5% przy krawędzi kwadratu, żeby nie zostawiać ostrej linii.
      const dx = Math.abs((p % info.width) / (info.width - 1) - 0.5)
      const dy = Math.abs(Math.floor(p / info.width) / (info.height - 1) - 0.5)
      const edge = Math.max(0, Math.min(1, (0.5 - Math.max(dx, dy)) / 0.05))
      const a = Math.max(0, Math.min(1, (lift - floor) / softness)) * edge
      for (let c = 0; c < 3; c++) rgba[p * 4 + c] = a > 0 ? Math.max(0, Math.min(255, Math.round((px[c] - (1 - a) * bg[c]) / a))) : 0
      rgba[p * 4 + 3] = Math.round(a * 255)
    }
    await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
      .webp({ quality: 85, alphaQuality: 90 })
      .toFile(join(OUT, `tab-${TAB_IDS[i]}-${suffix}.webp`))
  }
}

await tabIcons(TABS_ON, [316, 853, 1376, 1904, 2432], 767, 110, 30, 'on')
await tabIcons(TABS_OFF, [347, 875, 1380, 1880, 2409], 770, 70, 12, 'off')
console.log('Gotowe: public/icons')
