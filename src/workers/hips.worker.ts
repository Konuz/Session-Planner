// Składanie obrazu TAN z kafelków HiPS: wybór rzędu, pobranie kafelków z luster, dekodowanie, malowanie, JPEG.
import { arcsecPerPixel, layoutTan, paintTan, SURVEYS, tileOrderFor, type HipsReply, type HipsRequest, type TilePixels } from '../lib/hips'
import { fetchTile } from '../lib/hipsTiles'

async function decode(blob: Blob): Promise<TilePixels> {
  const bitmap = await createImageBitmap(blob)
  const canvas = new OffscreenCanvas(512, 512)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()
  return { data: ctx.getImageData(0, 0, 512, 512).data }
}

async function render(req: HipsRequest): Promise<Blob> {
  const survey = SURVEYS[req.survey]
  const order = tileOrderFor(arcsecPerPixel(req.fovDeg, req.sizePx), survey.maxOrder, req.coarser)
  const layout = layoutTan({ raDeg: req.raDeg, decDeg: req.decDeg, fovDeg: req.fovDeg, sizePx: req.sizePx, order }, survey)
  const tiles = new Map<number, TilePixels | null>()
  await Promise.all(
    layout.tiles.map(async (n) => {
      tiles.set(n, await fetchTile(survey, order, n).then(decode).catch(() => null))
    }),
  )
  const rgba = paintTan(layout, tiles, req.mode)
  if (!rgba) throw new Error('brak kafelków')
  const canvas = new OffscreenCanvas(req.sizePx, req.sizePx)
  canvas.getContext('2d')!.putImageData(new ImageData(rgba as Uint8ClampedArray<ArrayBuffer>, req.sizePx, req.sizePx), 0, 0)
  return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 })
}

self.onmessage = (e: MessageEvent<HipsRequest>) => {
  const req = e.data
  render(req)
    .then((blob): HipsReply => ({ id: req.id, blob }))
    .catch((err: Error): HipsReply => ({ id: req.id, error: err.message }))
    .then((reply) => self.postMessage(reply))
}
