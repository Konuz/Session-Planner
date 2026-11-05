// Maska czarnych brzegów zdjęcia po stackowaniu: kliny i pasy, w których klatki się nie pokrywały.
// Wycina tylko czarne obszary połączone z krawędzią; ciemne miejsca we wnętrzu zdjęcia zostają.

/** Więcej wysp „zostaw” poza główną częścią zdjęcia oznacza gwiazdy na czarnym niebie, nie klin. */
const MAX_ISLANDS = 15
/** Mniejsze wyspy to szum lub artefakty JPEG przy krawędzi klina, nie gwiazdy. */
const MIN_ISLAND_PX = 4

/** Liczba 4-spójnych obszarów „zostaw” (255) o co najmniej MIN_ISLAND_PX pikselach, liczona najwyżej do `limit`. */
function keepComponents(mask: Uint8Array, width: number, height: number, limit: number): number {
  const n = width * height
  const seen = new Uint8Array(n)
  const queue = new Int32Array(n)
  let count = 0
  let tail = 0
  const visit = (j: number) => {
    if (mask[j] === 0 || seen[j]) return
    seen[j] = 1
    queue[tail++] = j
  }
  for (let start = 0; start < n && count < limit; start++) {
    if (mask[start] === 0 || seen[start]) continue
    let head = 0
    tail = 0
    visit(start)
    while (head < tail) {
      const i = queue[head++]
      const x = i % width
      if (x > 0) visit(i - 1)
      if (x < width - 1) visit(i + 1)
      if (i >= width) visit(i - width)
      if (i < n - width) visit(i + width)
    }
    if (tail >= MIN_ISLAND_PX) count++
  }
  return count
}

/**
 * Jeden kanał `width·height`: 255 = zostaw, 0 = wytnij; `null`, gdy nic nie wycięto.
 * Piksel jest czarny, gdy każdy z trzech pierwszych kanałów ≤ `threshold` (alfa pomijana).
 * Erozja o `erodePx` (odległość szachownicowa) usuwa ciemną obwódkę na granicy.
 */
export function blackBorderMask(pixels: Uint8Array, width: number, height: number, channels: number, opts: { threshold?: number; erodePx?: number } = {}): Uint8Array | null {
  const { threshold = 4, erodePx = 2 } = opts
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
  // Przycięta czerń nieba sięgająca krawędzi to nie klin: zostawiamy zdjęcie bez maski, gdy wycięcie
  // zajęłoby większość kadru albo otaczałoby wiele wysp (gwiazd). Kliny po stackowaniu są puste.
  if (tail > 0.75 * n || keepComponents(mask, width, height, MAX_ISLANDS + 2) > MAX_ISLANDS + 1) return null
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
