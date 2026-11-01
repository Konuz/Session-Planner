// Składanie obrazu TAN z kafelków HiPS: wybór rzędu, pobranie kafelków z luster, dekodowanie, malowanie, JPEG.
import { arcsecPerPixel, layoutTan, paintTan, SURVEYS, tileOrderFor, type HipsCancel, type HipsReply, type HipsRequest, type TilePixels } from '../lib/hips'
import { fetchTile } from '../lib/hipsTiles'

// Zadania anulowane przez stronę: kafelki dalej trafiają do Cache Storage, ale bez dekodowania i malowania.
const cancelled = new Set<number>()

async function decode(blob: Blob): Promise<TilePixels> {
  const bitmap = await createImageBitmap(blob)
  const canvas = new OffscreenCanvas(512, 512)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()
  return { data: ctx.getImageData(0, 0, 512, 512).data }
}

async function render(req: HipsRequest): Promise<HipsReply | null> {
  const survey = SURVEYS[req.survey]
  const order = tileOrderFor(arcsecPerPixel(req.fovDeg, req.sizePx), survey.maxOrder, req.coarser)
  const layout = layoutTan({ raDeg: req.raDeg, decDeg: req.decDeg, fovDeg: req.fovDeg, sizePx: req.sizePx, order }, survey)
  const tiles = new Map<number, TilePixels | null>()
  await Promise.all(
    layout.tiles.map(async (n) => {
      const blob = await fetchTile(survey, order, n).catch(() => null)
      tiles.set(n, blob && !cancelled.has(req.id) ? await decode(blob).catch(() => null) : null)
    }),
  )
  if (cancelled.has(req.id)) return null
  const rgba = paintTan(layout, tiles, req.mode)
  if (!rgba) throw new Error('brak kafelków')
  const canvas = new OffscreenCanvas(req.sizePx, req.sizePx)
  canvas.getContext('2d')!.putImageData(new ImageData(rgba as Uint8ClampedArray<ArrayBuffer>, req.sizePx, req.sizePx), 0, 0)
  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 })
  return { id: req.id, blob, complete: layout.tiles.every((n) => tiles.get(n)) }
}

self.onmessage = (e: MessageEvent<HipsRequest | HipsCancel>) => {
  const msg = e.data
  if ('cancel' in msg) {
    cancelled.add(msg.cancel)
    return
  }
  render(msg)
    .catch((err: Error): HipsReply => ({ id: msg.id, error: err.message }))
    .then((reply) => {
      cancelled.delete(msg.id)
      if (reply) self.postMessage(reply)
    })
}
