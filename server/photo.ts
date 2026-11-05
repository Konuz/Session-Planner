import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import sharp from 'sharp'
import { parseCatalog, type DSO } from '../src/lib/catalog.ts'
import type { PhotoProject } from '../src/lib/photo.ts'
import { loadPhotoDistances } from './photoDistances.ts'

export type PhotoEnv = { SKYSHOT_BRIDGE?: string; SKYSHOT_INDEX?: string }
const execute = promisify(execFile)
const maxBytes = 40 * 1024 * 1024
const maxRasterPixels = 64_000_000
const uploadIdleMs = 15_000
const uploadDeadlineMs = 120_000
let busy = false
const catalogPath = fileURLToPath(new URL('../public/data/catalog.json', import.meta.url))
const skyshotCache = fileURLToPath(new URL('../scripts/.cache/', import.meta.url))
let cachedCatalogById: Promise<Map<string, DSO>> | null = null

function getCatalogById(): Promise<Map<string, DSO>> {
  cachedCatalogById ??= readFile(catalogPath, 'utf8')
    .then((raw) => new Map(parseCatalog(JSON.parse(raw).rows).map((o) => [o.id, o])))
    .catch((err) => {
      cachedCatalogById = null
      throw err
    })
  return cachedCatalogById
}

function paths(env: PhotoEnv) {
  return { binary: env.SKYSHOT_BRIDGE ?? resolve(skyshotCache, 'skyshot-build/release', process.platform === 'win32' ? 'tracker-skyshot.exe' : 'tracker-skyshot'), index: env.SKYSHOT_INDEX ?? resolve(skyshotCache, 'skyshot-data/index') }
}

function receivePhoto(req: IncomingMessage): Promise<Buffer | 408 | 413 | null> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = []
    let size = 0
    const idle = setTimeout(() => finish(408), uploadIdleMs)
    const deadline = setTimeout(() => finish(408), uploadDeadlineMs)

    function finish(result: Buffer | 408 | 413 | null) {
      clearTimeout(idle)
      clearTimeout(deadline)
      req.off('data', onData)
      req.off('end', onEnd)
      req.off('close', onClose)
      req.off('error', onClose)
      if (typeof result === 'number') req.pause()
      resolve(result)
    }
    function onData(chunk: Buffer) {
      size += chunk.length
      if (size > maxBytes) { finish(413); return }
      chunks.push(chunk)
      idle.refresh()
    }
    function onEnd() { finish(Buffer.concat(chunks, size)) }
    function onClose() { finish(null) }

    req.once('end', onEnd)
    req.once('close', onClose)
    req.once('error', onClose)
    req.on('data', onData)
  })
}

export async function photoApi(req: IncomingMessage, res: ServerResponse, env: PhotoEnv = process.env as PhotoEnv, fetchImpl: typeof fetch = fetch) {
  const json = (status: number, value: unknown, cache = 'no-store') => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cache }).end(JSON.stringify(value)) }
  const url = new URL(req.url ?? '/', 'http://localhost')
  const path = url.pathname
  const { binary, index } = paths(env)
  if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}` && req.headers.origin !== `https://${req.headers.host}`) { json(403, { error: 'Żądanie musi pochodzić z tej aplikacji.' }); return }
  if (path.endsWith('/distances')) {
    if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); json(405, { error: 'Wymagane zapytanie GET.' }); return }
    const byId = await getCatalogById()
    const object = byId.get(url.searchParams.get('id') ?? '')
    if (!object) { json(404, { error: 'Nieznany obiekt katalogowy.' }); return }
    const abort = new AbortController()
    res.on('close', () => { if (!res.writableEnded) abort.abort() })
    const result = await loadPhotoDistances(object, fetchImpl, abort.signal)
    if (!abort.signal.aborted) json(200, result, result.warnings.length ? 'no-store' : 'private, max-age=3600')
    return
  }
  if (path.endsWith('/status') && req.method === 'GET') {
    const ready = await Promise.all([access(binary), access(index)]).then(() => true, () => false)
    json(200, { ready }); return
  }
  if (!path.endsWith('/solve')) { json(404, { error: 'Nieznany adres.' }); return }
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); json(405, { error: 'Wymagane przesłanie zdjęcia.' }); return }
  const mime = req.headers['content-type']?.split(';')[0]
  if (!mime || !['image/jpeg', 'image/png', 'image/webp', 'image/tiff', 'application/fits', 'application/octet-stream'].includes(mime)) { json(415, { error: 'Wybierz plik JPEG, PNG, WebP, TIFF lub FITS.' }); return }
  const rejectUpload = (status: 408 | 413) => {
    res.setHeader('Connection', 'close')
    json(status, { error: status === 408 ? 'Przekroczono czas przesyłania zdjęcia.' : 'Maksymalny rozmiar zdjęcia to 40 MB.' })
  }
  if (Number(req.headers['content-length']) > maxBytes) { rejectUpload(413); return }
  if (!await Promise.all([access(binary), access(index)]).then(() => true, () => false)) { json(503, { error: 'Astrometria jest niedostępna na tym serwerze. Wymaga lokalnej instalacji Skyshota.' }); return }
  if (req.destroyed || res.destroyed) return
  if (busy) { json(409, { error: 'Trwa rozwiązywanie innego zdjęcia. Spróbuj ponownie za chwilę.' }); return }
  busy = true
  const abort = new AbortController()
  res.once('close', () => { if (!res.writableEnded) abort.abort() })
  let temp: string | undefined
  try {
    let input = await receivePhoto(req)
    if (input === null || res.destroyed) return
    if (typeof input === 'number') { rejectUpload(input); return }
    temp = await mkdtemp(join(tmpdir(), 'tracker-photo-'))
    abort.signal.throwIfAborted()
    if (input.subarray(0, 9).toString() === 'SIMPLE  =') {
      const fits = join(temp, 'input.fits')
      const preview = join(temp, 'preview.png')
      await writeFile(fits, input)
      await execute(binary, ['preview', fits, preview], { timeout: 60_000, signal: abort.signal, windowsHide: true })
      input = await readFile(preview)
    }
    abort.signal.throwIfAborted()
    let image: Buffer
    try {
      image = await sharp(input, { limitInputPixels: maxRasterPixels }).autoOrient().resize({ width: 3200, height: 3200, fit: 'inside', withoutEnlargement: true }).flatten({ background: '#000000' }).jpeg({ quality: 95 }).toBuffer()
    } catch {
      if (!abort.signal.aborted) json(422, { error: 'Nie można odczytać tego obrazu. Dla JPEG, PNG, WebP i TIFF obowiązuje limit 64 MP.' })
      return
    }
    abort.signal.throwIfAborted()
    const imagePath = join(temp, 'reference.jpg')
    await writeFile(imagePath, image)
    const { stdout } = await execute(binary, ['solve', imagePath, index, catalogPath], { timeout: 90_000, maxBuffer: 8 * 1024 * 1024, signal: abort.signal, windowsHide: true })
    const result = JSON.parse(stdout) as PhotoProject['astrometry'] & { width: number; height: number; objects: { id: string; x: number; y: number; radius: number }[] }
    const byId = await getCatalogById()
    const cuts = result.objects.flatMap((p) => {
      const o = byId.get(p.id)
      return o ? [{ ...p, type: o.type, raDeg: o.raDeg, decDeg: o.decDeg, enabled: true, distLy: o.distLy, distanceSource: o.distLy ? 'Wikidata — katalog aplikacji' : '', uncertaintyLy: null, distanceScope: 'object' as const }] : []
    }).sort((a, b) => a.id.localeCompare(b.id, 'pl', { numeric: true }))
    const { width, height, objects: _objects, ...astrometry } = result
    let name = 'Zdjęcie'
    try { name = decodeURIComponent(String(req.headers['x-photo-name'] ?? name)).slice(0, 160) } catch { /* Nazwa nie wpływa na astrometrię. */ }
    const project: PhotoProject = { version: 1, id: createHash('sha256').update(image).digest('hex'), name, image: `data:image/jpeg;base64,${image.toString('base64')}`, width, height, createdAt: Date.now(), cuts, astrometry }
    json(200, project)
  } catch (error) {
    if (!abort.signal.aborted) json(422, { error: 'Nie udało się jednoznacznie rozwiązać zdjęcia. Spróbuj obrazu z większą liczbą ostrych gwiazd.', detail: error instanceof Error && 'killed' in error && error.killed ? 'Przekroczono czas obliczeń.' : undefined })
  } finally {
    busy = false
    try {
      if (temp) await rm(temp, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
    } catch { console.warn('Nie udało się usunąć tymczasowych plików zdjęcia.') }
  }
}
