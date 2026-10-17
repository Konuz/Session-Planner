// Parametry planowania (sekcja 5): wartości domyślne [Z6–Z9, Z12, Z21] i walidacja zakresów.
import type { MoonRuleThresholds, PlanningSettings } from '../types'

/** Problem walidacji: pole parametrów i komunikat dla użytkownika. */
export interface PlanningSettingsProblem {
  field: string
  message: string
}

export const DEFAULT_MOON_RULES: MoonRuleThresholds = {
  moonDownMinFraction: 0.8,
  broadband: { greenMaxIllum: 0.15, yellowMaxIllum: 0.5, yellowMinSepDeg: 90 },
  broadbandFaintNebula: { greenMaxIllum: 0.15 },
  hydrogenSulfur: { greenMinSepDeg: 50, yellowMinSepDeg: 25 },
  oxygen: { greenMinSepDeg: 70, greenMaxIllum: 0.75, yellowMinSepDeg: 40 },
}

export const DEFAULT_PLANNING_SETTINGS: PlanningSettings = {
  darknessThresholdDeg: -18,
  autoLowerThreshold: true,
  minAltitudeDeg: 30,
  minEffectiveHours: 3,
  catalogStepMin: 5,
  detailStepMin: 1,
  seeingArcsec: 2.5,
  fitRange: [0.25, 0.8],
  moonRules: DEFAULT_MOON_RULES,
}

/** Zakres liczbowy pola (granice włącznie); `field` to ścieżka pola w PlanningSettings. */
interface RangeRule {
  field: string
  label: string
  min: number
  max: number
  range: string
  integer?: boolean
}

const ILLUMINATION = { min: 0, max: 1, range: '0–100%' }
const SEPARATION = { min: 0, max: 180, range: '0–180°' }

const RANGE_RULES: readonly RangeRule[] = [
  { field: 'minAltitudeDeg', label: 'h_min', min: 0, max: 90, range: '0–90°' },
  { field: 'minEffectiveHours', label: 'Minimum czasu efektywnego', min: 0.5, max: 24, range: '0,5–24 h' },
  { field: 'catalogStepMin', label: 'Krok katalogu', min: 1, max: 30, range: '1–30 min', integer: true },
  { field: 'detailStepMin', label: 'Krok wykresu nocy', min: 1, max: 30, range: '1–30 min', integer: true },
  { field: 'seeingArcsec', label: 'Seeing', min: 0.5, max: 10, range: '0,5–10″' },
  { field: 'moonRules.moonDownMinFraction', label: 'Księżyc pod horyzontem, udział okna', ...ILLUMINATION },
  { field: 'moonRules.broadband.greenMaxIllum', label: 'L, R, G, B, OSC, zielony: oświetlenie', ...ILLUMINATION },
  { field: 'moonRules.broadband.yellowMaxIllum', label: 'L, R, G, B, OSC, żółty: oświetlenie', ...ILLUMINATION },
  { field: 'moonRules.broadband.yellowMinSepDeg', label: 'L, R, G, B, OSC, żółty: separacja', ...SEPARATION },
  {
    field: 'moonRules.broadbandFaintNebula.greenMaxIllum',
    label: 'Mgławice refleksyjne i ciemne, zielony: oświetlenie',
    ...ILLUMINATION,
  },
  { field: 'moonRules.hydrogenSulfur.greenMinSepDeg', label: 'Ha, SII, zielony: separacja', ...SEPARATION },
  { field: 'moonRules.hydrogenSulfur.yellowMinSepDeg', label: 'Ha, SII, żółty: separacja', ...SEPARATION },
  { field: 'moonRules.oxygen.greenMinSepDeg', label: 'OIII, DualBand, zielony: separacja', ...SEPARATION },
  { field: 'moonRules.oxygen.greenMaxIllum', label: 'OIII, DualBand, zielony: oświetlenie', ...ILLUMINATION },
  { field: 'moonRules.oxygen.yellowMinSepDeg', label: 'OIII, DualBand, żółty: separacja', ...SEPARATION },
]

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

const inRange = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max

/** Problemy dowolnej wartości (także wpisu z bazy); brak pola albo pole innego typu to błąd zakresu. */
function problemsOf(raw: unknown): PlanningSettingsProblem[] {
  const read = (path: string) => path.split('.').reduce<unknown>((value, key) => (isRecord(value) ? value[key] : undefined), raw)
  const problems: PlanningSettingsProblem[] = []
  const threshold = read('darknessThresholdDeg')
  if (![-18, -15, -12].some((allowed) => allowed === threshold)) {
    problems.push({ field: 'darknessThresholdDeg', message: 'Próg ciemności: wybierz −18°, −15° albo −12°' })
  }
  for (const rule of RANGE_RULES) {
    const value = read(rule.field)
    if (rule.integer && typeof value === 'number' && !Number.isInteger(value)) {
      problems.push({ field: rule.field, message: `${rule.label}: wpisz liczbę całkowitą` })
    } else if (!inRange(value, rule.min, rule.max)) {
      problems.push({ field: rule.field, message: `${rule.label}: dozwolony zakres ${rule.range}` })
    }
  }
  const low = read('fitRange.0')
  const high = read('fitRange.1')
  if (!inRange(low, 0, 1) || !inRange(high, 0, 1)) {
    problems.push({ field: 'fitRange', message: 'Pasuje do kadru: dozwolony zakres 0–100%' })
  } else if (low >= high) {
    problems.push({ field: 'fitRange', message: 'Pasuje do kadru: dolna granica musi być mniejsza od górnej' })
  }
  return problems
}

/** Lista problemów (pole i komunikat); pusta, gdy parametry są poprawne. */
export function validatePlanningSettings(settings: PlanningSettings): PlanningSettingsProblem[] {
  return problemsOf(settings)
}

/** Czy wartość (np. wpis z bazy) to kompletne i poprawne parametry planowania. */
export function isPlanningSettings(raw: unknown): raw is PlanningSettings {
  return (
    isRecord(raw) &&
    typeof raw.autoLowerThreshold === 'boolean' &&
    Array.isArray(raw.fitRange) &&
    raw.fitRange.length === 2 &&
    problemsOf(raw).length === 0
  )
}
