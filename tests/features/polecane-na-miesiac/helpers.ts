// Wspólne dane testów funkcji „polecane-na-miesiac”.
import { readFileSync } from 'node:fs'
import { DEMO_PROFILES } from '../../../src/data/demo'
import { featuredObjects } from '../../../src/data/featuredObjects'
import { designationKey, formatDesignation } from '../../../src/services/catalog/records'
import {
  filterCatalog,
  type CatalogFilterContext,
  type CatalogFilterState,
} from '../../../src/services/catalogFilters'
import {
  computeCatalogNight,
  type CatalogNightParams,
  type CatalogTarget,
  type ObjectNightSummary,
} from '../../../src/services/catalogNight'
import { DEFAULT_PLANNING_SETTINGS } from '../../../src/services/planningSettings'
import type { Darkness } from '../../../src/services/visibility'
import { at } from '../../../src/test/fixtures'
import type { Designation, DsoObject, EquipmentProfile, ObserverLocation, PlanningSettings } from '../../../src/types'

/** Katalog aplikacji (public/catalog, 16 516 obiektów). */
export const CATALOG = JSON.parse(
  readFileSync(new URL('../../../public/catalog/catalog.v1.json', import.meta.url), 'utf8'),
) as DsoObject[]

const byDesignation = new Map(
  CATALOG.flatMap((object) => object.designations.map((designation) => [designationKey(designation), object] as const)),
)

/** Obiekt katalogu aplikacji po dowolnym oznaczeniu, np. catalogObject('M', '31'). */
export function catalogObject(catalog: Designation['catalog'], id: string): DsoObject {
  const object = byDesignation.get(designationKey({ catalog, id }))
  if (!object) throw new Error(`Brak obiektu ${formatDesignation({ catalog, id })} w katalogu`)
  return object
}

/** Lista „Klasyki” (26 obiektów) w kolejności z featured.json. */
export const KLASYKI: readonly DsoObject[] = featuredObjects(CATALOG)

export const M31 = catalogObject('M', '31')
export const NGC7000 = catalogObject('NGC', '7000')
export const IC1396 = catalogObject('IC', '1396')
export const M45 = catalogObject('M', '45')
export const M42 = catalogObject('M', '42')
export const M101 = catalogObject('M', '101')
export const B33 = catalogObject('B', '33')
export const NGC2237 = catalogObject('NGC', '2237')

/** Pięć obiektów z P5 w kolejności z przykładu: M 31, NGC 7000, IC 1396, M 45, M 42. */
export const P5_OBJECTS: readonly DsoObject[] = [M31, NGC7000, IC1396, M45, M42]

/** Oznaczenia główne w zapisie aplikacji („M 31”, „NGC 7000”), w kolejności listy. */
export function names(objects: readonly DsoObject[]): string[] {
  return objects.map((object) => formatDesignation(object.primary))
}

/** Tylko uid i współrzędne J2000 – tyle dostaje Worker. */
export function targetsOf(objects: readonly DsoObject[]): CatalogTarget[] {
  return objects.map(({ uid, raDeg, decDeg }) => ({ uid, raDeg, decDeg }))
}

/** Noce z przykładów jako data wieczoru 'RRRR-MM-DD'. */
export const OCT_15 = '2026-10-15'
export const OCT_24 = '2026-10-24'
export const OCT_31 = '2026-10-31'
export const NOV_01 = '2026-11-01'
export const NOV_15 = '2026-11-15'

/** Lokalizacja z P5 (pełny rekord z aplikacji): 52,0°N, 19,0°E, 150 m, Europe/Warsaw, horyzont płaski. */
export const P5_LOCATION: ObserverLocation = {
  id: 'wektory-plaski',
  name: 'Polska centralna (horyzont płaski)',
  latDeg: 52,
  lonDegEast: 19,
  elevationM: 150,
  timezone: 'Europe/Warsaw',
  horizon: [],
  bortle: null,
  sqm: null,
}

/** Parametry planowania z P5 (pełny obiekt): próg −18° z obniżaniem, h_min 30°, minimum 3 h, krok 5 min. */
export const P5_SETTINGS: PlanningSettings = {
  ...DEFAULT_PLANNING_SETTINGS,
  darknessThresholdDeg: -18,
  autoLowerThreshold: true,
  minAltitudeDeg: 30,
  minEffectiveHours: 3,
  catalogStepMin: 5,
}

/** Parametry P5 (52,0°N, 19,0°E, 150 m, płaski, −18° z obniżaniem, h_min 30°, krok 5 min) dla nocy `nightDate`. */
export function p5Params(nightDate: string, latDeg = 52): CatalogNightParams {
  return {
    location: { latDeg, lonDegEast: 19, elevationM: 150, timezone: 'Europe/Warsaw', horizon: [] },
    nightDate,
    settings: { darknessThresholdDeg: -18, autoLowerThreshold: true, minAltitudeDeg: 30, catalogStepMin: 5 },
  }
}

/** Wyniki widoczności (`computeCatalogNight` z `widocznosc-katalogu`) obiektów `objects` w nocy `nightDate` z parametrami P5. */
export function nightResults(objects: readonly DsoObject[], nightDate: string, latDeg = 52): ObjectNightSummary[] {
  return computeCatalogNight(p5Params(nightDate, latDeg), targetsOf(objects)).objects
}

/** Stan „żaden filtr nie jest włączony”, zapisany wprost. */
export const NO_FILTERS: CatalogFilterState = {
  catalogs: [],
  types: [],
  constellation: null,
  magnitude: null,
  showWithoutMagnitude: true,
  size: null,
  visibleTonight: false,
  fitsFrame: false,
}

export function filtersWith(patch: Partial<CatalogFilterState>): CatalogFilterState {
  return { ...NO_FILTERS, ...patch }
}

function profileNamed(name: string): EquipmentProfile {
  const profile = DEMO_PROFILES.find((candidate) => candidate.name === name)
  if (!profile) throw new Error(`Brak profilu ${name}`)
  return profile
}

/** Mój zestaw (aktywny zestaw nie wpływa na „Polecane na miesiąc”). */
export const MY_SET = profileNamed('Mój zestaw')

/** Parametry planowania z P5 z innym minimum godzin [h]. */
export function settingsWithMinimum(minEffectiveHours: number): PlanningSettings {
  return { ...P5_SETTINGS, minEffectiveHours }
}

/** Dane do filtrowania przy nocy D `nightDate`: wyniki nocy D, wyniki nocy odniesienia i minimum godzin. */
export interface MonthCase {
  nightDate: string
  results: readonly ObjectNightSummary[] | null
  referenceResults: readonly ObjectNightSummary[] | null
  minEffectiveHours?: number
}

export function monthContext({ nightDate, results, referenceResults, minEffectiveHours = 3 }: MonthCase): CatalogFilterContext {
  return { nightDate, results, referenceResults, settings: settingsWithMinimum(minEffectiveHours), profile: MY_SET }
}

/** filterCatalog z filtrami „żaden + patch”; wynik jako oznaczenia główne. */
export function run(objects: readonly DsoObject[], filters: Partial<CatalogFilterState>, data: MonthCase): string[] {
  return names(filterCatalog(objects, filtersWith(filters), monthContext(data)))
}

/** Tylko „Polecane na miesiąc”. */
export function recommended(objects: readonly DsoObject[], data: MonthCase): string[] {
  return run(objects, { recommendedThisMonth: true }, data)
}

/** Tylko „Widoczne w wybraną noc”. */
export function visibleTonight(objects: readonly DsoObject[], data: MonthCase): string[] {
  return run(objects, { visibleTonight: true }, data)
}

/** Okno ciemności −18° podane wprost dla wyników syntetycznych (wartość nie wpływa na filtr). */
export const WINDOW: Darkness = {
  kind: 'window',
  window: { startMs: at('2026-10-15 19:42', 'CEST'), endMs: at('2026-10-16 05:17', 'CEST') },
  thresholdDeg: -18,
  lowered: false,
}

/** Stan „brak okna ciemności nawet przy progu −12°”. */
export const NO_WINDOW: Darkness = { kind: 'none', thresholdDeg: -12 }

/** Wynik widoczności podany wprost: czas efektywny [min] albo null („brak okna”). */
export function summary(uid: string, effectiveMinutes: number | null, darkness: Darkness = WINDOW): ObjectNightSummary {
  return { uid, darkness, effectiveMinutes, transitMs: null, highest: null }
}

/** Obiekt syntetyczny (spoza katalogu); uid służy też jako oznaczenie główne. */
export function syntheticObject(uid: string, patch: Partial<DsoObject> = {}): DsoObject {
  return {
    uid,
    primary: { catalog: 'Other', id: uid },
    designations: [{ catalog: 'Other', id: uid }],
    commonNames: [],
    type: 'other',
    raDeg: 0,
    decDeg: 0,
    sizeMajorArcmin: null,
    sizeMinorArcmin: null,
    positionAngleDeg: null,
    magV: null,
    surfaceBrightness: null,
    ldnOpacity: null,
    sh2Brightness: null,
    lbnBrightness: null,
    vdbStarMagV: null,
    constellation: 'Psc',
    sources: ['test'],
    ...patch,
  }
}
