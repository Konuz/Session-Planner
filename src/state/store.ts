import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { EMPTY_FILTER, SKY_GROUPS, type CatalogFilter, type SkyGroup } from '../lib/catalog'
import type { HorizonPoint } from '../lib/horizon'
import { nightDateOf } from '../lib/night'
import { isSkyLook } from '../lib/hipsSky'
import { isThumbSource } from '../lib/thumbs'
import { planExposures } from '../lib/exposures'
import { fieldId, sanitizeField } from '../lib/fieldTarget'
import { DEFAULT_WEATHER_PROVIDER, isValidTimeZone, normalizeWeatherProvider } from '../lib/services'
import {
  DEFAULT_EQUIPMENT,
  DEFAULT_EQUIPMENT_SET,
  HOME,
  createPersistStorage,
  normalizeSkyObjectDensity,
  sanitizeEquipment,
  sanitizeFilter,
  sanitizeLocation,
  updateEquipment,
  type EquipmentSet,
  type Location,
  type State,
} from './storeHelpers'

export {
  DEFAULT_EQUIPMENT,
  HOME,
  type CenterMode,
  type Equipment,
  type EquipmentSet,
  type Framing,
  type FramingLayer,
  type FramingViewState,
  type Location,
  type PlanItem,
  type State,
  type Tab,
} from './storeHelpers'

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
      freeField: null,
      framePinned: true,
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
      showGalaxyLines: true,
      skyLook: 'default',
      thumbSource: 'dss2',
      annotationColors: {},
      findPulse: 0,

      setTab: (tab, catalogPlanMode) => set({ tab, catalogPlanMode: tab === 'catalog' ? catalogPlanMode ?? null : null }),
      setCenterMode: (centerMode) => set({ centerMode }),
      setSpace3DOpen: (space3DOpen) => set({ space3DOpen }),
      setLocation: (location) => set({ location, nightDate: nightDateOf(Date.now(), location.timeZone), timeMs: null }),
      saveLocation: (loc) => set((s) => {
        const key = `${loc.name}:${loc.latDeg.toFixed(4)}:${loc.lonDeg.toFixed(4)}`
        return { savedLocations: [loc, ...s.savedLocations.filter((l) => `${l.name}:${l.latDeg.toFixed(4)}:${l.lonDeg.toFixed(4)}` !== key)].slice(0, 12) }
      }),
      removeLocation: (target) => set((s) => ({
        savedLocations: s.savedLocations.filter((l) => typeof target === 'string'
          ? l.name !== target
          : `${l.name}:${l.latDeg.toFixed(4)}:${l.lonDeg.toFixed(4)}` !== `${target.name}:${target.latDeg.toFixed(4)}:${target.lonDeg.toFixed(4)}`),
      })),
      setWeatherProvider: (weatherProvider) => set({ weatherProvider: normalizeWeatherProvider(weatherProvider) }),
      setNightDate: (nightDate) => set({ nightDate, timeMs: null }),
      setTime: (timeMs) => set({ timeMs }),
      select: (selectedIndex, find = true) =>
        set((s) => {
          // Swobodne pole ma indeks −1: nie trafia do historii ani do zapisu wyboru.
          if (selectedIndex !== null && selectedIndex < 0) return s
          let history = s.history.slice(0, s.historyPos + 1)
          if (!history.length && s.selectedIndex !== null) history = [s.selectedIndex]
          if (selectedIndex !== null && history[history.length - 1] !== selectedIndex) history = [...history, selectedIndex]
          return {
            selectedIndex,
            history,
            historyPos: history.length - 1,
            freeField: null,
            framePinned: true,
            framing: selectedIndex === s.selectedIndex && !s.freeField ? s.framing : { ...s.framing, raDeg: null, decDeg: null, mosaic: undefined },
            findPulse: find ? s.findPulse + 1 : s.findPulse,
          }
        }),
      stepHistory: (delta) =>
        set((s) => {
          // Ze swobodnej eksploracji „wstecz” wraca do obiektu, od którego się zaczęła.
          const fromField = s.freeField !== null && delta < 0
          if (fromField && s.selectedIndex === null) return s
          const historyPos = fromField ? s.historyPos : s.historyPos + delta
          if (!fromField && (historyPos < 0 || historyPos >= s.history.length)) return s
          return {
            historyPos,
            selectedIndex: fromField ? s.selectedIndex : s.history[historyPos],
            freeField: null,
            framePinned: true,
            framing: { ...s.framing, raDeg: null, decDeg: null, mosaic: undefined },
            findPulse: s.findPulse + 1,
          }
        }),
      // Nowy środek pola staje się środkiem kadru; mozaika obiektu nie przechodzi na pole, mozaika pola zostaje.
      setFreeField: (field) => set((s) => ({
        freeField: field,
        framing: { ...s.framing, raDeg: null, decDeg: null, mosaic: s.freeField ? s.framing.mosaic : undefined },
        framingView: { ...s.framingView, photoCenter: null },
      })),
      setFramePinned: (framePinned) => set({ framePinned }),
      addEquipmentSet: () => set((s) => {
        const numericIds = s.equipmentSets.map((item) => Number(item.id)).filter(Number.isFinite)
        const id = String(Math.max(0, ...numericIds) + 1)
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
      setMinVisibleMinutes: (minVisibleMinutes) => set({ minVisibleMinutes }),
      setHorizon: (horizon) => set({ horizon }),
      setFraming: (patch) => set((s) => ({ framing: { ...s.framing, ...patch } })),
      setFramingView: (patch) => set((s) => ({ framingView: { ...s.framingView, ...patch } })),
      setFramingStretch: (layer, levels) => set((s) => {
        const rest = { ...s.framingStretch }
        delete rest[layer]
        return { framingStretch: levels ? { ...rest, [layer]: levels } : rest }
      }),
      addToPlan: (objectIndex, objectId, field) =>
        set((s) => {
          if (s.plan.some((p) => p.objectId === objectId)) return s
          // Bieżący kadr należy do celu na karcie: pola w swobodnej eksploracji albo wybranego obiektu poza nią.
          const current = field ? !!s.freeField && fieldId(s.freeField) === objectId : !s.freeField && s.selectedIndex === objectIndex
          return {
                plan: [
                  ...s.plan,
                  {
                    key: `${objectIndex}-${Date.now()}`,
                    objectIndex,
                    objectId,
                    ...(field ? { field } : {}),
                    startMs: null,
                    endMs: null,
                    framing: current ? s.framing : { raDeg: null, decDeg: null, paDeg: 0 },
                    filters: s.equipment.mono ? 'L, R, G, B' : 'OSC',
                    exposures: planExposures({ filters: s.equipment.mono ? 'L, R, G, B' : 'OSC' }),
                    note: '',
                  },
                ],
              }
        }),
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
      setFilter: (patch) => set((s) => (Object.keys(patch) as (keyof CatalogFilter)[]).every((k) => Object.is(s.filter[k], patch[k])) ? s : { filter: { ...s.filter, ...patch } }),
      setSort: (sortBy) => set({ sortBy }),
      toggleSkyGroup: (group) => set((s) => ({ skyGroups: { ...s.skyGroups, [group]: !s.skyGroups[group] } })),
      setSkyObjectDensity: (value) => set({ skyObjectDensity: normalizeSkyObjectDensity(value) }),
      toggleSkyExtra: (id) => set((s) => ({ skyExtraHidden: s.skyExtraHidden.includes(id) ? s.skyExtraHidden.filter((value) => value !== id) : [...s.skyExtraHidden, id] })),
      setAnnotationColor: (type, color) => set((s) => ({ annotationColors: { ...s.annotationColors, [type]: color } })),
      resetAnnotationColors: () => set({ annotationColors: {} }),
      setOwnPhotosOpacity: (value) => set({ ownPhotosOpacity: Math.max(0.1, Math.min(1, value)) }),
      setOutlinesOpacity: (value) => set({ outlinesOpacity: Math.max(0.1, Math.min(1, value)) }),
      setSkyLook: (skyLook) => set({ skyLook }),
      setThumbSource: (thumbSource) => set({ thumbSource }),
      toggle: (key) => set((s) => ({ [key]: !s[key] }) as Partial<State>),
    }),
    {
      name: 'konuzastro-tracker',
      storage: createPersistStorage(),
      version: 1,
      migrate: (persisted) => persisted as Partial<State>,
      partialize: (s) => ({
        location: s.location,
        savedLocations: s.savedLocations,
        weatherProvider: s.weatherProvider,
        selectedIndex: s.selectedIndex,
        freeField: s.freeField,
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
        showGalaxyLines: s.showGalaxyLines,
        skyLook: s.skyLook,
        thumbSource: s.thumbSource,
        annotationColors: s.annotationColors,
      }),
      merge: (persisted, current) => {
        const p = (persisted && typeof persisted === 'object' ? persisted : undefined) as Partial<State> | undefined
        const location = sanitizeLocation(p?.location, HOME) ?? HOME
        const savedLocations = Array.isArray(p?.savedLocations)
          ? p.savedLocations.map((l) => sanitizeLocation(l, HOME)).filter((l): l is Location => l !== null)
          : current.savedLocations
        const rawSets = Array.isArray(p?.equipmentSets)
          ? p.equipmentSets
            .filter((item): item is EquipmentSet => !!item && typeof item === 'object' && typeof item.id === 'string' && item.id.length > 0 && typeof item.name === 'string')
            .map((item) => ({ ...item, equipment: sanitizeEquipment(item.equipment, DEFAULT_EQUIPMENT) }))
          : []
        const equipmentSets = rawSets.length ? rawSets : [{
          ...DEFAULT_EQUIPMENT_SET,
          equipment: sanitizeEquipment(p?.equipment, DEFAULT_EQUIPMENT),
        }]
        const activeSet = equipmentSets.find((item) => item.id === p?.activeEquipmentSetId) ?? equipmentSets[0]
        const opacity = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0.1, Math.min(1, v)) : 1)
        const minAltDeg = typeof p?.minAltDeg === 'number' && Number.isFinite(p.minAltDeg) ? Math.max(0, Math.min(89, p.minAltDeg)) : current.minAltDeg
        const skyGroupsRaw = p?.skyGroups && typeof p.skyGroups === 'object' ? p.skyGroups : {}
        const skyGroups = Object.fromEntries(SKY_GROUPS.map((g) => [g, typeof (skyGroupsRaw as Record<string, unknown>)[g] === 'boolean' ? (skyGroupsRaw as Record<string, boolean>)[g] : current.skyGroups[g]])) as Record<SkyGroup, boolean>
        const sortBy = typeof p?.sortBy === 'string' && ['best', 'alt', 'hours', 'mag', 'size', 'name'].includes(p.sortBy) ? p.sortBy : current.sortBy
        const minVisibleMinutes = p?.minVisibleMinutes === 'night' || (typeof p?.minVisibleMinutes === 'number' && Number.isFinite(p.minVisibleMinutes) && p.minVisibleMinutes >= 0)
          ? p.minVisibleMinutes
          : current.minVisibleMinutes
        const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
        // Własne modele: tylko rekordy z identyfikatorem (widok Sprzęt szuka po `id`).
        const savedModels = <T,>(v: unknown, fallback: T[]): T[] => (Array.isArray(v) ? v.filter((item) => isRecord(item) && typeof item.id === 'string') as T[] : fallback)
        return {
          ...current, ...p,
          savedTelescopes: savedModels(p?.savedTelescopes, current.savedTelescopes),
          savedCameras: savedModels(p?.savedCameras, current.savedCameras),
          selectedIndex: Number.isSafeInteger(p?.selectedIndex) ? p!.selectedIndex! : current.selectedIndex,
          location,
          savedLocations: savedLocations.length ? savedLocations : [location],
          nightDate: nightDateOf(Date.now(), location.timeZone),
          freeField: sanitizeField(p?.freeField),
          // Cel bez kadru i cel-pole z uszkodzonymi współrzędnymi wypadają z planu (obiekty katalogu sprawdza wczytanie katalogu).
          plan: Array.isArray(p?.plan) ? p.plan.filter((item) => isRecord(item) && isRecord(item.framing) && (!item.field || sanitizeField(item.field))) : current.plan,
          filter: sanitizeFilter(p?.filter),
          sortBy,
          minVisibleMinutes,
          minAltDeg,
          horizon: Array.isArray(p?.horizon) ? p.horizon.filter((pt): pt is HorizonPoint => !!pt && typeof pt.azDeg === 'number' && Number.isFinite(pt.azDeg) && typeof pt.altDeg === 'number' && Number.isFinite(pt.altDeg)) : current.horizon,
          favoriteIds: Array.isArray(p?.favoriteIds) ? p.favoriteIds.filter((id): id is string => typeof id === 'string') : current.favoriteIds,
          skyGroups,
          framingStretch: p?.framingStretch && typeof p.framingStretch === 'object' ? p.framingStretch : {},
          ownPhotos: isRecord(p?.ownPhotos) ? Object.fromEntries(Object.entries(p.ownPhotos).filter(([, entry]) => isRecord(entry) && typeof entry.photoId === 'string')) : {},
          equipmentSets, activeEquipmentSetId: activeSet.id, equipment: activeSet.equipment,
          weatherProvider: normalizeWeatherProvider(p?.weatherProvider),
          skyObjectDensity: normalizeSkyObjectDensity(p?.skyObjectDensity),
          skyExtraHidden: Array.isArray(p?.skyExtraHidden) ? p.skyExtraHidden.filter((id): id is string => typeof id === 'string') : current.skyExtraHidden,
          showGalaxyRegions: typeof p?.showGalaxyRegions === 'boolean' ? p.showGalaxyRegions : current.showGalaxyRegions,
          showGalaxyLines: typeof p?.showGalaxyLines === 'boolean' ? p.showGalaxyLines : current.showGalaxyLines,
          ownPhotosOpacity: opacity(p?.ownPhotosOpacity), outlinesOpacity: opacity(p?.outlinesOpacity),
          skyLook: isSkyLook(p?.skyLook) ? p.skyLook : current.skyLook,
          thumbSource: isThumbSource(p?.thumbSource) ? p.thumbSource : current.thumbSource,
        }
      },
      onRehydrateStorage: () => (state) => {
        if (state) queueMicrotask(() => {
          const tz = isValidTimeZone(state.location?.timeZone) ? state.location.timeZone : 'Europe/Warsaw'
          useStore.setState({ nightDate: nightDateOf(Date.now(), tz) })
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
