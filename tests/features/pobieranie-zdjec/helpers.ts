// Atrapy dla testów „pobieranie-zdjec”: sieć (`fetch`), ładowanie obrazu SkyView, Cache Storage,
// `localStorage` i zegar. Atrapy nie zakładają nazwy pamięci ani formatu zapisu nazwy źródła:
// pamięć wypełnia się w testach tylko przez udane pobranie (`fillCache`).
import {
  createSkyImageLoader,
  type SkyImageCache,
  type SkyImageCacheStorage,
  type SkyImageClock,
  type SkyImageLoader,
  type SkyImageStorage,
} from '../../../src/services/skyImage/loader'
import type { SkyImageRequest, SkyImageSourceId } from '../../../src/services/skyImage/sources'

/** Zachowanie źródła pobieranego przez `fetch`. */
export type FetchBehaviour =
  | 'ok' // 200, image/jpeg, treść `<id>-bytes`
  | 'silent' // nie odpowiada; po przerwaniu odrzuca się jak prawdziwy fetch (AbortError)
  | 'network' // odrzucone zapytanie (brak sieci)
  | 'hold' // czeka, aż test sam je rozstrzygnie (`net.held`); przerwanie nic nie zmienia
  | { status: number; contentType?: string }

/** Zachowanie ładowania obrazu SkyView. */
export type ImageBehaviour = 'ok' | 'silent' | 'error'

export interface NetBehaviours {
  alaskybis: FetchBehaviour
  alasky: FetchBehaviour
  skyview: ImageBehaviour
  stsci: FetchBehaviour
}

export interface RecordedCall {
  sourceId: SkyImageSourceId | 'unknown'
  kind: 'fetch' | 'image'
  url: string
  signal: AbortSignal
}

export interface HeldCall {
  url: string
  resolve: (response: Response) => void
}

/** Dane obrazu, które zwraca atrapa `loadImage` dla SkyView. */
export interface SkyviewToken {
  skyview: string
}

export function sourceOfUrl(url: string): SkyImageSourceId | 'unknown' {
  const host = new URL(url).hostname
  if (host === 'alaskybis.cds.unistra.fr') return 'alaskybis'
  if (host === 'alasky.cds.unistra.fr') return 'alasky'
  if (host === 'skyview.gsfc.nasa.gov') return 'skyview'
  if (host === 'archive.stsci.edu') return 'stsci'
  return 'unknown'
}

function abortError(): DOMException {
  return new DOMException('The operation was aborted.', 'AbortError')
}

/** Obietnica, która nie rozstrzyga się sama; po przerwaniu odrzuca się z AbortError. */
function silentUntilAbort<T>(signal: AbortSignal): Promise<T> {
  return new Promise<T>((_resolve, reject) => {
    if (signal.aborted) {
      reject(abortError())
      return
    }
    signal.addEventListener('abort', () => reject(abortError()), { once: true })
  })
}

export function imageResponse(body: string, contentType = 'image/jpeg'): Response {
  return new Response(body, { status: 200, headers: { 'content-type': contentType } })
}

export class FakeNet {
  behaviours: NetBehaviours
  calls: RecordedCall[] = []
  held: HeldCall[] = []

  constructor(behaviours: Partial<NetBehaviours> = {}) {
    this.behaviours = { alaskybis: 'ok', alasky: 'ok', skyview: 'ok', stsci: 'ok', ...behaviours }
  }

  set(behaviours: Partial<NetBehaviours>): void {
    this.behaviours = { ...this.behaviours, ...behaviours }
  }

  /** Źródła kolejnych zapytań (fetch i ładowanie obrazu) od indeksu `from`. */
  sources(from = 0): Array<SkyImageSourceId | 'unknown'> {
    return this.calls.slice(from).map((call) => call.sourceId)
  }

  fetch = (url: string, init: { signal: AbortSignal }): Promise<Response> => {
    const sourceId = sourceOfUrl(url)
    this.calls.push({ sourceId, kind: 'fetch', url, signal: init.signal })
    const behaviour: FetchBehaviour =
      sourceId === 'alaskybis' || sourceId === 'alasky' || sourceId === 'stsci'
        ? this.behaviours[sourceId]
        : { status: 404 }
    if (behaviour === 'ok') {
      return Promise.resolve(imageResponse(`${sourceId}-bytes`, sourceId === 'stsci' ? 'image/gif' : 'image/jpeg'))
    }
    if (behaviour === 'silent') return silentUntilAbort<Response>(init.signal)
    if (behaviour === 'network') return Promise.reject(new TypeError('Failed to fetch'))
    if (behaviour === 'hold') {
      return new Promise<Response>((resolve) => {
        this.held.push({ url, resolve })
      })
    }
    return Promise.resolve(
      new Response(`${sourceId}-response`, {
        status: behaviour.status,
        headers: { 'content-type': behaviour.contentType ?? 'text/html' },
      }),
    )
  }

  loadImage = (url: string, signal: AbortSignal): Promise<unknown> => {
    const sourceId = sourceOfUrl(url)
    this.calls.push({ sourceId, kind: 'image', url, signal })
    const behaviour = this.behaviours.skyview
    if (behaviour === 'ok') return Promise.resolve<SkyviewToken>({ skyview: url })
    if (behaviour === 'silent') return silentUntilAbort<unknown>(signal)
    return Promise.reject(new Error('image error event'))
  }
}

/** Klucz pamięci sprowadzony do ścieżki (atrapa przyjmuje tekst, Request albo pełny adres). */
function normalizeKey(key: unknown): string {
  let text: string
  if (typeof key === 'string') text = key
  else if (key instanceof URL) text = key.href
  else if (key instanceof Request) text = key.url
  else text = String(key)
  return /^https?:\/\//.test(text) ? new URL(text).pathname : text
}

export class FakeCaches implements SkyImageCacheStorage {
  readonly store = new Map<string, Response>()
  /** Zapis kończy się błędem braku miejsca. */
  putFails = false
  /** Odczyty czekają na `releaseMatches()`. */
  private holdingMatches = false
  private waiting: Array<() => void> = []

  holdMatches(): void {
    this.holdingMatches = true
  }

  releaseMatches(): void {
    this.holdingMatches = false
    const waiting = this.waiting
    this.waiting = []
    waiting.forEach((resume) => resume())
  }

  keys(): string[] {
    return [...this.store.keys()]
  }

  open(name: string): Promise<SkyImageCache> {
    void name
    const cache: SkyImageCache = {
      match: (key: string) => this.match(key),
      put: (key: string, response: Response) => this.put(key, response),
    }
    return Promise.resolve(cache)
  }

  private async match(key: string): Promise<Response | undefined> {
    if (this.holdingMatches) {
      await new Promise<void>((resume) => this.waiting.push(resume))
    }
    const stored = this.store.get(normalizeKey(key))
    return stored?.clone()
  }

  private async put(key: string, response: Response): Promise<void> {
    if (this.putFails) throw new DOMException('Quota exceeded', 'QuotaExceededError')
    const body = await response.blob()
    this.store.set(normalizeKey(key), new Response(body, { status: response.status, headers: response.headers }))
  }

  /** Treść zapisanej odpowiedzi pod kluczem (ścieżką). */
  async text(key: string): Promise<string | undefined> {
    const stored = this.store.get(key)
    return stored ? await stored.clone().text() : undefined
  }
}

export class FakeStorage implements SkyImageStorage {
  readonly values = new Map<string, string>()

  constructor(initial: Record<string, string> = {}) {
    Object.entries(initial).forEach(([key, value]) => this.values.set(key, value))
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}

/** Prawdziwe `setImmediate` z Node (szybsze od `setTimeout(0)`), a bez niego `setTimeout(0)`. */
const nextTurn: (resolve: () => void) => void = (() => {
  const immediate = (globalThis as unknown as { setImmediate?: (callback: () => void) => unknown }).setImmediate
  return immediate ? (resolve: () => void) => void immediate(resolve) : (resolve: () => void) => void globalThis.setTimeout(resolve, 0)
})()

/** Opróżnia kolejkę obietnic (kilkadziesiąt tur pętli zdarzeń; zegar implementacji to atrapa, więc nic nie mija). */
export async function flush(rounds = 30): Promise<void> {
  for (let i = 0; i < rounds; i += 1) {
    await new Promise<void>((resolve) => nextTurn(resolve))
  }
}

interface FakeTimer {
  id: number
  at: number
  callback: () => void
}

export class FakeClock implements SkyImageClock {
  now = 0
  private nextId = 1
  private timers: FakeTimer[] = []

  setTimeout(callback: () => void, ms: number): unknown {
    const id = this.nextId
    this.nextId += 1
    this.timers.push({ id, at: this.now + Math.max(0, ms), callback })
    return id
  }

  clearTimeout(handle: unknown): void {
    this.timers = this.timers.filter((timer) => timer.id !== handle)
  }

  /** Przesuwa zegar o `ms`, uruchamiając po kolei zaplanowane zadania i opróżniając kolejkę obietnic. */
  async advance(ms: number): Promise<void> {
    const target = this.now + ms
    await flush()
    for (;;) {
      const due = this.timers
        .filter((timer) => timer.at <= target)
        .sort((a, b) => a.at - b.at || a.id - b.id)[0]
      if (!due) break
      this.timers = this.timers.filter((timer) => timer.id !== due.id)
      this.now = due.at
      due.callback()
      await flush()
    }
    this.now = target
    await flush()
  }
}

/** Śledzi, czy obietnica już się rozstrzygnęła. */
export function track<T>(promise: Promise<T>): { settled: () => boolean; promise: Promise<T> } {
  let settled = false
  const tracked = promise.then(
    (value) => {
      settled = true
      return value
    },
    (error: unknown) => {
      settled = true
      throw error
    },
  )
  return { settled: () => settled, promise: tracked }
}

export interface Harness {
  loader: SkyImageLoader
  net: FakeNet
  caches: FakeCaches | null
  storage: FakeStorage
  clock: FakeClock
}

export interface HarnessOptions {
  net?: Partial<NetBehaviours>
  /** Wspólna pamięć (np. wypełniona wcześniej); `null` = przeglądarka bez Cache Storage. */
  caches?: FakeCaches | null
  /** Zapamiętane źródło w `localStorage`. */
  remembered?: string
}

export function harness(options: HarnessOptions = {}): Harness {
  const net = new FakeNet(options.net)
  const caches = options.caches === undefined ? new FakeCaches() : options.caches
  const storage = new FakeStorage(
    options.remembered === undefined ? {} : { 'astrophotography-planner-sky-source': options.remembered },
  )
  const clock = new FakeClock()
  const loader = createSkyImageLoader({
    fetch: net.fetch,
    loadImage: net.loadImage,
    caches,
    storage,
    clock,
  })
  return { loader, net, caches, storage, clock }
}

/** Uruchamia `promise` przy zegarze przesuniętym o `ms` i zwraca wynik. */
export async function settle<T>(clock: FakeClock, promise: Promise<T>, ms = 0): Promise<T> {
  await clock.advance(ms)
  return await promise
}

/**
 * Wypełnia wspólną pamięć wycinkiem z `sourceId`: osobny obiekt pobierający z pustym `localStorage`,
 * w którym działa tylko to źródło (wcześniejsze w kolejności Z28 odpowiadają 503 albo błędem obrazu).
 */
export async function fillCache(caches: FakeCaches, sourceId: 'alaskybis' | 'alasky' | 'stsci', request: SkyImageRequest): Promise<void> {
  const order: Array<'alaskybis' | 'alasky' | 'stsci'> = ['alaskybis', 'alasky', 'stsci']
  const before = order.slice(0, order.indexOf(sourceId))
  const net: Partial<NetBehaviours> = { skyview: sourceId === 'stsci' ? 'error' : 'ok' }
  before.forEach((id) => {
    net[id] = { status: 503 }
  })
  const h = harness({ net, caches })
  await settle(h.clock, h.loader.load(request))
}

export const STORAGE_KEY = 'astrophotography-planner-sky-source'
