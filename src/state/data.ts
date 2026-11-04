// Wspólne dane wyliczane: katalog, faza nocy, widoczność katalogu (worker), pogoda.
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import type { Site } from '../lib/astro'
import { loadCatalog, type DSO } from '../lib/catalog'
import { darkWindow, nightPhases, type NightPhases } from '../lib/night'
import { fetchWeather, type WeatherHour } from '../lib/services'
import type { VisibilityRequest, VisibilityResult } from '../workers/visibility.worker'
import { useStore } from './store'

// ---------- Katalog (wczytany raz) ----------

let catalogSnapshot: { catalog: DSO[] | null; error: string | null } = { catalog: null, error: null }
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
    .then((catalog) => { catalogSnapshot = { catalog, error: null } })
    .catch((e: Error) => { catalogSnapshot = { catalog: null, error: e.message } })
    .finally(() => listeners.forEach((l) => l()))
}

export function useCatalog(): { catalog: DSO[] | null; error: string | null } {
  useEffect(startCatalog, [])
  return useSyncExternalStore(subscribeCatalog, getCatalogSnapshot)
}

export function useSelected(): DSO | null {
  const { catalog } = useCatalog()
  const index = useStore((s) => s.selectedIndex)
  return catalog && index !== null ? (catalog[index] ?? null) : null
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
  maxAlt: Float32Array
  hours: Float32Array
  best: Float64Array
}

export function useCatalogVisibility(): CatalogVisibility | null {
  const { catalog } = useCatalog()
  const site = useSite()
  const night = useNight()
  const minAlt = useStore((s) => s.minAltDeg)
  const horizon = useStore((s) => s.horizon)
  const [result, setResult] = useState<CatalogVisibility | null>(null)

  useEffect(() => {
    if (!catalog) return
    worker ??= new Worker(new URL('../workers/visibility.worker.ts', import.meta.url), { type: 'module' })
    const id = ++requestId
    const [darkStart, darkEnd] = darkWindow(night)
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
    const onMessage = (e: MessageEvent<VisibilityResult>) => {
      if (e.data.id === id) setResult({ maxAlt: e.data.maxAlt, hours: e.data.hours, best: e.data.best })
    }
    worker.addEventListener('message', onMessage)
    worker.postMessage(req)
    return () => worker?.removeEventListener('message', onMessage)
  }, [catalog, site, night, minAlt, horizon])

  return result
}

// ---------- Pogoda ----------

export function useWeather(): { hours: WeatherHour[]; error: string | null; loading: boolean } {
  const loc = useStore((s) => s.location)
  const [state, setState] = useState<{ key: string; hours: WeatherHour[]; error: string | null }>({ key: '', hours: [], error: null })
  const key = `${loc.latDeg},${loc.lonDeg}`
  useEffect(() => {
    let alive = true
    fetchWeather(loc.latDeg, loc.lonDeg)
      .then((hours) => alive && setState({ key, hours, error: null }))
      .catch((e: Error) => alive && setState({ key, hours: [], error: e.message }))
    return () => {
      alive = false
    }
  }, [key, loc.latDeg, loc.lonDeg])
  return useMemo(
    () => ({ hours: state.key === key ? state.hours : [], error: state.key === key ? state.error : null, loading: state.key !== key }),
    [state, key],
  )
}
