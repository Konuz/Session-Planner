// Własne zdjęcie z maską czarnych brzegów w pełnej rozdzielczości, poza wątkiem interfejsu (audyt C07): dekodowanie,
// dwa odczyty pikseli (do ok. 2 × 41 MB przy 3200 px) i przepisanie alfy blokowały wcześniej główny wątek.

export interface PhotoMaskRequest { id: number; image: Blob; mask: Blob | null; width: number; height: number }
export type PhotoMaskResult = { id: number; bitmap: ImageBitmap } | { id: number; error: string }

self.onmessage = async (e: MessageEvent<PhotoMaskRequest>) => {
  const { id, image, mask, width, height } = e.data
  const reply = (result: PhotoMaskResult, transfer: Transferable[] = []) =>
    // Forma z tablicą transfer działa w każdej przeglądarce; typy DOM widzą tu Window, stąd rzutowanie.
    (self as unknown as Worker).postMessage(result, transfer)
  try {
    const c = new OffscreenCanvas(width, height)
    const ctx = c.getContext('2d')!
    const photo = await createImageBitmap(image)
    ctx.drawImage(photo, 0, 0, width, height)
    photo.close()
    if (mask) {
      // Maska jest w odcieniach szarości (bez alfy): jasność maski → przezroczystość zdjęcia.
      const m = new OffscreenCanvas(width, height)
      const mctx = m.getContext('2d', { willReadFrequently: true })!
      const maskImage = await createImageBitmap(mask)
      mctx.drawImage(maskImage, 0, 0, width, height)
      maskImage.close()
      const alpha = mctx.getImageData(0, 0, width, height).data
      m.width = m.height = 0
      const pixels = ctx.getImageData(0, 0, width, height)
      for (let i = 3; i < pixels.data.length; i += 4) pixels.data[i] = alpha[i - 3]
      ctx.putImageData(pixels, 0, 0)
    }
    const bitmap = c.transferToImageBitmap()
    reply({ id, bitmap }, [bitmap])
  } catch (err) {
    reply({ id, error: err instanceof Error ? err.message : String(err) })
  }
}
