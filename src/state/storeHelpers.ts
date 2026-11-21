import type { PersistStorage } from 'zustand/middleware'
import { EMPTY_FILTER, type CatalogFilter, type ObjectType, type SkyGroup } from '../lib/catalog'
import type { Mosaic } from '../lib/framing'
import type { HorizonPoint } from '../lib/horizon'
import type { DomeStyle } from '../lib/space3d'
import type { SkyLook } from '../lib/hipsSky'
import type { ThumbSource } from '../lib/thumbs'
import type { Exposure } from '../lib/exposures'
import type { Field } from '../lib/fieldTarget'
import { isValidTimeZone, type WeatherProviderId } from '../lib/services'
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

export interface EquipmentSet {
  id: string
  name: string
  equipment: Equipment
}

export interface SavedTelescope {
  id: string
  name: string
  apertureMm: number
  focalLengthMm: number
  reducer: number
}

export interface SavedCamera {
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

export const DEFAULT_EQUIPMENT_SET: EquipmentSet = { id: '1', name: 'Zestaw 1', equipment: DEFAULT_EQUIPMENT }

export interface Framing {
  raDeg: number | null
  decDeg: number | null
  paDeg: number
  mosaic?: Mosaic
}

export type FramingLayer = 'red' | 'color' | 'ps1' | 'nsns' | 'nsnsRgb' | 'nsnsOhs' | 'nsnsSho'

export interface FramingViewState {
  layer: FramingLayer
  zoom: number
  comparisonOpen: boolean
  comparedSetIds: string[] | null
  candidateId: string
  frameVisible: boolean
  photoCenter: { objectIndex: number; raDeg: number; decDeg: number } | null
}

export interface PlanItem {
  key: string
  objectIndex: number
  objectId: string
  /** Swobodne pole (objectIndex −1, objectId z `fieldId`); brak dla obiektu katalogu. */
  field?: Field
  startMs: number | null
  endMs: number | null
  framing: Framing
  filters: string
  exposures?: Exposure[]
  note: string
}

export type Tab = 'sky' | 'catalog' | 'planner' | 'equipment' | 'horizon'
export type CenterMode = 'dome' | 'framing'

export interface State {
  tab: Tab
  catalogPlanMode: 'single' | 'multiple' | null
  centerMode: CenterMode
  space3DOpen: boolean
  location: Location
  savedLocations: Location[]
  weatherProvider: WeatherProviderId
  nightDate: string
  timeMs: number | null
  selectedIndex: number | null
  /** Swobodna eksploracja: cel to środek przesuniętej ramki FOV, nie obiekt; `select` ją kończy. */
  freeField: Field | null
  /** Ramka FOV na kopule przypięta (false: można ją przeciągać). */
  framePinned: boolean
  history: number[]
  historyPos: number
  equipment: Equipment
  equipmentSets: EquipmentSet[]
  activeEquipmentSetId: string
  savedTelescopes: SavedTelescope[]
  savedCameras: SavedCamera[]
  minAltDeg: number
  horizon: HorizonPoint[]
  framing: Framing
  framingView: FramingViewState
  framingStretch: Record<string, Levels>
  plan: PlanItem[]
  favoriteIds: string[]
  ownPhotos: Record<string, { photoId: string; shown: boolean }>
  filter: CatalogFilter
  sortBy: 'best' | 'alt' | 'hours' | 'mag' | 'size' | 'name'
  minVisibleMinutes: number | 'night'
  showDecLabels: boolean
  showLines: boolean
  showTracks: boolean
  showArt: boolean
  showOutlines: boolean
  outlinesOpacity: number
  showOwnPhotos: boolean
  ownPhotosOpacity: number
  showEllipses: boolean
  showObjectMarkers: boolean
  skyGroups: Record<SkyGroup, boolean>
  skyObjectDensity: number
  skyExtraHidden: string[]
  showLabels: boolean
  showAnnotations: boolean
  show3DAnnotations: boolean
  showGalaxyRegions: boolean
  domeStyle: DomeStyle
  domeOpacity: number
  skyLook: SkyLook
  thumbSource: ThumbSource
  annotationColors: Partial<Record<ObjectType, string>>
  findPulse: number

  setTab(tab: Tab, catalogPlanMode?: State['catalogPlanMode']): void
  setCenterMode(mode: CenterMode): void
  setSpace3DOpen(open: boolean): void
  setLocation(loc: Location): void
  saveLocation(loc: Location): void
  removeLocation(loc: Pick<Location, 'name' | 'latDeg' | 'lonDeg'> | string): void
  setWeatherProvider(provider: WeatherProviderId): void
  setNightDate(date: string): void
  setTime(t: number | null): void
  select(index: number | null, find?: boolean): void
  stepHistory(delta: number): void
  setFreeField(field: Field): void
  setFramePinned(pinned: boolean): void
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
  setFramingStretch(layer: string, levels: Levels | null): void
  addToPlan(index: number, id: string, field?: Field): void
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
  toggle(key: 'showDecLabels' | 'showLines' | 'showTracks' | 'showArt' | 'showOutlines' | 'showOwnPhotos' | 'showEllipses' | 'showObjectMarkers' | 'showLabels' | 'showAnnotations' | 'show3DAnnotations' | 'showGalaxyRegions'): void
}

export function sanitizeEquipment(raw: unknown, fallback: Equipment = DEFAULT_EQUIPMENT): Equipment {
  const e = (raw && typeof raw === 'object' ? raw : {}) as Partial<Equipment>
  const pos = (v: unknown, fb: number) => typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : fb
  const str = (v: unknown, fb: string) => typeof v === 'string' ? v : fb
  return {
    telescopeId: str(e.telescopeId, fallback.telescopeId),
    telescopeName: str(e.telescopeName, fallback.telescopeName),
    apertureMm: pos(e.apertureMm, fallback.apertureMm),
    focalLengthMm: pos(e.focalLengthMm, fallback.focalLengthMm),
    reducer: pos(e.reducer, fallback.reducer),
    cameraId: str(e.cameraId, fallback.cameraId),
    cameraName: str(e.cameraName, fallback.cameraName),
    widthPx: pos(e.widthPx, fallback.widthPx),
    heightPx: pos(e.heightPx, fallback.heightPx),
    pixelUm: pos(e.pixelUm, fallback.pixelUm),
    binning: pos(e.binning, fallback.binning),
    mono: typeof e.mono === 'boolean' ? e.mono : fallback.mono,
    seeingArcsec: pos(e.seeingArcsec, fallback.seeingArcsec),
  }
}

export function sanitizeLocation(raw: unknown, fallback: Location): Location | null {
  if (!raw || typeof raw !== 'object') return null
  const l = raw as Partial<Location>
  if (typeof l.latDeg !== 'number' || !Number.isFinite(l.latDeg) || l.latDeg < -90 || l.latDeg > 90) return null
  if (typeof l.lonDeg !== 'number' || !Number.isFinite(l.lonDeg) || l.lonDeg < -180 || l.lonDeg > 180) return null
  const elev = typeof l.elevationM === 'number' && Number.isFinite(l.elevationM) && l.elevationM >= -500 && l.elevationM <= 10_000 ? l.elevationM : fallback.elevationM
  return {
    name: typeof l.name === 'string' && l.name.trim() ? l.name : fallback.name,
    region: typeof l.region === 'string' ? l.region : '',
    latDeg: l.latDeg,
    lonDeg: l.lonDeg,
    elevationM: elev,
    timeZone: isValidTimeZone(l.timeZone) ? l.timeZone : fallback.timeZone,
  }
}

export function sanitizeFilter(raw: unknown): CatalogFilter {
  const f = (raw && typeof raw === 'object' ? raw : {}) as Partial<CatalogFilter>
  return {
    ...EMPTY_FILTER,
    query: typeof f.query === 'string' ? f.query : '',
    catalogs: Array.isArray(f.catalogs) ? f.catalogs.filter((c): c is string => typeof c === 'string') : [],
    types: Array.isArray(f.types) ? f.types.filter((t): t is ObjectType => typeof t === 'string') : [],
    constellation: typeof f.constellation === 'string' ? f.constellation : '',
    maxMag: typeof f.maxMag === 'number' && Number.isFinite(f.maxMag) ? f.maxMag : null,
    minSizeArcmin: typeof f.minSizeArcmin === 'number' && Number.isFinite(f.minSizeArcmin) && f.minSizeArcmin >= 0 ? f.minSizeArcmin : 0,
    maxSizeArcmin: typeof f.maxSizeArcmin === 'number' && Number.isFinite(f.maxSizeArcmin) ? f.maxSizeArcmin : null,
  }
}

export function normalizeSkyObjectDensity(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 100
}

export function updateEquipment(s: State, patch: Partial<Equipment>, removedModel?: 'telescopeId' | 'cameraId') {
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

export function createPersistStorage(): PersistStorage<Partial<State>> {
  let lastSaved: Partial<State> | null = null
  return {
    getItem(name) {
      try {
        const raw = localStorage.getItem(name)
        return raw ? JSON.parse(raw) : null
      } catch {
        return null
      }
    },
    setItem(name, value) {
      const keys = Object.keys(value.state) as (keyof State)[]
      if (lastSaved && keys.every((k) => Object.is(lastSaved![k], value.state[k]))) return
      lastSaved = value.state
      try {
        localStorage.setItem(name, JSON.stringify(value))
      } catch {
        lastSaved = null
        console.warn('Nie udało się zapisać ustawień w localStorage (brak miejsca?).')
      }
    },
    removeItem(name) {
      lastSaved = null
      try {
        localStorage.removeItem(name)
      } catch {
      }
    },
  }
}
