// Wspólne dane testów funkcji „parametry-planowania”.
import { expect } from 'vitest'
import type { PlannerDb } from '../../../src/data/db'
import { DEMO_LOCATION } from '../../../src/data/demo'
import { planningSettingsRepository } from '../../../src/data/repositories'
import { defined } from '../../../src/test/fixtures'
import type { MoonRuleThresholds, ObserverLocation, PlanningSettings } from '../../../src/types'

/** Wartości domyślne wypisane wprost z P1 i P2 (części całości tam, gdzie spec podaje procenty). */
export function defaults(): PlanningSettings {
  return {
    darknessThresholdDeg: -18,
    autoLowerThreshold: true,
    minAltitudeDeg: 30,
    minEffectiveHours: 3,
    catalogStepMin: 5,
    detailStepMin: 1,
    seeingArcsec: 2.5,
    fitRange: [0.25, 0.8],
    moonRules: defaultMoonRules(),
  }
}

export function defaultMoonRules(): MoonRuleThresholds {
  return {
    moonDownMinFraction: 0.8,
    broadband: { greenMaxIllum: 0.15, yellowMaxIllum: 0.5, yellowMinSepDeg: 90 },
    broadbandFaintNebula: { greenMaxIllum: 0.15 },
    hydrogenSulfur: { greenMinSepDeg: 50, yellowMinSepDeg: 25 },
    oxygen: { greenMinSepDeg: 70, greenMaxIllum: 0.75, yellowMinSepDeg: 40 },
  }
}

/** Parametry domyślne z podmienionymi polami. */
export function settingsWith(patch: Partial<PlanningSettings>): PlanningSettings {
  return { ...defaults(), ...patch }
}

type RuleGroup = Exclude<keyof MoonRuleThresholds, 'moonDownMinFraction'>
type RuleField = { [G in RuleGroup]: keyof MoonRuleThresholds[G] }[RuleGroup]

/** Parametry domyślne z jednym progiem Księżyca (`group`.`field`) zmienionym na `value`. */
export function settingsWithRule(group: RuleGroup, field: RuleField, value: number): PlanningSettings {
  const rules = defaultMoonRules()
  if (!(field in rules[group])) throw new Error(`Brak progu ${group}.${field}`)
  return settingsWith({ moonRules: { ...rules, [group]: { ...rules[group], [field]: value } } })
}

/** Wszystkie progi oświetlenia (części całości) i wszystkie progi separacji [°] z MoonRuleThresholds. */
export const ILLUMINATION_RULES = [
  ['broadband', 'greenMaxIllum'],
  ['broadband', 'yellowMaxIllum'],
  ['broadbandFaintNebula', 'greenMaxIllum'],
  ['oxygen', 'greenMaxIllum'],
] as const

export const SEPARATION_RULES = [
  ['broadband', 'yellowMinSepDeg'],
  ['hydrogenSulfur', 'greenMinSepDeg'],
  ['hydrogenSulfur', 'yellowMinSepDeg'],
  ['oxygen', 'greenMinSepDeg'],
  ['oxygen', 'yellowMinSepDeg'],
] as const

/** Lokalizacja z wektorów: 52,0°N, 19,0°E, 150 m, Europe/Warsaw, horyzont płaski. */
export const FLAT_SITE: ObserverLocation = {
  ...DEMO_LOCATION,
  id: 'polska-centralna-plaski',
  name: 'Polska centralna (horyzont płaski)',
  horizon: [],
}

/** Podmienia wartość pola `key` w surowym wpisie, niezależnie od zagnieżdżenia; zwraca liczbę podmian. */
export function replaceDeep(value: unknown, key: string, replacement: unknown): number {
  if (typeof value !== 'object' || value === null) return 0
  let count = 0
  for (const [name, inner] of Object.entries(value)) {
    if (name === key) {
      ;(value as Record<string, unknown>)[name] = replacement
      count += 1
    } else {
      count += replaceDeep(inner, key, replacement)
    }
  }
  return count
}

/** Zapisuje poprawne parametry, a potem psuje surowy wpis `planning` w tabeli `settings` (pole `key` dostaje `replacement`). */
export async function corruptSaved(db: PlannerDb, saved: PlanningSettings, key: string, replacement: unknown): Promise<void> {
  await planningSettingsRepository.save(db, saved)
  const table = db.table<Record<string, unknown>, string>('settings')
  const entry = defined(await table.get('planning'))
  expect(replaceDeep(entry, key, replacement), `pole ${key} w zapisanym wpisie`).toBeGreaterThan(0)
  await table.put(entry)
}
