// Pobieranie zdjęć nieba (pobieranie-zdjec): kolejność prób, limit 10 s, pamięć podręczna (Cache Storage),
// ostatnie działające źródło, ręczny wybór źródła i zapis do pracy offline.
//
// Nazwy, których spec nie podaje (wybrane przez test-author):
// - `createSkyImageLoader(deps)` – obiekt pobierający (`SkyImageLoader`) ze wstrzykniętymi zależnościami:
//   `fetch(url, { signal })`, `loadImage(url, signal)` (ładowanie `<img>` dla SkyView: obietnica spełnia się
//   po zdarzeniu `load` danymi obrazu, odrzuca się po zdarzeniu `error`), `caches` (Cache Storage albo null,
//   gdy przeglądarka jej nie ma), `storage` (`localStorage`) i `clock` (`setTimeout` / `clearTimeout`).
// - `load(request, { sourceId })` – pobranie wycinka; `sourceId` = ręcznie wybrane źródło, brak/null = „automatycznie”.
//   Wynik: obraz (`kind: 'image'`), „brak zdjęcia” z listą prób (`kind: 'none'`) albo `kind: 'superseded'`,
//   gdy w trakcie zaczęło się nowsze pobranie (wtedy wynik jest ignorowany i nie zmienia widoku).
// - `current()` – to, co pokazuje widok: ostatni obraz albo „brak zdjęcia” (null przed pierwszym wynikiem).
// - `saveOffline()` – „Zapisz podgląd do pracy offline”: 'saved' („zapisano”) albo 'failed' („nie udało się zapisać”).
// - Powody prób: 'limit czasu', 'błąd <kod HTTP>' (np. 'błąd 503'), 'błąd obrazu', 'błąd sieci'.
// - `SKY_SOURCE_STORAGE_KEY` – klucz `localStorage` z identyfikatorem ostatniego działającego źródła
//   (`SkyImageSourceId`, np. 'stsci').
// - Klucze pamięci to `skyImageCacheKey` z `sources.ts`. Pamięć nazywa się `SKY_IMAGE_CACHE_NAME`, a nazwa
//   maszyny, która dała obraz, jest zapisana w nagłówku `SKY_SOURCE_HEADER` zapisanej odpowiedzi.
import {
  skyImageCacheKey,
  skyImageSources,
  skyImageUrl,
  skyviewLayerUrl,
  type SkyImageRequest,
  type SkyImageSourceId,
} from './sources'

// Limity dla poszczególnych źródeł (limit-hips2fits; nazwy wybrane przez test-author):
// - `SkyImageTimeouts` – tabela `{ [id źródła]: limit w ms }`; źródło bez wpisu dostaje `SKY_IMAGE_TIMEOUT_MS`.
// - `createSkyImageLoader(deps, timeouts?)` – drugi, opcjonalny argument; bez niego każde źródło ma 10 s.
// - `SKY_IMAGE_APP_TIMEOUTS_MS` – tabela limitów aplikacji, którą `useSkyImage` przekazuje do pobierania.

/** Klucz `localStorage` z ostatnim działającym źródłem. */
export const SKY_SOURCE_STORAGE_KEY = 'astrophotography-planner-sky-source'
/** Limit czasu jednej próby sieciowej [ms]. */
export const SKY_IMAGE_TIMEOUT_MS = 10_000

/** Limity czasu jednej próby sieciowej dla poszczególnych źródeł [ms]; brak wpisu = `SKY_IMAGE_TIMEOUT_MS`. */
export type SkyImageTimeouts = Partial<Record<SkyImageSourceId, number>>

/** Limity aplikacji (zakładka Kadr): hips2fits liczy niektóre warstwy 9–21 s, więc dostaje 30 s. */
export const SKY_IMAGE_APP_TIMEOUTS_MS: SkyImageTimeouts = {
  alaskybis: 30_000,
  alasky: 30_000,
  skyview: 10_000,
  stsci: 10_000,
}
/** Nazwa pamięci w Cache Storage. */
export const SKY_IMAGE_CACHE_NAME = 'sky-images-v1'
/** Nagłówek zapisanej odpowiedzi z identyfikatorem źródła, które dało obraz. */
export const SKY_SOURCE_HEADER = 'x-sky-image-source'
/** Limit SkyView w grupie warstwy (warstwy-skyview) [ms]. */
const SKYVIEW_LAYER_TIMEOUT_MS = 30_000
/** Grupa warstwy (warstwy-skyview) w kolejności prób. */
const LAYER_GROUP: SkyImageSourceId[] = ['alaskybis', 'alasky', 'skyview']

export interface SkyImageClock {
  setTimeout(callback: () => void, ms: number): unknown
  clearTimeout(handle: unknown): void
}

export interface SkyImageStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/** Podzbiór `Cache` używany przez program (klucz to ścieżka z `skyImageCacheKey`). */
export interface SkyImageCache {
  match(key: string): Promise<Response | undefined>
  put(key: string, response: Response): Promise<void>
}

/** Podzbiór `CacheStorage`. */
export interface SkyImageCacheStorage {
  open(name: string): Promise<SkyImageCache>
}

export interface SkyImageLoaderDeps {
  fetch: (url: string, init: { signal: AbortSignal }) => Promise<Response>
  /** Ładowanie obrazu `<img>` (SkyView): spełnia się danymi obrazu po `load`, odrzuca po `error`. */
  loadImage: (url: string, signal: AbortSignal) => Promise<unknown>
  /** Cache Storage albo null, gdy przeglądarka jej nie ma. */
  caches: SkyImageCacheStorage | null
  storage: SkyImageStorage
  clock: SkyImageClock
}

export interface SkyImageShown {
  kind: 'image'
  sourceId: SkyImageSourceId
  /** Podpis, np. „CDS hips2fits (alasky)” – z nazwy źródła, które naprawdę dało obraz. */
  sourceName: string
  /** `Blob` dla źródeł pobieranych przez `fetch` i z pamięci; dla SkyView wynik `loadImage`. */
  data: unknown
  /** Obraz odczytany z pamięci podręcznej („z pamięci”). */
  fromCache: boolean
  /** Obraz jest w pamięci podręcznej („zapisany”). */
  saved: boolean
  /**
   * warstwy-skyview: tylko przy pobieraniu z `layerFirst`. 'layer' = „w warstwie” (obraz z grupy warstwy: pamięć
   * warstwy, alaskybis, alasky, SkyView); 'fallback' = „zastępstwo” (STScI, gdy nie wybrano go ręcznie). Brak pola =
   * obraz bez tej informacji (pobieranie bez opcji albo ręcznie wybrane STScI).
   */
  layerRole?: 'layer' | 'fallback'
}

export interface SkyImageAttempt {
  sourceId: SkyImageSourceId
  /** 'limit czasu', 'błąd 503', 'błąd obrazu', 'błąd sieci'… */
  reason: string
}

export interface SkyImageMissing {
  kind: 'none'
  attempts: SkyImageAttempt[]
}

export interface SkyImageSuperseded {
  kind: 'superseded'
}

export type SkyImageView = SkyImageShown | SkyImageMissing
export type SkyImageLoadResult = SkyImageView | SkyImageSuperseded

export interface SkyImageLoadOptions {
  /** Ręcznie wybrane źródło; brak albo null = „automatycznie”. */
  sourceId?: SkyImageSourceId | null
  /**
   * warstwy-skyview (nazwa wybrana przez test-author): „warstwa ma pierwszeństwo”. Kolejność: najpierw grupa warstwy
   * (pamięć warstwy, alaskybis, alasky, SkyView z adresem `skyviewLayerUrl`; ręcznie wybrane źródło z grupy na początku
   * grupy), potem STScI (pamięć, sieć); ręcznie wybrane STScI albo SkyView idzie na sam początek. Zapamiętane źródło nie
   * zmienia kolejności i nie jest zmieniane. SkyView w grupie warstwy ma limit 30 s. Obraz dostaje `layerRole`.
   * Brak albo false = dotychczasowe pobieranie.
   */
  layerFirst?: boolean
}

export interface SkyImageLoader {
  load(request: SkyImageRequest, options?: SkyImageLoadOptions): Promise<SkyImageLoadResult>
  current(): SkyImageView | null
  saveOffline(): Promise<'saved' | 'failed'>
}

const SOURCES = skyImageSources()
const SOURCE_IDS = SOURCES.map((source) => source.id)

function sourceName(id: SkyImageSourceId): string {
  return SOURCES.find((source) => source.id === id)?.name ?? id
}

function isOffline(id: SkyImageSourceId): boolean {
  return SOURCES.find((source) => source.id === id)?.offline ?? false
}

function isSourceId(value: unknown): value is SkyImageSourceId {
  return SOURCE_IDS.includes(value as SkyImageSourceId)
}

/** Wynik jednej próby sieciowej: dane obrazu (Blob albo wynik `loadImage`) albo powód porażki. */
type NetResult = { ok: true; data: unknown } | { ok: false; reason: string } | { ok: false; superseded: true }

const SUPERSEDED = { kind: 'superseded' } as const

export function createSkyImageLoader(deps: SkyImageLoaderDeps, timeouts?: SkyImageTimeouts): SkyImageLoader {
  let view: SkyImageView | null = null
  let shownRequest: SkyImageRequest | null = null
  let active: AbortController | null = null

  function remembered(): SkyImageSourceId | null {
    try {
      const value = deps.storage.getItem(SKY_SOURCE_STORAGE_KEY)
      return isSourceId(value) ? value : null
    } catch {
      return null
    }
  }

  function remember(id: SkyImageSourceId): void {
    try {
      deps.storage.setItem(SKY_SOURCE_STORAGE_KEY, id)
    } catch {
      // brak localStorage – pomijamy
    }
  }

  /** Kolejność trybu automatycznego: zapamiętane źródło, potem reszta w kolejności Z28. */
  function autoOrder(): SkyImageSourceId[] {
    const first = remembered()
    return first ? [first, ...SOURCE_IDS.filter((id) => id !== first)] : [...SOURCE_IDS]
  }

  async function openCache(): Promise<SkyImageCache | null> {
    if (!deps.caches) return null
    try {
      return await deps.caches.open(SKY_IMAGE_CACHE_NAME)
    } catch {
      return null
    }
  }

  /** Odczyt z pamięci pod kluczem źródła `id`; null, gdy brak. */
  async function readCache(id: SkyImageSourceId, request: SkyImageRequest): Promise<SkyImageShown | null> {
    const key = skyImageCacheKey(id, request)
    if (!key) return null
    const cache = await openCache()
    if (!cache) return null
    try {
      const response = await cache.match(key)
      if (!response) return null
      const stored = response.headers.get(SKY_SOURCE_HEADER)
      const sourceId = isSourceId(stored) ? stored : id
      const data = await response.blob()
      return { kind: 'image', sourceId, sourceName: sourceName(sourceId), data, fromCache: true, saved: true }
    } catch {
      return null
    }
  }

  /** Zapis obrazu do pamięci z nazwą źródła w nagłówku; true, gdy się udał. */
  async function writeCache(id: SkyImageSourceId, request: SkyImageRequest, data: unknown): Promise<boolean> {
    const key = skyImageCacheKey(id, request)
    if (!key || !(data instanceof Blob)) return false
    const cache = await openCache()
    if (!cache) return false
    try {
      const headers: Record<string, string> = { [SKY_SOURCE_HEADER]: id }
      if (data.type) headers['content-type'] = data.type
      await cache.put(key, new Response(data, { status: 200, headers }))
      return true
    } catch {
      return false
    }
  }

  /**
   * Jedna próba sieciowa z limitem źródła (domyślnie 10 s); przerwanie `outer` kończy ją jako „superseded”.
   * `layerFirst`: SkyView z adresem warstwy i limitem 30 s.
   */
  function tryNetwork(id: SkyImageSourceId, request: SkyImageRequest, outer: AbortSignal, layerFirst = false): Promise<NetResult> {
    if (outer.aborted) return Promise.resolve({ ok: false, superseded: true })
    const controller = new AbortController()
    const inLayer = layerFirst && id === 'skyview'
    const url = inLayer ? skyviewLayerUrl(request) : skyImageUrl(id, request)
    const limit = inLayer ? SKYVIEW_LAYER_TIMEOUT_MS : (timeouts?.[id] ?? SKY_IMAGE_TIMEOUT_MS)
    return new Promise<NetResult>((resolve) => {
      let done = false
      const finish = (result: NetResult): void => {
        if (done) return
        done = true
        deps.clock.clearTimeout(timer)
        outer.removeEventListener('abort', onOuterAbort)
        resolve(result)
      }
      const onOuterAbort = (): void => {
        controller.abort()
        finish({ ok: false, superseded: true })
      }
      const timer = deps.clock.setTimeout(() => {
        controller.abort()
        finish({ ok: false, reason: 'limit czasu' })
      }, limit)
      outer.addEventListener('abort', onOuterAbort, { once: true })

      if (id === 'skyview') {
        deps.loadImage(url, controller.signal).then(
          (data) => finish({ ok: true, data }),
          () => finish({ ok: false, reason: 'błąd obrazu' }),
        )
        return
      }
      deps
        .fetch(url, { signal: controller.signal })
        .then(async (response): Promise<NetResult> => {
          const type = response.headers.get('content-type') ?? ''
          if (response.status < 200 || response.status > 299 || !type.toLowerCase().startsWith('image/')) {
            return { ok: false, reason: `błąd ${response.status}` }
          }
          return { ok: true, data: await response.blob() }
        })
        .then(finish, () => finish({ ok: false, reason: 'błąd sieci' }))
    })
  }

  /** Udane pobranie z sieci: zapis do pamięci (gdy źródło na to pozwala) i zapamiętanie źródła (bez `layerFirst`). */
  async function fromNetwork(id: SkyImageSourceId, request: SkyImageRequest, data: unknown, layerFirst = false): Promise<SkyImageShown> {
    const saved = isOffline(id) ? await writeCache(id, request, data) : false
    if (!layerFirst) remember(id)
    return { kind: 'image', sourceId: id, sourceName: sourceName(id), data, fromCache: false, saved }
  }

  async function run(
    request: SkyImageRequest,
    manual: SkyImageSourceId | null,
    layerFirst: boolean,
    signal: AbortSignal,
  ): Promise<SkyImageLoadResult> {
    const attempts: SkyImageAttempt[] = []
    const checkedKeys = new Set<string>()

    async function cacheStep(ids: SkyImageSourceId[]): Promise<SkyImageShown | null> {
      for (const id of ids) {
        const key = skyImageCacheKey(id, request)
        if (!key || checkedKeys.has(key)) continue
        checkedKeys.add(key)
        const hit = await readCache(id, request)
        if (signal.aborted) return null
        if (hit) return hit
      }
      return null
    }

    async function networkStep(ids: SkyImageSourceId[]): Promise<SkyImageShown | 'superseded' | null> {
      for (const id of ids) {
        const result = await tryNetwork(id, request, signal, layerFirst)
        if (signal.aborted || 'superseded' in result) return 'superseded'
        if (result.ok) {
          const shown = await fromNetwork(id, request, result.data, layerFirst)
          return signal.aborted ? 'superseded' : shown
        }
        attempts.push({ sourceId: id, reason: result.reason })
      }
      return null
    }

    // Bez `layerFirst`: zapamiętane źródło, potem Z28. Z nim: grupa warstwy, potem STScI (zastępstwo).
    const groups = layerFirst ? [LAYER_GROUP, ['stsci' as const]] : [autoOrder()]
    const steps = [...(manual ? [[manual]] : []), ...groups.map((ids) => ids.filter((id) => id !== manual))]
    const withRole = (shown: SkyImageShown): SkyImageShown => {
      if (!layerFirst || (shown.sourceId === 'stsci' && manual === 'stsci')) return shown
      return { ...shown, layerRole: shown.sourceId === 'stsci' ? 'fallback' : 'layer' }
    }

    for (const ids of steps) {
      const hit = await cacheStep(ids)
      if (signal.aborted) return SUPERSEDED
      if (hit) return withRole(hit)
      const shown = await networkStep(ids)
      if (shown === 'superseded') return SUPERSEDED
      if (shown) return withRole(shown)
    }
    return { kind: 'none', attempts }
  }

  return {
    async load(request, options = {}) {
      active?.abort()
      const controller = new AbortController()
      active = controller
      const result = await run(request, options.sourceId ?? null, options.layerFirst ?? false, controller.signal)
      if (controller.signal.aborted || result.kind === 'superseded') return SUPERSEDED
      view = result
      shownRequest = request
      return result
    },

    current() {
      return view
    },

    async saveOffline() {
      const shown = view
      const request = shownRequest
      if (!shown || shown.kind !== 'image' || !request) return 'failed'
      if (shown.saved) return 'saved'
      if (!deps.caches) return 'failed'
      const signal = active?.signal ?? new AbortController().signal
      const order = SOURCE_IDS.filter(isOffline)
      for (const id of order) {
        const result = await tryNetwork(id, request, signal)
        if (signal.aborted || view !== shown) return 'failed'
        if (!result.ok) continue
        if (!(await writeCache(id, request, result.data))) return 'failed'
        remember(id)
        view = { kind: 'image', sourceId: id, sourceName: sourceName(id), data: result.data, fromCache: false, saved: true }
        return 'saved'
      }
      return 'failed'
    },
  }
}
