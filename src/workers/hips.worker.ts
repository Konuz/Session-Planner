// Składanie obrazu TAN z kafelków HiPS: wybór rzędu, pobranie kafelków z luster, dekodowanie, malowanie, JPEG.
import { arcsecPerPixel, layoutTan, paintSizeFor, paintTan, SURVEYS, tileOrderFor, type HipsCancel, type HipsReply, type HipsRequest, type TilePixels } from '../lib/hips'
import { fetchTile } from '../lib/hipsTiles'

// Zadania anulowane przez stronę: kafelki dalej trafiają do Cache Storage, ale bez dekodowania i malowania.
const cancelled = new Set<number>()
const running = new Set<number>()

let decodeCanvas: OffscreenCanvas | null = null
let decodeCtx: OffscreenCanvasRenderingContext2D | null = null

async function decode(blob: Blob): Promise<TilePixels> {
  const bitmap = await createImageBitmap(blob)
  try {
    decodeCanvas ??= new OffscreenCanvas(512, 512)
    decodeCtx ??= decodeCanvas.getContext('2d')!
    // Płótno jest wspólne: bez czyszczenia kafelek z przezroczystością złożyłby się z poprzednim.
    decodeCtx.clearRect(0, 0, 512, 512)
    decodeCtx.drawImage(bitmap, 0, 0)
    return { data: decodeCtx.getImageData(0, 0, 512, 512).data }
  } finally { bitmap.close() }
}

async function render(req: HipsRequest): Promise<HipsReply | null> {
  const survey = SURVEYS[req.survey]
  const scale = arcsecPerPixel(req.fovDeg, req.sizePx)
  const order = tileOrderFor(scale, survey.maxOrder, req.coarser)
  const paintPx = paintSizeFor(scale, order, survey, req.sizePx)
  const layout = layoutTan({ raDeg: req.raDeg, decDeg: req.decDeg, fovDeg: req.fovDeg, sizePx: paintPx, order }, survey)
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
  let canvas = new OffscreenCanvas(paintPx, paintPx)
  canvas.getContext('2d')!.putImageData(new ImageData(rgba as Uint8ClampedArray<ArrayBuffer>, paintPx, paintPx), 0, 0)
  if (paintPx < req.sizePx) {
    const painted = canvas
    canvas = new OffscreenCanvas(req.sizePx, req.sizePx)
    const ctx = canvas.getContext('2d')!
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(painted, 0, 0, req.sizePx, req.sizePx)
  }
  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 })
  return { id: req.id, blob, complete: layout.tiles.every((n) => tiles.get(n)) }
}

self.onmessage = (e: MessageEvent<HipsRequest | HipsCancel>) => {
  const msg = e.data
  if ('cancel' in msg) {
    if (running.has(msg.cancel)) cancelled.add(msg.cancel)
    return
  }
  running.add(msg.id)
  render(msg)
    .catch((err: Error): HipsReply => ({ id: msg.id, error: err.message }))
    .then((reply) => {
      const aborted = cancelled.delete(msg.id)
      running.delete(msg.id)
      self.postMessage(aborted || !reply ? { id: msg.id, cancelled: true } satisfies HipsReply : reply)
    })
}
