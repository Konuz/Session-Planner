// Wspólne dane i narzędzia testów funkcji „zakladka-kadr” (spec: .autoloop/features/zakladka-kadr/spec.md).
//
// Nazwy i znaczniki, których spec nie podaje (wybrane przez test-author; opis także w zaślepkach):
// - model `src/features/framing/framingModel.ts`: `VIEW_SIZE`, `dragFraming(start, pointer, fovDeg, renderedWidthPx)`,
//   `readPaInput(text, currentPaDeg)`, `readOverlapInput(text, currentPct)`;
// - sklep: `Tab` z 'framing', stan `framing` (Framing | null) i `framingObjectUid`, akcja `updateFraming(uid, framing)`;
// - `FramingTab` (`src/features/framing/FramingTab.tsx`) bierze obiekty z haka `useFeaturedObjects` zakładki Noc;
// - `FramingView` (`src/features/framing/FramingView.tsx`) z props `{ fovDeg, profile, framing, mapObjects }`;
//   SVG `viewBox="0 0 1000 1000"`, panel = `<g data-panel="N">` z wielokątem (LG, PG, PD, LD) i tekstem „N”,
//   pryzmat = `data-role="oag"`, obiekt mapy = `<g data-map-uid>`; punkty w jednostkach widoku, bez `transform`.
// Testy działają w Node bez DOM (renderToStaticMarkup). „Kliknięcie” i wybór z listy: sonda (`probe`) w trakcie renderu
// rozwija drzewo elementów, znajduje element HTML i oddaje jego właściwości, a test wywołuje `onClick` / `onChange`
// (wzorzec z tests/features/wybor-obiektu/helpers.ts, skopiowany, żeby nie wiązać testów różnych funkcji).
import { readFileSync } from 'node:fs'
import { createElement, isValidElement, type ElementType, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, vi } from 'vitest'
import { DEMO_PROFILES } from '../../../src/data/demo'
import { DEFAULT_LOCATION_ID } from '../../../src/data/locations'
import { featuredObjects } from '../../../src/data/featuredObjects'
import type { useFeaturedObjects } from '../../../src/features/night/useFeaturedObjects'
import { formatDesignation } from '../../../src/services/catalog/records'
import { mosaicPanels, mosaicSizeDeg, oagPrisms, skyToCutout, type CutoutPoint, type SkyCutout } from '../../../src/services/framing'
import { assignOutlines, parseOutlines } from '../../../src/services/outlines'
import { cutoutFovDeg } from '../../../src/services/skyImage/sources'
import type { DsoObject, EquipmentProfile, Framing } from '../../../src/types'

// ---------- Katalog i obiekty ----------

/** Czas na test z pełnym katalogiem (≈16,5 tys. obiektów, zarysy i mapa zastępcza). */
export const FULL_CATALOG_TIMEOUT = 60_000

/** Katalog aplikacji (public/catalog). Testy czytają go z dysku, bo `loadCatalog` używa fetch. */
export const CATALOG = JSON.parse(
  readFileSync(new URL('../../../public/catalog/catalog.v1.json', import.meta.url), 'utf8'),
) as DsoObject[]

/** Lista „Klasyki” w kolejności z featured.json. */
export const KLASYKI: readonly DsoObject[] = featuredObjects(CATALOG)

/** Obiekt katalogu o oznaczeniu głównym zapisanym jak `formatDesignation` (np. „M 42”). */
export function catalogObject(designation: string): DsoObject {
  const found = CATALOG.find((object) => formatDesignation(object.primary) === designation)
  if (!found) throw new Error(`Brak w katalogu: ${designation}`)
  return found
}

/** M 42 (NGC1976): RA 83,81867°, Dec −5,38967°. */
export const M42 = catalogObject('M 42')
/** M 31 (NGC224): RA 10,68479°, Dec 41,26906° – obiekt domyślny. */
export const M31 = catalogObject('M 31')
/** M 13 (NGC6205): poza „Klasyki”. */
export const M13 = catalogObject('M 13')

export const uids = (objects: readonly DsoObject[]): string[] => objects.map((object) => object.uid)

/** Zarysy Stellarium przypisane do katalogu (`zarysy-stellarium`). */
export const POLYGONS = assignOutlines(
  parseOutlines(readFileSync(new URL('../../../src/data/outlines.dat', import.meta.url), 'utf8')),
  CATALOG,
).polygonsByUid

// ---------- Profile i kadr ----------

function demoProfile(id: string): EquipmentProfile {
  const found = DEMO_PROFILES.find((profile) => profile.id === id)
  if (!found) throw new Error(`Brak profilu ${id}`)
  return structuredClone(found)
}

export const MY_SET_ID = 'demo-moj-zestaw'
export const REDCAT_ID = 'demo-redcat51-asi2600mc'
export const ESPRIT_ID = 'demo-esprit100-asi6200mm'
export const NEWTON200_ID = 'demo-newton200-asi533mm'

/** „Mój zestaw”: Newton 150/600 + Ares-M Pro, bez OAG. */
export const mySet = (): EquipmentProfile => demoProfile(MY_SET_ID)
/** RedCat 51 + ASI2600MC Pro (OSC). */
export const redcat = (): EquipmentProfile => demoProfile(REDCAT_ID)
/** Esprit 100ED + ASI6200MM Pro (mono). */
export const esprit = (): EquipmentProfile => demoProfile(ESPRIT_ID)
/** Newton 200/1000 + ASI533MM Pro (mono). */
export const newton200 = (): EquipmentProfile => demoProfile(NEWTON200_ID)

export type Oag = NonNullable<EquipmentProfile['oag']>

/** OAG z P23 (`geometria-kadru` P15): pryzmat 8 × 4 mm, odsunięcie 8 mm, kąt 0°. */
export const P23_OAG: Oag = { prismWidthMm: 8, prismHeightMm: 4, offsetFromCenterMm: 8, angleDeg: 0 }

export function withOag(profile: EquipmentProfile, oag: Oag | null): EquipmentProfile {
  return { ...profile, oag }
}

export interface FramingInput {
  ra?: number
  dec?: number
  pa?: number
  cols?: number
  rows?: number
  overlap?: number
}

/** Kadr; domyślnie środek RA 30°, Dec 0°, PA 0°, mozaika 1×1, zakładka 20%. */
export function framing({ ra = 30, dec = 0, pa = 0, cols = 1, rows = 1, overlap = 20 }: FramingInput = {}): Framing {
  return { centerRaDeg: ra, centerDecDeg: dec, paDeg: pa, mosaic: { cols, rows, overlapPct: overlap } }
}

/** Środek kadru z P8–P13: RA 83,8221°, Dec −5,3911°. */
export const DRAG_CENTER = { ra: 83.8221, dec: -5.3911 }

/** Wycinek 1000 × 1000 o danym polu wokół środka kadru (= widok). */
export function viewCutout(frame: Framing, fovDeg: number): SkyCutout {
  return { center: { raDeg: frame.centerRaDeg, decDeg: frame.centerDecDeg }, fovDeg, widthPx: 1000, heightPx: 1000 }
}

/** Pole widoku zakładki: pole wycinka `cutoutFovDeg(mosaicSizeDeg(...))` z `zrodla-zdjec` (P19). */
export function tabFovDeg(profile: EquipmentProfile, frame: Framing): number {
  return cutoutFovDeg(mosaicSizeDeg(profile, frame))
}

/** Oczekiwane narożniki paneli w jednostkach widoku (rzut narożników z `geometria-kadru`). */
export function expectedPanels(profile: EquipmentProfile, frame: Framing, fovDeg: number): CutoutPoint[][] {
  const cut = viewCutout(frame, fovDeg)
  return mosaicPanels(profile, frame).map((panel) => panel.corners.map((corner) => skyToCutout(cut, corner)))
}

/** Oczekiwane prostokąty pryzmatów OAG w jednostkach widoku. */
export function expectedPrisms(profile: EquipmentProfile, frame: Framing, fovDeg: number): CutoutPoint[][] {
  const cut = viewCutout(frame, fovDeg)
  return oagPrisms(profile, frame).map((quad) => quad.map((corner) => skyToCutout(cut, corner)))
}

// ---------- Porównania ----------

export const ANGLE_TOL = 0.002
export const PX_TOL = 1

export function expectNear(actual: number, expected: number, tol: number, what = ''): void {
  expect(Math.abs(actual - expected), `${what}: ${actual} zamiast ${expected} ±${tol}`).toBeLessThanOrEqual(tol)
}

/** Środek kadru: RA w [0, 360) i ±0,002°. */
export function expectCenter(frame: Framing, raDeg: number, decDeg: number, what = 'środek'): void {
  expect(frame.centerRaDeg, `${what} RA w [0, 360)`).toBeGreaterThanOrEqual(0)
  expect(frame.centerRaDeg, `${what} RA w [0, 360)`).toBeLessThan(360)
  expectNear(frame.centerRaDeg, raDeg, ANGLE_TOL, `${what} RA`)
  expectNear(frame.centerDecDeg, decDeg, ANGLE_TOL, `${what} Dec`)
}

export function expectPoint(actual: CutoutPoint, x: number, y: number, what = 'punkt'): void {
  expectNear(actual.x, x, PX_TOL, `${what} x`)
  expectNear(actual.y, y, PX_TOL, `${what} y`)
}

/** Narożniki w tej samej kolejności, każdy ±1. */
export function expectCorners(actual: readonly CutoutPoint[], expected: readonly CutoutPoint[], what = 'narożniki'): void {
  expect(actual, `${what}: liczba punktów`).toHaveLength(expected.length)
  expected.forEach((point, i) => expectPoint(actual[i], point.x, point.y, `${what} [${i}]`))
}

export interface Box {
  xMin: number
  xMax: number
  yMin: number
  yMax: number
}

export function box(points: readonly CutoutPoint[]): Box {
  return {
    xMin: Math.min(...points.map((p) => p.x)),
    xMax: Math.max(...points.map((p) => p.x)),
    yMin: Math.min(...points.map((p) => p.y)),
    yMax: Math.max(...points.map((p) => p.y)),
  }
}

export function expectBox(actual: Box, x: [number, number], y: [number, number], what = 'prostokąt'): void {
  expectNear(actual.xMin, x[0], PX_TOL, `${what} x min`)
  expectNear(actual.xMax, x[1], PX_TOL, `${what} x max`)
  expectNear(actual.yMin, y[0], PX_TOL, `${what} y min`)
  expectNear(actual.yMax, y[1], PX_TOL, `${what} y max`)
}

/** Środek górnej krawędzi ramki (między narożnikiem lewym górnym a prawym górnym). */
export function topEdgeMid(corners: readonly CutoutPoint[]): CutoutPoint {
  return { x: (corners[0].x + corners[1].x) / 2, y: (corners[0].y + corners[1].y) / 2 }
}

export function collectNumbers(value: unknown, out: number[] = []): number[] {
  if (typeof value === 'number') out.push(value)
  else if (Array.isArray(value)) value.forEach((item) => collectNumbers(item, out))
  else if (value !== null && typeof value === 'object') Object.values(value).forEach((item) => collectNumbers(item, out))
  return out
}

/** Liczba z wartości pola (przecinek albo kropka). */
export function fieldNumber(value: string | undefined): number {
  return Number((value ?? '').trim().replace(',', '.'))
}

// ---------- Uruchomienie aplikacji ----------

export const STORAGE_KEY = 'astrophotography-planner-ui'

/** localStorage w pamięci (metody Storage), z zawartością początkową. */
export class MemoryStorage {
  private readonly items = new Map<string, string>()

  constructor(initial: Record<string, string> = {}) {
    for (const [key, value] of Object.entries(initial)) this.items.set(key, value)
  }

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

/** Zapis preferencji tak, jak zapisuje je aplikacja (wersja 1). */
export function savedPreferences(objectUid: string | null, tab: string): MemoryStorage {
  const state = { activeLocationId: DEFAULT_LOCATION_ID, activeProfileId: MY_SET_ID, redMode: false, tab, objectUid }
  return new MemoryStorage({ [STORAGE_KEY]: JSON.stringify({ state, version: 1 }) })
}

/** Zapamiętany wpis preferencji: stan i wersja. */
export function savedEntry(storage: MemoryStorage): { state: Record<string, unknown>; version: unknown } {
  const raw = storage.getItem(STORAGE_KEY)
  if (raw === null) return { state: {}, version: null }
  return JSON.parse(raw) as { state: Record<string, unknown>; version: unknown }
}

/** Wynik haka `useFeaturedObjects`. */
export type FeaturedHookResult = ReturnType<typeof useFeaturedObjects>

export function readyHook(objects: readonly DsoObject[] = KLASYKI, catalog: readonly DsoObject[] = CATALOG): FeaturedHookResult {
  return { featured: { status: 'ready', objects: [...objects], catalog: [...catalog] }, retry: () => undefined }
}

/**
 * Uruchomienie aplikacji z danym localStorage: świeże moduły stanu, zakładek, nawigacji i aplikacji
 * (atrapy z `vi.mock` w pliku testu obowiązują także dla nich). Lokalizacje oznaczone jako wczytane.
 */
export async function startApp(storage: MemoryStorage = new MemoryStorage()) {
  vi.stubGlobal('localStorage', storage)
  vi.resetModules()
  const { usePlannerStore } = await import('../../../src/state/plannerStore')
  const { FramingTab } = await import('../../../src/features/framing/FramingTab')
  const { FramingView } = await import('../../../src/features/framing/FramingView')
  const { NightTab } = await import('../../../src/features/night/NightTab')
  const { NavBar } = await import('../../../src/app/NavBar')
  const { default: App } = await import('../../../src/App')
  usePlannerStore.setState({ locationsReady: true })
  // renderToStaticMarkup czyta stan Zustand przez getServerSnapshot, czyli getInitialState(); kopiujemy tam bieżący stan.
  const sync = () => {
    Object.assign(usePlannerStore.getInitialState(), usePlannerStore.getState())
  }
  return {
    store: usePlannerStore,
    render(element: ReactElement): string {
      sync()
      return renderToStaticMarkup(element)
    },
    capture(element: ReactElement, match: (host: Host) => boolean): Probed {
      sync()
      return probe(element, match)
    },
    framingTab: () => createElement(FramingTab),
    nightTab: () => createElement(NightTab),
    navBar: () => createElement(NavBar),
    app: () => createElement(App),
    FramingView,
  }
}

export type App = Awaited<ReturnType<typeof startApp>>

// ---------- Sonda: właściwości elementów HTML w trakcie renderu ----------

export type HostProps = Record<string, unknown>

export interface Host {
  tag: string
  props: HostProps
}

export interface Probed {
  markup: string
  props: HostProps | null
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

/** Render z sondą: właściwości pierwszego elementu HTML, dla którego `match` jest prawdą. */
export function probe(element: ReactElement, match: (host: Host) => boolean): Probed {
  const found: { props: HostProps | null } = { props: null }
  const sonda = () => {
    for (const host of hosts(element)) {
      if (match(host)) {
        found.props = host.props
        break
      }
    }
    return element
  }
  const markup = renderToStaticMarkup(createElement(sonda))
  return { markup, props: found.props }
}

export function buttonWithText(text: string): (host: Host) => boolean {
  return (host) => host.tag === 'button' && hostText(host.props.children) === text
}

const CATALOG_UIDS: ReadonlySet<string> = new Set(CATALOG.map((object) => object.uid))

/** Pole wyboru obiektu: <select>, którego wszystkie opcje mają za wartość uid obiektu katalogu. */
export function isObjectSelect(host: Host): boolean {
  if (host.tag !== 'select') return false
  const values = [...hosts(host.props.children)].filter((child) => child.tag === 'option').map((option) => option.props.value)
  return values.length > 0 && values.every((value) => typeof value === 'string' && CATALOG_UIDS.has(value))
}

/** Suwak PA: <input type="range">. */
export function isRange(host: Host): boolean {
  return host.tag === 'input' && host.props.type === 'range'
}

/** <select> z opcjami 1…5 (kolumny albo wiersze mozaiki); `index` 0 = pierwszy taki w dokumencie. */
export function mosaicSelect(index: number): (host: Host) => boolean {
  let seen = -1
  return (host) => {
    if (host.tag !== 'select') return false
    const values = [...hosts(host.props.children)].filter((child) => child.tag === 'option').map((option) => String(option.props.value))
    if (values.join(',') !== '1,2,3,4,5') return false
    seen += 1
    return seen === index
  }
}

export function click(props: HostProps | null): void {
  const onClick = props?.onClick
  if (typeof onClick !== 'function') throw new Error('Element nie ma obsługi kliknięcia (onClick)')
  ;(onClick as (event: unknown) => void)(fakeEvent({}))
}

/** Zmiana wartości pola (<select>, <input>): `onChange` z atrapą zdarzenia (target i currentTarget mają `value`). */
export function choose(props: HostProps | null, value: string): void {
  const onChange = props?.onChange
  if (typeof onChange !== 'function') throw new Error('Pole nie ma obsługi zmiany (onChange)')
  ;(onChange as (event: unknown) => void)(fakeEvent({ value, valueAsNumber: Number(value) }))
}

function fakeEvent(target: Record<string, unknown>) {
  return {
    target,
    currentTarget: target,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
    nativeEvent: {},
  }
}

// ---------- Prosty parser znaczników z renderToStaticMarkup ----------

export interface MarkupElement {
  tag: string
  attrs: Record<string, string>
  children: (MarkupElement | string)[]
  parent: MarkupElement | null
}

const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'])
const TAG = /<!--[\s\S]*?-->|<\/([a-zA-Z][\w:-]*)\s*>|<([a-zA-Z][\w:-]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)*)\s*(\/?)>/g
const ATTRIBUTE = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g

function decode(text: string): string {
  return text
    .replace(/&nbsp;|&#160;/g, '\u00a0')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

function parseAttributes(text: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  for (const match of text.matchAll(ATTRIBUTE)) attrs[match[1].toLowerCase()] = decode(match[2] ?? match[3] ?? match[4] ?? '')
  return attrs
}

/** Drzewo elementów ze znaczników (React zamyka każdy element, a puste zapisuje jako „<x …/>”). */
export function parseMarkup(markup: string): MarkupElement {
  const root: MarkupElement = { tag: '#root', attrs: {}, children: [], parent: null }
  let current = root
  let last = 0
  for (const match of markup.matchAll(TAG)) {
    const text = markup.slice(last, match.index)
    if (text) current.children.push(decode(text))
    last = match.index + match[0].length
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
    if (!VOID_TAGS.has(element.tag) && match[4] !== '/') current = element
  }
  const rest = markup.slice(last)
  if (rest) current.children.push(decode(rest))
  return root
}

export function elementsOf(root: MarkupElement): MarkupElement[] {
  const found: MarkupElement[] = []
  const walk = (element: MarkupElement) => {
    for (const child of element.children) {
      if (typeof child === 'string') continue
      found.push(child)
      walk(child)
    }
  }
  walk(root)
  return found
}

export function textOf(element: MarkupElement, skip: MarkupElement | null = null): string {
  const parts: string[] = []
  const walk = (node: MarkupElement) => {
    for (const child of node.children) {
      if (typeof child === 'string') parts.push(child)
      else if (child !== skip) walk(child)
    }
  }
  walk(element)
  return parts.join(' ').replace(/[\u00a0\u202f\u2007]/g, ' ').replace(/\s+/g, ' ').trim()
}

export function visibleText(markup: string): string {
  return decode(markup.replace(/<!--.*?-->/g, '').replace(/<[^>]*>/g, ' '))
    .replace(/[\u00a0\u202f\u2007]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function closest(element: MarkupElement, tag: string): MarkupElement | null {
  let node = element.parent
  while (node && node.tag !== tag) node = node.parent
  return node
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

/** Etykieta pola: aria-label, aria-labelledby, otaczający <label> (bez tekstu samego pola) albo <label for=…>. */
export function fieldLabel(root: MarkupElement, field: MarkupElement): string {
  if (field.attrs['aria-label']) return field.attrs['aria-label'].trim()
  const all = elementsOf(root)
  const labelledBy = field.attrs['aria-labelledby']
  if (labelledBy) {
    return labelledBy
      .split(/\s+/)
      .map((id) => all.find((element) => element.attrs.id === id))
      .map((element) => (element ? textOf(element) : ''))
      .join(' ')
      .trim()
  }
  const wrapping = closest(field, 'label')
  if (wrapping) return textOf(wrapping, field)
  const id = field.attrs.id
  const labelFor = id ? all.find((element) => element.tag === 'label' && element.attrs.for === id) : undefined
  return labelFor ? textOf(labelFor) : ''
}

/** Pole wyboru obiektu w znacznikach: wartości (uid), etykiety opcji i zaznaczone etykiety. */
export function objectSelect(markup: string): { values: string[]; labels: string[]; selected: string[] } {
  const root = parseMarkup(markup)
  const optionsOf = (select: MarkupElement) => elementsOf(select).filter((element) => element.tag === 'option')
  const selects = elementsOf(root).filter((element) => {
    if (element.tag !== 'select') return false
    const options = optionsOf(element)
    return options.length > 0 && options.every((option) => CATALOG_UIDS.has(option.attrs.value ?? ''))
  })
  if (selects.length !== 1) throw new Error(`Oczekiwano jednego pola wyboru obiektu, jest ${selects.length}`)
  const options = optionsOf(selects[0])
  return {
    values: options.map((option) => option.attrs.value ?? ''),
    labels: options.map((option) => textOf(option)),
    selected: options.filter((option) => 'selected' in option.attrs).map((option) => textOf(option)),
  }
}

// ---------- Pola zakładki Kadr w znacznikach ----------

export interface TabFields {
  /** Suwak PA (atrybuty). */
  range: Record<string, string>
  /** Pole tekstowe PA (atrybuty). */
  paField: Record<string, string>
  /** Zaznaczona wartość listy kolumn i wierszy. */
  cols: string
  rows: string
  /** Wartości opcji list kolumn i wierszy. */
  colsOptions: string[]
  rowsOptions: string[]
  /** Pole zakładki mozaiki (atrybuty). */
  overlapField: Record<string, string>
}

function selectedValue(select: MarkupElement): string {
  const options = elementsOf(select).filter((element) => element.tag === 'option')
  const chosen = options.find((option) => 'selected' in option.attrs) ?? (select.attrs.value ? undefined : options[0])
  return chosen?.attrs.value ?? select.attrs.value ?? ''
}

/** Pola PA i mozaiki zakładki Kadr (po etykietach: „PA”, „Kolumny”, „Wiersze”, „Zakładka”). */
export function tabFields(markup: string): TabFields {
  const root = parseMarkup(markup)
  const all = elementsOf(root)
  const labelled = (element: MarkupElement, pattern: RegExp) => pattern.test(fieldLabel(root, element))
  const ranges = all.filter((element) => element.tag === 'input' && element.attrs.type === 'range')
  expect(ranges, 'jeden suwak (input type="range")').toHaveLength(1)
  const textInputs = all.filter(
    (element) => element.tag === 'input' && !['range', 'hidden', 'checkbox', 'radio', 'button', 'submit'].includes(element.attrs.type ?? 'text'),
  )
  const paFields = textInputs.filter((element) => labelled(element, /\bPA\b/))
  expect(paFields, 'jedno pole tekstowe z etykietą „PA”').toHaveLength(1)
  const overlapFields = textInputs.filter((element) => labelled(element, /zakładka/i))
  expect(overlapFields, 'jedno pole tekstowe z etykietą „Zakładka”').toHaveLength(1)
  const selects = all.filter((element) => element.tag === 'select')
  const colsSelect = selects.filter((element) => labelled(element, /kolumn/i))
  const rowsSelect = selects.filter((element) => labelled(element, /wiersz/i))
  expect(colsSelect, 'jedna lista z etykietą „Kolumny”').toHaveLength(1)
  expect(rowsSelect, 'jedna lista z etykietą „Wiersze”').toHaveLength(1)
  const optionValues = (select: MarkupElement) =>
    elementsOf(select)
      .filter((element) => element.tag === 'option')
      .map((option) => option.attrs.value ?? textOf(option))
  return {
    range: ranges[0].attrs,
    paField: paFields[0].attrs,
    cols: selectedValue(colsSelect[0]),
    rows: selectedValue(rowsSelect[0]),
    colsOptions: optionValues(colsSelect[0]),
    rowsOptions: optionValues(rowsSelect[0]),
    overlapField: overlapFields[0].attrs,
  }
}

// ---------- Rysunek SVG ----------

/** Jedyny <svg viewBox="0 0 1000 1000"> w znacznikach. */
export function viewSvg(root: MarkupElement): MarkupElement {
  const svgs = elementsOf(root).filter(
    (element) => element.tag === 'svg' && (element.attrs.viewbox ?? '').trim().split(/[\s,]+/).join(' ') === '0 0 1000 1000',
  )
  if (svgs.length !== 1) throw new Error(`Oczekiwano jednego <svg viewBox="0 0 1000 1000">, jest ${svgs.length}`)
  return svgs[0]
}

const SHAPE_TAGS = new Set(['polygon', 'polyline', 'path', 'ellipse', 'circle'])

/** Punkty kształtu z `points` (polygon, polyline) albo `d` (path z M, L, Z bezwzględnymi). */
export function shapePoints(element: MarkupElement): CutoutPoint[] {
  const transformed = [element, ...ancestors(element)].find((node) => node.tag !== 'svg' && node.attrs.transform)
  if (transformed) {
    throw new Error(`Kształt <${element.tag}> ma atrybut transform (u siebie albo u przodka <${transformed.tag}>); punkty mają być w jednostkach widoku`)
  }
  let text: string
  if (element.tag === 'polygon' || element.tag === 'polyline') text = element.attrs.points ?? ''
  else if (element.tag === 'path') {
    const d = element.attrs.d ?? ''
    if (/[^MLZmlz\d\s,.eE+-]/.test(d) || /[mlz]/.test(d.replace(/e/gi, ''))) {
      throw new Error(`Ścieżka używa poleceń innych niż bezwzględne M, L, Z: ${d.slice(0, 60)}`)
    }
    text = d.replace(/[MLZ]/g, ' ')
  } else throw new Error(`Kształt <${element.tag}> nie ma listy punktów`)
  const numbers = (text.match(/[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g) ?? []).map(Number)
  if (numbers.length % 2 !== 0) throw new Error(`Nieparzysta liczba współrzędnych: ${text.slice(0, 60)}`)
  const points: CutoutPoint[] = []
  for (let i = 0; i < numbers.length; i += 2) points.push({ x: numbers[i], y: numbers[i + 1] })
  // Ścieżka zamknięta powtórzonym pierwszym punktem: pomijamy powtórzenie.
  if (points.length > 4 && element.tag === 'path') {
    const [first, lastPoint] = [points[0], points[points.length - 1]]
    if (Math.abs(first.x - lastPoint.x) < 1e-9 && Math.abs(first.y - lastPoint.y) < 1e-9) points.pop()
  }
  return points
}

export function shapesIn(element: MarkupElement): MarkupElement[] {
  return [element, ...elementsOf(element)].filter((node) => SHAPE_TAGS.has(node.tag))
}

/** Panele `<g data-panel="N">` w kolejności dokumentu: numer, narożniki (pierwszy wielokąt) i teksty w grupie. */
export function panels(svg: MarkupElement): { number: string; corners: CutoutPoint[]; texts: string[] }[] {
  return elementsOf(svg)
    .filter((element) => element.tag === 'g' && element.attrs['data-panel'] !== undefined)
    .map((group) => {
      const shapes = shapesIn(group).filter((shape) => shape.attrs['data-role'] !== 'oag')
      if (shapes.length === 0) throw new Error(`Panel ${group.attrs['data-panel']} nie ma wielokąta`)
      return {
        number: group.attrs['data-panel'],
        corners: shapePoints(shapes[0]),
        texts: elementsOf(group)
          .filter((element) => element.tag === 'text')
          .map((element) => textOf(element)),
      }
    })
}

/** Prostokąty pryzmatów OAG (`data-role="oag"`). */
export function oagShapes(svg: MarkupElement): CutoutPoint[][] {
  return elementsOf(svg)
    .filter((element) => element.attrs['data-role'] === 'oag')
    .flatMap((element) => shapesIn(element))
    .map(shapePoints)
}

export interface MapGroup {
  element: MarkupElement
  uid: string
  shapes: MarkupElement[]
  texts: string[]
}

export function mapGroups(svg: MarkupElement): MapGroup[] {
  return elementsOf(svg)
    .filter((element) => element.tag === 'g' && element.attrs['data-map-uid'] !== undefined)
    .map((group) => ({
      element: group,
      uid: group.attrs['data-map-uid'],
      shapes: shapesIn(group).filter((shape) => shape !== group),
      texts: elementsOf(group)
        .filter((element) => element.tag === 'text')
        .map((element) => textOf(element)),
    }))
}

/** Kształt rysowany linią przerywaną: `stroke-dasharray` (≠ „none”) na kształcie albo na przodku do grupy mapy włącznie. */
export function isDashed(shape: MarkupElement, group: MarkupElement): boolean {
  const chain: MarkupElement[] = [shape]
  let node = shape.parent
  while (node && node !== group) {
    chain.push(node)
    node = node.parent
  }
  chain.push(group)
  return chain.some((element) => {
    const value = (element.attrs['stroke-dasharray'] ?? '').trim()
    return value !== '' && value !== 'none'
  })
}

/** Widok kadru z tekstu znaczników: svg, panele, pryzmaty i mapa. */
export function drawing(markup: string) {
  const root = parseMarkup(markup)
  const svg = viewSvg(root)
  return { root, svg, panels: panels(svg), oag: oagShapes(svg), map: mapGroups(svg) }
}

/** Wszystkie liczby kadru w stanie (bez NaN i ±∞). */
export function expectFinite(value: unknown): void {
  const bad = collectNumbers(value).filter((n) => !Number.isFinite(n))
  expect(bad, 'NaN albo ±∞ w wyniku').toEqual([])
}
