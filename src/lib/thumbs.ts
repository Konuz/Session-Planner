// Miniatury obiektów (DSS2 czerwony z CDS hips2fits, czarno-białe): kolejka z ograniczoną liczbą zapytań,
// zapis w Cache Storage (drugi raz bez sieci) i zapasowy serwer alasky przy błędzie alaskybis.
import type { DSO } from './catalog'

const CACHE_NAME = 'tracker-thumbs-v1'
const SERVERS = ['alaskybis', 'alasky']
const MAX_PARALLEL = 5

/** Pole wycinka [°]: obiekt zajmuje ok. 60% kadru, od 0,2° do 4°. */
export function thumbFovDeg(o: Pick<DSO, 'majArcmin'>): number {
  const fov = (Math.max(o.majArcmin, 3) * 1.7) / 60
  return Math.round(Math.min(4, Math.max(0.2, fov)) * 1000) / 1000
}

export function hips2fitsUrl(server: string, raDeg: number, decDeg: number, fovDeg: number, sizePx: number, hips = 'CDS/P/DSS2/red'): string {
  const p = new URLSearchParams({
    hips,
    width: String(sizePx),
    height: String(sizePx),
    fov: String(fovDeg),
    ra: raDeg.toFixed(4),
    dec: decDeg.toFixed(4),
    projection: 'TAN',
    format: 'jpg',
  })
  return `https://${server}.cds.unistra.fr/hips-image-services/hips2fits?${p}`
}

type Job = { key: string; urls: string[]; fallback?: string; resolve: (url: string) => void; reject: (e: unknown) => void; signal?: AbortSignal }

const queue: Job[] = []
const memory = new Map<string, Promise<string>>()
let active = 0
let cachePromise: Promise<Cache | null> | null = null

const openCache = () => (cachePromise ??= ('caches' in globalThis ? caches.open(CACHE_NAME).catch(() => null) : Promise.resolve(null)))

async function run(job: Job) {
  active++
  try {
    const cache = await openCache()
    const hit = cache && (await cache.match(job.key))
    if (hit) return job.resolve(URL.createObjectURL(await hit.blob()))
    if (job.signal?.aborted) return job.reject(new DOMException('aborted', 'AbortError'))
    // Zapytanie z asekuracją: drugi serwer startuje, gdy pierwszy nie odpowie w 2,5 s albo zwróci błąd.
    const ctrl = new AbortController()
    job.signal?.addEventListener('abort', () => ctrl.abort())
    const attempt = async (url: string, delayMs: number, previous?: Promise<Blob>) => {
      if (delayMs) await Promise.race([new Promise((r) => setTimeout(r, delayMs)), previous?.catch(() => undefined)])
      if (ctrl.signal.aborted) throw new DOMException('aborted', 'AbortError')
      const res = await fetch(url, { signal: ctrl.signal })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      if (blob.size < 200) throw new Error('pusty obraz')
      return blob
    }
    try {
      const first = attempt(job.urls[0], 0)
      const blob = await Promise.any([first, ...job.urls.slice(1).map((u) => attempt(u, 2500, first))])
      ctrl.abort()
      await cache?.put(job.key, new Response(blob, { headers: { 'Content-Type': 'image/jpeg' } }))
      job.resolve(URL.createObjectURL(blob))
    } catch (e) {
      // Ostatnie źródło: NASA SkyView (bez CORS, więc bez Cache Storage; tylko pamięć HTTP przeglądarki).
      if (job.fallback && !job.signal?.aborted) job.resolve(job.fallback)
      else job.reject(e instanceof AggregateError ? e.errors[0] : e)
    }
  } finally {
    active--
    pump()
  }
}

function pump() {
  while (active < MAX_PARALLEL && queue.length) {
    // Najnowsze żądania (to, co użytkownik właśnie widzi) idą pierwsze.
    const job = queue.pop()!
    if (job.signal?.aborted) {
      job.reject(new DOMException('aborted', 'AbortError'))
      continue
    }
    void run(job)
  }
}

/** Adres obiektu blob z miniaturą (z pamięci, z Cache Storage albo z sieci). */
export function getSkyImage(raDeg: number, decDeg: number, fovDeg: number, sizePx: number, signal?: AbortSignal, hips?: string): Promise<string> {
  const key = `/thumb/${hips ?? 'dss2r'}/${raDeg.toFixed(4)}/${decDeg.toFixed(4)}/${fovDeg}/${sizePx}`
  const known = memory.get(key)
  if (known) return known
  const promise = new Promise<string>((resolve, reject) => {
    const fallback = `https://skyview.gsfc.nasa.gov/current/cgi/runquery.pl?Survey=dss2r&Position=${raDeg.toFixed(4)},${decDeg.toFixed(4)}&Size=${fovDeg}&Pixels=${sizePx}&Return=JPG`
    queue.push({ key, urls: SERVERS.map((s) => hips2fitsUrl(s, raDeg, decDeg, fovDeg, sizePx, hips)), fallback, resolve, reject, signal })
    pump()
  })
  memory.set(key, promise)
  promise.catch(() => memory.delete(key))
  return promise
}

export function getThumb(o: DSO, signal?: AbortSignal): Promise<string> {
  return getSkyImage(o.raDeg, o.decDeg, thumbFovDeg(o), 128, signal)
}
