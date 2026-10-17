// Wspólne dane testów funkcji „rekomendacje-filtrow”.
import { readFileSync } from 'node:fs'
import { expect } from 'vitest'
import { DEMO_PROFILES } from '../../../src/data/demo'
import {
  angularSeparationDeg,
  bodyPosition,
  horizonAltitudeDeg,
  horizontalFromHourAngle,
  hourAngleDeg,
  moonIlluminatedFraction,
  toEquatorOfDate,
} from '../../../src/services/astroMath'
import { designationKey, formatDesignation } from '../../../src/services/catalog/records'
import {
  prepareCatalogNight,
  type CatalogNightLocation,
  type CatalogNightParams,
  type CatalogNightSettings,
  type CatalogTarget,
  type ObjectNightSummary,
} from '../../../src/services/catalogNight'
import type { FilterAdvice, FilterAdviceColor, MoonConditions, MoonSample } from '../../../src/services/filterAdvice'
import { DEFAULT_MOON_RULES, DEFAULT_PLANNING_SETTINGS } from '../../../src/services/planningSettings'
import { MINUTE_MS, at } from '../../../src/test/fixtures'
import type { Designation, DsoObject, EquipmentProfile, FilterId, MoonRuleThresholds, PlanningSettings } from '../../../src/types'

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
export const NGC7000 = catalogObject('NGC', '7000')
export const M42 = catalogObject('M', '42')
/** vdB 141: mgławica refleksyjna (uid Sh2-136). */
export const VDB141 = catalogObject('VdB', '141')
/** LDN 1235: mgławica ciemna. */
export const LDN1235 = catalogObject('LDN', '1235')

/** Profil demonstracyjny po nazwie (sekcja 6.4). */
export function profileNamed(name: string): EquipmentProfile {
  const profile = DEMO_PROFILES.find((candidate) => candidate.name === name)
  if (!profile) throw new Error(`Brak profilu ${name}`)
  return profile
}

/** Filtry Mojego zestawu: L, R, G, B, Ha, OIII, SII. */
export const MY_SET: readonly FilterId[] = profileNamed('Mój zestaw').filters
/** Filtry zestawu RedCat 51 + ASI2600MC Pro: OSC, DualBand. */
export const REDCAT: readonly FilterId[] = profileNamed('RedCat 51 + ASI2600MC Pro').filters

/** Rekomendacje jako pary [filtr, kolor], w kolejności wyniku. */
export function pairs(advice: readonly FilterAdvice[]): [FilterId, FilterAdviceColor][] {
  return advice.map(({ filter, color }) => [filter, color])
}

/** Oczekiwane pary dla Mojego zestawu (L, R, G, B, Ha, OIII, SII) z koloru każdej grupy. */
export function seven(
  broadband: FilterAdviceColor,
  hydrogenSulfur: FilterAdviceColor,
  oxygen: FilterAdviceColor,
): [FilterId, FilterAdviceColor][] {
  return [
    ['L', broadband],
    ['R', broadband],
    ['G', broadband],
    ['B', broadband],
    ['Ha', hydrogenSulfur],
    ['OIII', oxygen],
    ['SII', hydrogenSulfur],
  ]
}

/** Kolory jednej grupy z wyniku dla Mojego zestawu. */
export function colorsOf(advice: readonly FilterAdvice[], filters: readonly FilterId[]): FilterAdviceColor[] {
  return filters.map((filter) => {
    const found = advice.find((item) => item.filter === filter)
    if (!found) throw new Error(`Brak rekomendacji dla filtra ${filter}`)
    return found.color
  })
}

/** Dane Księżyca podane wprost: udział pod horyzontem (0–1), oświetlenie (0–1), najmniejsza separacja [°]. */
export function moon(moonDownFraction: number, illumination: number, minSeparationDeg: number): MoonConditions {
  return { moonDownFraction, illumination, minSeparationDeg }
}

export interface RulesPatch {
  moonDownMinFraction?: number
  broadband?: Partial<MoonRuleThresholds['broadband']>
  broadbandFaintNebula?: Partial<MoonRuleThresholds['broadbandFaintNebula']>
  hydrogenSulfur?: Partial<MoonRuleThresholds['hydrogenSulfur']>
  oxygen?: Partial<MoonRuleThresholds['oxygen']>
}

/** Progi domyślne (`DEFAULT_MOON_RULES`) zmienione przez `patch`. */
export function rules(patch: RulesPatch = {}): MoonRuleThresholds {
  return {
    moonDownMinFraction: patch.moonDownMinFraction ?? DEFAULT_MOON_RULES.moonDownMinFraction,
    broadband: { ...DEFAULT_MOON_RULES.broadband, ...patch.broadband },
    broadbandFaintNebula: { ...DEFAULT_MOON_RULES.broadbandFaintNebula, ...patch.broadbandFaintNebula },
    hydrogenSulfur: { ...DEFAULT_MOON_RULES.hydrogenSulfur, ...patch.hydrogenSulfur },
    oxygen: { ...DEFAULT_MOON_RULES.oxygen, ...patch.oxygen },
  }
}

// ---------- Próbki podane wprost (moonConditions) ----------

export type SampleFields = Partial<Omit<MoonSample, 'timeMs' | 'durationMs'>>

/** Wartości domyślne próbki: obiekt widoczny, Księżyc 10° pod horyzontem, oświetlenie 30%, separacja 100°. */
const SAMPLE_DEFAULTS: Omit<MoonSample, 'timeMs' | 'durationMs'> = {
  objectVisible: true,
  moonAltDeg: -10,
  moonIllumination: 0.3,
  moonSeparationDeg: 100,
}

/** Jedna próbka w chwili `local` (czas CEST, np. '2026-10-16 20:00') o długości `durationMin`. */
export function sample(local: string, durationMin: number, fields: SampleFields = {}): MoonSample {
  return { timeMs: at(local, 'CEST'), durationMs: durationMin * MINUTE_MS, ...SAMPLE_DEFAULTS, ...fields }
}

/** Próbki co `stepMin` minut od `from` do `to` (bez `to`, czas CEST); ostatnia przycięta do `to`. */
export function run(from: string, to: string, fields: SampleFields = {}, stepMin = 5): MoonSample[] {
  const startMs = at(from, 'CEST')
  const endMs = at(to, 'CEST')
  const samples: MoonSample[] = []
  for (let t = startMs; t < endMs; t += stepMin * MINUTE_MS) {
    samples.push({ timeMs: t, durationMs: Math.min(stepMin * MINUTE_MS, endMs - t), ...SAMPLE_DEFAULTS, ...fields })
  }
  return samples
}

/** Próbki z polami `fields` zmienionymi w próbce o chwili `local` (CEST). */
export function patchAt(samples: readonly MoonSample[], local: string, fields: SampleFields): MoonSample[] {
  const timeMs = at(local, 'CEST')
  expect(samples.some((item) => item.timeMs === timeMs), `brak próbki ${local}`).toBe(true)
  return samples.map((item) => (item.timeMs === timeMs ? { ...item, ...fields } : item))
}

/** Każda próbka dostaje inne oświetlenie: (i + 1) / 1000 dla i-tej próbki. */
export function uniqueIllumination(samples: readonly MoonSample[]): MoonSample[] {
  return samples.map((item, i) => ({ ...item, moonIllumination: (i + 1) / 1000 }))
}

/** Oświetlenie próbki o chwili `local` (CEST). */
export function illuminationAt(samples: readonly MoonSample[], local: string): number {
  const timeMs = at(local, 'CEST')
  const found = samples.find((item) => item.timeMs === timeMs)
  if (!found) throw new Error(`Brak próbki ${local}`)
  return found.moonIllumination
}

// ---------- Noc katalogu (computeCatalogNight) ----------

/** Lokalizacja wektorów: 52,0°N, 19,0°E, 150 m, Europe/Warsaw, horyzont płaski. */
export const FLAT_SITE: CatalogNightLocation = {
  latDeg: 52,
  lonDegEast: 19,
  elevationM: 150,
  timezone: 'Europe/Warsaw',
  horizon: [],
}

export const OCT_16 = '2026-10-16'
export const OCT_24 = '2026-10-24'
export const JUN_21 = '2026-06-21'

export interface ParamsPatch {
  location?: Partial<CatalogNightLocation>
  nightDate?: string
  settings?: Partial<CatalogNightSettings>
}

/** Parametry z przykładów: 52,0°N, 19,0°E, 150 m, horyzont płaski, noc 16/17.10.2026, próg −18° z obniżaniem, h_min 30°, krok 5 min. */
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

/** Tylko uid i współrzędne J2000 – tyle dostaje liczenie katalogu. */
export function targetOf({ uid, raDeg, decDeg }: CatalogTarget): CatalogTarget {
  return { uid, raDeg, decDeg }
}

/** Podsumowanie obiektu o danym uid z wyniku. */
export function summaryOf(objects: readonly ObjectNightSummary[], uid: string): ObjectNightSummary {
  const summary = objects.find((object) => object.uid === uid)
  if (!summary) throw new Error(`Brak wyniku dla ${uid}`)
  return summary
}

/** Wartość różna od null i undefined (z komunikatem, czego brakuje). */
export function present<T>(value: T | null | undefined, what: string): T {
  expect(value, what).not.toBeNull()
  expect(value, what).not.toBeUndefined()
  return value as T
}

/** Dane Księżyca liczone wprost z reguł spec: w oknie efektywnym obiektu i (dla porównania) w całym oknie ciemności. */
export interface ReferenceMoon {
  effective: MoonConditions | null
  wholeWindow: MoonConditions | null
}

interface ReferenceSample {
  timeMs: number
  durationMs: number
  visible: boolean
  moonAltDeg: number
  illumination: number
  separationDeg: number
}

function conditionsOf(all: readonly ReferenceSample[], counted: readonly ReferenceSample[]): MoonConditions | null {
  if (counted.length === 0) return null
  const totalMs = counted.reduce((sum, item) => sum + item.durationMs, 0)
  const downMs = counted.filter((item) => !(item.moonAltDeg > 0)).reduce((sum, item) => sum + item.durationMs, 0)
  const last = counted[counted.length - 1]
  const midMs = (counted[0].timeMs + last.timeMs + last.durationMs) / 2
  const nearest = all.reduce((best, item) => (Math.abs(item.timeMs - midMs) < Math.abs(best.timeMs - midMs) ? item : best))
  return {
    moonDownFraction: downMs / totalMs,
    illumination: nearest.illumination,
    minSeparationDeg: Math.min(...counted.map((item) => item.separationDeg)),
  }
}

/**
 * Wzorzec z reguł spec („Styk z resztą”, „Pytania”), liczony z publicznego API: próbki siatki okna ciemności
 * (`prepareCatalogNight`), obiekt widoczny, gdy h > max(h_min, horyzont lokalny) dla współrzędnych daty;
 * Księżyc z `bodyPosition('moon', …)` (topocentrycznie, „nad horyzontem” = wysokość > 0°), oświetlenie z
 * `moonIlluminatedFraction` w próbce najbliższej środka, separacja `angularSeparationDeg` współrzędnych daty obiektu i Księżyca.
 */
export function referenceMoon(target: CatalogTarget, nightParams: CatalogNightParams): ReferenceMoon {
  const night = prepareCatalogNight(nightParams)
  const grid = night.grid
  if (!grid) return { effective: null, wholeWindow: null }
  const ofDate = toEquatorOfDate(target, night.precession)
  const samples: ReferenceSample[] = grid.timesMs.map((timeMs, i) => {
    const { altDeg, azDeg } = horizontalFromHourAngle(hourAngleDeg(grid.lstDeg[i], ofDate.raDeg), ofDate.decDeg, night.site.latDeg)
    const moonPosition = bodyPosition('moon', night.site, timeMs)
    return {
      timeMs,
      durationMs: grid.durationsMs[i],
      visible: altDeg > Math.max(night.minAltitudeDeg, horizonAltitudeDeg(night.horizon, azDeg)),
      moonAltDeg: moonPosition.altDeg,
      illumination: moonIlluminatedFraction(timeMs),
      separationDeg: angularSeparationDeg(ofDate, moonPosition),
    }
  })
  return {
    effective: conditionsOf(
      samples,
      samples.filter((item) => item.visible),
    ),
    wholeWindow: conditionsOf(samples, samples),
  }
}
