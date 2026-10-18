// Wspólne dane testów funkcji „zakladka-katalog”.
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { DEMO_PROFILES } from '../../../src/data/demo'
import { featuredObjects } from '../../../src/data/featuredObjects'
import { CatalogList, type CatalogListProps } from '../../../src/features/catalog/CatalogList'
import { CatalogMessages } from '../../../src/features/catalog/CatalogMessages'
import { CatalogPanel, type CatalogPanelProps } from '../../../src/features/catalog/CatalogPanel'
import type {
  CatalogLoad,
  CatalogTabState,
  CatalogView,
  CatalogViewInput,
} from '../../../src/features/catalog/catalogTabModel'
import type { CardContext } from '../../../src/features/catalog/objectCardModel'
import { bodyPosition } from '../../../src/services/astroMath'
import { designationKey, formatDesignation } from '../../../src/services/catalog/records'
import type { CatalogFilterState } from '../../../src/services/catalogFilters'
import { prepareCatalogNight, type CatalogNightParams, type CatalogTarget } from '../../../src/services/catalogNight'
import { DEFAULT_PLANNING_SETTINGS } from '../../../src/services/planningSettings'
import { createCatalogEngine, type CatalogEngine } from '../../../src/workers/catalogEngine'
import type { CatalogWorkerPort } from '../../../src/workers/catalogClient'
import {
  buildCatalogRequest,
  type CatalogWorkerRequest,
  type CatalogWorkerResponse,
  type ResultResponse,
} from '../../../src/workers/catalogMessages'
import type { Designation, DsoObject, EquipmentProfile, ObserverLocation, PlanningSettings } from '../../../src/types'

// ---------- Katalog ----------

/** Katalog aplikacji (public/catalog, 16 516 obiektów). */
export const CATALOG = JSON.parse(
  readFileSync(new URL('../../../public/catalog/catalog.v1.json', import.meta.url), 'utf8'),
) as DsoObject[]

const byDesignation = new Map(
  CATALOG.flatMap((object) => object.designations.map((designation) => [designationKey(designation), object] as const)),
)

/** Obiekt katalogu aplikacji po dowolnym oznaczeniu, np. catalogObject('M', '31'). */
export function catalogObject(catalog: Designation['catalog'], id: string): DsoObject {
  const object = byDesignation.get(designationKey({ catalog, id }))
  if (!object) throw new Error(`Brak obiektu ${formatDesignation({ catalog, id })} w katalogu`)
  return object
}

/** Lista „Klasyki” (26 obiektów) w kolejności z featured.json. */
export const KLASYKI: readonly DsoObject[] = featuredObjects(CATALOG)

export const M31 = catalogObject('M', '31')
export const M42 = catalogObject('M', '42')
export const M45 = catalogObject('M', '45')
export const NGC7000 = catalogObject('NGC', '7000')
export const IC1396 = catalogObject('IC', '1396')

/** Pięć obiektów z T9: M 31, NGC 7000, IC 1396, M 42, M 45. */
export const T9_OBJECTS: readonly DsoObject[] = [M31, NGC7000, IC1396, M42, M45]

/** Skróty IAU gwiazdozbiorów obiektów katalogu (88). */
export const CONSTELLATIONS: ReadonlySet<string> = new Set(CATALOG.map((object) => object.constellation))

/** Oznaczenia główne w zapisie aplikacji („M 31”, „NGC 7000”), w kolejności listy. */
export function names(objects: readonly DsoObject[]): string[] {
  return objects.map((object) => formatDesignation(object.primary))
}

/** Tylko uid i współrzędne J2000 – tyle dostaje Worker. */
export function targetsOf(objects: readonly DsoObject[]): CatalogTarget[] {
  return objects.map(({ uid, raDeg, decDeg }) => ({ uid, raDeg, decDeg }))
}

// ---------- Lokalizacje, noce, parametry, zestawy ----------

export const OCT_15 = '2026-10-15'
export const OCT_16 = '2026-10-16'
export const OCT_17 = '2026-10-17'
export const OCT_24 = '2026-10-24'
export const OCT_31 = '2026-10-31'
export const JUN_21 = '2026-06-21'

/** 52,0°N, 19,0°E, 150 m, Europe/Warsaw, horyzont płaski. */
export const FLAT: ObserverLocation = {
  id: 'polska-centralna-plaski',
  name: 'Polska centralna (horyzont płaski)',
  latDeg: 52,
  lonDegEast: 19,
  elevationM: 150,
  timezone: 'Europe/Warsaw',
  horizon: [],
  bortle: null,
  sqm: null,
}

/** Ta sama lokalizacja na 54,83°N (P6). */
export const NORTH: ObserverLocation = { ...FLAT, id: 'polnoc-54-83', name: 'Północ (54,83°N)', latDeg: 54.83 }

/** Parametry z przykładów: próg −18° z obniżaniem, h_min 30°, minimum 3 h, krok katalogu 5 min. */
export const SETTINGS: PlanningSettings = {
  ...DEFAULT_PLANNING_SETTINGS,
  darknessThresholdDeg: -18,
  autoLowerThreshold: true,
  minAltitudeDeg: 30,
  minEffectiveHours: 3,
  catalogStepMin: 5,
}

export function settingsWith(patch: Partial<PlanningSettings>): PlanningSettings {
  return { ...SETTINGS, ...patch }
}

function profileNamed(name: string): EquipmentProfile {
  const profile = DEMO_PROFILES.find((candidate) => candidate.name === name)
  if (!profile) throw new Error(`Brak profilu ${name}`)
  return profile
}

/** Mój zestaw: Newton 150/600 + Ares-M Pro (kadr 1,080° × 1,080°), GEM, filtry L, R, G, B, Ha, OIII, SII. */
export const MY_SET = profileNamed('Mój zestaw')
/** RedCat 51 + ASI2600MC Pro: filtry OSC i DualBand. */
export const REDCAT = profileNamed('RedCat 51 + ASI2600MC Pro')

/** Żaden filtr nie jest włączony, „pokaż obiekty bez jasności” zaznaczone (zapisane wprost). */
export const NO_FILTERS: CatalogFilterState = {
  catalogs: [],
  types: [],
  constellation: null,
  magnitude: null,
  showWithoutMagnitude: true,
  size: null,
  visibleTonight: false,
  fitsFrame: false,
}

export function filtersWith(patch: Partial<CatalogFilterState>): CatalogFilterState {
  return { ...NO_FILTERS, ...patch }
}

// ---------- Odpowiedzi Workera ----------

const engines = new Map<readonly DsoObject[], CatalogEngine>()
let nextRequestId = 0

/**
 * Odpowiedź „wynik” prawdziwego silnika Workera na żądanie o noc `nightDate` w lokalizacji `location`
 * (żądanie z `buildCatalogRequest`), dla obiektów `objects`; kopia jak po `postMessage`.
 */
export function workerResult(
  location: ObserverLocation,
  nightDate: string,
  objects: readonly DsoObject[] = T9_OBJECTS,
  settings: PlanningSettings = SETTINGS,
): ResultResponse {
  let engine = engines.get(objects)
  if (!engine) {
    engine = createCatalogEngine()
    engine.handle({ type: 'catalog', objects: targetsOf(objects) })
    engines.set(objects, engine)
  }
  const params = buildCatalogRequest({ location, nightDate, settings })
  const response = structuredClone(engine.handle({ type: 'compute', requestId: ++nextRequestId, params }))
  if (response.type !== 'result') throw new Error(`Oczekiwano „wynik”, jest ${JSON.stringify(response).slice(0, 200)}`)
  return response
}

/** Podsumowanie obiektu z odpowiedzi Workera. */
export function summaryIn(response: ResultResponse, object: DsoObject) {
  const summary = response.objects.find((item) => item.uid === object.uid)
  if (!summary) throw new Error(`Brak wyniku ${object.uid}`)
  return summary
}

// ---------- Model widoku ----------

export function ready(objects: readonly DsoObject[]): CatalogLoad {
  return { status: 'ready', objects }
}

/**
 * Dane modelu widoku; domyślnie: cały katalog wczytany, bez filtrów, sortowanie „czas efektywny”, noc 16/17.10.2026,
 * parametry z przykładów, Mój zestaw, Worker jeszcze nie odpowiedział.
 */
export function viewInput(patch: Partial<CatalogViewInput> = {}): CatalogViewInput {
  return {
    catalog: ready(CATALOG),
    filters: NO_FILTERS,
    sort: 'effectiveTime',
    nightDate: OCT_16,
    settings: SETTINGS,
    profile: MY_SET,
    tonight: null,
    reference: null,
    ...patch,
  }
}

/** Stan aplikacji do żądań; domyślnie 52,0°N płaski, noc 16/17.10.2026, parametry z przykładów, Mój zestaw, bez filtrów. */
export function tabState(patch: Partial<CatalogTabState> = {}): CatalogTabState {
  return {
    location: FLAT,
    nightDate: OCT_16,
    settings: SETTINGS,
    profile: MY_SET,
    filters: NO_FILTERS,
    sort: 'effectiveTime',
    ...patch,
  }
}

/** Żądanie „licz” o noc `nightDate` z lokalizacji i parametrów stanu (funkcja z `obliczenia-w-tle`). */
export function requestFor(state: CatalogTabState, nightDate: string = state.nightDate): CatalogNightParams {
  return buildCatalogRequest({ location: state.location, nightDate, settings: state.settings })
}

/** Liczba wyników bez rozróżniania rodzaju odstępu (pl-PL używa spacji nierozdzielającej): „16 516 z 16 516 obiektów”. */
export function spaces(text: string | null): string | null {
  return text === null ? null : text.replace(/[\u00a0\u202f\u2007]/g, ' ')
}

// ---------- Karty ----------

/** Kontekst kart dla nocy żądania `params`: miejsce, macierz precesji nocy, kursor i Księżyc w kursorze. */
export function cardContext(params: CatalogNightParams, cursorMs: number, profile: EquipmentProfile = MY_SET): CardContext {
  const night = prepareCatalogNight(params)
  return {
    site: night.site,
    timeZone: params.location.timezone,
    precession: night.precession,
    profile,
    cursorMs,
    moonAtCursor: bodyPosition('moon', night.site, cursorMs),
  }
}

// ---------- Render ----------

/** Pierwszy ekran listy: 1024 × 800 px. */
export const SCREEN = { width: 1024, height: 800 }

export function renderList(props: CatalogListProps): string {
  return renderToStaticMarkup(createElement(CatalogList, props))
}

export function renderPanel(patch: Partial<CatalogPanelProps> = {}): string {
  const props: CatalogPanelProps = {
    catalog: CATALOG,
    filters: NO_FILTERS,
    sort: 'effectiveTime',
    onFiltersChange: () => undefined,
    onSortChange: () => undefined,
    ...patch,
  }
  return renderToStaticMarkup(createElement(CatalogPanel, props))
}

export function renderMessages(view: CatalogView): string {
  return renderToStaticMarkup(createElement(CatalogMessages, { view, onRetry: () => undefined }))
}

/** Tekst widoczny w znacznikach: bez tagów, z rozkodowanymi encjami, spacje scalone, bez spacji przed „,” „.” „)”. */
export function visibleText(markup: string): string {
  return decode(markup.replace(/<!--.*?-->/g, '').replace(/<[^>]*>/g, ' '))
    .replace(/[\u00a0\u202f\u2007]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;)])/g, '$1')
    .replace(/\(\s+/g, '(')
    .trim()
}

function decode(text: string): string {
  return text
    .replace(/&nbsp;|&#160;/g, '\u00a0')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
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

/** Tekst elementu: tekst wszystkich potomków, spacje scalone. */
export function textOf(element: MarkupElement): string {
  const parts: string[] = []
  const walk = (node: MarkupElement) => {
    for (const child of node.children) {
      if (typeof child === 'string') parts.push(child)
      else walk(child)
    }
  }
  walk(element)
  return parts.join(' ').replace(/[\u00a0\u202f\u2007]/g, ' ').replace(/\s+/g, ' ').trim()
}

export function classesOf(element: MarkupElement): string[] {
  return (element.attrs.class ?? '').split(/\s+/).filter(Boolean)
}

/** Element wyboru w panelu: opcja listy, pole wyboru, przycisk przełącznika; etykieta i czy jest zaznaczony. */
export interface Choice {
  label: string
  selected: boolean
  element: MarkupElement
}

const CHOICE_ROLES = new Set(['checkbox', 'radio', 'switch', 'option', 'menuitemcheckbox', 'menuitemradio', 'tab'])

function closest(element: MarkupElement, tag: string): MarkupElement | null {
  let node = element.parent
  while (node && node.tag !== tag) node = node.parent
  return node
}

/** Etykieta pola formularza: aria-label, otaczający <label> albo <label for=…>. */
function fieldLabel(root: MarkupElement, input: MarkupElement): string {
  if (input.attrs['aria-label']) return input.attrs['aria-label']
  const wrapping = closest(input, 'label')
  if (wrapping) return textOf(wrapping)
  const id = input.attrs.id
  const labelFor = id ? elementsOf(root).find((element) => element.tag === 'label' && element.attrs.for === id) : undefined
  return labelFor ? textOf(labelFor) : ''
}

/**
 * Elementy wyboru: <option> (zaznaczona: `selected`), <input type="checkbox|radio"> (zaznaczony: `checked`),
 * <button> i elementy z rolą checkbox/radio/switch/option (zaznaczone: aria-pressed, aria-checked albo aria-selected).
 */
export function choicesOf(root: MarkupElement): Choice[] {
  const choices: Choice[] = []
  for (const element of elementsOf(root)) {
    const { attrs } = element
    if (element.tag === 'option') {
      choices.push({ label: textOf(element), selected: 'selected' in attrs, element })
    } else if (element.tag === 'input' && (attrs.type === 'checkbox' || attrs.type === 'radio')) {
      choices.push({ label: fieldLabel(root, element), selected: 'checked' in attrs, element })
    } else if (element.tag === 'button' || CHOICE_ROLES.has(attrs.role ?? '')) {
      const pressed = [attrs['aria-pressed'], attrs['aria-checked'], attrs['aria-selected']].includes('true')
      choices.push({ label: attrs['aria-label'] ?? textOf(element), selected: pressed, element })
    }
  }
  return choices
}

const lower = (text: string) => text.toLocaleLowerCase('pl')

/** Czy etykieta to `name` (bez rozróżniania wielkości liter), ewentualnie z dopiskiem po spacji, np. „NGC (8219)”. */
export function labelIs(label: string, name: string): boolean {
  const [a, b] = [lower(label), lower(name)]
  return a === b || a.startsWith(`${b} `)
}

/** Jedyny element wyboru o etykiecie `name`. */
export function choiceNamed(choices: readonly Choice[], name: string): Choice {
  const found = choices.filter((choice) => labelIs(choice.label, name))
  if (found.length !== 1) {
    throw new Error(`Oczekiwano jednego elementu wyboru „${name}”, jest ${found.length}: ${choices.map((c) => c.label).join(' | ')}`)
  }
  return found[0]
}

const GROUP_TAGS = new Set(['select', 'fieldset', 'datalist'])
const GROUP_ROLES = new Set(['radiogroup', 'group', 'listbox', 'tablist', 'menu'])

/** Grupa wyboru, do której należy `choice`: najbliższy <select>, <fieldset> albo element z rolą grupy. */
export function groupOf(choices: readonly Choice[], choice: Choice): Choice[] {
  let node = choice.element.parent
  while (node && !GROUP_TAGS.has(node.tag) && !GROUP_ROLES.has(node.attrs.role ?? '')) node = node.parent
  if (!node) throw new Error(`Element wyboru „${choice.label}” nie należy do grupy (select, fieldset, radiogroup)`)
  const group = node
  const inside = (element: MarkupElement) => {
    for (let parent = element.parent; parent; parent = parent.parent) if (parent === group) return true
    return false
  }
  return choices.filter((candidate) => inside(candidate.element))
}

// ---------- Klasy i kolory ----------

/** Pola (select, textarea, input poza checkbox/radio/hidden) bez klasy `control` i przyciski bez klasy `button`. */
export function controlsWithoutClass(markup: string): string[] {
  const offenders: string[] = []
  for (const element of elementsOf(parseMarkup(markup))) {
    const classes = classesOf(element)
    const isField =
      element.tag === 'select' ||
      element.tag === 'textarea' ||
      (element.tag === 'input' && !['checkbox', 'radio', 'hidden'].includes(element.attrs.type ?? 'text'))
    if (isField && !classes.includes('control')) offenders.push(`<${element.tag} class="${element.attrs.class ?? ''}">`)
    if (element.tag === 'button' && !classes.includes('button')) offenders.push(`<button class="${element.attrs.class ?? ''}">`)
  }
  return offenders
}

/** Klasy narzędziowe Tailwind, które ustawiają kolor (z wariantami, np. „md:”, i przezroczystością „/70”). */
const COLOR_UTILITY = '(?:[a-z0-9-]+:)*(?:text|bg|border(?:-[a-z])?|fill|stroke|outline|ring|decoration|accent|caret|divide|shadow|from|via|to)'

/** Domyślna paleta Tailwind (spoza tokenów): odcienie z numerem, np. „text-green-500”, oraz biel i czerń. */
const PALETTE_CLASS = new RegExp(
  `(?:^|[\\s"'])${COLOR_UTILITY}-(?:(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\\d{2,3}|white|black)(?:/\\d+)?(?=[\\s"'])`,
  'g',
)

/** Kolory wpisane wprost w znaczniki (poza tokenami): #hex, rgb()/hsl()/oklch(), paleta Tailwind, kolory w stylach i SVG. */
export function colorsOutsideTokens(markup: string): string[] {
  const found: string[] = []
  found.push(...(markup.match(/(?<!&)#[0-9a-f]{3,8}\b/gi) ?? []))
  found.push(...(markup.match(/\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/gi) ?? []))
  found.push(...(markup.match(PALETTE_CLASS) ?? []))
  for (const [, style] of markup.matchAll(/style="([^"]*)"/g)) {
    const declarations = style.match(
      /(?:^|;)\s*(?:color|background|background-color|border-color|fill|stroke|outline-color)\s*:\s*(?!var\(|currentcolor|inherit|transparent|none)[^;]+/gi,
    )
    found.push(...(declarations ?? []))
  }
  found.push(...(markup.match(/\s(?:fill|stroke|color|stop-color)="(?!none"|currentColor"|var\(|url\()[^"]+"/g) ?? []))
  return found
}

// ---------- Atrapy przeglądarki ----------

/** Atrapa Workera z `postMessage`: zapisuje wysłane komunikaty, a odpowiedzi podaje przez `onmessage`. */
export class FakeWorker implements CatalogWorkerPort {
  readonly sent: CatalogWorkerRequest[] = []
  onmessage: ((event: MessageEvent<CatalogWorkerResponse>) => void) | null = null

  postMessage = (message: CatalogWorkerRequest): void => {
    this.sent.push(structuredClone(message))
  }

  /** Odpowiedź Workera dociera do wątku głównego. */
  reply(response: CatalogWorkerResponse): void {
    this.onmessage?.(new MessageEvent('message', { data: structuredClone(response) }))
  }
}

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
