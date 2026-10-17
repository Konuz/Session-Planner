// Wspólne dane testów funkcji „widocznosc-katalogu”.
import { readFileSync } from 'node:fs'
import { expect } from 'vitest'
import { designationKey, formatDesignation } from '../../../src/services/catalog/records'
import type {
  CatalogNightLocation,
  CatalogNightParams,
  CatalogNightSettings,
  ObjectNightSummary,
} from '../../../src/services/catalogNight'
import { DEFAULT_PLANNING_SETTINGS } from '../../../src/services/planningSettings'
import type { Darkness, TimeRange } from '../../../src/services/visibility'
import type { Designation, DsoObject, PlanningSettings } from '../../../src/types'

/** Katalog aplikacji (public/catalog, 16 516 obiektów). */
export const CATALOG = JSON.parse(
  readFileSync(new URL('../../../public/catalog/catalog.v1.json', import.meta.url), 'utf8'),
) as DsoObject[]

const byDesignation = new Map(
  CATALOG.flatMap((object) => object.designations.map((designation) => [designationKey(designation), object] as const)),
)

/** Obiekt katalogu aplikacji po oznaczeniu, np. catalogObject('M', '31'). */
export function catalogObject(catalog: Designation['catalog'], id: string): DsoObject {
  const object = byDesignation.get(designationKey({ catalog, id }))
  if (!object) throw new Error(`Brak obiektu ${formatDesignation({ catalog, id })} w katalogu`)
  return object
}

export const M31 = catalogObject('M', '31')
export const IC1396 = catalogObject('IC', '1396')
export const M45 = catalogObject('M', '45')
export const NGC7000 = catalogObject('NGC', '7000')
export const M42 = catalogObject('M', '42')
export const M101 = catalogObject('M', '101')

/** Pięć obiektów z T9 w kolejności z P1. */
export const T9_OBJECTS: readonly DsoObject[] = [M31, IC1396, M45, NGC7000, M42]

/** Lokalizacja wektorów: 52,0°N, 19,0°E, 150 m, Europe/Warsaw, horyzont płaski. */
export const FLAT_SITE: CatalogNightLocation = {
  latDeg: 52,
  lonDegEast: 19,
  elevationM: 150,
  timezone: 'Europe/Warsaw',
  horizon: [],
}

export const OCT_16 = '2026-10-16'
export const JUN_21 = '2026-06-21'

export interface ParamsPatch {
  location?: Partial<CatalogNightLocation>
  nightDate?: string
  settings?: Partial<CatalogNightSettings>
}

/**
 * Parametry z przykładów: lokalizacja wektorów, noc 16/17.10.2026, próg −18° z obniżaniem, h_min 30°, krok 5 min.
 * Parametry planowania są pełnym obiektem `PlanningSettings`, tak jak w aplikacji.
 */
export function params(patch: ParamsPatch = {}): CatalogNightParams {
  const settings: PlanningSettings = {
    ...DEFAULT_PLANNING_SETTINGS,
    darknessThresholdDeg: -18,
    autoLowerThreshold: true,
    minAltitudeDeg: 30,
    catalogStepMin: 5,
    ...patch.settings,
  }
  return { location: { ...FLAT_SITE, ...patch.location }, nightDate: patch.nightDate ?? OCT_16, settings }
}

/** Podsumowanie obiektu o danym uid z wyniku. */
export function summaryOf(objects: readonly ObjectNightSummary[], uid: string): ObjectNightSummary {
  const summary = objects.find((object) => object.uid === uid)
  if (!summary) throw new Error(`Brak wyniku dla ${uid}`)
  return summary
}

/** Okno ciemności ze stanu nocy; przy „brak okna” test kończy się błędem. */
export function windowOf(darkness: Darkness): TimeRange {
  if (darkness.kind !== 'window') throw new Error(`Brak okna przy progu ${darkness.thresholdDeg}°`)
  return darkness.window
}

/** Wartość różna od null (z komunikatem, czego brakuje). */
export function present<T>(value: T | null | undefined, what: string): T {
  expect(value, what).not.toBeNull()
  expect(value, what).not.toBeUndefined()
  return value as T
}
