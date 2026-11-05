// Maska czarnych brzegów zdjęcia po stackowaniu: kliny i pasy, w których klatki się nie pokrywały.
// Wycina tylko czarne obszary połączone z krawędzią; ciemne miejsca we wnętrzu zdjęcia zostają.

/**
 * Jeden kanał `width·height`: 255 = zostaw, 0 = wytnij; `null`, gdy nic nie wycięto.
 * Piksel jest czarny, gdy każdy z trzech pierwszych kanałów ≤ `threshold` (alfa pomijana).
 * Erozja o `erodePx` (odległość szachownicowa) usuwa ciemną obwódkę na granicy.
 */
export function blackBorderMask(pixels: Uint8Array, width: number, height: number, channels: number, opts: { threshold?: number; erodePx?: number } = {}): Uint8Array | null {
  const { threshold = 8, erodePx = 2 } = opts
  const n = width * height
  const black = (i: number) => {
    const p = i * channels
    return pixels[p] <= threshold && pixels[p + Math.min(1, channels - 1)] <= threshold && pixels[p + Math.min(2, channels - 1)] <= threshold
  }
  const mask = new Uint8Array(n).fill(255)
  const queue = new Int32Array(n)
  let head = 0
  let tail = 0
  const visit = (i: number) => {
    if (mask[i] === 0 || !black(i)) return
    mask[i] = 0
    queue[tail++] = i
  }
  for (let x = 0; x < width; x++) { visit(x); visit((height - 1) * width + x) }
  for (let y = 0; y < height; y++) { visit(y * width); visit(y * width + width - 1) }
  if (!tail) return null
  while (head < tail) {
    const i = queue[head++]
    const x = i % width
    if (x > 0) visit(i - 1)
    if (x < width - 1) visit(i + 1)
    if (i >= width) visit(i - width)
    if (i < n - width) visit(i + width)
  }
  // Erozja warstwami od wyciętych pikseli: każdy przebieg dokłada 8-sąsiadów poprzedniej warstwy.
  let from = 0
  for (let pass = 0; pass < erodePx; pass++) {
    const to = tail
    for (let q = from; q < to; q++) {
      const i = queue[q]
      const x = i % width
      const y = (i - x) / width
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy
        if (yy < 0 || yy >= height) continue
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx
          if (xx < 0 || xx >= width) continue
          const j = yy * width + xx
          if (mask[j] === 0) continue
          mask[j] = 0
          queue[tail++] = j
        }
      }
    }
    from = to
  }
  return mask
}
