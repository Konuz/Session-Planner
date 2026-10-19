// Wspólne narzędzia testów funkcji „profile-zestawow”.
// Nazwy, których spec nie podaje (wybrane przez test-author): pole stanu `profiles`, akcje `addProfile()`,
// `duplicateProfile(id)`, `saveProfile(profile)`, `removeProfile(id)` w src/state/plannerStore.ts. Wczytanie profili
// odbywa się przy starcie razem z lokalizacjami (`loadLocations`). Bazę sprawdzamy przez surowy wpis tabeli `settings`
// o kluczu `profiles` (wartość: lista profili), bez zakładania nazwy repozytorium.
// „Ponowne otwarcie aplikacji”: świeże moduły stanu, bazy i paska nad localStorage w pamięci (vi.resetModules).
// Testy działają w Node bez DOM; wybór z listy „Zestaw”: sonda (`probe`) w trakcie renderu oddaje właściwości <select>.
import { createElement, isValidElement, type ElementType, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { vi } from 'vitest'
import { DEMO_PROFILES } from '../../../src/data/demo'
import type { EquipmentProfile } from '../../../src/types'

// ---------- Profile z 6.4 ----------

export const MOJ_ID = 'demo-moj-zestaw'
export const REDCAT_ID = 'demo-redcat51-asi2600mc'
export const NEWTON_ID = 'demo-newton200-asi533mm'
export const ESPRIT_ID = 'demo-esprit100-asi6200mm'

export const DEMO_NAMES = [
  'Mój zestaw',
  'RedCat 51 + ASI2600MC Pro',
  'Newton 200/1000 + ASI533MM Pro',
  'Esprit 100ED + ASI6200MM Pro',
]

/** Głęboka kopia profilu z 6.4 o danym id. */
export function demo(id: string): EquipmentProfile {
  const found = DEMO_PROFILES.find((profile) => profile.id === id)
  if (found === undefined) throw new Error(`Brak profilu ${id} w DEMO_PROFILES`)
  return structuredClone(found)
}

/** Profil z 6.4 pod nowym id i nazwą (np. własny profil „Szeroki kadr”). */
export function custom(id: string, name: string, base: string = REDCAT_ID): EquipmentProfile {
  return { ...demo(base), id, name }
}

/** Wartości profilu bez id i nazwy (do porównania „z tymi samymi wartościami”). */
export function valuesOf(profile: EquipmentProfile): Omit<EquipmentProfile, 'id' | 'name'> {
  const copy: Partial<EquipmentProfile> = structuredClone(profile)
  delete copy.id
  delete copy.name
  return copy as Omit<EquipmentProfile, 'id' | 'name'>
}

/** Surowy profil z 6.4 bez ogniskowej teleskopu (uszkodzony wpis, P13). */
export function withoutFocalLength(id: string): unknown {
  const raw = structuredClone(demo(id)) as unknown as { telescope: Record<string, unknown> }
  delete raw.telescope.focalLengthMm
  return raw
}

// ---------- localStorage w pamięci ----------

/** Klucz zapisu preferencji interfejsu w localStorage. */
export const STORAGE_KEY = 'astrophotography-planner-ui'

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

/** localStorage z zapamiętanym id aktywnego profilu (zapis preferencji w wersji 1, jak robi to aplikacja). */
export function storageWithActive(activeProfileId: string): MemoryStorage {
  return new MemoryStorage({ [STORAGE_KEY]: JSON.stringify({ state: { activeProfileId }, version: 1 }) })
}

/** Zapamiętane preferencje (stan z localStorage). */
export function savedState(storage: MemoryStorage): Record<string, unknown> {
  const raw = storage.getItem(STORAGE_KEY)
  if (raw === null) return {}
  return (JSON.parse(raw) as { state: Record<string, unknown> }).state
}

// ---------- Uruchomienie aplikacji ----------

const PROFILES_KEY = 'profiles'

/** Uruchomienie aplikacji z danym localStorage: świeże moduły stanu, bazy i górnego paska (bez wczytania bazy). */
export async function startApp(storage: MemoryStorage = new MemoryStorage()) {
  vi.stubGlobal('localStorage', storage)
  vi.resetModules()
  const { usePlannerStore, activeProfileOf } = await import('../../../src/state/plannerStore')
  const { appDb } = await import('../../../src/data/appDb')
  const { TopBar } = await import('../../../src/app/TopBar')
  const store = usePlannerStore
  return {
    store,
    db: appDb,
    storage,
    activeProfileOf,
    state: () => store.getState(),
    profiles: () => store.getState().profiles,
    names: () => store.getState().profiles.map((profile) => profile.name),
    active: () => activeProfileOf(store.getState()),
    load: () => store.getState().loadLocations(),
    /** Surowa wartość wpisu `profiles` w tabeli `settings` (undefined, gdy wpisu nie ma). */
    async saved(): Promise<unknown> {
      return (await appDb.settings.get(PROFILES_KEY))?.value
    },
    /** Zapis surowej wartości wpisu `profiles` (np. uszkodzonej) wprost do tabeli `settings`. */
    async putSaved(value: unknown): Promise<void> {
      await appDb.settings.put({ id: PROFILES_KEY, value })
    },
    async clearSettings(): Promise<void> {
      await appDb.settings.clear()
    },
    /** Lista „Zestaw” na górnym pasku dla bieżącego stanu aplikacji. */
    topBar(): ProfileSelect {
      Object.assign(store.getInitialState(), store.getState())
      const ids = new Set([...DEMO_PROFILES, ...store.getState().profiles].map((profile) => profile.id))
      const found = probe(createElement(TopBar), (host) => isProfileSelect(host, ids))
      if (found.props === null) throw new Error('Na górnym pasku nie ma listy „Zestaw”')
      const props = found.props
      return {
        markup: found.markup,
        value: props.value,
        options: optionsOf(props).map((option) => option.text),
        values: optionsOf(props).map((option) => option.value),
        choose: (value: string) => choose(props, value),
      }
    },
  }
}

export type App = Awaited<ReturnType<typeof startApp>>

/** Czas na pierwsze wczytanie modułów (transformacja Vite trwa kilka sekund), żeby pierwszy test nie przekroczył limitu. */
export const WARM_UP_MS = 60_000

/** Pierwsze wczytanie modułów stanu, bazy i paska przed testami (do `beforeAll`). */
export async function warmUp(): Promise<void> {
  await startApp()
  vi.unstubAllGlobals()
}

/** Aplikacja uruchomiona po raz pierwszy: pusta tabela `settings`, pusty localStorage. */
export async function firstRun(): Promise<App> {
  const app = await startApp(new MemoryStorage())
  await app.clearSettings()
  return app
}

/** Ponowne otwarcie aplikacji (nowy pusty localStorage, chyba że podano inny) i wczytanie bazy jak przy starcie. */
export async function reopen(storage: MemoryStorage = new MemoryStorage()): Promise<App> {
  const app = await startApp(storage)
  await app.load()
  return app
}

// ---------- Sonda: właściwości elementów HTML w trakcie renderu ----------

type HostProps = Record<string, unknown>

interface Host {
  tag: string
  props: HostProps
}

export interface ProfileSelect {
  markup: string
  /** Wartość pola (id wybranego profilu). */
  value: unknown
  /** Teksty opcji w kolejności. */
  options: string[]
  /** Wartości opcji w kolejności. */
  values: unknown[]
  /** Wybór opcji o wartości `value` (`onChange` z atrapą zdarzenia). */
  choose: (value: string) => void
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

function textOf(node: unknown): string {
  const parts: string[] = []
  const walk = (value: unknown): void => {
    if (typeof value === 'string' || typeof value === 'number') parts.push(String(value))
    else if (Array.isArray(value)) value.forEach(walk)
    else if (isValidElement(value)) walk(expand(value))
  }
  walk(node)
  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

function optionsOf(props: HostProps): { value: unknown; text: string }[] {
  return [...hosts(props.children)]
    .filter((host) => host.tag === 'option')
    .map((option) => ({ value: option.props.value, text: textOf(option.props.children) }))
}

/** Lista „Zestaw”: <select>, którego wszystkie opcje mają za wartość id profilu. */
function isProfileSelect(host: Host, ids: ReadonlySet<string>): boolean {
  if (host.tag !== 'select') return false
  const values = optionsOf(host.props).map((option) => option.value)
  return values.length > 0 && values.every((value) => typeof value === 'string' && ids.has(value))
}

function probe(element: ReactElement, match: (host: Host) => boolean): { markup: string; props: HostProps | null } {
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

function choose(props: HostProps, value: string): void {
  const onChange = props.onChange
  if (typeof onChange !== 'function') throw new Error('Lista nie ma obsługi wyboru (onChange)')
  const target = { value }
  ;(onChange as (event: unknown) => void)({
    target,
    currentTarget: target,
    preventDefault() {},
    stopPropagation() {},
  })
}
