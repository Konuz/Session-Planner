// Pośrednik kafelków HiPS Northern Sky Narrowband Survey (S. Ziegenbalg, CC BY-NC-SA 4.0). Jedynym źródłem jest
// prywatny serwer autora (lustra CDS z MocServer zwracają 404), a kafelki PNG mają 650–800 KB. Każdy kafelek pobieramy
// raz, przekodowujemy do JPEG (ok. 9× mniej; przezroczystość poza pokryciem staje się czernią) i trzymamy na dysku.
// Status HiPS „clonable” pozwala na taką kopię; przekodowane kafelki zostają na tej samej licencji. `mirrorSet`
// (skrypt `scripts/hips-mirror.ts`) pobiera cały zestaw z góry; znacznik `mirror-complete.json` w katalogu zestawu
// mówi pośrednikowi, że brak pliku na dysku to brak kafelka, bez pytania źródła.
import { access, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

export const HIPS_SETS: Record<string, string> = {
  'nsns-tc8': 'https://www.simg.de/nebulae3/dr0_1/tc8',
  'nsns-rgb8': 'https://www.simg.de/nebulae3/dr0_2/rgb8',
}
const MAX_ORDER = 5
/** Katalog bufora na dysku; domyślnie `scripts/.cache/hips-proxy` (poza git). */
export type HipsProxyEnv = { HIPS_CACHE_DIR?: string }

const DEFAULT_DIR = fileURLToPath(new URL('../scripts/.cache/hips-proxy/', import.meta.url))
// Allsky.png rzędu 3 ma 5,6 MB, kafelek do 0,8 MB.
const MAX_UPSTREAM_BYTES = 16 << 20
const UPSTREAM_TIMEOUT_MS = 30000
// Uprzejmość wobec serwera autora: najwyżej tyle równoczesnych pobrań.
const MAX_UPSTREAM = 4

export type HipsTilePath = { set: string; order: number; npix: number | 'allsky' }

/** Ścieżka kafelka (końcówka URL): `<zestaw>/Norder<k>/Dir<d>/Npix<n>.jpg` albo `<zestaw>/Norder3/Allsky.jpg`. */
export function parseHipsPath(pathname: string): HipsTilePath | null {
  const m = /(?:^|\/)([a-z0-9-]+)\/Norder(\d)\/(?:Dir(\d+)\/Npix(\d+)|(Allsky))\.jpg$/.exec(pathname)
  if (!m || !(m[1] in HIPS_SETS)) return null
  const order = Number(m[2])
  if (m[5]) return order === 3 ? { set: m[1], order, npix: 'allsky' } : null
  const npix = Number(m[4])
  if (order > MAX_ORDER || npix >= 12 * 4 ** order || Number(m[3]) !== Math.floor(npix / 10000) * 10000) return null
  return { set: m[1], order, npix }
}

function relativePath({ order, npix }: HipsTilePath): string {
  return npix === 'allsky' ? `Norder${order}/Allsky` : `Norder${order}/Dir${Math.floor(npix / 10000) * 10000}/Npix${npix}`
}

async function readBytes(response: Response, maxBytes: number): Promise<Buffer> {
  if (Number(response.headers.get('content-length')) > maxBytes) throw new Error('Odpowiedź przekracza limit rozmiaru')
  const reader = response.body?.getReader()
  if (!reader) return Buffer.alloc(0)
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) return Buffer.concat(chunks)
      size += value.byteLength
      if (size > maxBytes) throw new Error('Odpowiedź przekracza limit rozmiaru')
      chunks.push(value)
    }
  } catch (error) {
    void reader.cancel().catch(() => {})
    throw error
  }
}

export const MIRROR_MARKER = 'mirror-complete.json'

export interface HipsStore {
  /** JPEG kafelka; null, gdy go nie ma (404 źródła albo pełna kopia bez tego pliku). Błąd sieci lub dekodowania rzuca. */
  load(tile: HipsTilePath): Promise<Buffer | null>
  dir: string
}

/** Kafelki z dysku, a brakujące ze źródła (PNG → JPEG) w kolejce najwyżej `MAX_UPSTREAM` pobrań; jedno pobranie na kafelek. */
export function createHipsStore(env: HipsProxyEnv = process.env as HipsProxyEnv, fetchImpl: typeof fetch = fetch): HipsStore {
  const dir = env.HIPS_CACHE_DIR || DEFAULT_DIR
  const inFlight = new Map<string, Promise<Buffer | null>>()
  // Kafelki poza pokryciem (404 źródła): bez ponownych pytań do końca działania procesu.
  const missing = new Set<string>()
  let active = 0
  const waiting: (() => void)[] = []
  const slot = async () => {
    while (active >= MAX_UPSTREAM) await new Promise<void>((r) => waiting.push(r))
    active++
    return () => { active--; waiting.shift()?.() }
  }

  async function fetchTile(tile: HipsTilePath, rel: string): Promise<Buffer | null> {
    const file = join(dir, tile.set, `${rel}.jpg`)
    const cached = await readFile(file).catch(() => null)
    if (cached) return cached
    if (await access(join(dir, tile.set, MIRROR_MARKER)).then(() => true, () => false)) return null
    const release = await slot()
    let png: Buffer
    try {
      const response = await fetchImpl(`${HIPS_SETS[tile.set]}/${rel}.png`, { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) })
      if (response.status === 404) { void response.body?.cancel().catch(() => {}); return null }
      if (!response.ok) { void response.body?.cancel().catch(() => {}); throw new Error(`HTTP ${response.status}`) }
      png = await readBytes(response, MAX_UPSTREAM_BYTES)
    } finally { release() }
    const jpeg = await sharp(png).flatten({ background: '#000' }).jpeg({ quality: 85, mozjpeg: true }).toBuffer()
    await mkdir(dirname(file), { recursive: true })
    const temp = `${file}.${process.pid}.${Date.now()}.tmp`
    await writeFile(temp, jpeg)
    await rename(temp, file).catch(() => rm(temp, { force: true }))
    return jpeg
  }

  return {
    dir,
    async load(tile) {
      const rel = relativePath(tile)
      const key = `${tile.set}/${rel}`
      if (missing.has(key)) return null
      let pending = inFlight.get(key)
      if (!pending) {
        pending = fetchTile(tile, rel).then((jpeg) => { if (!jpeg) missing.add(key); return jpeg }).finally(() => inFlight.delete(key))
        inFlight.set(key, pending)
      }
      return pending
    },
  }
}

export interface MirrorProgress { order: number | 'allsky'; done: number; total: number; tiles: number; missing: number; failed: number }

/**
 * Cały zestaw na dysku: Allsky i kafelki od rzędu 0 w dół. Kafelek nadrzędny istnieje, gdy ma dane któreś z jego
 * dzieci, więc pod brakującym (404) nie schodzimy. Ponawia nieudane pobrania 3 razy; znacznik pełnej kopii zapisuje
 * tylko bez porażek (ponowne uruchomienie dobiera brakujące, gotowe pliki czyta z dysku).
 */
export async function mirrorSet(store: HipsStore, set: string, onProgress: (p: MirrorProgress) => void = () => {}): Promise<{ tiles: number; missing: number; failed: number }> {
  const totals = { tiles: 0, missing: 0, failed: 0 }
  const fetchWithRetry = async (tile: HipsTilePath): Promise<Buffer | null | 'failed'> => {
    for (let attempt = 1; ; attempt++) {
      try { return await store.load(tile) } catch { if (attempt >= 3) return 'failed' }
    }
  }
  const allsky = await fetchWithRetry({ set, order: 3, npix: 'allsky' })
  if (allsky === 'failed') totals.failed++
  onProgress({ order: 'allsky', done: 1, total: 1, ...totals })
  let level = Array.from({ length: 12 }, (_, i) => i)
  for (let order = 0; order <= MAX_ORDER && level.length; order++) {
    const next: number[] = []
    let done = 0
    const counts = { tiles: 0, missing: 0, failed: 0 }
    await Promise.all(level.map(async (npix) => {
      const result = await fetchWithRetry({ set, order, npix })
      if (result === 'failed') counts.failed++
      else if (result) {
        counts.tiles++
        if (order < MAX_ORDER) next.push(npix * 4, npix * 4 + 1, npix * 4 + 2, npix * 4 + 3)
      } else counts.missing++
      // Po porażce dzieci też próbujemy: nie wiemy, czy kafelek istnieje.
      if (result === 'failed' && order < MAX_ORDER) next.push(npix * 4, npix * 4 + 1, npix * 4 + 2, npix * 4 + 3)
      done++
      if (done % 200 === 0 || done === level.length) onProgress({ order, done, total: level.length, ...counts })
    }))
    totals.tiles += counts.tiles
    totals.missing += counts.missing
    totals.failed += counts.failed
    level = next.sort((a, b) => a - b)
  }
  if (!totals.failed) {
    await mkdir(join(store.dir, set), { recursive: true })
    await writeFile(join(store.dir, set, MIRROR_MARKER), JSON.stringify({ source: HIPS_SETS[set], date: new Date().toISOString(), ...totals }, null, 1))
  }
  return totals
}

export function createHipsProxy(env: HipsProxyEnv = process.env as HipsProxyEnv, fetchImpl: typeof fetch = fetch) {
  const store = createHipsStore(env, fetchImpl)
  return async function hipsApi(req: IncomingMessage, res: ServerResponse) {
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, { Allow: 'GET, HEAD' }).end(); return }
    const tile = parseHipsPath(new URL(req.url ?? '/', 'http://localhost').pathname)
    if (!tile) { res.writeHead(404).end(); return }
    let jpeg: Buffer | null
    try { jpeg = await store.load(tile) } catch { if (!res.headersSent) res.writeHead(502, { 'Cache-Control': 'no-store' }).end(); return }
    if (!jpeg) { res.writeHead(404, { 'Cache-Control': 'public, max-age=86400' }).end(); return }
    // Wydanie danych się nie zmienia; nowe wydanie dostanie nowy zestaw (np. dr0_3), więc długi czas buforowania.
    res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Content-Length': jpeg.length, 'Cache-Control': 'public, max-age=2592000' })
    res.end(req.method === 'HEAD' ? undefined : jpeg)
  }
}
