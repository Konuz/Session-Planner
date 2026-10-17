// Widoczność całego katalogu w noc D (7A): noc przygotowana raz, potem tanie podsumowanie każdego obiektu.
// ZAŚLEPKA funkcji „widocznosc-katalogu”: każde wywołanie zgłasza NotImplementedError.
import type { DsoObject, HorizonPoint, Mount, ObserverLocation, PlanningSettings } from '../types'
import type { GeoPosition, PrecessionMatrix } from './astroMath'
import type { Darkness, SampleGrid, TimedAltitude, TimeRange } from './visibility'

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
}

/** Wynik dla całego katalogu: stan nocy i podsumowania w kolejności obiektów wejścia. */
export interface CatalogNightResult {
  darkness: Darkness
  objects: ObjectNightSummary[]
}

function notImplemented(name: string): never {
  throw new Error(`NotImplementedError: ${name}`)
}

/** Przygotowanie nocy raz: okno ciemności, oś nocy, siatka co krok katalogowy i macierz precesji. */
export function prepareCatalogNight(params: CatalogNightParams): PreparedCatalogNight {
  void params
  return notImplemented('prepareCatalogNight')
}

/** Podsumowanie jednego obiektu w przygotowanej nocy. */
export function summarizeObject(night: PreparedCatalogNight, target: CatalogTarget): ObjectNightSummary {
  void night
  void target
  return notImplemented('summarizeObject')
}

/** Widoczność całego katalogu w noc D; wyniki w kolejności obiektów, z uid. */
export function computeCatalogNight(params: CatalogNightParams, targets: readonly CatalogTarget[]): CatalogNightResult {
  void params
  void targets
  return notImplemented('computeCatalogNight')
}

/** Przerzut przez południk z górowania i montażu [Z10]: tylko GEM i tylko, gdy obiekt góruje w nocy. */
export function meridianFlipMs(transitMs: number | null, mount: Mount): number | null {
  void transitMs
  void mount
  return notImplemented('meridianFlipMs')
}
