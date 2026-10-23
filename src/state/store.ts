// Stan aplikacji (Zustand). Preferencje, sprzęt, horyzont i plan zapisują się w localStorage.
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { EMPTY_FILTER, type CatalogFilter } from '../lib/catalog'
import type { HorizonPoint } from '../lib/horizon'
import { nightDateOf } from '../lib/night'

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

export const DEFAULT_EQUIPMENT: Equipment = {
  telescopeId: 'gso-newton-150-600',
  telescopeName: 'GSO Newton 6" f/4',
  apertureMm: 150,
  focalLengthMm: 600,
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
  note: string
}

export type Tab = 'sky' | 'catalog' | 'planner' | 'equipment' | 'horizon'
export type CenterMode = 'dome' | 'framing' | '3d'

interface State {
  tab: Tab
  centerMode: CenterMode
  location: Location
  savedLocations: Location[]
  nightDate: string
  /** Kursor czasu [ms UTC]; null = środek nocy / teraz. */
  timeMs: number | null
  selectedIndex: number | null
  equipment: Equipment
  minAltDeg: number
  horizon: HorizonPoint[]
  framing: Framing
  plan: PlanItem[]
  filter: CatalogFilter
  sortBy: 'best' | 'alt' | 'hours' | 'mag' | 'size' | 'name'
  onlyVisible: boolean
  showLines: boolean
  showTracks: boolean
  showArt: boolean
  showOutlines: boolean
  /** Głębia adnotacji kopuły: 0 — tylko kontury, 1 — + NGC/IC, 2 — + Sh2, Barnard, vdB, 3 — + LBN, LDN, SNR. */
  annotationDepth: number
  showLabels: boolean
  /** Licznik „znajdź obiekt” — zmiana uruchamia animację na kopule. */
  findPulse: number

  setTab(tab: Tab): void
  setCenterMode(mode: CenterMode): void
  setLocation(loc: Location): void
  saveLocation(loc: Location): void
  removeLocation(name: string): void
  setNightDate(date: string): void
  setTime(t: number | null): void
  select(index: number | null, find?: boolean): void
  setEquipment(patch: Partial<Equipment>): void
  setMinAlt(v: number): void
  setHorizon(points: HorizonPoint[]): void
  setFraming(patch: Partial<Framing>): void
  addToPlan(index: number, id: string): void
  updatePlan(key: string, patch: Partial<PlanItem>): void
  removeFromPlan(key: string): void
  movePlan(key: string, delta: number): void
  setFilter(patch: Partial<CatalogFilter>): void
  setSort(s: State['sortBy']): void
  setAnnotationDepth(depth: number): void
  toggle(key: 'showLines' | 'showTracks' | 'showArt' | 'showOutlines' | 'showLabels' | 'onlyVisible'): void
}

export const useStore = create<State>()(
  persist(
    (set) => ({
      tab: 'sky',
      centerMode: 'dome',
      location: HOME,
      savedLocations: [HOME],
      nightDate: nightDateOf(Date.now(), HOME.timeZone),
      timeMs: null,
      selectedIndex: null,
      equipment: DEFAULT_EQUIPMENT,
      minAltDeg: 25,
      horizon: [],
      framing: { raDeg: null, decDeg: null, paDeg: 0 },
      plan: [],
      filter: EMPTY_FILTER,
      sortBy: 'best',
      onlyVisible: false,
      showLines: true,
      showTracks: true,
      showArt: true,
      showOutlines: true,
      annotationDepth: 0,
      showLabels: true,
      findPulse: 0,

      setTab: (tab) => set({ tab }),
      setCenterMode: (centerMode) => set({ centerMode }),
      setLocation: (location) => set({ location, nightDate: nightDateOf(Date.now(), location.timeZone), timeMs: null }),
      saveLocation: (loc) => set((s) => ({ savedLocations: [loc, ...s.savedLocations.filter((l) => l.name !== loc.name)].slice(0, 12) })),
      removeLocation: (name) => set((s) => ({ savedLocations: s.savedLocations.filter((l) => l.name !== name) })),
      setNightDate: (nightDate) => set({ nightDate, timeMs: null }),
      setTime: (timeMs) => set({ timeMs }),
      select: (selectedIndex, find = true) =>
        set((s) => ({
          selectedIndex,
          framing: { raDeg: null, decDeg: null, paDeg: s.framing.paDeg },
          findPulse: find ? s.findPulse + 1 : s.findPulse,
        })),
      setEquipment: (patch) => set((s) => ({ equipment: { ...s.equipment, ...patch } })),
      setMinAlt: (minAltDeg) => set({ minAltDeg }),
      setHorizon: (horizon) => set({ horizon }),
      setFraming: (patch) => set((s) => ({ framing: { ...s.framing, ...patch } })),
      addToPlan: (objectIndex, objectId) =>
        set((s) =>
          s.plan.some((p) => p.objectIndex === objectIndex)
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
      setFilter: (patch) => set((s) => ({ filter: { ...s.filter, ...patch } })),
      setSort: (sortBy) => set({ sortBy }),
      setAnnotationDepth: (annotationDepth) => set({ annotationDepth }),
      toggle: (key) => set((s) => ({ [key]: !s[key] }) as Partial<State>),
    }),
    {
      name: 'konuzastro-tracker',
      version: 1,
      partialize: (s) => ({
        location: s.location,
        savedLocations: s.savedLocations,
        selectedIndex: s.selectedIndex,
        equipment: s.equipment,
        minAltDeg: s.minAltDeg,
        horizon: s.horizon,
        plan: s.plan,
        filter: s.filter,
        sortBy: s.sortBy,
        onlyVisible: s.onlyVisible,
        showLines: s.showLines,
        showTracks: s.showTracks,
        showArt: s.showArt,
        showOutlines: s.showOutlines,
        annotationDepth: s.annotationDepth,
        showLabels: s.showLabels,
      }),
      // Noc zawsze startuje od bieżącej daty w strefie zapisanej lokalizacji.
      onRehydrateStorage: () => (state) => {
        if (state) queueMicrotask(() => useStore.setState({ nightDate: nightDateOf(Date.now(), state.location.timeZone) }))
      },
    },
  ),
)
