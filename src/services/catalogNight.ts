// Widoczność całego katalogu w noc D (7A): noc przygotowana raz, potem tanie podsumowanie każdego obiektu.
import type { DsoObject, HorizonPoint, Mount, ObserverLocation, PlanningSettings } from '../types'
import { precessionMatrix, toEquatorOfDate, type GeoPosition, type PrecessionMatrix } from './astroMath'
import type { MoonConditions } from './filterAdvice'
import {
  darknessWindow,
  effectiveMinutes,
  highestPoint,
  meridianFlipMs as flipAfterTransitMs,
  nightRange,
  nightSun,
  sampleGrid,
  transitMs,
  type Darkness,
  type SampleGrid,
  type TimedAltitude,
  type TimeRange,
} from './visibility'

/** Położenie, strefa czasowa i horyzont lokalizacji; nazwa lokalizacji nie wpływa na wynik. */
export type CatalogNightLocation = Pick<ObserverLocation, 'latDeg' | 'lonDegEast' | 'elevationM' | 'timezone' | 'horizon'>

/** Parametry planowania, od których zależy widoczność katalogu [Z6–Z8]. */
export type CatalogNightSettings = Pick<
  PlanningSettings,
  'darknessThresholdDeg' | 'autoLowerThreshold' | 'minAltitudeDeg' | 'catalogStepMin'
>

export interface CatalogNightParams {
  location: CatalogNightLocation
  /** Noc D jako 'RRRR-MM-DD': od lokalnego południa dnia D do lokalnego południa dnia D+1. */
  nightDate: string
  settings: CatalogNightSettings
}

/** Dane obiektu potrzebne do liczenia: uid i współrzędne J2000. */
export type CatalogTarget = Pick<DsoObject, 'uid' | 'raDeg' | 'decDeg'>

/** Wszystko, co zależy tylko od nocy, miejsca i parametrów: liczone raz dla całego katalogu. */
export interface PreparedCatalogNight {
  site: GeoPosition
  horizon: readonly HorizonPoint[]
  minAltitudeDeg: number
  /** Oś nocy: od zachodu Słońca − 1 h do wschodu + 1 h (`nightSun`). */
  axis: TimeRange
  /** Okno ciemności z użytym progiem albo „brak okna” (`darknessWindow`). */
  darkness: Darkness
  /** Siatka okna ciemności co krok katalogowy (`sampleGrid`); null przy „brak okna”. */
  grid: SampleGrid | null
  /** Macierz precesji liczona raz na noc (`precessionMatrix`). */
  precession: PrecessionMatrix
}

/** Podsumowanie obiektu w noc D. */
export interface ObjectNightSummary {
  uid: string
  /** Użyty próg ciemności (i czy obniżony) z oknem albo stan „brak okna przy progu …”. */
  darkness: Darkness
  /** Czas efektywny [min] z krokiem katalogowym; null przy „brak okna” (0 = obiekt nie jest widoczny). */
  effectiveMinutes: number | null
  /** Górowanie (pierwsze po zachodzie Słońca − 1 h); null, gdy wypada po końcu osi nocy, czyli obiekt góruje w dzień. */
  transitMs: number | null
  /** Najwyższe położenie w oknie ciemności; null przy „brak okna”. */
  highest: TimedAltitude | null
  /**
   * Dane Księżyca w oknie efektywnym obiektu (`moonConditions` z `filterAdvice.ts`, Księżyc liczony raz na krok siatki);
   * null, gdy obiekt nie ma czasu efektywnego albo noc nie ma okna. Pole opcjonalne, bo podsumowania podane wprost
   * (np. w testach innych funkcji) mogą go nie mieć; `summarizeObject` ma je zawsze wypełniać.
   */
  moon?: MoonConditions | null
}

/** Wynik dla całego katalogu: stan nocy i podsumowania w kolejności obiektów wejścia. */
export interface CatalogNightResult {
  darkness: Darkness
  objects: ObjectNightSummary[]
}

/** Przygotowanie nocy raz: okno ciemności, oś nocy, siatka co krok katalogowy i macierz precesji. */
export function prepareCatalogNight({ location, nightDate, settings }: CatalogNightParams): PreparedCatalogNight {
  const site: GeoPosition = { latDeg: location.latDeg, lonDegEast: location.lonDegEast, elevationM: location.elevationM }
  const night = nightRange(nightDate, location.timezone)
  const { axis } = nightSun(site, night)
  const darkness = darknessWindow(site, night, settings.darknessThresholdDeg, settings.autoLowerThreshold)
  return {
    site,
    horizon: location.horizon,
    minAltitudeDeg: settings.minAltitudeDeg,
    axis,
    darkness,
    grid: darkness.kind === 'window' ? sampleGrid(darkness.window, settings.catalogStepMin, site.lonDegEast) : null,
    precession: precessionMatrix((axis.startMs + axis.endMs) / 2),
  }
}

/** Podsumowanie jednego obiektu w przygotowanej nocy. */
export function summarizeObject(night: PreparedCatalogNight, target: CatalogTarget): ObjectNightSummary {
  const ofDate = toEquatorOfDate(target, night.precession)
  // t₀ = zachód − 1 h; górowanie po końcu osi nocy wypada w dzień.
  const transit = transitMs(ofDate.raDeg, night.site.lonDegEast, night.axis.startMs)
  const { darkness, grid } = night
  return {
    uid: target.uid,
    darkness,
    effectiveMinutes: grid ? effectiveMinutes(ofDate, night.site, grid, night.minAltitudeDeg, night.horizon) : null,
    transitMs: transit <= night.axis.endMs ? transit : null,
    highest: darkness.kind === 'window' ? highestPoint(ofDate, night.site, darkness.window, transit) : null,
  }
}

/** Widoczność całego katalogu w noc D; wyniki w kolejności obiektów, z uid. */
export function computeCatalogNight(params: CatalogNightParams, targets: readonly CatalogTarget[]): CatalogNightResult {
  const night = prepareCatalogNight(params)
  return { darkness: night.darkness, objects: targets.map((target) => summarizeObject(night, target)) }
}

/** Przerzut przez południk z górowania i montażu [Z10]: tylko GEM i tylko, gdy obiekt góruje w nocy. */
export function meridianFlipMs(transitMs: number | null, mount: Mount): number | null {
  return transitMs === null ? null : flipAfterTransitMs(transitMs, mount)
}
