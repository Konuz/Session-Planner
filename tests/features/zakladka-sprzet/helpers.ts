// Wspólne dane i narzędzia testów funkcji „zakladka-sprzet”.
// Testy działają w Node bez DOM (renderToStaticMarkup). Komponenty z src/features/equipment/ są prezentacyjne, więc
// jeden render pokazuje dany stan. „Wpisanie”, wybór, pole wyboru i kliknięcie: sonda (`probeAll`) w trakcie renderu
// rozwija drzewo elementów, oddaje właściwości elementów HTML, a test wywołuje ich `onChange` / `onClick` z atrapą zdarzenia.
//
// Nazwy, których spec nie podaje (wybrane przez test-author; opisane też w zaślepkach):
// - `ProfileList` (ProfileList.tsx) – props ze spec; `confirmRemove: boolean`, `error: string | null`,
//   `onSelect(id)`, pozostałe zdarzenia bez argumentów („Duplikuj zestaw” kopiuje aktywny zestaw).
// - `ProfileEditor` (ProfileEditor.tsx) – props ze spec; `form: ProfileForm` (formularz-profilu), `saved: EquipmentProfile`,
//   `message: { kind: 'saved' | 'error'; text } | null` (jak `PlanningSaveMessage`), `onQueryChange(kind, query)`
//   z `kind` 'telescope' | 'camera', `onDuplicateBuiltin(kind, id)`, pozostałe zdarzenia bez argumentów.
// - `OwnEquipmentList` (OwnEquipmentList.tsx) – props ze spec; `editing` i `confirmRemove`: `{ kind, id } | null`,
//   `editForm` teleskopu: `{ name, apertureMm, focalLengthMm }` (tekst), `message: string | null`, `onEdit(kind, id)`,
//   `onEditChange(form)`, `onRemoveRequest(kind, id)`, pozostałe zdarzenia bez argumentów.
// - `EquipmentSection` (EquipmentSection.tsx) – kontener bez props, renderowany przez SettingsTab.
// Pole formularza zestawu test rozpoznaje po tym, który klucz `ProfileForm` zmienia jego `onChange` (pole szukania:
// które wywołanie `onQueryChange`), więc mapowanie pól nie zależy od treści etykiet; etykiety sprawdza osobno P14.
import { readFileSync } from 'node:fs'
import { createElement, isValidElement, type ElementType, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, vi } from 'vitest'
import { TopBar } from '../../../src/app/TopBar'
import { BUILTIN_CAMERAS, BUILTIN_TELESCOPES } from '../../../src/data/equipmentCatalog'
import { DEMO_PROFILES } from '../../../src/data/demo'
import { OwnEquipmentList, type OwnEntryForm, type OwnEquipmentListProps } from '../../../src/features/equipment/OwnEquipmentList'
import { ProfileEditor, type ProfileEditorProps } from '../../../src/features/equipment/ProfileEditor'
import { ProfileList, type ProfileListProps } from '../../../src/features/equipment/ProfileList'
import { profileToForm, type ProfileForm } from '../../../src/features/equipment/profileForm'
import { SettingsTab } from '../../../src/features/settings/SettingsTab'
import { usePlannerStore } from '../../../src/state/plannerStore'
import type { CameraSpec, EquipmentProfile, TelescopeSpec } from '../../../src/types'

// ---------- Dane ----------

export const MOJ_ID = 'demo-moj-zestaw' // Newton 150/600 (własny) + Player One Ares-M Pro
export const REDCAT_ID = 'demo-redcat51-asi2600mc'
export const NEWTON_ID = 'demo-newton200-asi533mm'
export const ESPRIT_ID = 'demo-esprit100-asi6200mm'

export const ESPRIT_100 = 'skywatcher-esprit-100ed'
export const ASI6200MM = 'zwo-asi6200mm-pro'
export const ARES_M = 'player-one-ares-m-pro'

export const DEMO_NAMES = ['Mój zestaw', 'RedCat 51 + ASI2600MC Pro', 'Newton 200/1000 + ASI533MM Pro', 'Esprit 100ED + ASI6200MM Pro']

/** Głęboka kopia profilu z 6.4 o danym id. */
export function demo(id: string): EquipmentProfile {
  const found = DEMO_PROFILES.find((profile) => profile.id === id)
  if (found === undefined) throw new Error(`Brak profilu ${id} w DEMO_PROFILES`)
  return structuredClone(found)
}

/** Formularz profilu z 6.4 z nadpisanymi polami. */
export function formOf(id: string, patch: Partial<ProfileForm> = {}): ProfileForm {
  return { ...profileToForm(demo(id)), ...patch }
}

export function builtinTelescope(id: string): TelescopeSpec {
  const found = BUILTIN_TELESCOPES.find((spec) => spec.id === id)
  if (found === undefined) throw new Error(`Brak teleskopu ${id}`)
  return found
}

export function builtinCamera(id: string): CameraSpec {
  const found = BUILTIN_CAMERAS.find((spec) => spec.id === id)
  if (found === undefined) throw new Error(`Brak kamery ${id}`)
  return found
}

/** Własny teleskop (wpis `origin: 'user'`, marka pusta jak w wlasny-sprzet). */
export function userTelescope(id: string, name: string, apertureMm: number, focalLengthMm: number): TelescopeSpec {
  return { id, brand: '', model: name, design: 'other', apertureMm, focalLengthMm, origin: 'user' }
}

/** Własna kamera (wpis `origin: 'user'`). */
export function userCamera(id: string, name: string, x: number, y: number, pixel: number, sensor: 'mono' | 'osc' = 'mono'): CameraSpec {
  return { id, brand: '', model: name, sensorModel: null, sensor, resolutionXPx: x, resolutionYPx: y, pixelSizeUm: pixel, origin: 'user' }
}

// ---------- Teksty ze spec ----------

export const SAVE_PROFILE = 'Zapisz zestaw'
export const DISCARD_PROFILE = 'Odrzuć zmiany zestawu'
export const UNSAVED = 'Niezapisane zmiany'
export const CHANGED = 'zmienione względem katalogu'
export const SAVE_TELESCOPE = 'Zapisz jako mój teleskop'
export const SAVE_CAMERA = 'Zapisz jako moją kamerę'
export const DUPLICATE_BUILTIN = 'Duplikuj jako własny'
export const MANUAL = 'Własny (wpis ręczny)'
export const ADD_PROFILE = 'Dodaj zestaw'
export const DUPLICATE_PROFILE = 'Duplikuj zestaw'
export const REMOVE_PROFILE = 'Usuń zestaw'
export const LAST_PROFILE = 'Ostatniego zestawu nie można usunąć'
export const LOADING = 'Wczytywanie własnych wpisów…'
export const NO_ENTRIES = 'Brak własnych wpisów. Użyj „Zapisz jako mój teleskop” albo „Zapisz jako moją kamerę”.'
export const READ_ONLY = 'Wpis wbudowany jest tylko do odczytu: możesz go zduplikować'
export const OSC_NOTE = 'Kamera kolorowa (OSC): efektywna rozdzielczość jest niższa, niż wynika ze skali.'
export const REDUCER_LABELS = ['0,63×', '0,7×', '0,73×', '0,8×', '0,85×', '1,0×', '2,0×']
export const FILTER_LABELS = ['L', 'R', 'G', 'B', 'Ha', 'OIII', 'SII', 'OSC', 'DualBand']
export const DASH = '—'

// ---------- ProfileEditor ----------

const noop = () => undefined

/** Props edytora: domyślnie „Mój zestaw” bez zmian, wpisy wbudowane, seeing 2,5″, puste wyszukiwarki, bez komunikatu. */
export function editorProps(patch: Partial<ProfileEditorProps> = {}): ProfileEditorProps {
  return {
    form: formOf(MOJ_ID),
    saved: demo(MOJ_ID),
    telescopes: BUILTIN_TELESCOPES,
    cameras: BUILTIN_CAMERAS,
    seeingArcsec: 2.5,
    telescopeQuery: '',
    cameraQuery: '',
    message: null,
    onFormChange: noop,
    onQueryChange: noop,
    onSave: noop,
    onDiscard: noop,
    onSaveTelescope: noop,
    onSaveCamera: noop,
    onDuplicateBuiltin: noop,
    ...patch,
  }
}

/** Props edytora zestawu z 6.4 (zapisany zestaw i formularz z nadpisanymi polami). */
export function editorFor(id: string, formPatch: Partial<ProfileForm> = {}, patch: Partial<ProfileEditorProps> = {}): ProfileEditorProps {
  return editorProps({ saved: demo(id), form: formOf(id, formPatch), ...patch })
}

/** Klucz pola: klucz `ProfileForm`, `filters:<id>` dla pola wyboru filtra, `query:telescope` / `query:camera`. */
export type FieldKey = keyof ProfileForm | `filters:${string}` | 'query:telescope' | 'query:camera'

export interface EditorRender {
  markup: string
  root: MarkupElement
  text: string
  /** Elementy pól (input, select) według klucza; opcje radiowe jednego klucza – kilka elementów. */
  fields: Map<FieldKey, MarkupElement[]>
  /** Jedyny element pola o kluczu `key` (opcje radiowe – pierwszy). */
  field: (key: FieldKey) => MarkupElement
}

const SENTINEL = '§sonda§'
const FIELD_TAGS = new Set(['input', 'select', 'textarea'])

/** Opcje <select> z właściwości (wartość, tekst). */
function selectOptions(props: HostProps): { value: string; text: string }[] {
  return [...hosts(props.children)]
    .filter((host) => host.tag === 'option')
    .map((option) => ({ value: typeof option.props.value === 'string' || typeof option.props.value === 'number' ? String(option.props.value) : hostText(option.props.children), text: hostText(option.props.children) }))
}

function changedKeys(before: ProfileForm, after: ProfileForm): (keyof ProfileForm)[] {
  return (Object.keys(after) as (keyof ProfileForm)[]).filter((key) => JSON.stringify(after[key]) !== JSON.stringify(before[key]))
}

/**
 * Render edytora i przypisanie pól do kluczy: dla każdego pola sonda wywołuje `onChange` (tekst kontrolny, każda opcja
 * listy, przełączenie pola wyboru) i sprawdza, co zmieniło się w `onFormChange` albo czy wywołano `onQueryChange`.
 */
export function renderEditor(patch: Partial<ProfileEditorProps> = {}): EditorRender {
  const props = editorProps(patch)
  const onFormChange = vi.fn<(form: ProfileForm) => void>()
  const onQueryChange = vi.fn<(kind: 'telescope' | 'camera', query: string) => void>()
  const { markup, found } = probeAll(
    createElement(ProfileEditor, { ...props, onFormChange, onQueryChange }),
    (host) => FIELD_TAGS.has(host.tag) && host.props.type !== 'hidden',
  )
  const root = parseMarkup(markup)
  const elements = elementsOf(root).filter((element) => FIELD_TAGS.has(element.tag) && element.attrs.type !== 'hidden')
  expect(elements.length, 'pola w znacznikach i w sondzie').toBe(found.length)
  const fields = new Map<FieldKey, MarkupElement[]>()
  const add = (key: FieldKey, element: MarkupElement) => fields.set(key, [...(fields.get(key) ?? []), element])
  found.forEach((host, index) => {
    const keys = new Set<FieldKey>()
    const typed = host.tag !== 'select' && !(host.tag === 'input' && NON_TEXT_TYPES.has(typeof host.props.type === 'string' ? host.props.type : 'text'))
    const record = () => {
      for (const [kind] of onQueryChange.mock.calls) keys.add(`query:${kind}`)
      for (const [next] of onFormChange.mock.calls) {
        for (const key of changedKeys(props.form, next)) {
          if (key === 'filters') {
            const before = new Set(props.form.filters)
            const after = new Set(next.filters)
            for (const id of [...before, ...after]) if (before.has(id) !== after.has(id)) keys.add(`filters:${id}`)
          } else if (!typed || next[key] === SENTINEL) {
            keys.add(key)
          }
        }
      }
      onFormChange.mockClear()
      onQueryChange.mockClear()
    }
    if (typeof host.props.onChange !== 'function') return
    if (host.tag === 'select') {
      for (const option of selectOptions(host.props)) {
        change(host, option.value)
        record()
      }
    } else if (host.tag === 'input' && (host.props.type === 'checkbox' || host.props.type === 'radio')) {
      const checked = Boolean(host.props.checked ?? host.props.defaultChecked)
      toggle(host.props, !checked, typeof host.props.value === 'string' ? host.props.value : 'on')
      record()
    } else {
      change(host, SENTINEL)
      record()
    }
    for (const key of keys) add(key, elements[index])
  })
  // Opcja radiowa, która już jest zaznaczona, nie zmienia formularza; dostaje klucz innej opcji tej samej grupy
  // (ten sam atrybut name, a bez niego – ten sam najbliższy fieldset albo role="radiogroup").
  const groupOf = (radio: MarkupElement): string | MarkupElement | null => {
    if (radio.attrs.name) return radio.attrs.name
    for (let node = radio.parent; node; node = node.parent) if (node.tag === 'fieldset' || node.attrs.role === 'radiogroup') return node
    return null
  }
  const mapped = new Set([...fields.values()].flat())
  for (const radio of elements.filter((element) => element.tag === 'input' && element.attrs.type === 'radio' && !mapped.has(element))) {
    const group = groupOf(radio)
    if (group === null) continue
    for (const [key, list] of [...fields.entries()]) {
      if (list.some((other) => other.attrs.type === 'radio' && groupOf(other) === group)) {
        fields.set(key, elements.filter((element) => element === radio || list.includes(element)))
        break
      }
    }
  }
  return {
    markup,
    root,
    text: visibleText(markup),
    fields,
    field(key) {
      const list = fields.get(key)
      expect(list, `pole formularza „${key}”`).toBeDefined()
      return (list ?? [])[0]
    },
  }
}

/** Przycisk z sondy: element w znacznikach i jego właściwości (te same indeksy: kolejność dokumentu). */
export interface ProbedButton {
  element: MarkupElement
  props: HostProps
  text: string
}

/** Wszystkie przyciski elementu w kolejności dokumentu, z właściwościami z sondy. */
export function buttonsOf(element: ReactElement): { markup: string; root: MarkupElement; buttons: ProbedButton[] } {
  const { markup, found } = probeAll(element, (host) => host.tag === 'button')
  const root = parseMarkup(markup)
  const elements = elementsOf(root).filter((child) => child.tag === 'button')
  expect(elements.length, 'przyciski w znacznikach i w sondzie').toBe(found.length)
  return { markup, root, buttons: elements.map((child, index) => ({ element: child, props: found[index].props, text: textOf(child) })) }
}

/** Jedyny przycisk o tekście `text`. */
export function onlyButton(buttons: readonly ProbedButton[], text: string): ProbedButton {
  const matching = buttons.filter((button) => button.text === text)
  expect(matching, `przyciski „${text}”`).toHaveLength(1)
  return matching[0]
}

export function editorButtons(patch: Partial<ProfileEditorProps> = {}) {
  return buttonsOf(createElement(ProfileEditor, editorProps(patch)))
}

/** Podgląd: lista <dl>, w której każdy <dt> ma zaraz po sobie swój <dd>; tekst <dd> według tekstu <dt>. */
export function previewOf(root: MarkupElement): { list: MarkupElement; values: Record<string, string> } {
  const lists = elementsOf(root).filter(
    (element) => element.tag === 'dl' && elementsOf(element).some((child) => child.tag === 'dt' && textOf(child) === 'F_eff'),
  )
  expect(lists, 'lista <dl> podglądu z „F_eff”').toHaveLength(1)
  const values: Record<string, string> = {}
  const terms = elementsOf(lists[0]).filter((child) => child.tag === 'dt')
  for (const term of terms) {
    const siblings = (term.parent?.children ?? []).filter((child): child is MarkupElement => typeof child !== 'string')
    const next = siblings[siblings.indexOf(term) + 1]
    expect(next?.tag, `po <dt> „${textOf(term)}” stoi <dd>`).toBe('dd')
    values[textOf(term)] = textOf(next)
  }
  return { list: lists[0], values }
}

export const PREVIEW_TERMS = ['F_eff', 'Światłosiła', 'Matryca', 'Pole widzenia', 'Skala', 'Próbkowanie']

/**
 * Lista wyników wyszukiwarki, w której stoi przycisk `first` („Własny” albo „Własna”): najbliższy przodek ul / ol /
 * role list|listbox|group, a bez niego rodzic przycisku. Zwraca teksty przycisków listy i jej nazwę (aria-label,
 * aria-labelledby albo tekst elementu tuż przed listą).
 */
export function resultsOf(root: MarkupElement, first: string): { list: MarkupElement; labels: string[]; name: string } {
  const starts = elementsOf(root).filter((element) => element.tag === 'button' && textOf(element) === first)
  expect(starts, `przyciski „${first}”`).toHaveLength(1)
  let list: MarkupElement | null = starts[0].parent
  for (let node = starts[0].parent; node; node = node.parent) {
    if (node.tag === 'ul' || node.tag === 'ol' || ['list', 'listbox', 'group'].includes(node.attrs.role ?? '')) {
      list = node
      break
    }
  }
  if (!list) throw new Error('Brak listy wyników')
  const labels = elementsOf(list).filter((element) => element.tag === 'button').map((element) => textOf(element))
  return { list, labels, name: accessibleName(root, list) }
}

/** Nazwa listy: aria-label / aria-labelledby listy albo przodka (do 3 poziomów), inaczej tekst poprzedniego rodzeństwa. */
function accessibleName(root: MarkupElement, list: MarkupElement): string {
  const all = elementsOf(root)
  let node: MarkupElement | null = list
  for (let level = 0; node && level < 4; level += 1, node = node.parent) {
    if (node.attrs['aria-label']) return node.attrs['aria-label'].trim()
    const ids = node.attrs['aria-labelledby']
    if (ids) {
      return ids
        .split(/\s+/)
        .map((id) => all.find((element) => element.attrs.id === id))
        .map((element) => (element ? textOf(element) : ''))
        .join(' ')
        .trim()
    }
    const siblings = (node.parent?.children ?? []).filter((child): child is MarkupElement => typeof child !== 'string')
    const previous = siblings[siblings.indexOf(node) - 1]
    if (previous && !elementsOf(previous).some((child) => child.tag === 'button' || FIELD_TAGS.has(child.tag))) {
      const text = textOf(previous)
      if (text) return text
    }
  }
  return ''
}

/** Kliknięcie przycisku wyniku o tekście `label` (z sondy) w edytorze z props `patch`. */
export function clickEditorButton(patch: Partial<ProfileEditorProps>, label: string): void {
  click(onlyButton(editorButtons(patch).buttons, label).props)
}

/** Wybrana opcja pola (select: zaznaczona opcja; opcje radiowe: etykieta zaznaczonej). */
export function chosenText(root: MarkupElement, elements: readonly MarkupElement[]): string {
  if (elements.length === 1 && elements[0].tag === 'select') {
    const options = elementsOf(elements[0]).filter((element) => element.tag === 'option')
    const selected = options.find((option) => 'selected' in option.attrs) ?? options[0]
    return selected ? textOf(selected) : ''
  }
  const checked = elements.find((element) => 'checked' in element.attrs)
  return checked ? fieldLabel(root, checked) : ''
}

/** Teksty opcji pola (select: opcje; opcje radiowe: etykiety). */
export function optionTexts(root: MarkupElement, elements: readonly MarkupElement[]): string[] {
  if (elements.length === 1 && elements[0].tag === 'select') {
    return elementsOf(elements[0]).filter((element) => element.tag === 'option').map((option) => textOf(option))
  }
  return elements.map((element) => fieldLabel(root, element))
}

/** Etykieta pola zaczyna się od `label` (za etykietą może stać komunikat albo podpowiedź). */
export function labelStartsWith(root: MarkupElement, field: MarkupElement, label: string): boolean {
  const text = fieldLabel(root, field)
  return text === label || text.startsWith(`${label} `)
}

/** Etykieta grupy opcji (select: etykieta pola; opcje radiowe: legend / aria-label grupy). */
export function groupLabel(root: MarkupElement, elements: readonly MarkupElement[]): string {
  if (elements.length === 1) return fieldLabel(root, elements[0])
  for (let node = elements[0].parent; node; node = node.parent) {
    if (!elements.every((element) => ancestorsOf(element).includes(node))) continue
    if (node.attrs['aria-label']) return node.attrs['aria-label']
    const legend = node.children.find((child): child is MarkupElement => typeof child !== 'string' && child.tag === 'legend')
    if (legend) return textOf(legend)
    const ids = node.attrs['aria-labelledby']
    if (ids) {
      const all = elementsOf(root)
      return ids
        .split(/\s+/)
        .map((id) => all.find((element) => element.attrs.id === id))
        .map((element) => (element ? textOf(element) : ''))
        .join(' ')
    }
  }
  return ''
}

// ---------- ProfileList i OwnEquipmentList ----------

export function listProps(patch: Partial<ProfileListProps> = {}): ProfileListProps {
  return {
    profiles: DEMO_PROFILES,
    activeId: MOJ_ID,
    canRemove: true,
    confirmRemove: false,
    error: null,
    onSelect: noop,
    onAdd: noop,
    onDuplicate: noop,
    onRemoveRequest: noop,
    onRemoveConfirm: noop,
    onRemoveCancel: noop,
    ...patch,
  }
}

export function listButtons(patch: Partial<ProfileListProps> = {}) {
  return buttonsOf(createElement(ProfileList, listProps(patch)))
}

export function ownProps(patch: Partial<OwnEquipmentListProps> = {}): OwnEquipmentListProps {
  return {
    telescopes: [],
    cameras: [],
    editing: null,
    editForm: null,
    confirmRemove: null,
    message: null,
    onEdit: noop,
    onEditChange: noop,
    onEditSave: noop,
    onEditCancel: noop,
    onRemoveRequest: noop,
    onRemoveConfirm: noop,
    onRemoveCancel: noop,
    ...patch,
  }
}

export function ownButtons(patch: Partial<OwnEquipmentListProps> = {}) {
  return buttonsOf(createElement(OwnEquipmentList, ownProps(patch)))
}

/**
 * Wpisy „Mój sprzęt”: dla każdego przycisku „Edytuj” najbliższy przodek li / role="listitem" / tr (bez niego – rodzic
 * przycisku); w kolejności dokumentu, z tekstem wpisu (zaczyna się od napisu wpisu, np. „Ćma 50 — 50/250 mm”).
 */
export function ownEntries(root: MarkupElement): { element: MarkupElement; text: string }[] {
  const edits = elementsOf(root).filter((element) => element.tag === 'button' && textOf(element) === 'Edytuj')
  return edits.map((edit) => {
    let entry = edit.parent ?? edit
    for (let node = edit.parent; node && node.tag !== '#root'; node = node.parent) {
      if (node.tag === 'li' || node.tag === 'tr' || node.attrs.role === 'listitem') {
        entry = node
        break
      }
    }
    return { element: entry, text: textOf(entry) }
  })
}

/** Pola tekstowe edycji wpisu w OwnEquipmentList według klucza `editForm` (z sondy, jak w renderEditor). */
export function renderOwnEdit(patch: Partial<OwnEquipmentListProps>) {
  const props = ownProps(patch)
  const onEditChange = vi.fn<(form: OwnEntryForm) => void>()
  const { markup, found } = probeAll(createElement(OwnEquipmentList, { ...props, onEditChange }), isTextInputHost)
  const root = parseMarkup(markup)
  const elements = textInputsOf(root)
  expect(elements.length, 'pola tekstowe w znacznikach i w sondzie').toBe(found.length)
  const fields: Record<string, MarkupElement> = {}
  const inputs: Record<string, Host> = {}
  found.forEach((host, index) => {
    onEditChange.mockClear()
    change(host, SENTINEL)
    const next = onEditChange.mock.calls[0]?.[0] as unknown as Record<string, unknown> | undefined
    const key = next ? Object.keys(next).find((name) => next[name] === SENTINEL) : undefined
    if (key) {
      fields[key] = elements[index]
      inputs[key] = host
    }
  })
  onEditChange.mockClear()
  return { root, markup, fields, inputs, onEditChange }
}

// ---------- Zakładka Ustawienia i górny pasek (stan aplikacji) ----------

/** renderToStaticMarkup czyta stan Zustand z getInitialState(); kopiujemy tam bieżący stan aplikacji. */
export function syncStore(): void {
  Object.assign(usePlannerStore.getInitialState(), usePlannerStore.getState())
}

/** Zakładka Ustawienia dla bieżącego stanu aplikacji: znaczniki, drzewo i przyciski z właściwościami (sonda). */
export function renderSettings() {
  syncStore()
  return buttonsOf(createElement(SettingsTab))
}

/** Nagłówki (h1–h6) w kolejności dokumentu. */
export function headingsOf(root: MarkupElement): MarkupElement[] {
  return elementsOf(root).filter((element) => /^h[1-6]$/.test(element.tag))
}

/** Część dokumentu od nagłówka do następnego nagłówka tego samego albo wyższego poziomu. */
export function partAfter(root: MarkupElement, heading: MarkupElement): MarkupElement[] {
  const all = elementsOf(root)
  const level = Number(heading.tag.slice(1))
  const rest = all.slice(all.indexOf(heading) + 1)
  const end = rest.findIndex((element) => /^h[1-6]$/.test(element.tag) && Number(element.tag.slice(1)) <= level)
  return end < 0 ? rest : rest.slice(0, end)
}

/** Jedyny nagłówek spełniający warunek. */
export function headingWhere(root: MarkupElement, test: (text: string) => boolean, what: string): MarkupElement {
  const found = headingsOf(root).filter((element) => test(textOf(element)))
  expect(found, `nagłówki ${what}`).toHaveLength(1)
  return found[0]
}

/** Pole części dokumentu o etykiecie zaczynającej się od `label` (jedyne). */
export function fieldIn(root: MarkupElement, part: readonly MarkupElement[], label: string): MarkupElement {
  const found = part.filter((element) => FIELD_TAGS.has(element.tag) && element.attrs.type !== 'checkbox' && element.attrs.type !== 'radio' && labelStartsWith(root, element, label))
  expect(found, `pola „${label}”`).toHaveLength(1)
  return found[0]
}

/** Typ kamery w części dokumentu: zaznaczona opcja pola „Typ” (select) albo zaznaczona opcja radiowa mono / OSC. */
export function sensorIn(root: MarkupElement, part: readonly MarkupElement[]): string {
  const selects = part.filter((element) => element.tag === 'select' && labelStartsWith(root, element, 'Typ'))
  if (selects.length === 1) return chosenText(root, selects)
  const radios = part.filter((element) => element.tag === 'input' && element.attrs.type === 'radio' && ['mono', 'OSC'].includes(fieldLabel(root, element)))
  return chosenText(root, radios)
}

/** Lista „Zestaw” na górnym pasku: tekst wybranej opcji i właściwości pola (z sondy). */
export function topBarProfile(): { selected: string; options: string[]; choose: (id: string) => void } {
  syncStore()
  const ids = new Set(usePlannerStore.getState().profiles.map((profile) => profile.id))
  const { markup, found } = probeAll(createElement(TopBar), (host) => {
    if (host.tag !== 'select') return false
    const values = selectOptions(host.props).map((option) => option.value)
    return values.length > 0 && values.every((value) => ids.has(value))
  })
  expect(found, 'lista „Zestaw” na górnym pasku').toHaveLength(1)
  const root = parseMarkup(markup)
  const selects = elementsOf(root).filter(
    (element) => element.tag === 'select' && elementsOf(element).some((option) => option.tag === 'option' && ids.has(option.attrs.value ?? '')),
  )
  expect(selects).toHaveLength(1)
  const options = elementsOf(selects[0]).filter((element) => element.tag === 'option')
  const selected = options.find((option) => 'selected' in option.attrs)
  return {
    selected: selected ? textOf(selected) : '',
    options: options.map((option) => textOf(option)),
    choose: (id) => change(found[0], id),
  }
}

/** Kolejne obroty pętli zdarzeń, aż `condition` będzie prawdą (najwyżej `ms`). */
export async function until(condition: () => boolean, ms = 2000): Promise<void> {
  await vi.waitFor(() => {
    if (!condition()) throw new Error('warunek jeszcze niespełniony')
  }, { timeout: ms, interval: 5 })
}

// ---------- Komunikat i element przy polu ----------

/** Pola formularza (input, select, textarea; bez ukrytych) w poddrzewie. */
export function fieldsIn(element: MarkupElement): MarkupElement[] {
  return elementsOf(element).filter((child) => FIELD_TAGS.has(child.tag) && child.attrs.type !== 'hidden')
}

export function ancestorsOf(element: MarkupElement): MarkupElement[] {
  const chain: MarkupElement[] = []
  for (let node: MarkupElement | null = element; node; node = node.parent) chain.push(node)
  return chain
}

/** Najmniejsze elementy, których tekst zawiera `message`. */
export function messageElements(root: MarkupElement, message: string): MarkupElement[] {
  return elementsOf(root).filter(
    (element) =>
      textOf(element).includes(message) &&
      !element.children.some((child) => typeof child !== 'string' && textOf(child).includes(message)),
  )
}

/**
 * Czy komunikat `message` stoi przy polu (jednym z `fields`): najmniejszy wspólny element pola i komunikatu nie zawiera
 * innych pól niż `fields`, albo pole wskazuje komunikat przez aria-describedby / aria-errormessage.
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

/** Najmniejszy wspólny przodek dwóch elementów. */
export function commonAncestor(a: MarkupElement, b: MarkupElement): MarkupElement | null {
  const chain = new Set(ancestorsOf(a))
  return ancestorsOf(b).find((node) => chain.has(node)) ?? null
}

/** Pozycja elementu w kolejności dokumentu. */
export function orderOf(root: MarkupElement, element: MarkupElement): number {
  return elementsOf(root).indexOf(element)
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
export function toggle(props: HostProps, checked: boolean, value = 'on'): void {
  handler(props, 'onChange')(fakeEvent({ checked, value, type: 'checkbox' }))
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
    .replace(/&nbsp;|&#160;/g, ' ')
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
 * Tekst elementu: tekst potomków (bez poddrzewa `skip`), spacje scalone. Sąsiednie węzły tekstu (np. „Usunąć<!-- -->„…”)
 * łączą się bez spacji, elementy blokowe rozdziela spacja.
 */
export function textOf(element: MarkupElement, skip: MarkupElement | null = null): string {
  const walk = (node: MarkupElement): string =>
    node.children
      .map((child) => {
        if (typeof child === 'string') return child
        if (child === skip) return ' '
        if (child.tag === 'select' || child.tag === 'svg') return ' '
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

const PALETTE =
  /^(?:[a-z0-9-]+:)*!?(?:text|bg|border(?:-[trblxy])?|ring|fill|stroke|outline|decoration|divide|accent|caret|from|via|to|shadow|placeholder)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white)(?:-\d+)?(?:\/\d+)?$/
const ARBITRARY_COLOR = /-\[(?:#|rgb|hsl|oklch|color:)/

/** Kolory spoza tokenów: klasy palety Tailwind, kolory wpisane w klasę albo w atrybut style. */
export function colorsOutsideTokens(root: MarkupElement): string[] {
  const offenders: string[] = []
  for (const element of elementsOf(root)) {
    for (const name of classesOf(element)) if (PALETTE.test(name) || ARBITRARY_COLOR.test(name)) offenders.push(name)
    const style = element.attrs.style ?? ''
    if (/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i.test(style)) offenders.push(`style="${style}"`)
  }
  return offenders
}

// ---------- Wysokość elementu ----------

const STYLES = readFileSync(new URL('../../../src/index.css', import.meta.url), 'utf8')

function cssMinHeightPx(className: string): number | null {
  if (!/^[a-z][a-z0-9-]*$/.test(className)) return null
  const rule = new RegExp(`\\.${className}\\s*\\{([^}]*)\\}`).exec(STYLES)
  const value = rule ? /min-height:\s*([\d.]+)(rem|px)/.exec(rule[1]) : null
  return value ? Number(value[1]) * (value[2] === 'rem' ? 16 : 1) : null
}

const toPx = (value: string, unit: string) => Number(value) * (unit === 'rem' ? 16 : 1)

/** Najmniejsza wysokość elementu [px] z klas (min-h-*, h-*, size-*, reguły z src/index.css) i atrybutu style. */
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
