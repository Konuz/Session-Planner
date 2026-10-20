// Atrapy dla testów „warstwy-skyview” (spec: .autoloop/features/warstwy-skyview/spec.md).
// Sieć, obraz SkyView, pamięć, `localStorage` i zegar to atrapy z tests/features/pobieranie-zdjec/helpers.ts.
// Dodatkowo: wspólna oś zdarzeń (`events`) z odczytami pamięci ('cache:layer' = klucz hips2fits, czyli „pamięć
// warstwy”; 'cache:stsci' = klucz STScI) i zapytaniami sieciowymi ('net:<id źródła>') w kolejności, oraz SkyView,
// które odpowiada po zadanym czasie atrapy zegara.
// Nazwy API wybrał test-author (spec ich nie podaje): opcja `layerFirst` w `load(request, { sourceId, layerFirst })`,
// pole `layerRole` ('layer' = „w warstwie”, 'fallback' = „zastępstwo”) w obrazie, `skyviewLayerUrl(request)`.
import { expect } from 'vitest'
import {
  createSkyImageLoader,
  type SkyImageCache,
  type SkyImageCacheStorage,
  type SkyImageLoader,
  type SkyImageShown,
  type SkyImageTimeouts,
} from '../../../src/services/skyImage/loader'
import type { SkyImageRequest } from '../../../src/services/skyImage/sources'
import type { ShownPhoto } from '../../../src/features/framing/photoModel'
import {
  FakeCaches,
  FakeClock,
  FakeNet,
  FakeStorage,
  sourceOfUrl,
  STORAGE_KEY,
  type NetBehaviours,
} from '../pobieranie-zdjec/helpers'

export { FakeCaches, fillCache, flush, settle, STORAGE_KEY, track } from '../pobieranie-zdjec/helpers'

/** M 42 z nagłówka przykładów: RA 83,8221°, Dec −5,3911°, wycinek 5°, 1000 px, warstwa Hα. */
export const HA: SkyImageRequest = { center: { raDeg: 83.8221, decDeg: -5.3911 }, fovDeg: 5, sizePx: 1000, layerId: 'halpha' }
/** Ten sam wycinek w warstwie DSS2 czerwony. */
export const RED: SkyImageRequest = { ...HA, layerId: 'dss2-red' }
/** Ten sam wycinek w warstwie DSS2 kolor. */
export const COLOR: SkyImageRequest = { ...HA, layerId: 'dss2-color' }

/** Adres SkyView z P1. */
export const P1_URL =
  'https://skyview.gsfc.nasa.gov/current/cgi/runquery.pl?Survey=H-Alpha%20Comp&Position=83.8221,-5.3911&Size=5&Pixels=1000&Return=JPG'

/** Limity aplikacji z nagłówka przykładów (podane wprost, jak w `limit-hips2fits`). */
export const APP_LIMITS: SkyImageTimeouts = { alaskybis: 30_000, alasky: 30_000, skyview: 10_000, stsci: 10_000 }

export const ALL_SILENT: NetBehaviours = { alaskybis: 'silent', alasky: 'silent', skyview: 'silent', stsci: 'silent' }
/** Każde źródło od razu zawodzi. */
export const ALL_FAIL: NetBehaviours = { alaskybis: { status: 503 }, alasky: { status: 503 }, skyview: 'error', stsci: { status: 503 } }
/** Grupa warstwy od razu zawodzi, STScI działa. */
export const GROUP_FAIL: Partial<NetBehaviours> = { alaskybis: { status: 503 }, alasky: { status: 503 }, skyview: 'error' }

/** Pełna kolejność P6 na osi zdarzeń. */
export const P6_EVENTS = ['cache:layer', 'net:alaskybis', 'net:alasky', 'net:skyview', 'cache:stsci', 'net:stsci']

function cacheLabel(key: unknown): string {
  const text = typeof key === 'string' ? key : key instanceof Request ? key.url : String(key)
  if (text.includes('/hips2fits/')) return 'cache:layer'
  if (text.includes('/stsci/')) return 'cache:stsci'
  return `cache:${text}`
}

/** Pamięć, która zapisuje odczyty (`match`) na osi zdarzeń i oddaje wszystko do `inner`. */
class LoggedCaches implements SkyImageCacheStorage {
  private readonly inner: FakeCaches
  private readonly events: string[]

  constructor(inner: FakeCaches, events: string[]) {
    this.inner = inner
    this.events = events
  }

  async open(name: string): Promise<SkyImageCache> {
    const cache = await this.inner.open(name)
    return {
      match: (key: string) => {
        this.events.push(cacheLabel(key))
        return cache.match(key)
      },
      put: (key: string, response: Response) => cache.put(key, response),
    }
  }
}

export interface LayerHarness {
  loader: SkyImageLoader
  net: FakeNet
  caches: FakeCaches
  storage: FakeStorage
  clock: FakeClock
  /** Oś zdarzeń: odczyty pamięci i zapytania sieciowe w kolejności. */
  events: string[]
}

export interface LayerHarnessOptions {
  net?: Partial<NetBehaviours>
  /** Pamięć wypełniona wcześniej (np. `fillCache`); jej wypełnianie nie trafia na oś zdarzeń. */
  caches?: FakeCaches
  /** Zapamiętane źródło w `localStorage`. */
  remembered?: string
  /** Tabela limitów; domyślnie limity aplikacji, null = pobieranie bez tabeli. */
  timeouts?: SkyImageTimeouts | null
  /** SkyView odpowiada obrazem po tylu ms atrapy zegara (zamiast zachowania z `net`). */
  skyviewAfterMs?: number
}

export function layerHarness(options: LayerHarnessOptions = {}): LayerHarness {
  const events: string[] = []
  const net = new FakeNet(options.net)
  const caches = options.caches ?? new FakeCaches()
  const storage = new FakeStorage(options.remembered === undefined ? {} : { [STORAGE_KEY]: options.remembered })
  const clock = new FakeClock()
  const fetch = (url: string, init: { signal: AbortSignal }): Promise<Response> => {
    events.push(`net:${sourceOfUrl(url)}`)
    return net.fetch(url, init)
  }
  const loadImage = (url: string, signal: AbortSignal): Promise<unknown> => {
    events.push(`net:${sourceOfUrl(url)}`)
    const delay = options.skyviewAfterMs
    if (delay === undefined) return net.loadImage(url, signal)
    net.calls.push({ sourceId: sourceOfUrl(url), kind: 'image', url, signal })
    return new Promise<unknown>((resolve, reject) => {
      const handle = clock.setTimeout(() => resolve({ skyview: url }), delay)
      signal.addEventListener(
        'abort',
        () => {
          clock.clearTimeout(handle)
          reject(new DOMException('The operation was aborted.', 'AbortError'))
        },
        { once: true },
      )
    })
  }
  const deps = { fetch, loadImage, caches: new LoggedCaches(caches, events), storage, clock }
  const timeouts = options.timeouts === undefined ? APP_LIMITS : options.timeouts
  const loader = timeouts === null ? createSkyImageLoader(deps) : createSkyImageLoader(deps, timeouts)
  return { loader, net, caches, storage, clock, events }
}

export function asImage(result: unknown): SkyImageShown {
  expect(result).toMatchObject({ kind: 'image' })
  return result as SkyImageShown
}

/** Pokazane zdjęcie dla modelu warstwy (podpis, licencja). */
export function photoOf(image: SkyImageShown, request: SkyImageRequest): ShownPhoto {
  return { image, request }
}

/** Obraz zbudowany ręcznie (jak wynik `load`) do testów podpisu i licencji. */
export function imageOf(
  sourceId: SkyImageShown['sourceId'],
  sourceName: string,
  extra: { fromCache?: boolean; layerRole?: 'layer' | 'fallback' } = {},
): SkyImageShown {
  const { fromCache = false, layerRole } = extra
  return {
    kind: 'image',
    sourceId,
    sourceName,
    data: `${sourceId}-data`,
    fromCache,
    saved: fromCache || sourceId !== 'skyview',
    ...(layerRole === undefined ? {} : { layerRole }),
  }
}

export const OUTLINES_LICENSE = 'Licencja: zarysy obiektów — Stellarium (GPL-2.0)'
export const STSCI_LICENSE = 'Licencja: zdjęcie — Digitized Sky Survey © STScI/AURA'
export const SKYVIEW_LICENSE = 'Licencja: zdjęcie — NASA/GSFC SkyView, dane DSS © STScI/AURA'
export const SKYVIEW_HA_LICENSE = 'Licencja: zdjęcie — NASA/GSFC SkyView, mapa Hα: Finkbeiner (ODbL)'
export const MISSING_TEXT = 'Brak zdjęcia — pokazuję zarysy obiektów'
