// Wspólne dane i narzędzia testów funkcji „edytor-parametrow”.
// Testy działają w Node bez DOM (renderToStaticMarkup). Edytor (`PlanningSettingsEditor`) jest komponentem
// prezentacyjnym: zapisane parametry, formularz i komunikat dostaje w props, więc jeden render pokazuje dany stan.
// „Wpisanie” w pole, wybór z listy, pole wyboru i kliknięcie: sonda (`probeAll`) w trakcie renderu rozwija drzewo
// elementów, oddaje właściwości elementów HTML, a test wywołuje ich `onChange` albo `onClick` z atrapą zdarzenia.
// Pole formularza odpowiadające elementowi <input> test ustala po tym, który klucz formularza zmienia jego `onChange`,
// więc nie zależy od treści etykiet.
import { readFileSync } from 'node:fs'
import { createElement, isValidElement, type ElementType, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, vi } from 'vitest'
import { NightTab } from '../../../src/features/night/NightTab'
import { PlanningSettingsEditor, type PlanningSettingsEditorProps } from '../../../src/features/settings/PlanningSettingsEditor'
import type { PlanningSettingsForm, PlanningTextField } from '../../../src/features/settings/planningSettingsForm'
import { SettingsTab } from '../../../src/features/settings/SettingsTab'
import { usePlannerStore } from '../../../src/state/plannerStore'
import type { MoonRuleThresholds, PlanningSettings } from '../../../src/types'

// ---------- Parametry i formularze ----------

/** Wartości domyślne wypisane wprost (parametry-planowania P1, P2; części całości). */
export function defaults(): PlanningSettings {
  return {
    darknessThresholdDeg: -18,
    autoLowerThreshold: true,
    minAltitudeDeg: 30,
    minEffectiveHours: 3,
    catalogStepMin: 5,
    detailStepMin: 1,
    seeingArcsec: 2.5,
    fitRange: [0.25, 0.8],
    moonRules: defaultMoonRules(),
  }
}

export function defaultMoonRules(): MoonRuleThresholds {
  return {
    moonDownMinFraction: 0.8,
    broadband: { greenMaxIllum: 0.15, yellowMaxIllum: 0.5, yellowMinSepDeg: 90 },
    broadbandFaintNebula: { greenMaxIllum: 0.15 },
    hydrogenSulfur: { greenMinSepDeg: 50, yellowMinSepDeg: 25 },
    oxygen: { greenMinSepDeg: 70, greenMaxIllum: 0.75, yellowMinSepDeg: 40 },
  }
}

/** Parametry domyślne z podmienionymi polami. */
export function settingsWith(patch: Partial<PlanningSettings>): PlanningSettings {
  return { ...defaults(), ...patch }
}

/** Parametry domyślne z podmienionymi progami Księżyca (płytko w każdej grupie). */
export function settingsWithMoon(patch: {
  moonDownMinFraction?: number
  broadband?: Partial<MoonRuleThresholds['broadband']>
  broadbandFaintNebula?: Partial<MoonRuleThresholds['broadbandFaintNebula']>
  hydrogenSulfur?: Partial<MoonRuleThresholds['hydrogenSulfur']>
  oxygen?: Partial<MoonRuleThresholds['oxygen']>
}): PlanningSettings {
  const rules = defaultMoonRules()
  return settingsWith({
    moonRules: {
      moonDownMinFraction: patch.moonDownMinFraction ?? rules.moonDownMinFraction,
      broadband: { ...rules.broadband, ...patch.broadband },
      broadbandFaintNebula: { ...rules.broadbandFaintNebula, ...patch.broadbandFaintNebula },
      hydrogenSulfur: { ...rules.hydrogenSulfur, ...patch.hydrogenSulfur },
      oxygen: { ...rules.oxygen, ...patch.oxygen },
    },
  })
}

/** Wszystkie 17 pól tekstowych formularza. */
export const TEXT_FIELDS: readonly PlanningTextField[] = [
  'minAltitudeDeg',
  'minEffectiveHours',
  'catalogStepMin',
  'detailStepMin',
  'seeingArcsec',
  'fitMinPercent',
  'fitMaxPercent',
  'moonDownMinPercent',
  'broadbandGreenMaxIllumPercent',
  'broadbandYellowMaxIllumPercent',
  'broadbandYellowMinSepDeg',
  'faintNebulaGreenMaxIllumPercent',
  'hydrogenSulfurGreenMinSepDeg',
  'hydrogenSulfurYellowMinSepDeg',
  'oxygenGreenMinSepDeg',
  'oxygenGreenMaxIllumPercent',
  'oxygenYellowMinSepDeg',
]

/** Pola w procentach (w parametrach części całości) i pola separacji w stopniach. */
export const PERCENT_FIELDS: readonly PlanningTextField[] = [
  'moonDownMinPercent',
  'broadbandGreenMaxIllumPercent',
  'broadbandYellowMaxIllumPercent',
  'faintNebulaGreenMaxIllumPercent',
  'oxygenGreenMaxIllumPercent',
]
export const SEPARATION_FIELDS: readonly PlanningTextField[] = [
  'broadbandYellowMinSepDeg',
  'hydrogenSulfurGreenMinSepDeg',
  'hydrogenSulfurYellowMinSepDeg',
  'oxygenGreenMinSepDeg',
  'oxygenYellowMinSepDeg',
]

/** Parametry z ustawioną wartością pola formularza `field` (w jednostkach parametrów: części całości, °, h, min, ″). */
export function settingsWithField(field: PlanningTextField, value: number): PlanningSettings {
  const base = defaults()
  switch (field) {
    case 'minAltitudeDeg':
    case 'minEffectiveHours':
    case 'catalogStepMin':
    case 'detailStepMin':
    case 'seeingArcsec':
      return settingsWith({ [field]: value })
    case 'fitMinPercent':
      return settingsWith({ fitRange: [value, base.fitRange[1]] })
    case 'fitMaxPercent':
      return settingsWith({ fitRange: [base.fitRange[0], value] })
    case 'moonDownMinPercent':
      return settingsWithMoon({ moonDownMinFraction: value })
    case 'broadbandGreenMaxIllumPercent':
      return settingsWithMoon({ broadband: { greenMaxIllum: value } })
    case 'broadbandYellowMaxIllumPercent':
      return settingsWithMoon({ broadband: { yellowMaxIllum: value } })
    case 'broadbandYellowMinSepDeg':
      return settingsWithMoon({ broadband: { yellowMinSepDeg: value } })
    case 'faintNebulaGreenMaxIllumPercent':
      return settingsWithMoon({ broadbandFaintNebula: { greenMaxIllum: value } })
    case 'hydrogenSulfurGreenMinSepDeg':
      return settingsWithMoon({ hydrogenSulfur: { greenMinSepDeg: value } })
    case 'hydrogenSulfurYellowMinSepDeg':
      return settingsWithMoon({ hydrogenSulfur: { yellowMinSepDeg: value } })
    case 'oxygenGreenMinSepDeg':
      return settingsWithMoon({ oxygen: { greenMinSepDeg: value } })
    case 'oxygenGreenMaxIllumPercent':
      return settingsWithMoon({ oxygen: { greenMaxIllum: value } })
    case 'oxygenYellowMinSepDeg':
      return settingsWithMoon({ oxygen: { yellowMinSepDeg: value } })
  }
}

/** P1: formularz wartości domyślnych (procenty zamiast części całości, przecinek dziesiętny). */
export const DEFAULT_FORM: PlanningSettingsForm = {
  darknessThresholdDeg: -18,
  autoLowerThreshold: true,
  minAltitudeDeg: '30',
  minEffectiveHours: '3',
  catalogStepMin: '5',
  detailStepMin: '1',
  seeingArcsec: '2,5',
  fitMinPercent: '25',
  fitMaxPercent: '80',
  moonDownMinPercent: '80',
  broadbandGreenMaxIllumPercent: '15',
  broadbandYellowMaxIllumPercent: '50',
  broadbandYellowMinSepDeg: '90',
  faintNebulaGreenMaxIllumPercent: '15',
  hydrogenSulfurGreenMinSepDeg: '50',
  hydrogenSulfurYellowMinSepDeg: '25',
  oxygenGreenMinSepDeg: '70',
  oxygenGreenMaxIllumPercent: '75',
  oxygenYellowMinSepDeg: '40',
}

/** Formularz domyślny z podmienionymi polami. */
export function formWith(patch: Partial<PlanningSettingsForm>): PlanningSettingsForm {
  return { ...DEFAULT_FORM, ...patch }
}

/**
 * Parametry, w których każde z 17 pól liczbowych ma inną wartość (wykrywa zamienione pola). 0,29, 0,57 i 0,07 razy 100
 * dają w liczbach zmiennoprzecinkowych 28,999…, 56,999… i 7,000…1, a w polu ma stać „29”, „57” i „7”.
 */
export const CUSTOM: PlanningSettings = {
  darknessThresholdDeg: -15,
  autoLowerThreshold: false,
  minAltitudeDeg: 41,
  minEffectiveHours: 4.5,
  catalogStepMin: 10,
  detailStepMin: 2,
  seeingArcsec: 3.1,
  fitRange: [0.29, 0.66],
  moonRules: {
    moonDownMinFraction: 0.9,
    broadband: { greenMaxIllum: 0.07, yellowMaxIllum: 0.155, yellowMinSepDeg: 100 },
    broadbandFaintNebula: { greenMaxIllum: 0.12 },
    hydrogenSulfur: { greenMinSepDeg: 60, yellowMinSepDeg: 33 },
    oxygen: { greenMinSepDeg: 85, greenMaxIllum: 0.57, yellowMinSepDeg: 45 },
  },
}

/** Formularz parametrów CUSTOM. */
export const CUSTOM_FORM: PlanningSettingsForm = {
  darknessThresholdDeg: -15,
  autoLowerThreshold: false,
  minAltitudeDeg: '41',
  minEffectiveHours: '4,5',
  catalogStepMin: '10',
  detailStepMin: '2',
  seeingArcsec: '3,1',
  fitMinPercent: '29',
  fitMaxPercent: '66',
  moonDownMinPercent: '90',
  broadbandGreenMaxIllumPercent: '7',
  broadbandYellowMaxIllumPercent: '15,5',
  broadbandYellowMinSepDeg: '100',
  faintNebulaGreenMaxIllumPercent: '12',
  hydrogenSulfurGreenMinSepDeg: '60',
  hydrogenSulfurYellowMinSepDeg: '33',
  oxygenGreenMinSepDeg: '85',
  oxygenGreenMaxIllumPercent: '57',
  oxygenYellowMinSepDeg: '45',
}

/** Kopia wartości z liczbami zaokrąglonymi do 9 miejsc (części całości z procentów: 15,5 / 100 albo 15,5 · 0,01). */
export function rounded<T>(value: T): T {
  if (typeof value === 'number') return (Math.round(value * 1e9) / 1e9) as T
  if (Array.isArray(value)) return value.map((item: unknown) => rounded(item)) as T
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, rounded(inner)])) as T
  }
  return value
}

// ---------- Teksty ze spec ----------

export const SAVE = 'Zapisz zmiany'
export const DISCARD = 'Odrzuć zmiany'
export const RESTORE = 'Przywróć domyślne'
export const UNSAVED = 'Niezapisane zmiany'
export const SAVED_TEXT = 'Zapisano parametry.'
export const SAVE_FAILED_PREFIX = 'Nie udało się zapisać: '
export const H_MIN_NOT_A_NUMBER = 'h_min: wpisz liczbę'
export const H_MIN_RANGE = 'h_min: dozwolony zakres 0–90°'
export const FIT_ORDER = 'Pasuje do kadru: dolna granica musi być mniejsza od górnej'

// ---------- Render edytora ----------

/** Props edytora: domyślnie zapisane parametry domyślne, formularz domyślny, bez komunikatu, bez obsługi zdarzeń. */
export function editorProps(patch: Partial<PlanningSettingsEditorProps> = {}): PlanningSettingsEditorProps {
  return {
    saved: defaults(),
    form: DEFAULT_FORM,
    message: null,
    onFormChange: () => undefined,
    onSave: () => undefined,
    ...patch,
  }
}

export function editorElement(patch: Partial<PlanningSettingsEditorProps> = {}): ReactElement {
  return createElement(PlanningSettingsEditor, editorProps(patch))
}

/** Wyrenderowany edytor: znaczniki, drzewo elementów, pole <input> każdego klucza formularza. */
export interface EditorRender {
  markup: string
  root: MarkupElement
  inputs: Record<PlanningTextField, MarkupElement>
  /** Klucze formularza pól tekstowych w kolejności dokumentu. */
  order: PlanningTextField[]
}

const SENTINEL = '§sonda§'

/**
 * Render edytora i przypisanie pól: dla każdego pola tekstowego (w kolejności dokumentu) sonda wywołuje `onChange`
 * z tekstem kontrolnym i sprawdza, który klucz formularza zmienił się w `onFormChange`. Każde pole ma zmieniać dokładnie
 * jeden klucz, każdy z 17 kluczy – w jednym polu.
 */
export function renderEditor(patch: Partial<PlanningSettingsEditorProps> = {}): EditorRender {
  const props = editorProps(patch)
  const onFormChange = vi.fn<(form: PlanningSettingsForm) => void>()
  const { markup, found } = probeAll(createElement(PlanningSettingsEditor, { ...props, onFormChange }), isTextInputHost)
  const order: PlanningTextField[] = found.map((host, index) => {
    onFormChange.mockClear()
    change(host, SENTINEL)
    expect(onFormChange, `pole tekstowe nr ${index + 1}: onFormChange po wpisaniu`).toHaveBeenCalledTimes(1)
    const next = onFormChange.mock.calls[0][0]
    const changed = (Object.keys(next) as (keyof PlanningSettingsForm)[]).filter((key) => next[key] !== props.form[key])
    expect(changed, `pole tekstowe nr ${index + 1}: zmienione klucze formularza`).toHaveLength(1)
    expect(next[changed[0]], `pole tekstowe nr ${index + 1}: wpisany tekst`).toBe(SENTINEL)
    return changed[0] as PlanningTextField
  })
  expect([...order].sort(), 'klucze formularza pól tekstowych').toEqual([...TEXT_FIELDS].sort())
  const root = parseMarkup(markup)
  const fields = textInputsOf(root)
  expect(fields, 'pola tekstowe w znacznikach').toHaveLength(TEXT_FIELDS.length)
  const inputs = Object.fromEntries(order.map((key, index) => [key, fields[index]])) as Record<PlanningTextField, MarkupElement>
  return { markup, root, inputs, order }
}

/** Tekst pól (atrybut value) według kluczy formularza. */
export function valuesOf(inputs: Record<PlanningTextField, MarkupElement>): Record<PlanningTextField, string> {
  return Object.fromEntries(TEXT_FIELDS.map((key) => [key, inputs[key].attrs.value ?? ''])) as Record<PlanningTextField, string>
}

/** Pola tekstowe formularza (bez kluczy progu i obniżania). */
export function textPart(form: PlanningSettingsForm): Record<PlanningTextField, string> {
  return Object.fromEntries(TEXT_FIELDS.map((key) => [key, form[key]])) as Record<PlanningTextField, string>
}

/** Jedyny przycisk o tekście `text` w drzewie `root`. */
export function buttonIn(root: MarkupElement, text: string): MarkupElement {
  const buttons = elementsOf(root).filter((element) => element.tag === 'button' && textOf(element) === text)
  expect(buttons, `przyciski „${text}”`).toHaveLength(1)
  return buttons[0]
}

export const isDisabled = (element: MarkupElement) => 'disabled' in element.attrs

/** Właściwości jedynego przycisku edytora o tekście `text` (z sondy). */
export function editorButton(patch: Partial<PlanningSettingsEditorProps>, text: string): HostProps {
  const { found } = probeAll(editorElement(patch), (host) => host.tag === 'button' && hostText(host.props.children) === text)
  expect(found, `przyciski „${text}”`).toHaveLength(1)
  return found[0].props
}

/** Jedyne pole <select> w drzewie i jego opcje (tekst, wartość, zaznaczenie). */
export function thresholdSelect(root: MarkupElement): { select: MarkupElement; options: { text: string; value: string; selected: boolean }[] } {
  const selects = elementsOf(root).filter((element) => element.tag === 'select')
  expect(selects, 'pola <select>').toHaveLength(1)
  const options = elementsOf(selects[0])
    .filter((element) => element.tag === 'option')
    .map((option) => ({ text: textOf(option), value: option.attrs.value ?? textOf(option), selected: 'selected' in option.attrs }))
  return { select: selects[0], options }
}

/** Jedyne pole wyboru (checkbox) w drzewie. */
export function checkboxIn(root: MarkupElement): MarkupElement {
  const boxes = elementsOf(root).filter((element) => element.tag === 'input' && element.attrs.type === 'checkbox')
  expect(boxes, 'pola wyboru (checkbox)').toHaveLength(1)
  return boxes[0]
}

// ---------- Zakładka Ustawienia i zakładka Noc (stan aplikacji) ----------

/** renderToStaticMarkup czyta stan Zustand z getInitialState(); kopiujemy tam bieżący stan aplikacji. */
function syncStore(): void {
  Object.assign(usePlannerStore.getInitialState(), usePlannerStore.getState())
}

export function renderSettingsTab(): string {
  syncStore()
  return renderToStaticMarkup(createElement(SettingsTab))
}

/**
 * Zakładka Ustawienia z sondą dla bieżącego stanu aplikacji. Wywołanie obsługi zdarzenia po renderze nie zmienia już
 * stanu formularza w zakładce (render na serwerze), ale każdy zapis do stanu aplikacji albo bazy jest widoczny.
 */
export function probeSettingsTab(match: (host: Host) => boolean): { markup: string; found: Host[] } {
  syncStore()
  return probeAll(createElement(SettingsTab), match)
}

/**
 * Właściwości przycisku o tekście `text` z sekcji „Parametry planowania” zakładki Ustawienia (z sondy): przyciski sondy
 * i znaczników są w tej samej kolejności dokumentu, więc przycisk sekcji wskazuje jego pozycja w znacznikach.
 */
export function planningButtonProps(text: string): HostProps {
  // Tekst przycisku liczymy w trakcie renderu: ikony (lucide) używają kontekstu Reacta, dostępnego tylko wtedy.
  const texts = new Map<HostProps, string>()
  const { markup, found } = probeSettingsTab((host) => {
    if (host.tag !== 'button') return false
    texts.set(host.props, hostText(host.props.children))
    return true
  })
  const { root, after } = planningPart(markup)
  const buttons = elementsOf(root).filter((element) => element.tag === 'button')
  expect(found, 'przyciski zakładki Ustawienia (sonda i znaczniki)').toHaveLength(buttons.length)
  const inSection = after.filter((element) => element.tag === 'button' && textOf(element) === text)
  expect(inSection, `przyciski „${text}” w sekcji „Parametry planowania”`).toHaveLength(1)
  const index = buttons.indexOf(inSection[0])
  expect(index).toBeGreaterThanOrEqual(0)
  expect(texts.get(found[index].props)).toBe(text)
  return found[index].props
}

/** Tekst zakładki Noc dla bieżącego stanu aplikacji (bez znaczników, spacje scalone). */
export function renderedNightTabText(): string {
  syncStore()
  return visibleText(renderToStaticMarkup(createElement(NightTab)))
}

/** Nagłówki (h1–h4) w kolejności dokumentu. */
export function headingsOf(root: MarkupElement): MarkupElement[] {
  return elementsOf(root).filter((element) => /^h[1-4]$/.test(element.tag))
}

/**
 * Sekcja „Parametry planowania” zakładki Ustawienia: nagłówek i elementy po nim w kolejności dokumentu, do następnego
 * nagłówka tego samego albo wyższego poziomu (sekcje dodane później pod nią nie należą do niej).
 */
export function planningPart(markup: string): { root: MarkupElement; heading: MarkupElement; after: MarkupElement[] } {
  const root = parseMarkup(markup)
  const all = elementsOf(root)
  const headings = headingsOf(root).filter((element) => textOf(element) === 'Parametry planowania')
  expect(headings, 'nagłówki „Parametry planowania”').toHaveLength(1)
  const heading = headings[0]
  const level = Number(heading.tag.slice(1))
  const rest = all.slice(all.indexOf(heading) + 1)
  const end = rest.findIndex((element) => /^h[1-6]$/.test(element.tag) && Number(element.tag.slice(1)) <= level)
  return { root, heading, after: end < 0 ? rest : rest.slice(0, end) }
}

/**
 * Tekst pól sekcji „Parametry planowania” w zakładce Ustawienia według kluczy formularza: kolejność pól z renderu
 * samego edytora (te same props), pola zakładki – pola tekstowe po nagłówku sekcji.
 */
export function settingsTabValues(markup: string, saved: PlanningSettings, form: PlanningSettingsForm): Record<PlanningTextField, string> {
  const { order } = renderEditor({ saved, form })
  const fields = planningPart(markup).after.filter(isTextInput)
  expect(fields, 'pola tekstowe sekcji „Parametry planowania”').toHaveLength(TEXT_FIELDS.length)
  return Object.fromEntries(order.map((key, index) => [key, fields[index].attrs.value ?? ''])) as Record<PlanningTextField, string>
}

// ---------- Komunikat przy polu ----------

const FIELD_TAGS = new Set(['input', 'select', 'textarea'])

/** Pola formularza (input, select, textarea; bez ukrytych) w poddrzewie. */
function fieldsIn(element: MarkupElement): MarkupElement[] {
  return elementsOf(element).filter((child) => FIELD_TAGS.has(child.tag) && child.attrs.type !== 'hidden')
}

function ancestorsOf(element: MarkupElement): MarkupElement[] {
  const chain: MarkupElement[] = []
  for (let node: MarkupElement | null = element; node; node = node.parent) chain.push(node)
  return chain
}

/** Najmniejsze elementy, których tekst zawiera `message`. */
function messageElements(root: MarkupElement, message: string): MarkupElement[] {
  return elementsOf(root).filter(
    (element) =>
      textOf(element).includes(message) &&
      !element.children.some((child) => typeof child !== 'string' && textOf(child).includes(message)),
  )
}

/**
 * Czy komunikat `message` stoi przy polu (jednym z `fields`): najmniejszy wspólny element pola i komunikatu nie zawiera
 * innych pól niż `fields` (np. komunikat w etykiecie pola albo w grupie „od–do” kadru), albo pole wskazuje komunikat
 * przez aria-describedby / aria-errormessage.
 */
export function nearField(root: MarkupElement, fields: readonly MarkupElement[], message: string): boolean {
  const all = elementsOf(root)
  for (const field of fields) {
    const ids = `${field.attrs['aria-describedby'] ?? ''} ${field.attrs['aria-errormessage'] ?? ''}`.split(/\s+/).filter(Boolean)
    if (ids.some((id) => all.some((element) => element.attrs.id === id && textOf(element).includes(message)))) return true
    const fieldChain = new Set(ancestorsOf(field))
    for (const element of messageElements(root, message)) {
      const common = ancestorsOf(element).find((node) => fieldChain.has(node))
      if (common && fieldsIn(common).every((inner) => fields.includes(inner))) return true
    }
  }
  return false
}

// ---------- Sonda: właściwości elementów HTML w trakcie renderu ----------

export type HostProps = Record<string, unknown>

/** Element HTML drzewa React (np. 'button') z właściwościami (np. `onClick`). */
export interface Host {
  tag: string
  props: HostProps
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

/** Elementy HTML węzła w kolejności dokumentu, po rozwinięciu komponentów. */
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

const NON_TEXT_TYPES = new Set(['checkbox', 'radio', 'hidden', 'button', 'submit', 'reset', 'file', 'range', 'color'])

function isTextInputHost(host: Host): boolean {
  return host.tag === 'input' && !NON_TEXT_TYPES.has(typeof host.props.type === 'string' ? host.props.type : 'text')
}

/**
 * Render elementu (renderToStaticMarkup) z sondą: w trakcie renderu sonda rozwija całe drzewo elementu (wywołuje
 * komponenty funkcyjne, więc ich hooki należą do sondy) i zbiera wszystkie elementy HTML, dla których `match` jest prawdą.
 */
export function probeAll(element: ReactElement, match: (host: Host) => boolean): { markup: string; found: Host[] } {
  const found: Host[] = []
  const sonda = () => {
    found.length = 0
    for (const host of hosts(element)) if (match(host)) found.push(host)
    return element
  }
  const markup = renderToStaticMarkup(createElement(sonda))
  return { markup, found }
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

function handler(props: HostProps, name: 'onClick' | 'onChange'): (event: unknown) => void {
  const fn = props[name]
  if (typeof fn !== 'function') throw new Error(`Element nie ma obsługi ${name}`)
  return fn as (event: unknown) => void
}

/** Kliknięcie: `onClick` elementu z atrapą zdarzenia. */
export function click(props: HostProps): void {
  handler(props, 'onClick')(fakeEvent({}))
}

/** Wpisanie tekstu w pole albo wybór wartości z listy: `onChange` z atrapą zdarzenia (target.value). */
export function change(host: Host | HostProps, value: string): void {
  const props = 'tag' in host && 'props' in host ? (host as Host).props : host
  handler(props, 'onChange')(fakeEvent({ value, type: 'text' }))
}

/** Zaznaczenie albo odznaczenie pola wyboru: `onChange` z atrapą zdarzenia (target.checked). */
export function toggle(props: HostProps, checked: boolean): void {
  handler(props, 'onChange')(fakeEvent({ checked, value: 'on', type: 'checkbox' }))
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

export function isTextInput(element: MarkupElement): boolean {
  return element.tag === 'input' && !NON_TEXT_TYPES.has(element.attrs.type ?? 'text')
}

/** Pola tekstowe (input) poddrzewa w kolejności dokumentu. */
export function textInputsOf(root: MarkupElement): MarkupElement[] {
  return elementsOf(root).filter(isTextInput)
}

const INLINE_TAGS = new Set(['span', 'strong', 'em', 'b', 'i', 'abbr', 'sub', 'sup', 'code', 'small', 'mark'])

/**
 * Tekst elementu: tekst potomków (bez poddrzewa `skip`), spacje scalone. Sąsiednie węzły tekstu (np. „h_min<!-- -->: …”)
 * łączą się bez spacji, elementy blokowe rozdziela spacja.
 */
export function textOf(element: MarkupElement, skip: MarkupElement | null = null): string {
  const walk = (node: MarkupElement): string =>
    node.children
      .map((child) => {
        if (typeof child === 'string') return child
        if (child === skip) return ' '
        return INLINE_TAGS.has(child.tag) ? walk(child) : ` ${walk(child)} `
      })
      .join('')
  return walk(element).replace(/[\u00a0\u202f\u2007]/g, ' ').replace(/\s+/g, ' ').trim()
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

/** Pola bez klasy `control` i przyciski bez klasy `button` (pola wyboru i opcje radiowe pomijamy). */
export function controlsWithoutClass(root: MarkupElement): string[] {
  const offenders: string[] = []
  for (const element of elementsOf(root)) {
    const classes = classesOf(element)
    const isField = element.tag === 'select' || element.tag === 'textarea' || isTextInput(element)
    if (isField && !classes.includes('control')) offenders.push(`<${element.tag} class="${element.attrs.class ?? ''}">`)
    if (element.tag === 'button' && !classes.includes('button')) offenders.push(`<button class="${element.attrs.class ?? ''}">`)
  }
  return offenders
}

// ---------- Wysokość elementu ----------

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
 * klasy z src/index.css (np. `button` i `control`: 2,75rem = 44 px); do tego wysokość `h-*`, `size-*` albo `height` ze stylu.
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
