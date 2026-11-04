// Stan aplikacji (Zustand). Preferencje, sprzęt, horyzont i plan zapisują się w localStorage.
import { create } from 'zustand'
import { persist, type PersistStorage } from 'zustand/middleware'
import { EMPTY_FILTER, type CatalogFilter, type ObjectType, SKY_GROUPS, type SkyGroup } from '../lib/catalog'
import type { Mosaic } from '../lib/framing'
import type { HorizonPoint } from '../lib/horizon'
import { nightDateOf } from '../lib/night'
import { planExposures, type Exposure } from '../lib/exposures'
import type { Levels } from '../lib/stretch'

export interface Location {
  name: string
  region: string
  latDeg: number
  lonDeg: number
  elevationM: number
  timeZone: string
}

export const HOME: Location = {
  name: 'Chrząstawa Wielka',
  region: 'Dolny Śląsk, Polska',
  latDeg: 51.09,
  lonDeg: 17.29,
  elevationM: 130,
  timeZone: 'Europe/Warsaw',
}

export interface Equipment {
  telescopeId: string
  telescopeName: string
  apertureMm: number
  focalLengthMm: number
  reducer: number
  cameraId: string
  cameraName: string
  widthPx: number
  heightPx: number
  pixelUm: number
  binning: number
  mono: boolean
  seeingArcsec: number
}

interface SavedTelescope {
  id: string
  name: string
  apertureMm: number
  focalLengthMm: number
  reducer: number
}

interface SavedCamera {
  id: string
  name: string
  widthPx: number
  heightPx: number
  pixelUm: number
  binning: number
  mono: boolean
}

export const DEFAULT_EQUIPMENT: Equipment = {
  telescopeId: 'william-optics-redcat-51',
  telescopeName: 'William Optics RedCat 51',
  apertureMm: 51,
  focalLengthMm: 250,
  reducer: 1,
  cameraId: 'player-one-ares-m-pro',
  cameraName: 'Player One Ares-M Pro',
  widthPx: 3008,
  heightPx: 3008,
  pixelUm: 3.76,
  binning: 1,
  mono: true,
  seeingArcsec: 2.5,
}

export interface Framing {
  /** Środek kadru J2000 (null = środek obiektu). */
  raDeg: number | null
  decDeg: number | null
  paDeg: number
  /** Siatka paneli; brak = jeden kadr. */
  mosaic?: Mosaic
}

export interface PlanItem {
  key: string
  objectIndex: number
  objectId: string
  /** Ręczne okno [ms]; null = okno wyliczone automatycznie. */
  startMs: number | null
  endMs: number | null
  framing: Framing
  filters: string
  exposures?: Exposure[]
  note: string
}

export type Tab = 'sky' | 'catalog' | 'planner' | 'equipment' | 'horizon'
export type CenterMode = 'dome' | 'framing' | '3d'

interface State {
  tab: Tab
  catalogPlanMode: 'single' | 'multiple' | null
  centerMode: CenterMode
  location: Location
  savedLocations: Location[]
  nightDate: string
  /** Kursor czasu [ms UTC]; null = środek nocy / teraz. */
  timeMs: number | null
  selectedIndex: number | null
  /** Historia wybranych obiektów w tej sesji (bez zapisu) i pozycja w niej dla strzałek ‹ ›. */
  history: number[]
  historyPos: number
  equipment: Equipment
  savedTelescopes: SavedTelescope[]
  savedCameras: SavedCamera[]
  minAltDeg: number
  horizon: HorizonPoint[]
  framing: Framing
  /** Rozciągnięcie zdjęcia kadru (poziomy) osobno dla każdej warstwy; brak wpisu = bez zmian. */
  framingStretch: Record<string, Levels>
  plan: PlanItem[]
  favoriteIds: string[]
  filter: CatalogFilter
  sortBy: 'best' | 'alt' | 'hours' | 'mag' | 'size' | 'name'
  onlyVisible: boolean
  showLines: boolean
  showTracks: boolean
  showArt: boolean
  showOutlines: boolean
  /** Elipsy obiektów katalogu (wymiary i kąt pozycyjny) na kopule. */
  showEllipses: boolean
  /** Grupy katalogów widoczne na kopule (znaczniki, elipsy i kontury). */
  skyGroups: Record<SkyGroup, boolean>
  showLabels: boolean
  showAnnotations: boolean
  /** Podpisy obiektów tła w widoku 3D (domyślnie wyłączone). */
  show3DAnnotations: boolean
  annotationColors: Partial<Record<ObjectType, string>>
  /** Licznik „znajdź obiekt”: zmiana uruchamia animację na kopule. */
  findPulse: number

  setTab(tab: Tab, catalogPlanMode?: State['catalogPlanMode']): void
  setCenterMode(mode: CenterMode): void
  setLocation(loc: Location): void
  saveLocation(loc: Location): void
  removeLocation(name: string): void
  setNightDate(date: string): void
  setTime(t: number | null): void
  select(index: number | null, find?: boolean): void
  /** Poprzedni (-1) albo następny (+1) obiekt z historii, z animacją „znajdź obiekt”. */
  stepHistory(delta: number): void
  setEquipment(patch: Partial<Equipment>): void
  addTelescope(): void
  removeTelescope(): void
  addCamera(): void
  removeCamera(): void
  setMinAlt(v: number): void
  setHorizon(points: HorizonPoint[]): void
  setFraming(patch: Partial<Framing>): void
  /** null przywraca domyślne poziomy warstwy. */
  setFramingStretch(layer: string, levels: Levels | null): void
  addToPlan(index: number, id: string): void
  updatePlan(key: string, patch: Partial<PlanItem>): void
  removeFromPlan(key: string): void
  movePlan(key: string, delta: number): void
  toggleFavorite(id: string): void
  clearFavorites(): void
  setFilter(patch: Partial<CatalogFilter>): void
  setSort(s: State['sortBy']): void
  toggleSkyGroup(group: SkyGroup): void
  setAnnotationColor(type: ObjectType, color: string): void
  resetAnnotationColors(): void
  toggle(key: 'showLines' | 'showTracks' | 'showArt' | 'showOutlines' | 'showEllipses' | 'showLabels' | 'showAnnotations' | 'show3DAnnotations' | 'onlyVisible'): void
}

// Porównanie pól przed JSON.stringify: zmiany czasu i kadru nie serializują planu w każdej klatce.
let lastSaved: Partial<State> | null = null
const storage: PersistStorage<Partial<State>> = {
  getItem(name) {
    try {
      const raw = localStorage.getItem(name)
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  },
  setItem(name, value) {
    const keys = Object.keys(value.state) as (keyof State)[]
    if (lastSaved && keys.every((k) => Object.is(lastSaved![k], value.state[k]))) return
    lastSaved = value.state
    try { localStorage.setItem(name, JSON.stringify(value)) } catch { /* Stan pozostaje w pamięci; ponowimy przy następnej zmianie preferencji. */ }
  },
  removeItem(name) {
    lastSaved = null
    try { localStorage.removeItem(name) } catch { /* Magazyn może być niedostępny. */ }
  },
}

export const useStore = create<State>()(
  persist(
    (set) => ({
      tab: 'sky',
      catalogPlanMode: null,
      centerMode: 'dome',
      location: HOME,
      savedLocations: [HOME],
      nightDate: nightDateOf(Date.now(), HOME.timeZone),
      timeMs: null,
      selectedIndex: null,
      history: [],
      historyPos: -1,
      equipment: DEFAULT_EQUIPMENT,
      savedTelescopes: [],
      savedCameras: [],
      minAltDeg: 25,
      horizon: [],
      framing: { raDeg: null, decDeg: null, paDeg: 0 },
      framingStretch: {},
      plan: [],
      favoriteIds: [],
      filter: EMPTY_FILTER,
      sortBy: 'best',
      onlyVisible: false,
      showLines: true,
      showTracks: true,
      showArt: true,
      showOutlines: true,
      showEllipses: false,
      skyGroups: Object.fromEntries(SKY_GROUPS.map((g) => [g, true])) as Record<SkyGroup, boolean>,
      showLabels: true,
      showAnnotations: true,
      show3DAnnotations: false,
      annotationColors: {},
      findPulse: 0,

      setTab: (tab, catalogPlanMode) => set({ tab, catalogPlanMode: tab === 'catalog' ? catalogPlanMode ?? null : null }),
      setCenterMode: (centerMode) => set({ centerMode }),
      setLocation: (location) => set({ location, nightDate: nightDateOf(Date.now(), location.timeZone), timeMs: null }),
      saveLocation: (loc) => set((s) => ({ savedLocations: [loc, ...s.savedLocations.filter((l) => l.name !== loc.name)].slice(0, 12) })),
      removeLocation: (name) => set((s) => ({ savedLocations: s.savedLocations.filter((l) => l.name !== name) })),
      setNightDate: (nightDate) => set({ nightDate, timeMs: null }),
      setTime: (timeMs) => set({ timeMs }),
      select: (selectedIndex, find = true) =>
        set((s) => {
          // Nowy wybór ucina historię „do przodu” jak w przeglądarce; obiekt zapisany z poprzedniej wizyty otwiera historię.
          let history = s.history.slice(0, s.historyPos + 1)
          if (!history.length && s.selectedIndex !== null) history = [s.selectedIndex]
          if (selectedIndex !== null && history[history.length - 1] !== selectedIndex) history = [...history, selectedIndex]
          return {
            selectedIndex,
            history,
            historyPos: history.length - 1,
            framing: { raDeg: null, decDeg: null, paDeg: s.framing.paDeg },
            findPulse: find ? s.findPulse + 1 : s.findPulse,
          }
        }),
      stepHistory: (delta) =>
        set((s) => {
          const historyPos = s.historyPos + delta
          if (historyPos < 0 || historyPos >= s.history.length) return s
          return {
            historyPos,
            selectedIndex: s.history[historyPos],
            framing: { raDeg: null, decDeg: null, paDeg: s.framing.paDeg },
            findPulse: s.findPulse + 1,
          }
        }),
      setEquipment: (patch) => set((s) => {
        const equipment = { ...s.equipment, ...patch }
        return {
          equipment,
          savedTelescopes: s.savedTelescopes.map((item) => item.id === equipment.telescopeId ? {
            ...item, name: equipment.telescopeName, apertureMm: equipment.apertureMm,
            focalLengthMm: equipment.focalLengthMm, reducer: equipment.reducer,
          } : item),
          savedCameras: s.savedCameras.map((item) => item.id === equipment.cameraId ? {
            ...item, name: equipment.cameraName, widthPx: equipment.widthPx,
            heightPx: equipment.heightPx, pixelUm: equipment.pixelUm,
            binning: equipment.binning, mono: equipment.mono,
          } : item),
        }
      }),
      addTelescope: () => set((s) => {
        const id = crypto.randomUUID()
        return {
          savedTelescopes: [...s.savedTelescopes, {
            id, name: s.equipment.telescopeName || 'Własny teleskop',
            apertureMm: s.equipment.apertureMm, focalLengthMm: s.equipment.focalLengthMm, reducer: s.equipment.reducer,
          }],
          equipment: { ...s.equipment, telescopeId: id },
        }
      }),
      removeTelescope: () => set((s) => ({
        savedTelescopes: s.savedTelescopes.filter((item) => item.id !== s.equipment.telescopeId),
        equipment: { ...s.equipment, telescopeId: 'custom' },
      })),
      addCamera: () => set((s) => {
        const id = crypto.randomUUID()
        return {
          savedCameras: [...s.savedCameras, {
            id, name: s.equipment.cameraName || 'Własna kamera', widthPx: s.equipment.widthPx,
            heightPx: s.equipment.heightPx, pixelUm: s.equipment.pixelUm,
            binning: s.equipment.binning, mono: s.equipment.mono,
          }],
          equipment: { ...s.equipment, cameraId: id },
        }
      }),
      removeCamera: () => set((s) => ({
        savedCameras: s.savedCameras.filter((item) => item.id !== s.equipment.cameraId),
        equipment: { ...s.equipment, cameraId: 'custom' },
      })),
      setMinAlt: (minAltDeg) => set({ minAltDeg }),
      setHorizon: (horizon) => set({ horizon }),
      setFraming: (patch) => set((s) => ({ framing: { ...s.framing, ...patch } })),
      setFramingStretch: (layer, levels) => set((s) => {
        const rest = { ...s.framingStretch }
        delete rest[layer]
        return { framingStretch: levels ? { ...rest, [layer]: levels } : rest }
      }),
      addToPlan: (objectIndex, objectId) =>
        set((s) =>
          s.plan.some((p) => p.objectId === objectId)
            ? s
            : {
                plan: [
                  ...s.plan,
                  {
                    key: `${objectIndex}-${Date.now()}`,
                    objectIndex,
                    objectId,
                    startMs: null,
                    endMs: null,
                    framing: s.selectedIndex === objectIndex ? s.framing : { raDeg: null, decDeg: null, paDeg: 0 },
                    filters: s.equipment.mono ? 'L, R, G, B' : 'OSC',
                    exposures: planExposures({ filters: s.equipment.mono ? 'L, R, G, B' : 'OSC' }),
                    note: '',
                  },
                ],
              },
        ),
      updatePlan: (key, patch) => set((s) => ({ plan: s.plan.map((p) => (p.key === key ? { ...p, ...patch } : p)) })),
      removeFromPlan: (key) => set((s) => ({ plan: s.plan.filter((p) => p.key !== key) })),
      movePlan: (key, delta) =>
        set((s) => {
          const i = s.plan.findIndex((p) => p.key === key)
          const j = i + delta
          if (i < 0 || j < 0 || j >= s.plan.length) return s
          const plan = [...s.plan]
          ;[plan[i], plan[j]] = [plan[j], plan[i]]
          return { plan }
        }),
      toggleFavorite: (id) => set((s) => ({ favoriteIds: s.favoriteIds.includes(id) ? s.favoriteIds.filter((value) => value !== id) : [...s.favoriteIds, id] })),
      clearFavorites: () => set({ favoriteIds: [] }),
      setFilter: (patch) => set((s) => ({ filter: { ...s.filter, ...patch } })),
      setSort: (sortBy) => set({ sortBy }),
      toggleSkyGroup: (group) => set((s) => ({ skyGroups: { ...s.skyGroups, [group]: !s.skyGroups[group] } })),
      setAnnotationColor: (type, color) => set((s) => ({ annotationColors: { ...s.annotationColors, [type]: color } })),
      resetAnnotationColors: () => set({ annotationColors: {} }),
      toggle: (key) => set((s) => ({ [key]: !s[key] }) as Partial<State>),
    }),
    {
      name: 'konuzastro-tracker',
      storage,
      version: 1,
      partialize: (s) => ({
        location: s.location,
        savedLocations: s.savedLocations,
        selectedIndex: s.selectedIndex,
        equipment: s.equipment,
        savedTelescopes: s.savedTelescopes,
        savedCameras: s.savedCameras,
        minAltDeg: s.minAltDeg,
        horizon: s.horizon,
        framingStretch: s.framingStretch,
        plan: s.plan,
        favoriteIds: s.favoriteIds,
        filter: s.filter,
        sortBy: s.sortBy,
        onlyVisible: s.onlyVisible,
        showLines: s.showLines,
        showTracks: s.showTracks,
        showArt: s.showArt,
        showOutlines: s.showOutlines,
        showEllipses: s.showEllipses,
        skyGroups: s.skyGroups,
        showLabels: s.showLabels,
        showAnnotations: s.showAnnotations,
        show3DAnnotations: s.show3DAnnotations,
        annotationColors: s.annotationColors,
      }),
      // Grupy katalogów dopisane po zapisie stanu startują włączone; stan sprzed poziomów kadru dostaje pusty obiekt.
      merge: (persisted, current) => {
        const p = persisted as Partial<State> | undefined
        return { ...current, ...p, skyGroups: { ...current.skyGroups, ...p?.skyGroups }, framingStretch: { ...p?.framingStretch } }
      },
      // Noc zawsze startuje od bieżącej daty w strefie zapisanej lokalizacji.
      onRehydrateStorage: () => (state) => {
        if (state) queueMicrotask(() => {
          useStore.setState({ nightDate: nightDateOf(Date.now(), state.location.timeZone) })
          // Dawny suwak głębi powyżej 0 oznaczał widoczne elipsy.
          if ((state as { annotationDepth?: number }).annotationDepth) useStore.setState({ showEllipses: true })
          if (state.equipment.telescopeId === 'gso-newton-150-600') useStore.getState().setEquipment({
            telescopeId: DEFAULT_EQUIPMENT.telescopeId,
            telescopeName: DEFAULT_EQUIPMENT.telescopeName,
            apertureMm: DEFAULT_EQUIPMENT.apertureMm,
            focalLengthMm: DEFAULT_EQUIPMENT.focalLengthMm,
          })
        })
      },
    },
  ),
)
