// Stan aplikacji (Zustand). Preferencje, sprzęt, horyzont i plan zapisują się w localStorage.
import { create } from 'zustand'
import { persist, type PersistStorage } from 'zustand/middleware'
import { EMPTY_FILTER, type CatalogFilter, type ObjectType, SKY_GROUPS, type SkyGroup } from '../lib/catalog'
import type { Mosaic } from '../lib/framing'
import type { HorizonPoint } from '../lib/horizon'
import { nightDateOf } from '../lib/night'
import { isDomeStyle, type DomeStyle } from '../lib/space3d'
import { isSkyLook, type SkyLook } from '../lib/hipsSky'
import { isThumbSource, type ThumbSource } from '../lib/thumbs'
import { planExposures, type Exposure } from '../lib/exposures'
import { DEFAULT_WEATHER_PROVIDER, normalizeWeatherProvider, type WeatherProviderId } from '../lib/services'
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

interface EquipmentSet {
  id: string
  name: string
  equipment: Equipment
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

const DEFAULT_EQUIPMENT_SET: EquipmentSet = { id: '1', name: 'Zestaw 1', equipment: DEFAULT_EQUIPMENT }

export interface Framing {
  /** Środek kadru J2000 (null = środek obiektu). */
  raDeg: number | null
  decDeg: number | null
  paDeg: number
  /** Siatka paneli; brak = jeden kadr. */
  mosaic?: Mosaic
}

export type FramingLayer = 'red' | 'color' | 'ps1' | 'nsns' | 'nsnsRgb'

export interface FramingViewState {
  layer: FramingLayer
  zoom: number
  comparisonOpen: boolean
  /** null = aktywny zestaw sprzętu. */
  comparedSetIds: string[] | null
  candidateId: string
  frameVisible: boolean
  photoCenter: { objectIndex: number; raDeg: number; decDeg: number } | null
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
export type CenterMode = 'dome' | 'framing'

interface State {
  tab: Tab
  catalogPlanMode: 'single' | 'multiple' | null
  centerMode: CenterMode
  /** Okno „Pozycja 3D” (modal nad Niebem); bez zapisu. */
  space3DOpen: boolean
  location: Location
  savedLocations: Location[]
  weatherProvider: WeatherProviderId
  nightDate: string
  /** Kursor czasu [ms UTC]; null = środek nocy / teraz. */
  timeMs: number | null
  selectedIndex: number | null
  /** Historia wybranych obiektów w tej sesji (bez zapisu) i pozycja w niej dla strzałek ‹ ›. */
  history: number[]
  historyPos: number
  /** Parametry aktywnego zestawu używane przez kadrowanie i planer. */
  equipment: Equipment
  equipmentSets: EquipmentSet[]
  activeEquipmentSetId: string
  savedTelescopes: SavedTelescope[]
  savedCameras: SavedCamera[]
  minAltDeg: number
  horizon: HorizonPoint[]
  framing: Framing
  framingView: FramingViewState
  /** Rozciągnięcie zdjęcia kadru (poziomy) osobno dla każdej warstwy; brak wpisu = bez zmian. */
  framingStretch: Record<string, Levels>
  plan: PlanItem[]
  favoriteIds: string[]
  /** Własne zdjęcia obiektów (rekordy w IndexedDB): identyfikator zdjęcia i wybór moje/domyślne. */
  ownPhotos: Record<string, { photoId: string; shown: boolean }>
  filter: CatalogFilter
  sortBy: 'best' | 'alt' | 'hours' | 'mag' | 'size' | 'name'
  onlyVisible: boolean
  minVisibleMinutes: number | 'night'
  showDecLabels: boolean
  showLines: boolean
  showTracks: boolean
  showArt: boolean
  showOutlines: boolean
  /** Krycie konturów mgławic na kopule (0,1–1). */
  outlinesOpacity: number
  /** Własne zdjęcia z wyborem „moje” na kopule i krycie tej warstwy (0,1–1). */
  showOwnPhotos: boolean
  ownPhotosOpacity: number
  /** Elipsy obiektów katalogu (wymiary i kąt pozycyjny) na kopule. */
  showEllipses: boolean
  showObjectMarkers: boolean
  /** Grupy katalogów widoczne na kopule (znaczniki, elipsy i kontury). */
  skyGroups: Record<SkyGroup, boolean>
  skyObjectDensity: number
  /** Rodziny katalogów z grupy „Inne” ukryte na kopule (EXTRA_CATALOGS w lib/catalog). */
  skyExtraHidden: string[]
  showLabels: boolean
  showAnnotations: boolean
  /** Podpisy obiektów tła w widoku 3D (domyślnie wyłączone). */
  show3DAnnotations: boolean
  showGalaxyRegions: boolean
  /** Wygląd kopuł odległości Wszechświata lokalnego w oknie „Pozycja 3D”. */
  domeStyle: DomeStyle
  /** Krycie kopuł odległości (0,1–1), mnożone przez wygaszanie warstw. */
  domeOpacity: number
  /** Wygląd nieba na kopule widoku Niebo: domyślny albo NSNS true-color. */
  skyLook: SkyLook
  /** Źródło miniatur obiektów; NSNS tylko dla dużych pól w pokryciu (`thumbImageOptions`). */
  thumbSource: ThumbSource
  annotationColors: Partial<Record<ObjectType, string>>
  /** Licznik „znajdź obiekt”: zmiana uruchamia animację na kopule. */
  findPulse: number

  setTab(tab: Tab, catalogPlanMode?: State['catalogPlanMode']): void
  setCenterMode(mode: CenterMode): void
  setSpace3DOpen(open: boolean): void
  setLocation(loc: Location): void
  saveLocation(loc: Location): void
  removeLocation(name: string): void
  setWeatherProvider(provider: WeatherProviderId): void
  setNightDate(date: string): void
  setTime(t: number | null): void
  select(index: number | null, find?: boolean): void
  /** Poprzedni (-1) albo następny (+1) obiekt z historii, z animacją „znajdź obiekt”. */
  stepHistory(delta: number): void
  addEquipmentSet(): void
  removeEquipmentSet(): void
  selectEquipmentSet(id: string): void
  renameEquipmentSet(name: string): void
  setEquipment(patch: Partial<Equipment>): void
  addTelescope(): void
  removeTelescope(): void
  addCamera(): void
  removeCamera(): void
  setMinAlt(v: number): void
  setMinVisibleMinutes(v: number | 'night'): void
  setHorizon(points: HorizonPoint[]): void
  setFraming(patch: Partial<Framing>): void
  setFramingView(patch: Partial<FramingViewState>): void
  /** null przywraca domyślne poziomy warstwy. */
  setFramingStretch(layer: string, levels: Levels | null): void
  addToPlan(index: number, id: string): void
  updatePlan(key: string, patch: Partial<PlanItem>): void
  removeFromPlan(key: string): void
  movePlan(key: string, delta: number): void
  toggleFavorite(id: string): void
  setOwnPhoto(objectId: string, photoId: string): void
  toggleOwnPhotoShown(objectId: string): void
  removeOwnPhoto(objectId: string): void
  clearFavorites(): void
  setFilter(patch: Partial<CatalogFilter>): void
  setSort(s: State['sortBy']): void
  toggleSkyGroup(group: SkyGroup): void
  setSkyObjectDensity(value: number): void
  toggleSkyExtra(id: string): void
  setAnnotationColor(type: ObjectType, color: string): void
  resetAnnotationColors(): void
  setOwnPhotosOpacity(value: number): void
  setOutlinesOpacity(value: number): void
  setDomeStyle(style: DomeStyle): void
  setDomeOpacity(value: number): void
  setSkyLook(look: SkyLook): void
  setThumbSource(source: ThumbSource): void
  toggle(key: 'showDecLabels' | 'showLines' | 'showTracks' | 'showArt' | 'showOutlines' | 'showOwnPhotos' | 'showEllipses' | 'showObjectMarkers' | 'showLabels' | 'showAnnotations' | 'show3DAnnotations' | 'showGalaxyRegions' | 'onlyVisible'): void
}

function normalizeSkyObjectDensity(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 100
}

function updateEquipment(s: State, patch: Partial<Equipment>, removedModel?: 'telescopeId' | 'cameraId') {
  const equipment = { ...s.equipment, ...patch }
  return {
    equipment,
    equipmentSets: s.equipmentSets.map((item) => {
      if (item.id === s.activeEquipmentSetId) return { ...item, equipment }
      if (removedModel && item.equipment[removedModel] === s.equipment[removedModel]) {
        return { ...item, equipment: { ...item.equipment, ...patch } }
      }
      return item
    }),
  }
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
    try { localStorage.setItem(name, JSON.stringify(value)) } catch {
      // Stan pozostaje w pamięci. Bez wyzerowania porównanie wyżej pominęłoby ponowienie tego samego stanu (C18).
      lastSaved = null
      console.warn('Nie udało się zapisać ustawień w localStorage (brak miejsca?).')
    }
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
      space3DOpen: false,
      location: HOME,
      savedLocations: [HOME],
      weatherProvider: DEFAULT_WEATHER_PROVIDER,
      nightDate: nightDateOf(Date.now(), HOME.timeZone),
      timeMs: null,
      selectedIndex: null,
      history: [],
      historyPos: -1,
      equipment: DEFAULT_EQUIPMENT,
      equipmentSets: [DEFAULT_EQUIPMENT_SET],
      activeEquipmentSetId: DEFAULT_EQUIPMENT_SET.id,
      savedTelescopes: [],
      savedCameras: [],
      minAltDeg: 25,
      horizon: [],
      framing: { raDeg: null, decDeg: null, paDeg: 0 },
      framingView: {
        layer: 'color',
        zoom: 1,
        comparisonOpen: false,
        comparedSetIds: null,
        candidateId: '',
        frameVisible: true,
        photoCenter: null,
      },
      framingStretch: {},
      plan: [],
      favoriteIds: [],
      ownPhotos: {},
      filter: EMPTY_FILTER,
      sortBy: 'best',
      onlyVisible: false,
      minVisibleMinutes: 0,
      showDecLabels: true,
      showLines: true,
      showTracks: true,
      showArt: true,
      showOutlines: true,
      outlinesOpacity: 1,
      showOwnPhotos: true,
      ownPhotosOpacity: 1,
      showEllipses: false,
      showObjectMarkers: true,
      skyGroups: Object.fromEntries(SKY_GROUPS.map((g) => [g, true])) as Record<SkyGroup, boolean>,
      skyObjectDensity: 100,
      skyExtraHidden: [],
      showLabels: true,
      showAnnotations: true,
      show3DAnnotations: false,
      showGalaxyRegions: true,
      domeStyle: 'plain',
      domeOpacity: 1,
      skyLook: 'default',
      thumbSource: 'dss2',
      annotationColors: {},
      findPulse: 0,

      setTab: (tab, catalogPlanMode) => set({ tab, catalogPlanMode: tab === 'catalog' ? catalogPlanMode ?? null : null }),
      setCenterMode: (centerMode) => set({ centerMode }),
      setSpace3DOpen: (space3DOpen) => set({ space3DOpen }),
      setLocation: (location) => set({ location, nightDate: nightDateOf(Date.now(), location.timeZone), timeMs: null }),
      saveLocation: (loc) => set((s) => ({ savedLocations: [loc, ...s.savedLocations.filter((l) => l.name !== loc.name)].slice(0, 12) })),
      removeLocation: (name) => set((s) => ({ savedLocations: s.savedLocations.filter((l) => l.name !== name) })),
      setWeatherProvider: (weatherProvider) => set({ weatherProvider: normalizeWeatherProvider(weatherProvider) }),
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
            framing: selectedIndex === s.selectedIndex ? s.framing : { ...s.framing, raDeg: null, decDeg: null },
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
            framing: { ...s.framing, raDeg: null, decDeg: null },
            findPulse: s.findPulse + 1,
          }
        }),
      addEquipmentSet: () => set((s) => {
        const id = String(Math.max(...s.equipmentSets.map((item) => Number(item.id))) + 1)
        const names = new Set(s.equipmentSets.map((item) => item.name))
        let number = s.equipmentSets.length + 1
        while (names.has(`Zestaw ${number}`)) number++
        const equipmentSet = { id, name: `Zestaw ${number}`, equipment: s.equipment }
        return {
          equipmentSets: [...s.equipmentSets, equipmentSet],
          activeEquipmentSetId: id,
        }
      }),
      removeEquipmentSet: () => set((s) => {
        if (s.equipmentSets.length <= 1) return s
        const equipmentSets = s.equipmentSets.filter((item) => item.id !== s.activeEquipmentSetId)
        const activeSet = equipmentSets[0]
        return { equipmentSets, activeEquipmentSetId: activeSet.id, equipment: activeSet.equipment }
      }),
      selectEquipmentSet: (id) => set((s) => {
        const item = s.equipmentSets.find((item) => item.id === id)
        return item ? { activeEquipmentSetId: item.id, equipment: item.equipment } : s
      }),
      renameEquipmentSet: (name) => set((s) => {
        const trimmed = name.trim()
        if (!trimmed) return s
        return {
          equipmentSets: s.equipmentSets.map((item) => item.id === s.activeEquipmentSetId && item.name !== trimmed ? { ...item, name: trimmed } : item),
        }
      }),
      setEquipment: (patch) => set((s) => ({
        ...updateEquipment(s, patch),
        savedTelescopes: s.savedTelescopes.map((item) => item.id === (patch.telescopeId ?? s.equipment.telescopeId) ? {
          ...item, name: patch.telescopeName ?? item.name, apertureMm: patch.apertureMm ?? item.apertureMm,
          focalLengthMm: patch.focalLengthMm ?? item.focalLengthMm, reducer: patch.reducer ?? item.reducer,
        } : item),
        savedCameras: s.savedCameras.map((item) => item.id === (patch.cameraId ?? s.equipment.cameraId) ? {
          ...item, name: patch.cameraName ?? item.name, widthPx: patch.widthPx ?? item.widthPx,
          heightPx: patch.heightPx ?? item.heightPx, pixelUm: patch.pixelUm ?? item.pixelUm,
          binning: patch.binning ?? item.binning, mono: patch.mono ?? item.mono,
        } : item),
      })),
      addTelescope: () => set((s) => {
        const id = crypto.randomUUID()
        return {
          savedTelescopes: [...s.savedTelescopes, {
            id, name: s.equipment.telescopeName || 'Własny teleskop',
            apertureMm: s.equipment.apertureMm, focalLengthMm: s.equipment.focalLengthMm, reducer: s.equipment.reducer,
          }],
          ...updateEquipment(s, { telescopeId: id }),
        }
      }),
      removeTelescope: () => set((s) => ({
        savedTelescopes: s.savedTelescopes.filter((item) => item.id !== s.equipment.telescopeId),
        ...updateEquipment(s, { telescopeId: 'custom' }, 'telescopeId'),
      })),
      addCamera: () => set((s) => {
        const id = crypto.randomUUID()
        return {
          savedCameras: [...s.savedCameras, {
            id, name: s.equipment.cameraName || 'Własna kamera', widthPx: s.equipment.widthPx,
            heightPx: s.equipment.heightPx, pixelUm: s.equipment.pixelUm,
            binning: s.equipment.binning, mono: s.equipment.mono,
          }],
          ...updateEquipment(s, { cameraId: id }),
        }
      }),
      removeCamera: () => set((s) => ({
        savedCameras: s.savedCameras.filter((item) => item.id !== s.equipment.cameraId),
        ...updateEquipment(s, { cameraId: 'custom' }, 'cameraId'),
      })),
      setMinAlt: (minAltDeg) => set({ minAltDeg }),
      setMinVisibleMinutes: (minVisibleMinutes) => set({ minVisibleMinutes, onlyVisible: true }),
      setHorizon: (horizon) => set({ horizon }),
      setFraming: (patch) => set((s) => ({ framing: { ...s.framing, ...patch } })),
      setFramingView: (patch) => set((s) => ({ framingView: { ...s.framingView, ...patch } })),
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
      setOwnPhoto: (objectId, photoId) => set((s) => ({ ownPhotos: { ...s.ownPhotos, [objectId]: { photoId, shown: true } } })),
      toggleOwnPhotoShown: (objectId) => set((s) => {
        const own = s.ownPhotos[objectId]
        return own ? { ownPhotos: { ...s.ownPhotos, [objectId]: { ...own, shown: !own.shown } } } : {}
      }),
      removeOwnPhoto: (objectId) => set((s) => {
        if (!s.ownPhotos[objectId]) return {}
        const { [objectId]: _removed, ...rest } = s.ownPhotos
        return { ownPhotos: rest }
      }),
      // Bez zmiany wartości zostaje ten sam obiekt: katalog nie przelicza listy i nie przewija jej na górę.
      setFilter: (patch) => set((s) => (Object.keys(patch) as (keyof CatalogFilter)[]).every((k) => Object.is(s.filter[k], patch[k])) ? s : { filter: { ...s.filter, ...patch } }),
      setSort: (sortBy) => set({ sortBy }),
      toggleSkyGroup: (group) => set((s) => ({ skyGroups: { ...s.skyGroups, [group]: !s.skyGroups[group] } })),
      setSkyObjectDensity: (value) => set({ skyObjectDensity: normalizeSkyObjectDensity(value) }),
      toggleSkyExtra: (id) => set((s) => ({ skyExtraHidden: s.skyExtraHidden.includes(id) ? s.skyExtraHidden.filter((value) => value !== id) : [...s.skyExtraHidden, id] })),
      setAnnotationColor: (type, color) => set((s) => ({ annotationColors: { ...s.annotationColors, [type]: color } })),
      resetAnnotationColors: () => set({ annotationColors: {} }),
      setOwnPhotosOpacity: (value) => set({ ownPhotosOpacity: Math.max(0.1, Math.min(1, value)) }),
      setOutlinesOpacity: (value) => set({ outlinesOpacity: Math.max(0.1, Math.min(1, value)) }),
      setDomeStyle: (domeStyle) => set({ domeStyle }),
      setDomeOpacity: (value) => set({ domeOpacity: Math.max(0.1, Math.min(1, value)) }),
      setSkyLook: (skyLook) => set({ skyLook }),
      setThumbSource: (thumbSource) => set({ thumbSource }),
      toggle: (key) => set((s) => ({ [key]: !s[key] }) as Partial<State>),
    }),
    {
      name: 'konuzastro-tracker',
      storage,
      version: 1,
      // Bez migrate zustand porzuca zapisany stan (plan, ulubione) po podbiciu wersji. Uzupełnianie pól robi merge.
      migrate: (persisted) => persisted as Partial<State>,
      partialize: (s) => ({
        location: s.location,
        savedLocations: s.savedLocations,
        weatherProvider: s.weatherProvider,
        selectedIndex: s.selectedIndex,
        equipmentSets: s.equipmentSets,
        activeEquipmentSetId: s.activeEquipmentSetId,
        savedTelescopes: s.savedTelescopes,
        savedCameras: s.savedCameras,
        minAltDeg: s.minAltDeg,
        horizon: s.horizon,
        framingStretch: s.framingStretch,
        plan: s.plan,
        favoriteIds: s.favoriteIds,
        ownPhotos: s.ownPhotos,
        filter: s.filter,
        sortBy: s.sortBy,
        onlyVisible: s.onlyVisible,
        minVisibleMinutes: s.minVisibleMinutes,
        showDecLabels: s.showDecLabels,
        showLines: s.showLines,
        showTracks: s.showTracks,
        showArt: s.showArt,
        showOutlines: s.showOutlines,
        outlinesOpacity: s.outlinesOpacity,
        showOwnPhotos: s.showOwnPhotos,
        ownPhotosOpacity: s.ownPhotosOpacity,
        showEllipses: s.showEllipses,
        showObjectMarkers: s.showObjectMarkers,
        skyGroups: s.skyGroups,
        skyObjectDensity: s.skyObjectDensity,
        skyExtraHidden: s.skyExtraHidden,
        showLabels: s.showLabels,
        showAnnotations: s.showAnnotations,
        show3DAnnotations: s.show3DAnnotations,
        showGalaxyRegions: s.showGalaxyRegions,
        domeStyle: s.domeStyle,
        domeOpacity: s.domeOpacity,
        skyLook: s.skyLook,
        thumbSource: s.thumbSource,
        annotationColors: s.annotationColors,
      }),
      // Grupy katalogów dopisane po zapisie stanu startują włączone; stan sprzed poziomów kadru dostaje pusty obiekt.
      merge: (persisted, current) => {
        const p = persisted as Partial<State> | undefined
        const equipmentSets = p?.equipmentSets?.length ? p.equipmentSets : [{
          ...DEFAULT_EQUIPMENT_SET,
          equipment: { ...DEFAULT_EQUIPMENT, ...p?.equipment },
        }]
        const activeSet = equipmentSets.find((item) => item.id === p?.activeEquipmentSetId) ?? equipmentSets[0]
        // Krycie warstw z zapisu przycięte do 10–100% (wartość nieliczbowa = 100%).
        const opacity = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0.1, Math.min(1, v)) : 1)
        return {
          ...current, ...p, skyGroups: { ...current.skyGroups, ...p?.skyGroups }, framingStretch: { ...p?.framingStretch }, ownPhotos: { ...p?.ownPhotos },
          equipmentSets, activeEquipmentSetId: activeSet.id, equipment: activeSet.equipment,
          weatherProvider: normalizeWeatherProvider(p?.weatherProvider),
          skyObjectDensity: normalizeSkyObjectDensity(p?.skyObjectDensity),
          skyExtraHidden: Array.isArray(p?.skyExtraHidden) ? p.skyExtraHidden.filter((id): id is string => typeof id === 'string') : current.skyExtraHidden,
          ownPhotosOpacity: opacity(p?.ownPhotosOpacity), outlinesOpacity: opacity(p?.outlinesOpacity),
          domeStyle: isDomeStyle(p?.domeStyle) ? p.domeStyle : current.domeStyle,
          domeOpacity: opacity(p?.domeOpacity),
          skyLook: isSkyLook(p?.skyLook) ? p.skyLook : current.skyLook,
          thumbSource: isThumbSource(p?.thumbSource) ? p.thumbSource : current.thumbSource,
        }
      },
      // Noc zawsze startuje od bieżącej daty w strefie zapisanej lokalizacji.
      onRehydrateStorage: () => (state) => {
        if (state) queueMicrotask(() => {
          let tz = 'Europe/Warsaw'
          try {
            if (state.location?.timeZone) {
              new Intl.DateTimeFormat('en-US', { timeZone: state.location.timeZone })
              tz = state.location.timeZone
            }
          } catch { /* nieprawidłowa strefa z localStorage wraca do domyślnej */ }
          useStore.setState({ nightDate: nightDateOf(Date.now(), tz) })
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
