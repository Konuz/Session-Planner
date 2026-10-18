// Formularz parametrów planowania w Ustawieniach (czyste funkcje): parametry → tekst pól i tekst pól → parametry albo
// lista błędów. Liczby czyta `parseDecimal` (przecinek i kropka), zakresy i komunikaty z `validatePlanningSettings`.
import { parseDecimal } from '../../services/equipment'
import {
  DEFAULT_PLANNING_SETTINGS,
  planningSettingLabel,
  validatePlanningSettings,
  type PlanningSettingsProblem,
} from '../../services/planningSettings'
import type { PlanningSettings } from '../../types'

/**
 * Pola tekstowe formularza. Pola `…Percent` są w procentach (w parametrach: części całości, „15” → 0,15),
 * pola `…SepDeg` i pozostałe w jednostkach parametrów (°, h, min, ″).
 */
export type PlanningTextField =
  | 'minAltitudeDeg'
  | 'minEffectiveHours'
  | 'catalogStepMin'
  | 'detailStepMin'
  | 'seeingArcsec'
  /** fitRange[0] w procentach. */
  | 'fitMinPercent'
  /** fitRange[1] w procentach. */
  | 'fitMaxPercent'
  /** moonRules.moonDownMinFraction w procentach. */
  | 'moonDownMinPercent'
  /** moonRules.broadband.greenMaxIllum w procentach. */
  | 'broadbandGreenMaxIllumPercent'
  /** moonRules.broadband.yellowMaxIllum w procentach. */
  | 'broadbandYellowMaxIllumPercent'
  /** moonRules.broadband.yellowMinSepDeg [°]. */
  | 'broadbandYellowMinSepDeg'
  /** moonRules.broadbandFaintNebula.greenMaxIllum w procentach. */
  | 'faintNebulaGreenMaxIllumPercent'
  /** moonRules.hydrogenSulfur.greenMinSepDeg [°]. */
  | 'hydrogenSulfurGreenMinSepDeg'
  /** moonRules.hydrogenSulfur.yellowMinSepDeg [°]. */
  | 'hydrogenSulfurYellowMinSepDeg'
  /** moonRules.oxygen.greenMinSepDeg [°]. */
  | 'oxygenGreenMinSepDeg'
  /** moonRules.oxygen.greenMaxIllum w procentach. */
  | 'oxygenGreenMaxIllumPercent'
  /** moonRules.oxygen.yellowMinSepDeg [°]. */
  | 'oxygenYellowMinSepDeg'

/** Stan formularza: tekst pól liczbowych, próg ciemności z listy i pole wyboru obniżania progu. */
export interface PlanningSettingsForm extends Record<PlanningTextField, string> {
  darknessThresholdDeg: PlanningSettings['darknessThresholdDeg']
  autoLowerThreshold: boolean
}

/**
 * Wynik odczytu formularza: parametry (null, gdy są błędy) i błędy. `field` błędu to klucz pola formularza, a dla obu
 * granic „Pasuje do kadru” wspólne 'fitRange'.
 */
export interface PlanningFormResult {
  settings: PlanningSettings | null
  issues: PlanningSettingsProblem[]
}

/** Komunikat po zapisie: „Zapisano parametry.” albo „Nie udało się zapisać: <przyczyna>”. */
export interface PlanningSaveMessage {
  kind: 'saved' | 'error'
  text: string
}

/** Formularz i komunikat po próbie zapisu. */
export interface PlanningSubmitResult {
  form: PlanningSettingsForm
  message: PlanningSaveMessage | null
}

/** Pole tekstowe: ścieżka w parametrach (jak `field` w `validatePlanningSettings`) i czy jest w procentach. */
const TEXT_FIELDS: readonly { key: PlanningTextField; path: string; percent?: true }[] = [
  { key: 'minAltitudeDeg', path: 'minAltitudeDeg' },
  { key: 'minEffectiveHours', path: 'minEffectiveHours' },
  { key: 'catalogStepMin', path: 'catalogStepMin' },
  { key: 'detailStepMin', path: 'detailStepMin' },
  { key: 'seeingArcsec', path: 'seeingArcsec' },
  { key: 'fitMinPercent', path: 'fitRange.0', percent: true },
  { key: 'fitMaxPercent', path: 'fitRange.1', percent: true },
  { key: 'moonDownMinPercent', path: 'moonRules.moonDownMinFraction', percent: true },
  { key: 'broadbandGreenMaxIllumPercent', path: 'moonRules.broadband.greenMaxIllum', percent: true },
  { key: 'broadbandYellowMaxIllumPercent', path: 'moonRules.broadband.yellowMaxIllum', percent: true },
  { key: 'broadbandYellowMinSepDeg', path: 'moonRules.broadband.yellowMinSepDeg' },
  { key: 'faintNebulaGreenMaxIllumPercent', path: 'moonRules.broadbandFaintNebula.greenMaxIllum', percent: true },
  { key: 'hydrogenSulfurGreenMinSepDeg', path: 'moonRules.hydrogenSulfur.greenMinSepDeg' },
  { key: 'hydrogenSulfurYellowMinSepDeg', path: 'moonRules.hydrogenSulfur.yellowMinSepDeg' },
  { key: 'oxygenGreenMinSepDeg', path: 'moonRules.oxygen.greenMinSepDeg' },
  { key: 'oxygenGreenMaxIllumPercent', path: 'moonRules.oxygen.greenMaxIllum', percent: true },
  { key: 'oxygenYellowMinSepDeg', path: 'moonRules.oxygen.yellowMinSepDeg' },
]

type Node = Record<string, unknown>

/** Węzeł nad ostatnim kluczem ścieżki i ten klucz. */
function slot(settings: PlanningSettings, path: string): { node: Node; key: string } {
  const keys = path.split('.')
  const key = keys.pop() ?? path
  return { node: keys.reduce<Node>((node, part) => node[part] as Node, settings as unknown as Node), key }
}

/** Pole błędu `validatePlanningSettings` dla ścieżki: obie granice kadru to jedno pole 'fitRange'. */
const problemField = (path: string) => (path.startsWith('fitRange.') ? 'fitRange' : path)

/** Klucz formularza dla pola błędu (granice kadru: 'fitRange'). */
const formField = (field: string) => TEXT_FIELDS.find((spec) => spec.path === field)?.key ?? field

/** Liczba z przecinkiem dziesiętnym, bez szumu zmiennoprzecinkowego (0,29 · 100 → „29”). */
const formatNumber = (value: number) => String(Math.round(value * 1e6) / 1e6).replace('.', ',')

/** Tekst pól dla parametrów: liczby z przecinkiem dziesiętnym, części całości jako procenty (0,15 → „15”). */
export function planningSettingsToForm(settings: PlanningSettings): PlanningSettingsForm {
  const text = Object.fromEntries(
    TEXT_FIELDS.map(({ key, path, percent }) => {
      const { node, key: last } = slot(settings, path)
      const value = node[last] as number
      return [key, formatNumber(percent ? value * 100 : value)]
    }),
  ) as Record<PlanningTextField, string>
  return { darknessThresholdDeg: settings.darknessThresholdDeg, autoLowerThreshold: settings.autoLowerThreshold, ...text }
}

/**
 * Parametry z formularza albo lista błędów: tekst, który nie jest liczbą → „<pole>: wpisz liczbę”; zakresy i komunikaty
 * jak w `validatePlanningSettings`. Nie zmienia formularza ani wartości domyślnych.
 */
export function readPlanningSettingsForm(form: PlanningSettingsForm): PlanningFormResult {
  // Pola, które nie są liczbą, zostają przy wartości domyślnej, a ich błędy zakresu się pomija.
  const settings = structuredClone(DEFAULT_PLANNING_SETTINGS)
  settings.darknessThresholdDeg = form.darknessThresholdDeg
  settings.autoLowerThreshold = form.autoLowerThreshold
  const unreadable = new Set<string>()
  for (const { key, path, percent } of TEXT_FIELDS) {
    const value = parseDecimal(form[key])
    if (value === null) unreadable.add(problemField(path))
    else {
      const { node, key: last } = slot(settings, path)
      node[last] = percent ? value / 100 : value
    }
  }
  const issues = [
    ...[...unreadable].map((field) => ({ field, message: `${planningSettingLabel(field)}: wpisz liczbę` })),
    ...validatePlanningSettings(settings).filter((problem) => !unreadable.has(problem.field)),
  ].map((issue) => ({ ...issue, field: formField(issue.field) }))
  return { settings: issues.length === 0 ? settings : null, issues }
}

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error))

/**
 * „Zapisz zmiany”: parametry z formularza zapisuje `save` (akcja `savePlanningSettings` ze stanu). Po zapisie komunikat
 * „Zapisano parametry.” i formularz zapisanych parametrów; gdy `save` się nie uda – „Nie udało się zapisać: <przyczyna>”,
 * a formularz zostaje bez zmian. Formularz z błędami nie jest zapisywany.
 */
export async function submitPlanningSettingsForm(
  form: PlanningSettingsForm,
  save: (settings: PlanningSettings) => Promise<void>,
): Promise<PlanningSubmitResult> {
  const { settings } = readPlanningSettingsForm(form)
  if (!settings) return { form, message: null }
  try {
    await save(settings)
    return { form: planningSettingsToForm(settings), message: { kind: 'saved', text: 'Zapisano parametry.' } }
  } catch (error) {
    return { form, message: { kind: 'error', text: `Nie udało się zapisać: ${errorText(error)}` } }
  }
}
