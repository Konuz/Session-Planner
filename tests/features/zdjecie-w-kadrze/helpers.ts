// Wspólne dane i narzędzia testów funkcji „zdjecie-w-kadrze” (spec: .autoloop/features/zdjecie-w-kadrze/spec.md).
//
// Nazwy, których spec nie podaje (wybrane przez test-author; opis także w zaślepkach):
// - model `src/features/framing/photoModel.ts`: `sourceChoices`, `layerChoices`, `loadOptions`, `photoCaption`,
//   `attemptLines`, `licenseLines`, `photoRect`, `nextPhotoRequest`, `createPhotoLayer` (stan warstwy zdjęcia
//   z wstrzykniętym pobieraniem: `setFrame`, `chooseSource`, `chooseLayer`, `retry`, `saveOffline`, `view`);
// - komponent `src/features/framing/PhotoPanel.tsx` (tylko renderuje `PhotoLayerView`);
// - hak `src/features/framing/useSkyImage.ts` (`useSkyImage({ center, size, dragging })` → `{ view, photoHref, layer }`);
// - `FramingView` z propem `photo = { href, rect }` → `<image data-role="photo">`.
// Testy działają w Node bez DOM (renderToStaticMarkup). „Kliknięcie”: sonda w trakcie renderu znajduje element HTML
// i oddaje jego właściwości (wzorzec z tests/features/zakladka-kadr/helpers.ts, skopiowany, żeby nie wiązać testów
// różnych funkcji).
import { createElement, isValidElement, type ElementType, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect } from 'vitest'
import type { EquatorialDeg } from '../../../src/services/astroMath'
import type { MosaicSize } from '../../../src/services/framing'
import {
  SKY_IMAGE_CACHE_NAME,
  SKY_SOURCE_HEADER,
  type SkyImageAttempt,
  type SkyImageCache,
  type SkyImageCacheStorage,
  type SkyImageClock,
  type SkyImageLoadOptions,
  type SkyImageLoadResult,
  type SkyImageLoaderDeps,
  type SkyImageMissing,
  type SkyImageShown,
  type SkyImageStorage,
  type SkyImageView,
} from '../../../src/services/skyImage/loader'
import {
  planCutout,
  skyImageSources,
  type SkyImageLayerId,
  type SkyImageRequest,
  type SkyImageSourceId,
} from '../../../src/services/skyImage/sources'
import type { PhotoFrame, PhotoLoaderPort, ShownPhoto } from '../../../src/features/framing/photoModel'

// ---------- Dane przykładów ----------

/** M 42 (NGC1976) z katalogu: RA 83,81867°, Dec −5,38967°. */
export const M42_CENTER: EquatorialDeg = { raDeg: 83.81866666666666, decDeg: -5.389666666666667 }
/** M 31 (NGC224) z katalogu: RA 10,68479°, Dec 41,26906°. */
export const M31_CENTER: EquatorialDeg = { raDeg: 10.684791666666666, decDeg: 41.26905555555555 }

/** Kadr 2,0° × 1,5° → pole wycinka 5° (`cutoutFovDeg`: 2 × przekątna 2,5°). */
export const SIZE_5: MosaicSize = { widthDeg: 2, heightDeg: 1.5 }
/** Kadr 1,0° × 0,75° → pole wycinka 2,5°. */
export const SIZE_2_5: MosaicSize = { widthDeg: 1, heightDeg: 0.75 }

export function frameAt(center: EquatorialDeg, size: MosaicSize = SIZE_5): PhotoFrame {
  return { center: { ...center }, size: { ...size } }
}

/** Wycinek M 42 z przykładów: pole 5°, 1000 px, warstwa jak podano (domyślnie DSS2 kolor). */
export function m42Request(layerId: SkyImageLayerId = 'dss2-color', size: MosaicSize = SIZE_5): SkyImageRequest {
  return planCutout(M42_CENTER, size, layerId)
}

export const SOURCE_NAME: Record<SkyImageSourceId, string> = Object.fromEntries(
  skyImageSources().map((source) => [source.id, source.name]),
) as Record<SkyImageSourceId, string>

export interface ImageFlags {
  fromCache?: boolean
  saved?: boolean
}

/** Wynik `load` z obrazem źródła `sourceId` (tak jak zwraca go `pobieranie-zdjec`). */
export function image(sourceId: SkyImageSourceId, { fromCache = false, saved }: ImageFlags = {}): SkyImageShown {
  return {
    kind: 'image',
    sourceId,
    sourceName: SOURCE_NAME[sourceId],
    data: `${sourceId}-data`,
    fromCache,
    saved: saved ?? (fromCache || sourceId !== 'skyview'),
  }
}

export function shown(sourceId: SkyImageSourceId, request: SkyImageRequest, flags: ImageFlags = {}): ShownPhoto {
  return { image: image(sourceId, flags), request }
}

export function missing(attempts: SkyImageAttempt[]): SkyImageMissing {
  return { kind: 'none', attempts }
}

/** Lista prób z P6. */
export const P6_ATTEMPTS: SkyImageAttempt[] = [
  { sourceId: 'alaskybis', reason: 'limit czasu' },
  { sourceId: 'alasky', reason: 'błąd 503' },
  { sourceId: 'skyview', reason: 'błąd obrazu' },
  { sourceId: 'stsci', reason: 'błąd sieci' },
]

export const OUTLINES_LICENSE = 'Licencja: zarysy obiektów — Stellarium (GPL-2.0)'

// ---------- Atrapa pobierania (liczy wywołania, zapisuje tryb, zwraca podany wynik) ----------

export interface LoadCall {
  request: SkyImageRequest
  /** null = tryb automatyczny, id = tryb ręczny z tym źródłem. */
  sourceId: SkyImageSourceId | null
}

interface Pending<T> {
  resolve: (value: T) => void
}

export class FakeLoader implements PhotoLoaderPort {
  calls: LoadCall[] = []
  saveCalls = 0
  private pendingLoads: Pending<SkyImageLoadResult>[] = []
  private pendingSaves: Pending<'saved' | 'failed'>[] = []
  private shownView: SkyImageView | null = null

  load = (request: SkyImageRequest, options?: SkyImageLoadOptions): Promise<SkyImageLoadResult> => {
    this.calls.push({ request: structuredClone(request), sourceId: options?.sourceId ?? null })
    return new Promise<SkyImageLoadResult>((resolve) => {
      this.pendingLoads.push({ resolve })
    })
  }

  saveOffline = (): Promise<'saved' | 'failed'> => {
    this.saveCalls += 1
    return new Promise<'saved' | 'failed'>((resolve) => {
      this.pendingSaves.push({ resolve })
    })
  }

  current = (): SkyImageView | null => this.shownView

  get lastCall(): LoadCall {
    const call = this.calls.at(-1)
    if (!call) throw new Error('Pobieranie nie zostało wywołane')
    return call
  }

  /** Rozstrzyga ostatnie wywołanie `load`; starsze dostają `superseded` (jak w `pobieranie-zdjec` P19). */
  async finish(result: SkyImageView): Promise<void> {
    const last = this.pendingLoads.pop()
    if (!last) throw new Error('Brak trwającego pobierania')
    for (const older of this.pendingLoads) older.resolve({ kind: 'superseded' })
    this.pendingLoads = []
    this.shownView = result
    last.resolve(result)
    await flush()
  }

  /** Spóźniony wynik najstarszego trwającego pobierania: `superseded` (nowsze pobieranie dalej trwa). */
  async supersedeOldest(): Promise<void> {
    const oldest = this.pendingLoads.shift()
    if (!oldest) throw new Error('Brak trwającego pobierania')
    oldest.resolve({ kind: 'superseded' })
    await flush()
  }

  /** Rozstrzyga zapis offline; `after` = to, co pokazuje pobieranie po zapisie (np. obraz STScI). */
  async finishSave(result: 'saved' | 'failed', after?: SkyImageView): Promise<void> {
    const pending = this.pendingSaves.shift()
    if (!pending) throw new Error('Brak trwającego zapisu')
    if (after) this.shownView = after
    pending.resolve(result)
    await flush()
  }
}

/** Kilka obrotów pętli zdarzeń (obietnice i odczyty `Response`). */
export async function flush(times = 20): Promise<void> {
  for (let i = 0; i < times; i += 1) await new Promise((resolve) => setTimeout(resolve, 0))
}

// ---------- Atrapy zależności prawdziwego pobierania (`createSkyImageLoader`) ----------

export type NetBehaviour = 'ok' | 'fail'

/** Zależności `createSkyImageLoader`: sieć wg zachowań, pamięć z rejestrem odczytów, zegar, który sam nie odpala. */
export class FakeDeps {
  fetchUrls: string[] = []
  imageUrls: string[] = []
  matchKeys: string[] = []
  private readonly entries = new Map<string, { body: string; headers: Record<string, string> }>()
  behaviours: Record<SkyImageSourceId, NetBehaviour>

  constructor(behaviours: Partial<Record<SkyImageSourceId, NetBehaviour>> = {}) {
    this.behaviours = { alaskybis: 'ok', alasky: 'ok', skyview: 'ok', stsci: 'ok', ...behaviours }
  }

  /** Wpis pamięci pod kluczem `key` z nazwą źródła w nagłówku (jak zapisuje go `pobieranie-zdjec`). */
  store(key: string, sourceId: SkyImageSourceId): void {
    this.entries.set(key, { body: `${sourceId}-cached`, headers: { [SKY_SOURCE_HEADER]: sourceId, 'content-type': 'image/jpeg' } })
  }

  get networkCount(): number {
    return this.fetchUrls.length + this.imageUrls.length
  }

  private source(url: string): SkyImageSourceId {
    const host = new URL(url).hostname
    if (host.startsWith('alaskybis.')) return 'alaskybis'
    if (host.startsWith('alasky.')) return 'alasky'
    if (host.startsWith('skyview.')) return 'skyview'
    return 'stsci'
  }

  private readonly cache: SkyImageCache = {
    match: (key: string) => {
      this.matchKeys.push(key)
      const entry = this.entries.get(key)
      return Promise.resolve(entry ? new Response(entry.body, { status: 200, headers: entry.headers }) : undefined)
    },
    put: async (key: string, response: Response) => {
      const headers: Record<string, string> = {}
      response.headers.forEach((value, name) => {
        headers[name] = value
      })
      this.entries.set(key, { body: await response.text(), headers })
    },
  }

  private readonly cacheStorage: SkyImageCacheStorage = {
    open: (name: string) => {
      expect(name).toBe(SKY_IMAGE_CACHE_NAME)
      return Promise.resolve(this.cache)
    },
  }

  private readonly memory = new Map<string, string>()

  private readonly storage: SkyImageStorage = {
    getItem: (key) => this.memory.get(key) ?? null,
    setItem: (key, value) => {
      this.memory.set(key, value)
    },
  }

  private readonly clock: SkyImageClock = {
    setTimeout: () => 0,
    clearTimeout: () => undefined,
  }

  deps(): SkyImageLoaderDeps {
    return {
      fetch: (url) => {
        this.fetchUrls.push(url)
        const id = this.source(url)
        if (this.behaviours[id] === 'ok') {
          return Promise.resolve(new Response(`${id}-bytes`, { status: 200, headers: { 'content-type': 'image/jpeg' } }))
        }
        return Promise.resolve(new Response('niedostępne', { status: 503, headers: { 'content-type': 'text/html' } }))
      },
      loadImage: (url) => {
        this.imageUrls.push(url)
        return this.behaviours.skyview === 'ok' ? Promise.resolve({ skyview: url }) : Promise.reject(new Error('error'))
      },
      caches: this.cacheStorage,
      storage: this.storage,
      clock: this.clock,
    }
  }
}

/** Pobieranie z rejestrem trybu wywołań (opakowuje prawdziwe pobieranie). */
export function recording(loader: PhotoLoaderPort): PhotoLoaderPort & { modes: Array<SkyImageSourceId | null> } {
  const modes: Array<SkyImageSourceId | null> = []
  return {
    modes,
    load: (request, options) => {
      modes.push(options?.sourceId ?? null)
      return loader.load(request, options)
    },
    saveOffline: () => loader.saveOffline(),
    current: () => loader.current(),
  }
}

// ---------- Porównania ----------

export const UNIT_TOL = 1

export function expectNear(actual: number, expected: number, tol: number, what = ''): void {
  expect(Math.abs(actual - expected), `${what}: ${actual} zamiast ${expected} ±${tol}`).toBeLessThanOrEqual(tol)
}

/** Prostokąt (lewy górny róg, szerokość, wysokość) jako zakresy x i y, ±1. */
export function expectRect(
  rect: { x: number; y: number; width: number; height: number },
  x: [number, number],
  y: [number, number],
  what = 'zdjęcie',
): void {
  expectNear(rect.x, x[0], UNIT_TOL, `${what} x min`)
  expectNear(rect.x + rect.width, x[1], UNIT_TOL, `${what} x max`)
  expectNear(rect.y, y[0], UNIT_TOL, `${what} y min`)
  expectNear(rect.y + rect.height, y[1], UNIT_TOL, `${what} y max`)
}

/** localStorage w pamięci (metody Storage). */
export class MemoryStorage {
  readonly items = new Map<string, string>()

  get length(): number {
    return this.items.size
  }

  clear(): void {
    this.items.clear()
  }

  getItem(key: string): string | null {
    return this.items.get(key) ?? null
  }

  key(index: number): string | null {
    return [...this.items.keys()][index] ?? null
  }

  removeItem(key: string): void {
    this.items.delete(key)
  }

  setItem(key: string, value: string): void {
    this.items.set(key, String(value))
  }
}

// ---------- Sonda: właściwości elementów HTML w trakcie renderu ----------

export type HostProps = Record<string, unknown>

export interface Host {
  tag: string
  props: HostProps
  /** Tekst elementu (liczony w trakcie renderu, bo komponenty ikon używają kontekstu Reacta). */
  text?: string
}

const FORWARD_REF = Symbol.for('react.forward_ref')
const MEMO = Symbol.for('react.memo')

type Render = (props: HostProps, ref: null) => unknown

function expand(element: ReactElement): unknown {
  const props = element.props as HostProps
  const type: unknown = element.type
  if (typeof type === 'string') return props.children
  if (typeof type === 'function') return (type as Render)(props, null)
  if (typeof type === 'object' && type !== null && '$$typeof' in type) {
    const kind = type.$$typeof
    if (kind === FORWARD_REF) return (type as unknown as { render: Render }).render(props, null)
    if (kind === MEMO) return createElement((type as unknown as { type: ElementType }).type, props)
  }
  return props.children
}

function* hosts(node: unknown): Generator<Host> {
  if (Array.isArray(node)) {
    for (const child of node) yield* hosts(child)
    return
  }
  if (!isValidElement(node)) return
  if (typeof node.type === 'string') yield { tag: node.type, props: node.props as HostProps }
  yield* hosts(expand(node))
}

export function hostText(node: unknown): string {
  const parts: string[] = []
  const walk = (value: unknown): void => {
    if (typeof value === 'string' || typeof value === 'number') parts.push(String(value))
    else if (Array.isArray(value)) value.forEach(walk)
    else if (isValidElement(value)) walk(expand(value))
  }
  walk(node)
  return parts.join(' ').replace(/[\u00a0\u202f\u2007]/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Render z sondą: znaczniki i wszystkie elementy HTML w kolejności dokumentu (z właściwościami). */
export function probeAll(element: ReactElement, before?: () => void): { markup: string; hosts: Host[] } {
  const found: Host[] = []
  const sonda = () => {
    before?.()
    for (const host of hosts(element)) found.push({ ...host, text: hostText(host.props.children) })
    return element
  }
  const markup = renderToStaticMarkup(createElement(sonda))
  return { markup, hosts: found }
}

export function buttons(all: readonly Host[], text: string): Host[] {
  return all.filter((host) => host.tag === 'button' && host.text === text)
}

export interface SelectInfo {
  host: Host
  values: string[]
  labels: string[]
  /** Etykieta opcji, której wartość jest wartością listy (`value` albo `defaultValue`). */
  selectedLabel: string | null
}

export function selectInfo(host: Host): SelectInfo {
  const options = [...hosts(host.props.children)].filter((child) => child.tag === 'option')
  const values = options.map((option) => {
    const value = option.props.value
    return typeof value === 'string' || typeof value === 'number' ? String(value) : hostText(option.props.children)
  })
  const labels = options.map((option) => hostText(option.props.children))
  const value = host.props.value ?? host.props.defaultValue
  const index = typeof value === 'string' || typeof value === 'number' ? values.indexOf(String(value)) : -1
  return { host, values, labels, selectedLabel: index >= 0 ? labels[index] : null }
}

/** Lista `<select>`, której etykiety opcji zawierają `label`. */
export function selectWithOption(all: readonly Host[], label: string): SelectInfo {
  const found = all.filter((host) => host.tag === 'select').map(selectInfo).filter((info) => info.labels.includes(label))
  if (found.length !== 1) throw new Error(`Oczekiwano jednej listy z opcją „${label}”, jest ${found.length}`)
  return found[0]
}

export function click(props: HostProps | null | undefined): void {
  const onClick = props?.onClick
  if (typeof onClick !== 'function') throw new Error('Element nie ma obsługi kliknięcia (onClick)')
  ;(onClick as (event: unknown) => void)(fakeEvent({}))
}

export function choose(props: HostProps | null | undefined, value: string): void {
  const onChange = props?.onChange
  if (typeof onChange !== 'function') throw new Error('Pole nie ma obsługi zmiany (onChange)')
  ;(onChange as (event: unknown) => void)(fakeEvent({ value }))
}

function fakeEvent(target: Record<string, unknown>) {
  return { target, currentTarget: target, preventDefault: () => undefined, stopPropagation: () => undefined, nativeEvent: {} }
}

export function visibleText(markup: string): string {
  return markup
    .replace(/<!--.*?-->/g, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/[\u00a0\u202f\u2007]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// ---------- Prosty parser znaczników (przodkowie elementu) ----------

export interface MarkupElement {
  tag: string
  attrs: Record<string, string>
  children: MarkupElement[]
  parent: MarkupElement | null
}

const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'])
const TAG = /<!--[\s\S]*?-->|<\/([a-zA-Z][\w:-]*)\s*>|<([a-zA-Z][\w:-]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)*)\s*(\/?)>/g
const ATTRIBUTE = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g

function parseAttributes(text: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  for (const match of text.matchAll(ATTRIBUTE)) attrs[match[1].toLowerCase()] = (match[2] ?? match[3] ?? match[4] ?? '').replace(/&amp;/g, '&')
  return attrs
}

/** Elementy ze znaczników w kolejności dokumentu (z rodzicem). */
export function markupElements(markup: string): MarkupElement[] {
  const root: MarkupElement = { tag: '#root', attrs: {}, children: [], parent: null }
  const all: MarkupElement[] = []
  let current = root
  for (const match of markup.matchAll(TAG)) {
    if (match[0].startsWith('<!--')) continue
    if (match[1] !== undefined) {
      const tag = match[1].toLowerCase()
      let open: MarkupElement | null = current
      while (open && open.tag !== tag) open = open.parent
      if (open?.parent) current = open.parent
      continue
    }
    const element: MarkupElement = { tag: match[2].toLowerCase(), attrs: parseAttributes(match[3]), children: [], parent: current }
    current.children.push(element)
    all.push(element)
    if (!VOID_TAGS.has(element.tag) && match[4] !== '/') current = element
  }
  return all
}

export function ancestors(element: MarkupElement): MarkupElement[] {
  const found: MarkupElement[] = []
  let node = element.parent
  while (node) {
    found.push(node)
    node = node.parent
  }
  return found
}
