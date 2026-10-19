// Stan globalny (7.0): lokalizacje, parametry planowania, noc D, aktywny zestaw, kursor czasu, Red Mode i zakładka.
// W localStorage zostają tylko drobne preferencje interfejsu (sekcja 3); lokalizacje i parametry są w IndexedDB.
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { appDb } from '../data/appDb'
import { DEFAULT_PROFILE_ID, DEMO_PROFILES } from '../data/demo'
import { DEFAULT_LOCATIONS, DEFAULT_LOCATION_ID } from '../data/locations'
import { locationRepository, planningSettingsRepository } from '../data/repositories'
import { DEFAULT_CATALOG_FILTERS, type CatalogFilterState } from '../services/catalogFilters'
import { DEFAULT_CATALOG_SORT, type CatalogSortKey } from '../services/catalogSort'
import { defaultCursorMs } from '../services/nightChart'
import { DEFAULT_PLANNING_SETTINGS } from '../services/planningSettings'
import { currentNightDate } from '../services/time'
import { darknessWindow, nightRange } from '../services/visibility'
import type { EquipmentProfile, ObserverLocation, PlanningSettings } from '../types'

/** Profile sprzętu z 6.4; dodawanie i edycję profili obejmuje moduł 7F. */
export const PROFILES: readonly EquipmentProfile[] = DEMO_PROFILES

export type Tab = 'catalog' | 'night' | 'settings'

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
}

export type PlannerStore = PlannerState & PlannerActions

/** Aktywna lokalizacja; przed wczytaniem bazy – pierwsza z lokalizacji startowych. */
export function activeLocationOf(state: Pick<PlannerState, 'locations' | 'activeLocationId'>): ObserverLocation {
  return state.locations.find((location) => location.id === state.activeLocationId) ?? state.locations[0] ?? DEFAULT_LOCATIONS[0]
}

export function activeProfileOf(
  state: Pick<PlannerState, 'activeProfileId'> & { profiles?: readonly EquipmentProfile[] },
): EquipmentProfile {
  return (
    PROFILES.find((profile) => profile.id === state.activeProfileId) ??
    PROFILES.find((profile) => profile.id === DEFAULT_PROFILE_ID) ??
    PROFILES[0]
  )
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

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error))

export const usePlannerStore = create<PlannerStore>()(
  persist(
    (set, get) => {
      const startMs = Date.now()
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
          set((state) => {
            const location = activeLocationOf({ locations, activeLocationId: state.activeLocationId })
            return {
              locations,
              locationsReady: true,
              storageError,
              planningSettings,
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

        addProfile() {
          return Promise.reject(new Error('NotImplementedError: addProfile'))
        },

        duplicateProfile() {
          return Promise.reject(new Error('NotImplementedError: duplicateProfile'))
        },

        saveProfile() {
          return Promise.reject(new Error('NotImplementedError: saveProfile'))
        },

        removeProfile() {
          return Promise.reject(new Error('NotImplementedError: removeProfile'))
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
