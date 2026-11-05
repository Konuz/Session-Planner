// Składanie obrazu na płótnie: tło, a na nim zdjęcie wklejone trójkątami afinicznymi (bez szwów i ramki).
import { affineFromTriangles, expandTriangle, warpTriangles, type OwnPhotoRecord, type Pt, type TanView } from './ownPhoto'

type Canvas = OffscreenCanvas | HTMLCanvasElement
type Context = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D

function canvas(width: number, height: number): Canvas {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height)
  const c = document.createElement('canvas')
  c.width = width
  c.height = height
  return c
}
const context = (c: Canvas) => c.getContext('2d') as Context

// Zdjęcie z wyciętymi czarnymi brzegami w pełnej rozdzielczości; najwyżej dwa naraz (ok. 40 MB każde).
const masked = new Map<string, Promise<Canvas>>()

async function maskedPhoto(record: OwnPhotoRecord): Promise<Canvas> {
  let photo = masked.get(record.photoId)
  if (!photo) {
    photo = (async () => {
      const c = canvas(record.width, record.height)
      const ctx = context(c)
      const image = await createImageBitmap(record.image)
      ctx.drawImage(image, 0, 0, record.width, record.height)
      image.close()
      if (record.mask) {
        // Maska jest w odcieniach szarości (bez alfy): jasność maski → przezroczystość zdjęcia.
        const m = canvas(record.width, record.height)
        const mctx = context(m)
        const maskImage = await createImageBitmap(record.mask)
        mctx.drawImage(maskImage, 0, 0, record.width, record.height)
        maskImage.close()
        const alpha = mctx.getImageData(0, 0, record.width, record.height).data
        const pixels = ctx.getImageData(0, 0, record.width, record.height)
        for (let i = 3; i < pixels.data.length; i += 4) pixels.data[i] = alpha[i - 3]
        ctx.putImageData(pixels, 0, 0)
      }
      return c
    })()
    photo.catch(() => masked.delete(record.photoId))
    masked.set(record.photoId, photo)
    while (masked.size > 2) masked.delete(masked.keys().next().value!)
  }
  return photo
}

async function toBlob(c: Canvas): Promise<Blob> {
  if ('convertToBlob' in c) return c.convertToBlob({ type: 'image/jpeg', quality: 0.92 })
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('Nie udało się zapisać obrazu'))), 'image/jpeg', 0.92))
}

export async function composeOwnPhoto(background: Blob | null, record: OwnPhotoRecord, view: TanView): Promise<Blob> {
  const out = canvas(view.sizePx, view.sizePx)
  const ctx = context(out)
  if (background) {
    const bg = await createImageBitmap(background)
    ctx.drawImage(bg, 0, 0, view.sizePx, view.sizePx)
    bg.close()
  } else {
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, view.sizePx, view.sizePx)
  }
  const triangles = warpTriangles(record.grid, record.width, record.height, view)
  if (triangles.length) {
    // Pomniejszenie źródła do ok. 2× skali docelowej: bez aliasingu w małych miniaturach.
    const scales = triangles.map((t) => {
      const [a, b, c, d] = affineFromTriangles(t.src, t.dst)
      return Math.sqrt(Math.abs(a * d - b * c))
    }).sort((x, y) => x - y)
    const k = Math.min(1, 2 * scales[scales.length >> 1])
    let source: Canvas = await maskedPhoto(record)
    if (k < 1) {
      const small = canvas(Math.max(1, Math.round(record.width * k)), Math.max(1, Math.round(record.height * k)))
      const sctx = context(small)
      sctx.imageSmoothingQuality = 'high'
      sctx.drawImage(source, 0, 0, small.width, small.height)
      source = small
    }
    const kx = source.width / record.width
    const ky = source.height / record.height
    ctx.imageSmoothingQuality = 'high'
    for (const t of triangles) {
      const dst = expandTriangle(t.dst, 1)
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(dst[0][0], dst[0][1])
      ctx.lineTo(dst[1][0], dst[1][1])
      ctx.lineTo(dst[2][0], dst[2][1])
      ctx.closePath()
      ctx.clip()
      const src = t.src.map(([x, y]) => [x * kx, y * ky]) as [Pt, Pt, Pt]
      ctx.setTransform(...affineFromTriangles(src, t.dst))
      ctx.drawImage(source, 0, 0)
      ctx.restore()
    }
  }
  return toBlob(out)
}
