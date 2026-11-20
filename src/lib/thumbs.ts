// Obrazy nieba składane w workerze. Wspólne są tylko trwające pobrania Blobów;
// URL należy do wyświetlającego komponentu, a gotowe obrazy do ograniczonego Cache Storage.
import type { DSO } from './catalog'
import { arcsecPerPixel, SURVEYS, type HipsCancel, type HipsReply, type HipsRequest, type ImageMode, type SurveyId } from './hips'
import { imageCache } from './imageCache'

const cache = imageCache('tracker-thumbs-v2', 128)
// Obrazy złożone bez części kafelków: odbiorcy, którzy z nich coś składają, też ich nie buforują.
const incomplete = new WeakSet<Blob>()

/** Czy obraz z `getSkyImage` ma wszystkie kafelki (obrazy z bufora zawsze mają). */
export function isCompleteSkyImage(blob: Blob): boolean {
  return !incomplete.has(blob)
}
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

/** Źródło miniatur obiektów (karty katalogu, szczegóły, karty Nieba). */
export type ThumbSource = 'dss2' | 'nsns' | 'nsnsRgb' | 'nsnsOhs' | 'nsnsSho'

export function isThumbSource(value: unknown): value is ThumbSource {
  return value === 'dss2' || value === 'nsns' || value === 'nsnsRgb' || value === 'nsnsOhs' || value === 'nsnsSho'
}

export function thumbSourceInfo(source: ThumbSource) {
  return source === 'nsnsSho' ? { ...SURVEYS.nsnsOhs, label: 'NSNS SHO' } : SURVEYS[source]
}

/** NSNS, gdy całe pole leży w pokryciu, a skala obrazu odpowiada szczegółowości przeglądu. */
export function thumbImageOptions(source: ThumbSource, decDeg: number, fovDeg: number, sizePx: number, dssCoarser = 0): SkyImageOptions {
  const survey = thumbSourceInfo(source)
  // OHS/SHO mają dwa razy drobniejsze kafelki niż warstwy szerokopasmowe.
  const minScale = survey.id === 'nsnsOhs' ? 7.5 : 15
  const covered = decDeg - fovDeg / 2 >= survey.minDecDeg
  const scaleFits = arcsecPerPixel(fovDeg, sizePx) >= minScale
  if (source === 'dss2' || !covered || !scaleFits) {
    return { survey: 'dss2', coarser: dssCoarser }
  }
  return source === 'nsnsSho' ? { survey: survey.id, mode: 'swap-rb' } : { survey: survey.id }
}

type Consumer = { resolve: (blob: Blob) => void; reject: (e: unknown) => void; cleanup: () => void }
type Job = { key: string; req: Omit<HipsRequest, 'id'>; consumers: Set<Consumer>; cancel?: () => void }
const queue: Job[] = []
const inFlight = new Map<string, Job>()
const pending = new Map<number, { resolve: (reply: HipsReply) => void; reject: (e: Error) => void }>()
let active = 0
let lastId = 0
let hipsWorker: Worker | null = null
const abortError = () => new DOMException('aborted', 'AbortError')

function worker(): Worker {
  if (!hipsWorker) {
    hipsWorker = new Worker(new URL('../workers/hips.worker.ts', import.meta.url), { type: 'module' })
    hipsWorker.onmessage = (e: MessageEvent<HipsReply>) => {
      const reply = e.data
      pending.get(reply.id)?.resolve(reply)
      pending.delete(reply.id)
    }
    hipsWorker.onerror = () => {
      hipsWorker?.terminate()
      hipsWorker = null
      for (const p of pending.values()) p.reject(new Error('worker obrazów przestał działać'))
      pending.clear()
    }
  }
  return hipsWorker
}

async function run(job: Job) {
  active++
  try {
    let blob = await cache.get(job.key)
    if (!job.consumers.size) return
    if (!blob) {
      const w = worker()
      const id = ++lastId
      const reply = await new Promise<HipsReply>((resolve, reject) => {
        pending.set(id, { resolve, reject })
        job.cancel = () => w.postMessage({ cancel: id } satisfies HipsCancel)
        try { w.postMessage({ id, ...job.req } satisfies HipsRequest) } catch (e) { pending.delete(id); reject(e) }
      })
      job.cancel = undefined
      if ('cancelled' in reply) return
      if ('error' in reply) throw new Error(reply.error)
      blob = reply.blob
      if (reply.complete) await cache.put(job.key, blob)
      else incomplete.add(blob)
    }
    for (const c of job.consumers) c.resolve(blob)
  } catch (e) {
    for (const c of job.consumers) c.reject(e)
  } finally {
    for (const c of job.consumers) c.cleanup()
    job.consumers.clear()
    if (inFlight.get(job.key) === job) inFlight.delete(job.key)
    active--
    pump()
  }
}

function pump() {
  while (active < MAX_PARALLEL && queue.length) void run(queue.pop()!)
}

/** Każdy odbiorca może się wycofać; ostatni anuluje render, slot zwalnia dopiero odpowiedź workera. */
export function getSkyImage(raDeg: number, decDeg: number, fovDeg: number, sizePx: number, signal?: AbortSignal, opts: SkyImageOptions = {}): Promise<Blob> {
  const { survey = 'dss2', mode = 'color', coarser = 0 } = opts
  const key = `/thumb/${survey}/${mode}/${coarser}/${raDeg.toFixed(4)}/${decDeg.toFixed(4)}/${fovDeg}/${sizePx}`
  if (signal?.aborted) return Promise.reject(abortError())
  let job = inFlight.get(key)
  if (!job) {
    job = { key, req: { raDeg, decDeg, fovDeg, sizePx, survey, mode, coarser }, consumers: new Set() }
    inFlight.set(key, job)
    queue.push(job)
  }
  const shared = job
  return new Promise<Blob>((resolve, reject) => {
    const abort = () => {
      shared.consumers.delete(consumer)
      consumer.cleanup()
      reject(abortError())
      if (shared.consumers.size) return
      if (inFlight.get(key) === shared) inFlight.delete(key)
      const queued = queue.indexOf(shared)
      if (queued >= 0) queue.splice(queued, 1)
      shared.cancel?.()
    }
    const consumer: Consumer = { resolve, reject, cleanup: () => signal?.removeEventListener('abort', abort) }
    shared.consumers.add(consumer)
    signal?.addEventListener('abort', abort, { once: true })
    pump()
  })
}

export function getThumb(o: DSO, signal?: AbortSignal, source: ThumbSource = 'dss2'): Promise<Blob> {
  // 224 px (rozmiar karty katalogu); DSS2 z rzędem grubszym o 1: bez rombów pikseli HEALPix; 12 miniatur ok. 2 MB.
  const fovDeg = thumbFovDeg(o)
  return getSkyImage(o.raDeg, o.decDeg, fovDeg, 224, signal, thumbImageOptions(source, o.decDeg, fovDeg, 224, 1))
}
