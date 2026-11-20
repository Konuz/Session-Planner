// Wspólne dane wyliczane: katalog, faza nocy, widoczność katalogu (worker), pogoda.
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import type { Site } from '../lib/astro'
import { loadCatalog, type DSO } from '../lib/catalog'
import { darkWindow, nightPhases, type NightPhases } from '../lib/night'
import { measureSince, perfNow } from '../lib/perf'
import { fetchWeather, type WeatherHour } from '../lib/services'
import type { VisibilityRequest, VisibilityResult } from '../workers/visibility.worker'
import { useStore } from './store'

// ---------- Katalog (wczytany raz) ----------

// Listy pokazują jeden wpis na obiekt. Pełna tablica zachowuje indeksy workera, gromad i zapisanych projektów.
let catalogSnapshot: { catalog: DSO[] | null; indexed: DSO[] | null; error: string | null } = { catalog: null, indexed: null, error: null }
const listeners = new Set<() => void>()
let started = false
const subscribeCatalog = (l: () => void) => {
  listeners.add(l)
  return () => { listeners.delete(l) }
}
const getCatalogSnapshot = () => catalogSnapshot

function startCatalog() {
  if (started) return
  started = true
  loadCatalog()
    .then((indexed) => {
      const catalog = indexed.filter((o) => !o.photoPrimaryId)
      const byId = new Map(catalog.map((o) => [o.id, o]))
      const redirects = new Map(indexed.filter((o) => o.photoPrimaryId).map((o) => [o.id, byId.get(o.photoPrimaryId!)!]))
      const state = useStore.getState()
      const favoriteIds = [...new Set(state.favoriteIds.map((id) => redirects.get(id)?.id ?? id))]
      const selected = state.selectedIndex === null ? undefined : indexed[state.selectedIndex]
      const selectedIndex = selected && redirects.get(selected.id)?.i
      const plan = state.plan.map((item) => {
        const primary = redirects.get(item.objectId)
        return primary ? { ...item, objectId: primary.id, objectIndex: primary.i } : item
      })
      if (selectedIndex != null || plan.some((item, i) => item !== state.plan[i]) || favoriteIds.some((id, i) => id !== state.favoriteIds[i]) || favoriteIds.length !== state.favoriteIds.length) {
        useStore.setState({ selectedIndex: selectedIndex ?? state.selectedIndex, plan, favoriteIds })
      }
      catalogSnapshot = { catalog, indexed, error: null }
    })
    .catch((e: Error) => {
      started = false
      catalogSnapshot = { catalog: null, indexed: null, error: e.message }
    })
    .finally(() => listeners.forEach((l) => l()))
}

export function useCatalog() {
  useEffect(startCatalog, [])
  return useSyncExternalStore(subscribeCatalog, getCatalogSnapshot)
}

export function useSelected(): DSO | null {
  const { indexed } = useCatalog()
  const index = useStore((s) => s.selectedIndex)
  return indexed && index !== null ? (indexed[index] ?? null) : null
}

/** Starsze własne zdjęcie pozostaje w IndexedDB pod oznaczeniem użytym przy jego dodaniu. */
export function useOwnPhotoKey(object: DSO | null): string {
  return useStore((s) => {
    if (!object) return ''
    if (s.ownPhotos[object.id]) return object.id
    return object.photoAliases?.find((alias) => s.ownPhotos[alias]) ?? object.id
  })
}

// ---------- Noc ----------

export function useSite(): Site {
  const loc = useStore((s) => s.location)
  return useMemo(() => ({ latDeg: loc.latDeg, lonDeg: loc.lonDeg, elevationM: loc.elevationM }), [loc.latDeg, loc.lonDeg, loc.elevationM])
}

export function useNight(): NightPhases {
  const site = useSite()
  const date = useStore((s) => s.nightDate)
  const tz = useStore((s) => s.location.timeZone)
  return useMemo(() => nightPhases(date, site, tz), [date, site, tz])
}

let clockNow = Date.now()
let clockInterval: ReturnType<typeof setInterval> | null = null
const clockListeners = new Set<() => void>()
const subscribeClock = (l: () => void) => {
  clockListeners.add(l)
  if (clockListeners.size === 1) {
    clockNow = Date.now()
    clockInterval = setInterval(() => {
      clockNow = Date.now()
      clockListeners.forEach((fn) => fn())
    }, 60_000)
  }
  return () => {
    clockListeners.delete(l)
    if (clockListeners.size === 0 && clockInterval !== null) {
      clearInterval(clockInterval)
      clockInterval = null
    }
  }
}
const getClockSnapshot = () => clockNow

/** Chwila wyświetlana: kursor czasu, „teraz” jeśli trwa ta noc, albo środek nocy. */
export function useTime(): number {
  const night = useNight()
  const cursor = useStore((s) => s.timeMs)
  const now = useSyncExternalStore(subscribeClock, getClockSnapshot)
  if (cursor !== null) return cursor
  if (now >= night.startMs && now <= night.endMs) return now
  return night.midnight
}

// ---------- Widoczność katalogu ----------

let worker: Worker | null = null
let sentCatalog: DSO[] | null = null
let requestId = 0

export interface CatalogVisibility {
  nightDurationMs: number
  maxAlt: Float32Array
  hours: Float32Array
  best: Float64Array
}

let lastVisibility: { key: string; value: CatalogVisibility } | null = null
const visListeners = new Set<() => void>()
const subscribeVis = (l: () => void) => {
  visListeners.add(l)
  return () => { visListeners.delete(l) }
}
const pendingVis = new Map<number, { key: string; darkStart: number; darkEnd: number; sent: number }>()
let lastRequestedVisKey = ''

const visibilityKey = (catalog: DSO[], site: Site, darkStart: number, darkEnd: number, minAlt: number, horizon: readonly unknown[]) =>
  `${catalog.length}|${site.latDeg},${site.lonDeg},${site.elevationM}|${darkStart}|${darkEnd}|${minAlt}|${JSON.stringify(horizon)}`

function ensureVisibilityWorker() {
  if (worker) return worker
  worker = new Worker(new URL('../workers/visibility.worker.ts', import.meta.url), { type: 'module' })
  worker.onmessage = (e: MessageEvent<VisibilityResult>) => {
    const meta = pendingVis.get(e.data.id)
    if (!meta) return
    pendingVis.delete(e.data.id)
    measureSince('visibility:roundtrip', meta.sent)
    if (meta.key !== lastRequestedVisKey) return
    lastVisibility = {
      key: meta.key,
      value: { nightDurationMs: meta.darkEnd - meta.darkStart, maxAlt: e.data.maxAlt, hours: e.data.hours, best: e.data.best },
    }
    visListeners.forEach((l) => l())
  }
  worker.onerror = () => {
    pendingVis.clear()
    worker?.terminate()
    worker = null
    sentCatalog = null
    lastRequestedVisKey = ''
    visListeners.forEach((l) => l())
  }
  return worker
}

export function useCatalogVisibility(): CatalogVisibility | null {
  const { indexed: catalog } = useCatalog()
  const site = useSite()
  const night = useNight()
  const minAlt = useStore((s) => s.minAltDeg)
  const horizon = useStore((s) => s.horizon)
  const [darkStart, darkEnd] = darkWindow(night)
  const key = catalog ? visibilityKey(catalog, site, darkStart, darkEnd, minAlt, horizon) : ''
  const snapshot = useSyncExternalStore(subscribeVis, () => (key && lastVisibility?.key === key ? lastVisibility.value : null))

  useEffect(() => {
    if (!catalog || lastVisibility?.key === key || lastRequestedVisKey === key) return
    lastRequestedVisKey = key
    const w = ensureVisibilityWorker()
    const id = ++requestId
    const needCoords = sentCatalog !== catalog
    if (needCoords) sentCatalog = catalog
    const req: VisibilityRequest = {
      id,
      ...(needCoords ? { ra: Float64Array.from(catalog, (o) => o.raDeg), dec: Float64Array.from(catalog, (o) => o.decDeg) } : {}),
      site,
      darkStart,
      darkEnd,
      minAltDeg: minAlt,
      horizon,
    }
    pendingVis.set(id, { key, darkStart, darkEnd, sent: perfNow() })
    w.postMessage(req)
  }, [catalog, site, darkStart, darkEnd, minAlt, horizon, key])

  return snapshot
}

// ---------- Pogoda ----------

export function useWeather(): { hours: WeatherHour[]; error: string | null; loading: boolean } {
  const loc = useStore((s) => s.location)
  const provider = useStore((s) => s.weatherProvider)
  const [state, setState] = useState<{ key: string; hours: WeatherHour[]; error: string | null }>({ key: '', hours: [], error: null })
  const key = `${provider}|${loc.latDeg},${loc.lonDeg}`
  useEffect(() => {
    let alive = true
    fetchWeather(loc.latDeg, loc.lonDeg, provider)
      .then((hours) => alive && setState({ key, hours, error: null }))
      .catch((e: Error) => alive && setState({ key, hours: [], error: e.message }))
    return () => {
      alive = false
    }
  }, [key, loc.latDeg, loc.lonDeg, provider])
  return useMemo(
    () => ({ hours: state.key === key ? state.hours : [], error: state.key === key ? state.error : null, loading: state.key !== key }),
    [state, key],
  )
}
