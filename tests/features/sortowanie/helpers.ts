// Wspólne dane testów funkcji „sortowanie”.
import { readFileSync } from 'node:fs'
import { DEMO_PROFILES } from '../../../src/data/demo'
import { featuredObjects } from '../../../src/data/featuredObjects'
import { computeOptics } from '../../../src/services/astroMath'
import { designationKey, formatDesignation } from '../../../src/services/catalog/records'
import {
  computeCatalogNight,
  type CatalogNightParams,
  type CatalogTarget,
  type ObjectNightSummary,
} from '../../../src/services/catalogNight'
import { sortCatalog, type CatalogSortContext, type CatalogSortKey } from '../../../src/services/catalogSort'
import { DEFAULT_PLANNING_SETTINGS } from '../../../src/services/planningSettings'
import type { Darkness } from '../../../src/services/visibility'
import { at } from '../../../src/test/fixtures'
import type { CatalogId, Designation, DsoObject, EquipmentProfile } from '../../../src/types'

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

export const SIMEIS147 = catalogObject('Simeis', '147')
export const SH2_155 = catalogObject('Sh2', '155')
export const NGC6960 = catalogObject('NGC', '6960')
export const NGC6992 = catalogObject('NGC', '6992')
export const NGC6888 = catalogObject('NGC', '6888')
export const LDN1251 = catalogObject('LDN', '1251')
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
export const NGC281 = catalogObject('NGC', '281')
export const NGC1499 = catalogObject('NGC', '1499')
export const NGC2237 = catalogObject('NGC', '2237')

/** Pięć obiektów z T9 (P1, P2): M 31, IC 1396, M 45, NGC 7000, M 42. */
export const T9_OBJECTS: readonly DsoObject[] = [M31, IC1396, M45, NGC7000, M42]

/** Oznaczenia główne w zapisie aplikacji („M 31”, „Sh2-155”, „vdB 141”), w kolejności listy. */
export function names(objects: readonly DsoObject[]): string[] {
  return objects.map((object) => formatDesignation(object.primary))
}

export function uids(objects: readonly DsoObject[]): string[] {
  return objects.map((object) => object.uid)
}

/** Lista od końca (nowa tablica). */
export function reversed<T>(list: readonly T[]): T[] {
  return [...list].reverse()
}

/** Stała permutacja inna niż wejście i odwrócenie: pozycje nieparzyste od końca, potem parzyste. */
export function scrambled<T>(list: readonly T[]): T[] {
  return [...list.filter((_, index) => index % 2 === 1).reverse(), ...list.filter((_, index) => index % 2 === 0)]
}

/** Trzy kolejności wejścia: podana, od końca i przemieszana (Array.prototype.sort jest stabilny). */
export function inputOrders(list: readonly DsoObject[]): DsoObject[][] {
  return [[...list], reversed(list), scrambled(list)]
}

/** Noc 16/17.10.2026: 52,0°N, 19,0°E, 150 m, Europe/Warsaw, horyzont płaski, próg −18° z obniżaniem, h_min 30°, krok 5 min. */
export const OCT_16_PARAMS: CatalogNightParams = {
  location: { latDeg: 52, lonDegEast: 19, elevationM: 150, timezone: 'Europe/Warsaw', horizon: [] },
  nightDate: '2026-10-16',
  settings: { darknessThresholdDeg: -18, autoLowerThreshold: true, minAltitudeDeg: 30, catalogStepMin: 5 },
}

/** Noc 21/22.06.2026 na 54,83°N: brak okna ciemności nawet przy progu −12° (T6). */
export const JUNE_21_NO_WINDOW_PARAMS: CatalogNightParams = {
  ...OCT_16_PARAMS,
  location: { ...OCT_16_PARAMS.location, latDeg: 54.83 },
  nightDate: '2026-06-21',
}

/** Tylko uid i współrzędne J2000 – tyle dostaje Worker. */
export function targetsOf(objects: readonly DsoObject[]): CatalogTarget[] {
  return objects.map(({ uid, raDeg, decDeg }) => ({ uid, raDeg, decDeg }))
}

/** Wyniki widoczności (`computeCatalogNight` z `widocznosc-katalogu`) dla obiektów `objects`. */
export function nightResults(objects: readonly DsoObject[], params: CatalogNightParams = OCT_16_PARAMS): ObjectNightSummary[] {
  return computeCatalogNight(params, targetsOf(objects)).objects
}

/** Wyniki nocy 16/17.10.2026 (krok 5 min) dla całych „Klasyki”, jak z Workera, który liczy cały przekazany katalog. */
export const OCTOBER: readonly ObjectNightSummary[] = nightResults(KLASYKI)

/** Okno ciemności −18° nocy 16/17.10.2026 (19:40–05:19 CEST). */
export const OCT_16_DARKNESS: Darkness = {
  kind: 'window',
  window: { startMs: at('2026-10-16 19:40', 'CEST'), endMs: at('2026-10-17 05:19', 'CEST') },
  thresholdDeg: -18,
  lowered: false,
}

/** Stan „brak okna ciemności nawet przy progu −12°”. */
export const NO_WINDOW: Darkness = { kind: 'none', thresholdDeg: -12 }

/** Wynik widoczności podany wprost: czas efektywny [min] albo null („brak okna”) i chwila górowania [ms] albo null. */
export function summary(
  uid: string,
  effectiveMinutes: number | null,
  transitMs: number | null = null,
  darkness: Darkness = OCT_16_DARKNESS,
): ObjectNightSummary {
  return { uid, darkness, effectiveMinutes, transitMs, highest: null }
}

/** Obiekt syntetyczny (spoza katalogu) z oznaczeniem głównym `catalog` + `id`; pozostałe pola puste. */
export function designated(catalog: CatalogId, id: string, patch: Partial<DsoObject> = {}): DsoObject {
  const primary: Designation = { catalog, id }
  return {
    uid: `test-${catalog}-${id}`,
    primary,
    designations: [primary],
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

/** Obiekt syntetyczny, którego uid jest też oznaczeniem głównym (katalog 'Other', zapis = uid). */
export function syntheticObject(uid: string, patch: Partial<DsoObject> = {}): DsoObject {
  return { ...designated('Other', uid), uid, ...patch }
}

function profileNamed(name: string): EquipmentProfile {
  const profile = DEMO_PROFILES.find((candidate) => candidate.name === name)
  if (!profile) throw new Error(`Brak profilu ${name}`)
  return profile
}

/** Mój zestaw: Newton 150/600 + Ares-M Pro (kadr 1,080° × 1,080°, krótszy bok 64,8′). */
export const MY_SET = profileNamed('Mój zestaw')
/** RedCat 51 + ASI2600MC Pro (krótszy bok 3,597° = 215,8′). */
export const REDCAT = profileNamed('RedCat 51 + ASI2600MC Pro')

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

/** Środek zakresu „Pasuje do kadru” [′] (P6): średnia części `fitRange` razy krótszy bok kadru. */
export function frameCenterArcmin(profile: EquipmentProfile, fitRange: readonly [number, number] = [0.25, 0.8]): number {
  return shortSideArcmin(profile) * ((fitRange[0] + fitRange[1]) / 2)
}

/** Kontekst przykładów: wyniki nocy 16/17.10.2026 dla „Klasyki”, parametry domyślne (25–80%), Mój zestaw. */
export function contextWith(patch: Partial<CatalogSortContext> = {}): CatalogSortContext {
  return { results: OCTOBER, settings: DEFAULT_PLANNING_SETTINGS, profile: MY_SET, ...patch }
}

/** Zakres „Pasuje do kadru” z parametrów planowania (pozostałe parametry domyślne). */
export function fitRangeSettings(fitRange: [number, number]): CatalogSortContext['settings'] {
  return { ...DEFAULT_PLANNING_SETTINGS, fitRange }
}

/** sortCatalog z kontekstem „domyślny + patch”; wynik jako oznaczenia główne. */
export function sorted(objects: readonly DsoObject[], key: CatalogSortKey, patch: Partial<CatalogSortContext> = {}): string[] {
  return names(sortCatalog(objects, key, contextWith(patch)))
}

/** Porządek oznaczeń ze „Styk z resztą”: `formatDesignation(primary)` przez `Intl.Collator('pl', { numeric: true })`. */
export const DESIGNATION_ORDER = new Intl.Collator('pl', { numeric: true })

/**
 * Pary sąsiednich obiektów listy, które łamią porządek z „Pytania”: mniejsza ranga `rank` wcześniej, remis i brak
 * wartości (null) według oznaczenia głównego w porządku naturalnym, obiekty bez wartości zawsze na końcu.
 */
export function orderViolations(list: readonly DsoObject[], rank: (object: DsoObject) => number | null): string[] {
  const problems: string[] = []
  for (let index = 1; index < list.length; index++) {
    const [a, b] = [list[index - 1], list[index]]
    const [ra, rb] = [rank(a), rank(b)]
    const byName = DESIGNATION_ORDER.compare(formatDesignation(a.primary), formatDesignation(b.primary))
    const ok = ra === null ? rb === null && byName < 0 : rb === null || ra < rb || (ra === rb && byName < 0)
    if (!ok) problems.push(`${formatDesignation(a.primary)} (${ra}) przed ${formatDesignation(b.primary)} (${rb})`)
  }
  return problems.slice(0, 10)
}
