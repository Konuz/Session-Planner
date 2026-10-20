// Zakładka Kadr w rendererze haków (hookRenderer.ts) dla testów zoom-kadru.
//
// Plik testu podmienia hak `useFeaturedObjects` (lista „Klasyki”, katalog = „Klasyki”, żeby mapa liczyła się szybko)
// i `createSkyImageLoader` (atrapa `FakeLoader`, która liczy pobrania). Prawdziwe są: sklep, `FramingTab`,
// `FramingView`, `useSkyImage` i warstwa zdjęcia. Zegary podmienia `vi.useFakeTimers`; `requestAnimationFrame` to
// `setTimeout` 16 ms.
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { vi } from 'vitest'
import { featuredObjects } from '../../../src/data/featuredObjects'
import { formatDesignation } from '../../../src/services/catalog/records'
import type { DsoObject, Framing } from '../../../src/types'
import { FakeLoader, M42_CENTER, MY_SET_ID, framing, parsePoints } from './helpers'
import { ancestorsOf, descendantsOf, HookRenderer, textOf, type FiredEvent, type HostElement } from './hookRenderer'

export const CATALOG = JSON.parse(
  readFileSync(new URL('../../../public/catalog/catalog.v1.json', import.meta.url), 'utf8'),
) as DsoObject[]
export const KLASYKI: readonly DsoObject[] = featuredObjects(CATALOG)

export function catalogObject(designation: string): DsoObject {
  const found = KLASYKI.find((object) => formatDesignation(object.primary) === designation)
  if (!found) throw new Error(`Brak w „Klasyki”: ${designation}`)
  return found
}

export const M42 = catalogObject('M 42')
export const M31 = catalogObject('M 31')

export class MemoryStorage {
  private readonly items = new Map<string, string>()
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

/** Podmienione zegary (także `Date` i `performance`) i `requestAnimationFrame` = `setTimeout` 16 ms. */
export function fakeClock(): void {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'] })
  vi.stubGlobal('requestAnimationFrame', (callback: (time: number) => void) => setTimeout(() => callback(performance.now()), 16))
  vi.stubGlobal('cancelAnimationFrame', (handle: ReturnType<typeof setTimeout>) => clearTimeout(handle))
}

export interface TabOptions {
  frame?: Framing
  profileId?: string
  redMode?: boolean
}

export interface Tab {
  r: HookRenderer
  store: Awaited<typeof import('../../../src/state/plannerStore')>['usePlannerStore']
  loader: FakeLoader
}

/**
 * Zakładka Kadr z obiektem M 42 (kadr wyśrodkowany na M 42, PA 0°, 1×1, chyba że podano inaczej) i profilem
 * „Mój zestaw”. `loaders` to lista, do której atrapa `createSkyImageLoader` dopisuje nowe pobieranie.
 */
export async function startTab(loaders: FakeLoader[], options: TabOptions = {}): Promise<Tab> {
  vi.stubGlobal('localStorage', new MemoryStorage())
  vi.resetModules()
  const { usePlannerStore } = await import('../../../src/state/plannerStore')
  const { FramingTab } = await import('../../../src/features/framing/FramingTab')
  const store = usePlannerStore
  store.setState({ locationsReady: true, redMode: options.redMode ?? false, activeProfileId: options.profileId ?? MY_SET_ID })
  store.getState().setTab('framing')
  store.getState().selectObject(M42.uid)
  store.getState().updateFraming(M42.uid, options.frame ?? framing(M42_CENTER))
  const before = loaders.length
  const r = new HookRenderer(() => createElement(FramingTab)).mount()
  const loader = loaders.at(-1)
  if (!loader || loaders.length === before) throw new Error('Zakładka nie utworzyła pobierania zdjęć (useSkyImage)')
  return { r, store, loader }
}

// ---------- Odczyty ----------

export function fullText(r: HookRenderer): string {
  return textOf(r.root)
}

/** Liczba z odczytu „Pole widoku: 3,05°” (dokładnie jeden odczyt na zakładce). */
export function readoutText(r: HookRenderer): string {
  const matches = fullText(r).match(/Pole widoku:\s*\d+(?:,\d+)?\s*°/g) ?? []
  if (matches.length !== 1) throw new Error(`Oczekiwano jednego odczytu „Pole widoku: …°”, jest ${matches.length}`)
  return matches[0].replace(/\s+/g, ' ').replace(/\s*°/, '°')
}

export function readout(r: HookRenderer): number {
  return Number(/(\d+(?:,\d+)?)/.exec(readoutText(r))![1].replace(',', '.'))
}

export type ZoomName = '+' | '−' | 'Dopasuj'

function names(host: HostElement): string[] {
  return [textOf(host), host.props['aria-label'], host.props.title]
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
}

/** Przycisk zoomu po tekście, `aria-label` albo `title` („−” albo „-”). */
export function zoomButton(r: HookRenderer, name: ZoomName): HostElement {
  const accepted = name === '−' ? ['−', '-'] : [name]
  const found = r.hosts().filter((host) => host.tag === 'button' && names(host).some((value) => accepted.includes(value)))
  if (found.length !== 1) throw new Error(`Oczekiwano jednego przycisku „${name}”, jest ${found.length}`)
  return found[0]
}

export const isDisabled = (host: HostElement): boolean => host.props.disabled === true || host.props['aria-disabled'] === true || host.props['aria-disabled'] === 'true'

export function click(r: HookRenderer, name: ZoomName): void {
  const button = zoomButton(r, name)
  if (isDisabled(button)) return
  r.fireReact(button, 'onClick', { type: 'click' })
}

export function viewSvg(r: HookRenderer): HostElement {
  const svgs = r.hosts().filter((host) => host.tag === 'svg' && (typeof host.props.viewBox === 'string' ? host.props.viewBox : '').trim() === '0 0 1000 1000')
  if (svgs.length !== 1) throw new Error(`Oczekiwano jednego <svg viewBox="0 0 1000 1000">, jest ${svgs.length}`)
  return svgs[0]
}

/** Narożniki pierwszego panelu ramki (`<g data-panel>`). */
export function panelCorners(r: HookRenderer): { x: number; y: number }[] {
  const group = descendantsOf(viewSvg(r)).find((host) => host.tag === 'g' && host.props['data-panel'] !== undefined)
  if (!group) throw new Error('Brak panelu ramki')
  const polygon = [group, ...descendantsOf(group)].find((host) => host.tag === 'polygon' || host.tag === 'polyline')
  const points = polygon?.props.points
  return parsePoints(typeof points === 'string' ? points : '')
}

/** Prostokąt zdjęcia `<image>` w widoku albo null. */
export function photoRectOf(r: HookRenderer): { x: number; y: number; width: number; height: number } | null {
  const found = descendantsOf(viewSvg(r)).filter((host) => host.tag === 'image')
  if (found.length === 0) return null
  const { x, y, width, height } = found[0].props
  return { x: Number(x), y: Number(y), width: Number(width), height: Number(height) }
}

export function center(tab: Tab): { raDeg: number; decDeg: number } {
  const frame = tab.store.getState().framing
  if (!frame) throw new Error('Brak kadru w stanie')
  return { raDeg: frame.centerRaDeg, decDeg: frame.centerDecDeg }
}

// ---------- Zdarzenia ----------

export interface PointerInit {
  id: number
  x: number
  y: number
}

const POINTER_PROP = { down: 'onPointerDown', move: 'onPointerMove', up: 'onPointerUp' } as const

/** Zdarzenie wskaźnika (dotyk) na svg widoku; obsługa bąbelkuje do przodków. Potem 20 ms zegara (rAF). */
export function pointer(tab: Tab, kind: keyof typeof POINTER_PROP, { id, x, y }: PointerInit): FiredEvent {
  const event = tab.r.fireReact(viewSvg(tab.r), POINTER_PROP[kind], {
    type: `pointer${kind}`,
    pointerId: id,
    pointerType: 'touch',
    isPrimary: id === 1,
    clientX: x,
    clientY: y,
    pageX: x,
    pageY: y,
    button: kind === 'move' ? -1 : 0,
    buttons: kind === 'up' ? 0 : 1,
  })
  tab.r.act(() => vi.advanceTimersByTime(20))
  return event
}

/** Elementy z nasłuchem `wheel` (addEventListener). */
export function wheelHosts(r: HookRenderer): HostElement[] {
  return [r.root, ...r.hosts()].filter((host) => host.node.listeners.some((listener) => listener.type === 'wheel'))
}

/** Ząbek kółka nad widokiem (zdarzenie trafia w svg widoku i bąbelkuje do przodków z nasłuchem `wheel`). */
export function wheel(tab: Tab, deltaY: number, deltaMode = 0, at = { x: 500, y: 500 }): FiredEvent {
  return tab.r.fireNative(viewSvg(tab.r), 'wheel', {
    deltaY,
    deltaX: 0,
    deltaZ: 0,
    deltaMode,
    clientX: at.x,
    clientY: at.y,
    ctrlKey: false,
  })
}

export function advance(tab: Tab, ms: number): void {
  tab.r.act(() => vi.advanceTimersByTime(ms))
}

export { ancestorsOf, descendantsOf }
