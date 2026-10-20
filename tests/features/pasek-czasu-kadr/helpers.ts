// Wspólne narzędzia testów funkcji „pasek-czasu-kadr” (spec: .autoloop/features/pasek-czasu-kadr/spec.md).
// Testy działają w Node bez DOM: górny pasek renderuje `renderToStaticMarkup`, a sonda w trakcie renderu rozwija
// drzewo elementów i oddaje właściwości elementów HTML (wybór z listy, zmiana daty, kliknięcie: wywołanie `onChange`
// albo `onClick` z atrapą zdarzenia). Stan aplikacji to wspólny `usePlannerStore`; przed każdym renderem stan
// bieżący trafia do stanu początkowego sklepu (render po stronie serwera czyta właśnie jego).
import { fromZonedTime } from 'date-fns-tz'
import { createElement, isValidElement, type ElementType, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { TopBar } from '../../../src/app/TopBar'
import { DEFAULT_PROFILE_ID, DEMO_PROFILES } from '../../../src/data/demo'
import { DEFAULT_LOCATIONS, DEFAULT_LOCATION_ID } from '../../../src/data/locations'
import { usePlannerStore, type Tab } from '../../../src/state/plannerStore'
import type { ObserverLocation } from '../../../src/types'

export const ZONE = 'Europe/Warsaw'
export const NIGHT = '2026-10-20'

/** Chwila czasu lokalnego (strefa domyślnej lokalizacji), np. local('2026-10-20T23:00'). */
export function local(dateTime: string): number {
  return fromZonedTime(`${dateTime}:00`, ZONE).getTime()
}

export const CURSOR_2300 = local('2026-10-20T23:00')

export const MOJ_ID = DEFAULT_PROFILE_ID
export const REDCAT_ID = 'demo-redcat51-asi2600mc'
export const NEWTON_ID = 'demo-newton200-asi533mm'
export const ESPRIT_ID = 'demo-esprit100-asi6200mm'

/** Druga lokalizacja (kopia domyślnej pod innym id i nazwą), żeby było co wybrać z listy „Lokalizacja”. */
export const SECOND_LOCATION: ObserverLocation = {
  ...structuredClone(DEFAULT_LOCATIONS[0]),
  id: 'test-druga-lokalizacja',
  name: 'Druga lokalizacja testowa',
}

/** Stan wyjściowy przykładów: lokalizacja domyślna, noc 20/21.10.2026, „Teraz” wyłączone, kursor 23:00. */
export function resetState(patch: Partial<ReturnType<typeof usePlannerStore.getState>> = {}): void {
  usePlannerStore.setState({
    locations: [...DEFAULT_LOCATIONS, SECOND_LOCATION],
    locationsReady: true,
    storageError: null,
    activeLocationId: DEFAULT_LOCATION_ID,
    activeProfileId: MOJ_ID,
    profiles: [...DEMO_PROFILES],
    nightDate: NIGHT,
    cursorMs: CURSOR_2300,
    followNow: false,
    redMode: false,
    tab: 'catalog',
    objectUid: null,
    framing: null,
    framingObjectUid: null,
    ...patch,
  })
}

export function state() {
  return usePlannerStore.getState()
}

export function setTab(tab: Tab): void {
  usePlannerStore.getState().setTab(tab)
}

// ---------- Sonda ----------

type HostProps = Record<string, unknown>

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

function* hosts(node: unknown): Generator<Host> {
  if (Array.isArray(node)) {
    for (const child of node) yield* hosts(child)
    return
  }
  if (!isValidElement(node)) return
  if (typeof node.type === 'string') yield { tag: node.type, props: node.props as HostProps }
  yield* hosts(expand(node))
}

/** Tekst dzieci elementu HTML (tylko teksty i elementy HTML; ikony nie mają tekstu). */
export function hostText(node: unknown): string {
  const parts: string[] = []
  const walk = (value: unknown): void => {
    if (typeof value === 'string' || typeof value === 'number') parts.push(String(value))
    else if (Array.isArray(value)) value.forEach(walk)
    else if (isValidElement(value) && typeof value.type === 'string') walk((value.props as HostProps).children)
  }
  walk(node)
  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

function optionValues(props: HostProps): unknown[] {
  return [...hosts(props.children)].filter((host) => host.tag === 'option').map((option) => option.props.value)
}

export interface Bar {
  markup: string
  hosts: Host[]
  /** Suwaki (input type=range). */
  ranges: Host[]
  outputs: Host[]
  /** Przyciski, których tekst zawiera „Teraz”. */
  nowButtons: Host[]
  redModeButtons: Host[]
  dateInputs: Host[]
  /** Listy, których wszystkie opcje to id profili („Zestaw”). */
  profileSelects: Host[]
  /** Listy, których wszystkie opcje to id lokalizacji („Lokalizacja”). */
  locationSelects: Host[]
}

/** Górny pasek dla bieżącego stanu aplikacji: znaczniki i elementy HTML w kolejności dokumentu. */
export function renderBar(): Bar {
  Object.assign(usePlannerStore.getInitialState(), usePlannerStore.getState())
  const element = createElement(TopBar)
  const found: Host[] = []
  const sonda = () => {
    found.length = 0
    for (const host of hosts(element)) found.push(host)
    return element
  }
  const markup = renderToStaticMarkup(createElement(sonda))
  const current = usePlannerStore.getState()
  const profileIds = new Set([...DEMO_PROFILES, ...current.profiles].map((profile) => profile.id))
  const locationIds = new Set([...DEFAULT_LOCATIONS, ...current.locations].map((location) => location.id))
  const selectWith = (ids: ReadonlySet<string>) =>
    found.filter((host) => {
      if (host.tag !== 'select') return false
      const values = optionValues(host.props)
      return values.length > 0 && values.every((value) => typeof value === 'string' && ids.has(value))
    })
  return {
    markup,
    hosts: [...found],
    ranges: found.filter((host) => host.tag === 'input' && host.props.type === 'range'),
    outputs: found.filter((host) => host.tag === 'output'),
    nowButtons: found.filter((host) => host.tag === 'button' && hostText(host.props.children).includes('Teraz')),
    redModeButtons: found.filter((host) => host.tag === 'button' && hostText(host.props.children).includes('Red Mode')),
    dateInputs: found.filter((host) => host.tag === 'input' && host.props.type === 'date'),
    profileSelects: selectWith(profileIds),
    locationSelects: selectWith(locationIds),
  }
}

/** Wywołanie `onChange` elementu z atrapą zdarzenia o wartości `value`. */
export function change(host: Host, value: string): void {
  const onChange = host.props.onChange
  if (typeof onChange !== 'function') throw new Error(`<${host.tag}> nie ma obsługi zmiany (onChange)`)
  const target = { value }
  ;(onChange as (event: unknown) => void)({ target, currentTarget: target, preventDefault() {}, stopPropagation() {} })
}

/** Wywołanie `onClick` elementu z atrapą zdarzenia. */
export function click(host: Host): void {
  const onClick = host.props.onClick
  if (typeof onClick !== 'function') throw new Error(`<${host.tag}> nie ma obsługi kliknięcia (onClick)`)
  ;(onClick as (event: unknown) => void)({ preventDefault() {}, stopPropagation() {} })
}

/** Tekst pola z godziną (element <output>). */
export function outputText(host: Host): string {
  return hostText(host.props.children)
}

/** Pasek ma pełny wiersz kursora: jeden suwak „Kursor czasu”, jedno pole z godziną i jeden przycisk „Teraz”. */
export function cursorRow(bar: Bar): { range: Host; output: Host; now: Host } {
  if (bar.ranges.length !== 1) throw new Error(`suwaków: ${bar.ranges.length}, oczekiwano 1`)
  if (bar.outputs.length !== 1) throw new Error(`pól z godziną: ${bar.outputs.length}, oczekiwano 1`)
  if (bar.nowButtons.length !== 1) throw new Error(`przycisków „Teraz”: ${bar.nowButtons.length}, oczekiwano 1`)
  return { range: bar.ranges[0], output: bar.outputs[0], now: bar.nowButtons[0] }
}

/** Indeks elementu na liście elementów paska (kolejność dokumentu). */
export function indexOf(bar: Bar, host: Host): number {
  return bar.hosts.indexOf(host)
}
