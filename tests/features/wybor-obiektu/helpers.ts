// Wspólne dane testów funkcji „wybor-obiektu”.
// Testy działają w Node bez DOM (renderToStaticMarkup). „Kliknięcie” i wybór z listy: sonda (`probe`) w trakcie renderu
// rozwija drzewo elementów, znajduje element HTML (np. <button>) i oddaje jego właściwości, a test wywołuje `onClick`.
import { readFileSync } from 'node:fs'
import { createElement, isValidElement, type ElementType, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { vi } from 'vitest'
import { DEMO_LOCATION, DEMO_PROFILES } from '../../../src/data/demo'
import { featuredObjects } from '../../../src/data/featuredObjects'
import { DEFAULT_LOCATIONS, DEFAULT_LOCATION_ID } from '../../../src/data/locations'
import { objectCardModel, type CardContext, type ObjectCardModel } from '../../../src/features/catalog/objectCardModel'
import type { useFeaturedObjects } from '../../../src/features/night/useFeaturedObjects'
import { bodyPosition } from '../../../src/services/astroMath'
import { designationKey, formatDesignation } from '../../../src/services/catalog/records'
import {
  prepareCatalogNight,
  summarizeObject,
  type CatalogNightParams,
  type ObjectNightSummary,
} from '../../../src/services/catalogNight'
import { DEFAULT_PLANNING_SETTINGS } from '../../../src/services/planningSettings'
import type { PlannerStore, Tab, usePlannerStore } from '../../../src/state/plannerStore'
import { at } from '../../../src/test/fixtures'
import type { Designation, DsoObject, EquipmentProfile } from '../../../src/types'

// ---------- Katalog ----------

/** Katalog aplikacji (public/catalog, 16 516 obiektów). */
export const CATALOG = JSON.parse(
  readFileSync(new URL('../../../public/catalog/catalog.v1.json', import.meta.url), 'utf8'),
) as DsoObject[]

const byDesignation = new Map(
  CATALOG.flatMap((object) => object.designations.map((designation) => [designationKey(designation), object] as const)),
)

/** Obiekt katalogu aplikacji po dowolnym oznaczeniu, np. catalogObject('M', '13'). */
export function catalogObject(catalog: Designation['catalog'], id: string): DsoObject {
  const object = byDesignation.get(designationKey({ catalog, id }))
  if (!object) throw new Error(`Brak obiektu ${formatDesignation({ catalog, id })} w katalogu`)
  return object
}

/** Lista „Klasyki” (26 obiektów) w kolejności z featured.json. */
export const KLASYKI: readonly DsoObject[] = featuredObjects(CATALOG)

/** M 13 (NGC6205, „Hercules Globular Cluster”): w katalogu, poza „Klasyki”. */
export const M13 = catalogObject('M', '13')
/** M 57 (NGC6720, „Ring Nebula”): w katalogu, poza „Klasyki”. */
export const M57 = catalogObject('M', '57')
/** M 31 (NGC224): z „Klasyki”, obiekt domyślny. */
export const M31 = catalogObject('M', '31')
/** M 42 (NGC1976, „Great Orion Nebula”): z „Klasyki”. */
export const M42 = catalogObject('M', '42')
/** M 45: z „Klasyki”. */
export const M45 = catalogObject('M', '45')

/** uid wszystkich obiektów katalogu. */
export const CATALOG_UIDS: ReadonlySet<string> = new Set(CATALOG.map((object) => object.uid))

export function uids(objects: readonly DsoObject[]): string[] {
  return objects.map((object) => object.uid)
}

/**
 * Nazwa obiektu w zakładce Noc jak w P2 („M 13 (Hercules Globular Cluster)”): oznaczenie główne i pierwsza nazwa
 * zwyczajowa w nawiasie; obiekt bez nazwy – samo oznaczenie (dotychczasowy zapis opcji listy „Klasyki”).
 */
export function nightName(object: DsoObject): string {
  const designation = formatDesignation(object.primary)
  return object.commonNames.length > 0 ? `${designation} (${object.commonNames[0]})` : designation
}

/** Wynik haka `useFeaturedObjects` w stanie „gotowe”: lista „Klasyki” i cały katalog (pole `catalog`). */
export type FeaturedHookResult = ReturnType<typeof useFeaturedObjects>

export function readyHook(objects: readonly DsoObject[] = KLASYKI, catalog: readonly DsoObject[] = CATALOG): FeaturedHookResult {
  return { featured: { status: 'ready', objects: [...objects], catalog: [...catalog] }, retry: () => undefined }
}

// ---------- Noc, lokalizacja, kursor ----------

export const OCT_16 = '2026-10-16'

/** Kursor 01:30 CEST 17.10.2026 (w nocy 16/17.10.2026). */
export const CURSOR_MS = at('2026-10-17 01:30', 'CEST')

/** Noc D, lokalizacja i kursor czasu (z trybem „Teraz”) – to, co otwarcie obiektu ma zostawić bez zmian (P1). */
export function nightPlaceCursor(state: PlannerStore) {
  const { nightDate, activeLocationId, cursorMs, followNow } = state
  return { nightDate, activeLocationId, cursorMs, followNow }
}

type Store = typeof usePlannerStore

/**
 * Stan przed kliknięciem karty: lokalizacje wczytane, aktywna lokalizacja demonstracyjna (nie domyślna), noc 16/17.10.2026,
 * kursor 01:30 CEST bez trybu „Teraz”, zakładka Katalog.
 */
export function prepareCatalogTab(store: Store): void {
  store.setState({ locations: [...DEFAULT_LOCATIONS], locationsReady: true })
  store.getState().selectLocation(DEMO_LOCATION.id)
  store.getState().setNightDate(OCT_16)
  store.getState().setCursor(CURSOR_MS)
  store.getState().setTab('catalog')
}

/** 52,0°N, 19,0°E, 150 m, horyzont płaski; noc 16/17.10.2026, parametry domyślne. */
const NIGHT_PARAMS: CatalogNightParams = {
  location: { latDeg: 52, lonDegEast: 19, elevationM: 150, timezone: 'Europe/Warsaw', horizon: [] },
  nightDate: OCT_16,
  settings: DEFAULT_PLANNING_SETTINGS,
}

const NIGHT = prepareCatalogNight(NIGHT_PARAMS)

/** Mój zestaw (profil demonstracyjny). */
export const MY_SET: EquipmentProfile = DEMO_PROFILES.find((profile) => profile.name === 'Mój zestaw') ?? DEMO_PROFILES[0]

/** Kontekst kart w nocy 16/17.10.2026 przy kursorze 01:30 CEST. */
export function cardContext(): CardContext {
  return {
    site: NIGHT.site,
    timeZone: 'Europe/Warsaw',
    precession: NIGHT.precession,
    profile: MY_SET,
    cursorMs: CURSOR_MS,
    moonAtCursor: bodyPosition('moon', NIGHT.site, CURSOR_MS),
  }
}

/** Wyniki nocy obiektów tak, jak liczy je Worker (`summarizeObject`). */
export function summaries(objects: readonly DsoObject[]): ObjectNightSummary[] {
  return objects.map((object) => summarizeObject(NIGHT, object))
}

/** Model karty obiektu w nocy 16/17.10.2026 (bez odznak filtrów). */
export function cardModel(object: DsoObject): ObjectCardModel {
  return objectCardModel(object, summarizeObject(NIGHT, object), [], cardContext())
}

/** Pierwszy ekran listy: 1024 × 800 px. */
export const SCREEN = { width: 1024, height: 800 }

// ---------- Uruchomienie aplikacji ----------

/** Klucz zapisu preferencji interfejsu w localStorage. */
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

/** Zapis preferencji tak, jak zapisuje je aplikacja (wersja 1): zapamiętany obiekt i zakładka. */
export function savedPreferences(objectUid: string | null, tab: Tab = 'night'): MemoryStorage {
  const state = { activeLocationId: DEFAULT_LOCATION_ID, activeProfileId: 'demo-moj-zestaw', redMode: false, tab, objectUid }
  return new MemoryStorage({ [STORAGE_KEY]: JSON.stringify({ state, version: 1 }) })
}

/** Zapamiętane preferencje (stan z localStorage). */
export function savedState(storage: MemoryStorage): Record<string, unknown> {
  const raw = storage.getItem(STORAGE_KEY)
  if (raw === null) return {}
  return (JSON.parse(raw) as { state: Record<string, unknown> }).state
}

/**
 * Uruchomienie aplikacji z danym localStorage: świeże moduły stanu, zakładki Noc, listy katalogu i aplikacji
 * (atrapy z `vi.mock` w pliku testu obowiązują także dla nich).
 */
export async function startApp(storage: MemoryStorage = new MemoryStorage()) {
  vi.stubGlobal('localStorage', storage)
  vi.resetModules()
  const { usePlannerStore } = await import('../../../src/state/plannerStore')
  const { NightTab } = await import('../../../src/features/night/NightTab')
  const { CatalogList } = await import('../../../src/features/catalog/CatalogList')
  const { NavBar } = await import('../../../src/app/NavBar')
  const { default: App } = await import('../../../src/App')
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
    nightTab: () => createElement(NightTab),
    app: () => createElement(App),
    navBar: () => createElement(NavBar),
    CatalogList,
  }
}

// ---------- Sonda: właściwości elementów HTML w trakcie renderu ----------

export type HostProps = Record<string, unknown>

/** Element HTML drzewa React (np. 'button') z właściwościami (np. `onClick`). */
export interface Host {
  tag: string
  props: HostProps
}

export interface Probed {
  markup: string
  /** Właściwości pierwszego elementu, dla którego `match` jest prawdą; null, gdy takiego nie ma. */
  props: HostProps | null
}

const FORWARD_REF = Symbol.for('react.forward_ref')
const MEMO = Symbol.for('react.memo')

type Render = (props: HostProps, ref: null) => unknown

/**
 * Jeden krok rozwinięcia elementu: dzieci elementu HTML albo to, co zwraca komponent (funkcyjny, forwardRef, memo);
 * Fragment, kontekst i Suspense – ich dzieci.
 */
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

/** Elementy HTML węzła w kolejności dokumentu, po rozwinięciu komponentów (leniwie, do pierwszego trafienia). */
function* hosts(node: unknown): Generator<Host> {
  if (Array.isArray(node)) {
    for (const child of node) yield* hosts(child)
    return
  }
  if (!isValidElement(node)) return
  if (typeof node.type === 'string') yield { tag: node.type, props: node.props as HostProps }
  yield* hosts(expand(node))
}

/** Tekst węzła po rozwinięciu komponentów, spacje scalone. */
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

/**
 * Render elementu (renderToStaticMarkup) z sondą: w trakcie renderu sonda rozwija drzewo elementu (wywołuje komponenty
 * funkcyjne, więc ich hooki należą do sondy) i oddaje właściwości pierwszego elementu HTML, dla którego `match` jest
 * prawdą – np. `onClick` przycisku albo `onChange` pola wyboru.
 */
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

/** Przycisk o tekście `text` (po rozwinięciu komponentów, np. ikon). */
export function buttonWithText(text: string): (host: Host) => boolean {
  return (host) => host.tag === 'button' && hostText(host.props.children) === text
}

/** Pole wyboru obiektu: <select>, którego wszystkie opcje mają za wartość uid obiektu katalogu. */
export function isObjectSelect(host: Host): boolean {
  if (host.tag !== 'select') return false
  const values = [...hosts(host.props.children)].filter((child) => child.tag === 'option').map((option) => option.props.value)
  return values.length > 0 && values.every((value) => typeof value === 'string' && CATALOG_UIDS.has(value))
}

/** Kliknięcie: `onClick` elementu z atrapą zdarzenia. */
export function click(props: HostProps | null): void {
  const onClick = props?.onClick
  if (typeof onClick !== 'function') throw new Error('Element nie ma obsługi kliknięcia (onClick)')
  ;(onClick as (event: unknown) => void)(fakeEvent({}))
}

/** Wybór wartości w polu <select>: `onChange` z atrapą zdarzenia (target i currentTarget mają `value`). */
export function choose(props: HostProps | null, value: string): void {
  const onChange = props?.onChange
  if (typeof onChange !== 'function') throw new Error('Pole wyboru nie ma obsługi zmiany (onChange)')
  ;(onChange as (event: unknown) => void)(fakeEvent({ value }))
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

/** Drzewo elementów ze znaczników (React zamyka każdy element, a elementy puste zapisuje jako „<input …/>”). */
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

/** Wszystkie elementy poddrzewa (bez korzenia), w kolejności dokumentu. */
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

/** Tekst elementu: tekst wszystkich potomków (bez poddrzewa `skip`), spacje scalone. */
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

export function classesOf(element: MarkupElement): string[] {
  return (element.attrs.class ?? '').split(/\s+/).filter(Boolean)
}

/** Tekst widoczny w znacznikach: bez tagów, z rozkodowanymi encjami, spacje scalone. */
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

/** Pole wyboru obiektu w znacznikach: wartości (uid) i etykiety opcji w kolejności, zaznaczone opcje, etykieta pola. */
export interface ObjectSelect {
  values: string[]
  labels: string[]
  selected: string[]
  label: string
}

/** Jedyne pole <select>, którego opcje to obiekty katalogu (wartość opcji = uid). */
export function objectSelect(markup: string): ObjectSelect {
  const root = parseMarkup(markup)
  const optionsOf = (select: MarkupElement) => elementsOf(select).filter((element) => element.tag === 'option')
  const selects = elementsOf(root).filter((element) => {
    if (element.tag !== 'select') return false
    const options = optionsOf(element)
    return options.length > 0 && options.every((option) => CATALOG_UIDS.has(option.attrs.value ?? ''))
  })
  if (selects.length !== 1) throw new Error(`Oczekiwano jednego pola wyboru obiektu, jest ${selects.length}`)
  const [select] = selects
  const options = optionsOf(select)
  return {
    values: options.map((option) => option.attrs.value ?? ''),
    labels: options.map((option) => textOf(option)),
    selected: options.filter((option) => 'selected' in option.attrs).map((option) => textOf(option)),
    label: fieldLabel(root, select),
  }
}

// ---------- Wysokość przycisku ----------

const STYLES = readFileSync(new URL('../../../src/index.css', import.meta.url), 'utf8')

/** min-height reguły `.klasa { … }` z src/index.css [px]; null, gdy reguły albo min-height nie ma. */
function cssMinHeightPx(className: string): number | null {
  if (!/^[a-z][a-z0-9-]*$/.test(className)) return null
  const rule = new RegExp(`\\.${className}\\s*\\{([^}]*)\\}`).exec(STYLES)
  const value = rule ? /min-height:\s*([\d.]+)(rem|px)/.exec(rule[1]) : null
  return value ? Number(value[1]) * (value[2] === 'rem' ? 16 : 1) : null
}

const toPx = (value: string, unit: string) => Number(value) * (unit === 'rem' ? 16 : 1)

/**
 * Najmniejsza wysokość elementu na najmniejszym ekranie [px], tak jak w kaskadzie CSS: min-height ze stylu, inaczej
 * z klas Tailwind bez wariantu (`min-h-11` = 44 px, `min-h-[44px]`; przy kilku – najmniejsza), które nadpisują regułę
 * klasy z src/index.css (np. `button`: 2,75rem = 44 px); do tego wysokość `h-*`, `size-*` albo `height` ze stylu.
 */
export function minHeightPx(element: MarkupElement): number {
  const utilityMin: number[] = []
  const heights: number[] = []
  const componentMin: number[] = []
  for (const className of classesOf(element)) {
    const scale = /^(min-h|h|size)-(\d+(?:\.\d+)?)$/.exec(className)
    const arbitrary = /^(min-h|h|size)-\[(\d+(?:\.\d+)?)(px|rem)\]$/.exec(className)
    const kind = scale?.[1] ?? arbitrary?.[1]
    const value = scale ? Number(scale[2]) * 4 : arbitrary ? toPx(arbitrary[2], arbitrary[3]) : null
    if (value !== null) (kind === 'min-h' ? utilityMin : heights).push(value)
    else {
      const css = cssMinHeightPx(className)
      if (css !== null) componentMin.push(css)
    }
  }
  const style = element.attrs.style ?? ''
  const styleMin = /(?:^|;)\s*min-height\s*:\s*([\d.]+)(px|rem)/.exec(style)
  const styleHeight = /(?:^|;)\s*height\s*:\s*([\d.]+)(px|rem)/.exec(style)
  if (styleHeight) heights.push(toPx(styleHeight[1], styleHeight[2]))
  const minHeight = styleMin
    ? toPx(styleMin[1], styleMin[2])
    : utilityMin.length > 0
      ? Math.min(...utilityMin)
      : Math.max(0, ...componentMin)
  return Math.max(minHeight, ...heights)
}
