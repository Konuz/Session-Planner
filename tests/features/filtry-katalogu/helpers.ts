// Wspólne dane testów funkcji „filtry-katalogu”.
import { readFileSync } from 'node:fs'
import { DEMO_PROFILES } from '../../../src/data/demo'
import { featuredObjects } from '../../../src/data/featuredObjects'
import { computeOptics } from '../../../src/services/astroMath'
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
import type { Designation, DsoObject, EquipmentProfile, PlanningSettings } from '../../../src/types'

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

export const VDB141 = catalogObject('VdB', '141')
export const VDB152 = catalogObject('VdB', '152')
export const SH2_155 = catalogObject('Sh2', '155')
export const SH2_129 = catalogObject('Sh2', '129')
export const SIMEIS147 = catalogObject('Simeis', '147')
export const NGC6960 = catalogObject('NGC', '6960')
export const LDN1251 = catalogObject('LDN', '1251')
export const LDN1235 = catalogObject('LDN', '1235')
export const NGC7000 = catalogObject('NGC', '7000')
export const IC1396 = catalogObject('IC', '1396')
export const M31 = catalogObject('M', '31')
export const M42 = catalogObject('M', '42')
export const M45 = catalogObject('M', '45')
export const M33 = catalogObject('M', '33')
export const M101 = catalogObject('M', '101')
export const M81 = catalogObject('M', '81')
export const M1 = catalogObject('M', '1')
export const IC1805 = catalogObject('IC', '1805')
export const IC1848 = catalogObject('IC', '1848')
export const NGC7635 = catalogObject('NGC', '7635')
export const NGC6888 = catalogObject('NGC', '6888')
export const NGC1499 = catalogObject('NGC', '1499')

/** Pięć obiektów z T9 (P2): M 31, IC 1396, M 45, NGC 7000, M 42. */
export const T9_OBJECTS: readonly DsoObject[] = [M31, IC1396, M45, NGC7000, M42]

/** Oznaczenia główne w zapisie aplikacji („M 31”, „Sh2-155”, „vdB 141”), w kolejności listy. */
export function names(objects: readonly DsoObject[]): string[] {
  return objects.map((object) => formatDesignation(object.primary))
}

export function uids(objects: readonly DsoObject[]): string[] {
  return objects.map((object) => object.uid)
}

/** Obiekty z `subset` w kolejności listy `input` (oczekiwany wynik „w kolejności wejścia”). */
export function inInputOrder(input: readonly DsoObject[], subset: readonly DsoObject[]): string[] {
  const chosen = new Set(subset)
  return names(input.filter((object) => chosen.has(object)))
}

/**
 * Stan „żaden filtr nie jest włączony”, zapisany wprost (niezależnie od stałej z modułu): wszystkie filtry wyłączone,
 * „pokaż obiekty bez jasności” zaznaczone.
 */
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

/** Mój zestaw: Newton 150/600 + Ares-M Pro (kadr 1,080° × 1,080°). */
export const MY_SET = profileNamed('Mój zestaw')
/** RedCat 51 + ASI2600MC Pro (krótszy bok 3,597°). */
export const REDCAT = profileNamed('RedCat 51 + ASI2600MC Pro')

/** Parametry domyślne (minimum 3 h, „Pasuje do kadru” 25–80%) ze zmienionymi polami. */
export function settingsWith(patch: Partial<PlanningSettings>): PlanningSettings {
  return { ...DEFAULT_PLANNING_SETTINGS, ...patch }
}

/** Kontekst przykładów: wynik jeszcze się liczy (null), parametry domyślne, Mój zestaw. */
export function contextWith(patch: Partial<CatalogFilterContext> = {}): CatalogFilterContext {
  return { results: null, settings: DEFAULT_PLANNING_SETTINGS, profile: MY_SET, ...patch }
}

/** filterCatalog z filtrami „żaden + patch” i kontekstem „domyślny + patch”. */
export function run(
  objects: readonly DsoObject[],
  filters: Partial<CatalogFilterState>,
  context: Partial<CatalogFilterContext> = {},
): DsoObject[] {
  return filterCatalog(objects, filtersWith(filters), contextWith(context))
}

/** Noc 16/17.10.2026: 52,0°N, 19,0°E, 150 m, Europe/Warsaw, horyzont płaski, próg −18° z obniżaniem, h_min 30°, krok 5 min. */
export const OCT_16_PARAMS: CatalogNightParams = {
  location: { latDeg: 52, lonDegEast: 19, elevationM: 150, timezone: 'Europe/Warsaw', horizon: [] },
  nightDate: '2026-10-16',
  settings: { darknessThresholdDeg: -18, autoLowerThreshold: true, minAltitudeDeg: 30, catalogStepMin: 5 },
}

/** Tylko uid i współrzędne J2000 – tyle dostaje Worker. */
export function targetsOf(objects: readonly DsoObject[]): CatalogTarget[] {
  return objects.map(({ uid, raDeg, decDeg }) => ({ uid, raDeg, decDeg }))
}

/** Wyniki widoczności (`computeCatalogNight` z `widocznosc-katalogu`) dla obiektów `objects`. */
export function nightResults(objects: readonly DsoObject[], params: CatalogNightParams = OCT_16_PARAMS): ObjectNightSummary[] {
  return computeCatalogNight(params, targetsOf(objects)).objects
}

/** Okno ciemności −18° nocy 16/17.10.2026 (19:40–05:19 CEST). */
export const OCT_16_DARKNESS: Darkness = {
  kind: 'window',
  window: { startMs: at('2026-10-16 19:40', 'CEST'), endMs: at('2026-10-17 05:19', 'CEST') },
  thresholdDeg: -18,
  lowered: false,
}

/** Stan „brak okna ciemności nawet przy progu −12°”. */
export const NO_WINDOW: Darkness = { kind: 'none', thresholdDeg: -12 }

/** Wynik widoczności podany wprost: czas efektywny [min] albo null („brak okna”). */
export function summary(uid: string, effectiveMinutes: number | null, darkness: Darkness = OCT_16_DARKNESS): ObjectNightSummary {
  return { uid, darkness, effectiveMinutes, transitMs: null, highest: null }
}

/** Obiekt syntetyczny (spoza katalogu) z polami ustawionymi wprost; pozostałe pola puste. */
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

/** Krótszy bok kadru zestawu [′] z `computeOptics` (sekcja 7B). */
export function shortSideArcmin(profile: EquipmentProfile): number {
  const optics = computeOptics({
    apertureMm: profile.telescope.apertureMm,
    focalLengthMm: profile.telescope.focalLengthMm,
    reducerFactor: profile.reducerFactor,
    resolutionXPx: profile.camera.resolutionXPx,
    resolutionYPx: profile.camera.resolutionYPx,
    pixelSizeUm: profile.camera.pixelSizeUm,
    binning: profile.camera.binning,
  })
  return Math.min(optics.fovWidthDeg, optics.fovHeightDeg) * 60
}

/** Zakres „Pasuje do kadru” [′]: części `fitRange` krótszego boku kadru. */
export function fitRangeArcmin(profile: EquipmentProfile, fitRange: readonly [number, number]): [number, number] {
  const side = shortSideArcmin(profile)
  return [side * fitRange[0], side * fitRange[1]]
}
