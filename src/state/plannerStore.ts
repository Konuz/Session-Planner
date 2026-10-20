// Stan globalny (7.0): lokalizacje, parametry planowania, noc D, aktywny zestaw, kursor czasu, Red Mode i zakładka.
// W localStorage zostają tylko drobne preferencje interfejsu (sekcja 3); lokalizacje i parametry są w IndexedDB.
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { appDb } from '../data/appDb'
import { DEFAULT_PROFILE_ID, DEMO_PROFILES } from '../data/demo'
import { DEFAULT_LOCATIONS, DEFAULT_LOCATION_ID } from '../data/locations'
import { locationRepository, planningSettingsRepository, profileRepository } from '../data/repositories'
import { DEFAULT_CATALOG_FILTERS, type CatalogFilterState } from '../services/catalogFilters'
import { DEFAULT_CATALOG_SORT, type CatalogSortKey } from '../services/catalogSort'
import { defaultCursorMs } from '../services/nightChart'
import { newProfileId, profileErrors, uniqueName } from '../services/equipment'
import { DEFAULT_PLANNING_SETTINGS } from '../services/planningSettings'
import { currentNightDate } from '../services/time'
import { darknessWindow, nightRange } from '../services/visibility'
import type { EquipmentProfile, Framing, ObserverLocation, PlanningSettings } from '../types'

export type Tab = 'catalog' | 'night' | 'framing' | 'settings'

interface PlannerState {
  locations: ObserverLocation[]
  locationsReady: boolean
  storageError: string | null
  activeLocationId: string
  activeProfileId: string
  /** Profile sprzętu (IndexedDB, tabela `settings`, wpis `profiles`); bez bazy – profile z 6.4. */
  profiles: EquipmentProfile[]
  /** Noc D, 'RRRR-MM-DD'. */
  nightDate: string
  cursorMs: number
  /** Tryb „Teraz”: kursor podąża za zegarem. */
  followNow: boolean
  redMode: boolean
  tab: Tab
  /** Obiekt na wykresie nocy (uid z katalogu); null = obiekt domyślny. */
  objectUid: string | null
  /** Parametry planowania (IndexedDB); przed wczytaniem bazy albo bez bazy – wartości domyślne. */
  planningSettings: PlanningSettings
  /** Filtry zakładki Katalog; bez zapisu między sesjami. */
  catalogFilters: CatalogFilterState
  /** Sortowanie zakładki Katalog; bez zapisu między sesjami. */
  catalogSort: CatalogSortKey
  /** Kadr zakładki Kadr (środek, PA, mozaika); null = jeszcze nie ustawiony. Tylko w pamięci, bez zapisu. */
  framing: Framing | null
  /** uid obiektu, na którym wyśrodkowano `framing`; inny pokazywany obiekt przenosi środek na siebie. */
  framingObjectUid: string | null
}

interface PlannerActions {
  loadLocations: () => Promise<void>
  saveLocation: (location: ObserverLocation) => Promise<void>
  removeLocation: (id: string) => Promise<void>
  /** Zapis parametrów planowania; parametry z błędem są odrzucane (wyjątek), stan zostaje bez zmian. */
  savePlanningSettings: (settings: PlanningSettings) => Promise<void>
  /** Dodaj: na końcu listy profil „Nowy zestaw” (wartości „Mój zestaw” z 6.4); aktywny bez zmian. */
  addProfile: () => Promise<void>
  /** Duplikuj: na końcu listy kopia profilu `id` („… (kopia)”); aktywny bez zmian. */
  duplicateProfile: (id: string) => Promise<void>
  /** Zapis profilu (po id albo na końcu listy); błędy z `validateEquipment` i pusta nazwa → wyjątek, stan bez zmian. */
  saveProfile: (profile: EquipmentProfile) => Promise<void>
  /** Usunięcie profilu; ostatniego profilu nie da się usunąć. */
  removeProfile: (id: string) => Promise<void>
  selectLocation: (id: string) => void
  selectProfile: (id: string) => void
  setNightDate: (nightDate: string) => void
  setCursor: (timeMs: number) => void
  goNow: (nowMs: number) => void
  toggleRedMode: () => void
  setTab: (tab: Tab) => void
  selectObject: (uid: string) => void
  /**
   * Otwarcie obiektu z katalogu na wykresie nocy: uid trafia do `objectUid`, zakładka zmienia się na 'night';
   * noc D, lokalizacja i kursor czasu (z trybem „Teraz”) zostają bez zmian.
   */
  openObject: (uid: string) => void
  setCatalogFilters: (filters: CatalogFilterState) => void
  setCatalogSort: (sort: CatalogSortKey) => void
  /** Zapis kadru zakładki Kadr razem z uid obiektu, przy którym go ustawiono. */
  updateFraming: (objectUid: string, framing: Framing) => void
}

export type PlannerStore = PlannerState & PlannerActions

/** Aktywna lokalizacja; przed wczytaniem bazy – pierwsza z lokalizacji startowych. */
export function activeLocationOf(state: Pick<PlannerState, 'locations' | 'activeLocationId'>): ObserverLocation {
  return state.locations.find((location) => location.id === state.activeLocationId) ?? state.locations[0] ?? DEFAULT_LOCATIONS[0]
}

/** Aktywny profil z listy w stanie (bez niej – z 6.4); nieznane id → „Mój zestaw”, a bez niego pierwszy profil. */
export function activeProfileOf(
  state: Pick<PlannerState, 'activeProfileId'> & { profiles?: readonly EquipmentProfile[] },
): EquipmentProfile {
  const profiles = state.profiles !== undefined && state.profiles.length > 0 ? state.profiles : DEMO_PROFILES
  return (
    profiles.find((profile) => profile.id === state.activeProfileId) ??
    profiles.find((profile) => profile.id === DEFAULT_PROFILE_ID) ??
    profiles[0]
  )
}

/** Kopia profilu pod nową nazwą i nowym id (wartości niezależne od oryginału). */
function copyProfile(source: EquipmentProfile, profiles: readonly EquipmentProfile[], name: string): EquipmentProfile {
  return { ...structuredClone(source), id: newProfileId(profiles.map((profile) => profile.id)), name }
}

/** Noc D i kursor: w trybie „Teraz” bieżąca noc i zegar, inaczej kursor domyślny dla nocy z progu ciemności (7.0). */
function nightAndCursor(
  location: ObserverLocation,
  settings: PlanningSettings,
  nightDate: string,
  followNow: boolean,
  nowMs: number,
) {
  if (followNow) return { nightDate: currentNightDate(nowMs, location.timezone), cursorMs: nowMs }
  const night = nightRange(nightDate, location.timezone)
  const darkness = darknessWindow(location, night, settings.darknessThresholdDeg, settings.autoLowerThreshold)
  return { nightDate, cursorMs: defaultCursorMs({ darkness, nightDate, timeZone: location.timezone }) }
}

function notImplemented(name: string, ...args: unknown[]): never {
  const error = new Error(`${name}: not implemented (${args.length})`)
  error.name = 'NotImplementedError'
  throw error
}

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error))

const DEFAULT_PROFILE = DEMO_PROFILES.find((profile) => profile.id === DEFAULT_PROFILE_ID) ?? DEMO_PROFILES[0]

export const usePlannerStore = create<PlannerStore>()(
  persist(
    (set, get) => {
      const startMs = Date.now()
      /** Zapis listy profili do bazy, a dopiero potem do stanu (błąd bazy zostawia stan bez zmian). */
      const commitProfiles = async (profiles: EquipmentProfile[]) => {
        await profileRepository.save(appDb, profiles)
        set({ profiles })
      }
      return {
        locations: [],
        locationsReady: false,
        storageError: null,
        activeLocationId: DEFAULT_LOCATION_ID,
        activeProfileId: DEFAULT_PROFILE_ID,
        profiles: [...DEMO_PROFILES],
        nightDate: currentNightDate(startMs, DEFAULT_LOCATIONS[0].timezone),
        cursorMs: startMs,
        followNow: true,
        redMode: false,
        tab: 'catalog',
        objectUid: null,
        planningSettings: DEFAULT_PLANNING_SETTINGS,
        catalogFilters: DEFAULT_CATALOG_FILTERS,
        catalogSort: DEFAULT_CATALOG_SORT,
        framing: null,
        framingObjectUid: null,

        async loadLocations() {
          let locations: ObserverLocation[]
          let storageError: string | null = null
          try {
            locations = await locationRepository.seed(appDb, DEFAULT_LOCATIONS)
          } catch (error) {
            locations = [...DEFAULT_LOCATIONS]
            storageError = `Baza danych przeglądarki jest niedostępna, więc zmian lokalizacji nie da się zapisać (${errorText(error)}).`
          }
          const planningSettings = await planningSettingsRepository.load(appDb).catch(() => DEFAULT_PLANNING_SETTINGS)
          const profiles = await profileRepository.load(appDb, DEMO_PROFILES).catch(() => [...DEMO_PROFILES])
          set((state) => {
            const location = activeLocationOf({ locations, activeLocationId: state.activeLocationId })
            return {
              locations,
              locationsReady: true,
              storageError,
              planningSettings,
              profiles,
              activeProfileId: activeProfileOf({ profiles, activeProfileId: state.activeProfileId }).id,
              activeLocationId: location.id,
              ...nightAndCursor(location, planningSettings, state.nightDate, state.followNow, Date.now()),
            }
          })
        },

        async saveLocation(location) {
          await locationRepository.save(appDb, location)
          const locations = await locationRepository.list(appDb)
          set((state) => ({
            locations,
            activeLocationId: location.id,
            ...(state.followNow ? nightAndCursor(location, state.planningSettings, state.nightDate, true, Date.now()) : {}),
          }))
        },

        async removeLocation(id) {
          if (get().locations.length <= 1) return
          await locationRepository.remove(appDb, id)
          const locations = await locationRepository.list(appDb)
          set((state) => {
            const location = activeLocationOf({ locations, activeLocationId: state.activeLocationId })
            return {
              locations,
              activeLocationId: location.id,
              ...nightAndCursor(location, state.planningSettings, state.nightDate, state.followNow, Date.now()),
            }
          })
        },

        async savePlanningSettings(planningSettings) {
          await planningSettingsRepository.save(appDb, planningSettings)
          set({ planningSettings })
        },

        async addProfile() {
          const { profiles } = get()
          const names = profiles.map((profile) => profile.name)
          const name = uniqueName(names, 'Nowy zestaw', (n) => `Nowy zestaw ${n}`)
          await commitProfiles([...profiles, copyProfile(DEFAULT_PROFILE, profiles, name)])
        },

        async duplicateProfile(id) {
          const { profiles } = get()
          const source = profiles.find((profile) => profile.id === id)
          if (source === undefined) throw new Error(`Nie ma profilu ${id}`)
          const names = profiles.map((profile) => profile.name)
          const name = uniqueName(names, `${source.name} (kopia)`, (n) => `${source.name} (kopia ${n})`)
          await commitProfiles([...profiles, copyProfile(source, profiles, name)])
        },

        async saveProfile(profile) {
          const errors = profileErrors(profile)
          if (errors.length > 0) throw new Error(errors.join('; '))
          const saved = structuredClone({ ...profile, name: profile.name.trim() })
          const { profiles } = get()
          const exists = profiles.some((entry) => entry.id === saved.id)
          await commitProfiles(exists ? profiles.map((entry) => (entry.id === saved.id ? saved : entry)) : [...profiles, saved])
        },

        async removeProfile(id) {
          const { profiles } = get()
          if (profiles.length <= 1) return
          const rest = profiles.filter((profile) => profile.id !== id)
          await profileRepository.save(appDb, rest)
          set((state) => ({ profiles: rest, activeProfileId: activeProfileOf({ ...state, profiles: rest }).id }))
        },

        selectLocation(id) {
          set((state) => {
            const location = activeLocationOf({ locations: state.locations, activeLocationId: id })
            return {
              activeLocationId: location.id,
              ...nightAndCursor(location, state.planningSettings, state.nightDate, state.followNow, Date.now()),
            }
          })
        },

        selectProfile(id) {
          set({ activeProfileId: id })
        },

        setNightDate(nightDate) {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(nightDate)) return
          set((state) => ({
            followNow: false,
            ...nightAndCursor(activeLocationOf(state), state.planningSettings, nightDate, false, Date.now()),
          }))
        },

        setCursor(timeMs) {
          set({ followNow: false, cursorMs: timeMs })
        },

        goNow(nowMs) {
          set((state) => ({
            followNow: true,
            ...nightAndCursor(activeLocationOf(state), state.planningSettings, state.nightDate, true, nowMs),
          }))
        },

        toggleRedMode() {
          set((state) => ({ redMode: !state.redMode }))
        },

        setTab(tab) {
          set({ tab })
        },

        selectObject(uid) {
          set({ objectUid: uid })
        },

        openObject(uid) {
          set({ objectUid: uid, tab: 'night' })
        },

        setCatalogFilters(catalogFilters) {
          set({ catalogFilters })
        },

        setCatalogSort(catalogSort) {
          set({ catalogSort })
        },

        updateFraming(objectUid, framing) {
          notImplemented('updateFraming', objectUid, framing)
        },
      }
    },
    {
      name: 'astrophotography-planner-ui',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ activeLocationId, activeProfileId, redMode, tab, objectUid }) => ({
        activeLocationId,
        activeProfileId,
        redMode,
        tab,
        objectUid,
      }),
    },
  ),
)

export const useActiveLocation = () => usePlannerStore(activeLocationOf)
export const useActiveProfile = () => usePlannerStore(activeProfileOf)
