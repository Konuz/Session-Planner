// Atrapy dla testów „limit-hips2fits”: te same co w „pobieranie-zdjec” (sieć, obraz, pamięć, `localStorage`,
// zegar), a obiekt pobierający dostaje opcjonalną tabelę limitów jako drugi argument
// `createSkyImageLoader(deps, timeouts?)` (nazwa i miejsce wybrane przez test-author, opis w loader.ts).
import { expect } from 'vitest'
import {
  createSkyImageLoader,
  type SkyImageLoader,
  type SkyImageShown,
  type SkyImageTimeouts,
} from '../../../src/services/skyImage/loader'
import type { SkyImageRequest } from '../../../src/services/skyImage/sources'
import {
  FakeCaches,
  FakeClock,
  FakeNet,
  FakeStorage,
  STORAGE_KEY,
  type NetBehaviours,
} from '../pobieranie-zdjec/helpers'

export { FakeCaches, fillCache, flush, imageResponse, settle, STORAGE_KEY, track } from '../pobieranie-zdjec/helpers'

/** Wycinek M 42 jak w `pobieranie-zdjec`. */
export const M42: SkyImageRequest = {
  center: { raDeg: 83.8221, decDeg: -5.3911 },
  fovDeg: 1,
  sizePx: 800,
  layerId: 'dss2-color',
}
/** Wspólny klucz hips2fits dla wycinka M 42 (P14 w `zrodla-zdjec`). */
export const HIPS_KEY = '/sky-image-cache/hips2fits/CDS%2FP%2FDSS2%2Fcolor/83.8221/-5.3911/1/800'
export const STSCI_KEY = '/sky-image-cache/stsci/dss/83.8221/-5.3911/1/0'

/** „Limity aplikacji” ze spec (podane wprost, żeby testy pobierania nie zależały od stałej). */
export const APP_LIMITS: SkyImageTimeouts = { alaskybis: 30_000, alasky: 30_000, skyview: 10_000, stsci: 10_000 }

export const ALL_SILENT: NetBehaviours = { alaskybis: 'silent', alasky: 'silent', skyview: 'silent', stsci: 'silent' }

export interface LimitHarness {
  loader: SkyImageLoader
  net: FakeNet
  caches: FakeCaches | null
  storage: FakeStorage
  clock: FakeClock
}

export interface LimitHarnessOptions {
  net?: Partial<NetBehaviours>
  caches?: FakeCaches | null
  remembered?: string
  /** Tabela limitów; `undefined` = pobieranie utworzone bez limitów (jeden argument). */
  timeouts?: SkyImageTimeouts
}

export function limitHarness(options: LimitHarnessOptions = {}): LimitHarness {
  const net = new FakeNet(options.net)
  const caches = options.caches === undefined ? new FakeCaches() : options.caches
  const storage = new FakeStorage(options.remembered === undefined ? {} : { [STORAGE_KEY]: options.remembered })
  const clock = new FakeClock()
  const deps = { fetch: net.fetch, loadImage: net.loadImage, caches, storage, clock }
  const loader = options.timeouts === undefined ? createSkyImageLoader(deps) : createSkyImageLoader(deps, options.timeouts)
  return { loader, net, caches, storage, clock }
}

export function asImage(result: unknown): SkyImageShown {
  expect(result).toMatchObject({ kind: 'image' })
  return result as SkyImageShown
}

export async function blobText(data: unknown): Promise<string> {
  expect(data).toBeInstanceOf(Blob)
  return await (data as Blob).text()
}
