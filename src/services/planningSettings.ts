// Parametry planowania (sekcja 5): wartości domyślne [Z6–Z9, Z12, Z21] i walidacja zakresów.
// ZAŚLEPKA funkcji „parametry-planowania”: każde użycie zgłasza NotImplementedError.
import type { MoonRuleThresholds, PlanningSettings } from '../types'

/** Problem walidacji: pole parametrów i komunikat dla użytkownika. */
export interface PlanningSettingsProblem {
  field: string
  message: string
}

function notImplemented(name: string): never {
  throw new Error(`NotImplementedError: ${name}`)
}

/** Zaślepka stałej: odczyt dowolnego pola zgłasza NotImplementedError. */
function notImplementedConstant<T extends object>(name: string): T {
  return new Proxy({} as T, { get: () => notImplemented(name) })
}

export const DEFAULT_MOON_RULES: MoonRuleThresholds = notImplementedConstant('DEFAULT_MOON_RULES')

export const DEFAULT_PLANNING_SETTINGS: PlanningSettings = notImplementedConstant('DEFAULT_PLANNING_SETTINGS')

/** Lista problemów (pole i komunikat); pusta, gdy parametry są poprawne. */
export function validatePlanningSettings(settings: PlanningSettings): PlanningSettingsProblem[] {
  void settings
  return notImplemented('validatePlanningSettings')
}
