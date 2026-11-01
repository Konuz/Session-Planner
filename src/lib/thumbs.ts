// Obrazy nieba składane w workerze z kafelków HiPS (DSS2, PanSTARRS) z kilku luster: kolejka z ograniczoną
// liczbą zadań i zapis gotowych obrazów w Cache Storage (drugi raz bez sieci).
import type { DSO } from './catalog'
import type { HipsReply, HipsRequest, ImageMode, SurveyId } from './hips'

const CACHE_NAME = 'tracker-thumbs-v2'
const MAX_PARALLEL = 5

/** Pole wycinka [°]: obiekt zajmuje ok. 60% kadru, od 0,2° do 4°. */
export function thumbFovDeg(o: Pick<DSO, 'majArcmin'>): number {
  const fov = (Math.max(o.majArcmin, 3) * 1.7) / 60
  return Math.round(Math.min(4, Math.max(0.2, fov)) * 1000) / 1000
}

export interface SkyImageOptions {
  survey?: SurveyId
  mode?: ImageMode
  coarser?: number
}

type Job = { key: string; req: Omit<HipsRequest, 'id'>; resolve: (url: string) => void; reject: (e: unknown) => void; signal?: AbortSignal }

const queue: Job[] = []
const memory = new Map<string, Promise<string>>()
const pending = new Map<number, { resolve: (blob: Blob) => void; reject: (e: Error) => void }>()
let active = 0
let lastId = 0
let cachePromise: Promise<Cache | null> | null = null
let hipsWorker: Worker | null = null

const abortError = () => new DOMException('aborted', 'AbortError')

const openCache = () =>
  (cachePromise ??=
    'caches' in globalThis
      ? (caches.delete('tracker-thumbs-v1'), caches.open(CACHE_NAME).catch(() => null))
      : Promise.resolve(null))

function worker(): Worker {
  if (!hipsWorker) {
    hipsWorker = new Worker(new URL('../workers/hips.worker.ts', import.meta.url), { type: 'module' })
    hipsWorker.onmessage = (e: MessageEvent<HipsReply>) => {
      const reply = e.data
      const p = pending.get(reply.id)
      if (!p) return // zadanie przerwane: wynik idzie do kosza
      pending.delete(reply.id)
      if ('error' in reply) p.reject(new Error(reply.error))
      else p.resolve(reply.blob)
    }
  }
  return hipsWorker
}

async function run(job: Job) {
  active++
  try {
    const cache = await openCache()
    const hit = cache && (await cache.match(job.key))
    if (hit) return job.resolve(URL.createObjectURL(await hit.blob()))
    if (job.signal?.aborted) return job.reject(abortError())
    const blob = await new Promise<Blob>((resolve, reject) => {
      const id = ++lastId
      pending.set(id, { resolve, reject })
      job.signal?.addEventListener('abort', () => {
        pending.delete(id)
        reject(abortError())
      })
      worker().postMessage({ id, ...job.req } satisfies HipsRequest)
    })
    await cache?.put(job.key, new Response(blob, { headers: { 'Content-Type': 'image/jpeg' } }))
    job.resolve(URL.createObjectURL(blob))
  } catch (e) {
    job.reject(e)
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
      job.reject(abortError())
      continue
    }
    void run(job)
  }
}

/** Adres obiektu blob z obrazem nieba (z pamięci, z Cache Storage albo złożony z kafelków). */
export function getSkyImage(raDeg: number, decDeg: number, fovDeg: number, sizePx: number, signal?: AbortSignal, opts: SkyImageOptions = {}): Promise<string> {
  const { survey = 'dss2', mode = 'red', coarser = 0 } = opts
  const key = `/thumb/${survey}/${mode}/${coarser}/${raDeg.toFixed(4)}/${decDeg.toFixed(4)}/${fovDeg}/${sizePx}`
  const known = memory.get(key)
  // Wspólne zapytanie mógł przerwać inny odbiorca (np. podwójny efekt w StrictMode): wtedy zaczynamy od nowa.
  if (known) return known.catch((e: Error) => (e.name === 'AbortError' && !signal?.aborted ? getSkyImage(raDeg, decDeg, fovDeg, sizePx, signal, opts) : Promise.reject(e)))
  const promise = new Promise<string>((resolve, reject) => {
    queue.push({ key, req: { raDeg, decDeg, fovDeg, sizePx, survey, mode, coarser }, resolve, reject, signal })
    pump()
  })
  memory.set(key, promise)
  promise.catch(() => memory.delete(key))
  return promise
}

export function getThumb(o: DSO, signal?: AbortSignal): Promise<string> {
  return getSkyImage(o.raDeg, o.decDeg, thumbFovDeg(o), 128, signal, { coarser: 1 })
}
