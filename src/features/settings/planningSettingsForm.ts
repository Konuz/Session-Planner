// Formularz parametrów planowania w Ustawieniach (czyste funkcje): parametry → tekst pól i tekst pól → parametry albo
// lista błędów. Liczby czyta `parseDecimal` (przecinek i kropka), zakresy i komunikaty z `validatePlanningSettings`.
// ZAŚLEPKA funkcji „edytor-parametrow”: funkcje zgłaszają NotImplementedError.
import type { PlanningSettingsProblem } from '../../services/planningSettings'
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

/** Wynik odczytu formularza: parametry (null, gdy są błędy) i błędy (pole formularza i komunikat). */
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

function notImplemented(name: string): never {
  throw new Error(`NotImplementedError: ${name}`)
}

/** Tekst pól dla parametrów: liczby z przecinkiem dziesiętnym, części całości jako procenty (0,15 → „15”). */
export function planningSettingsToForm(settings: PlanningSettings): PlanningSettingsForm {
  void settings
  return notImplemented('planningSettingsToForm')
}

/**
 * Parametry z formularza albo lista błędów: tekst, który nie jest liczbą → „<pole>: wpisz liczbę”; zakresy i komunikaty
 * jak w `validatePlanningSettings`. Nie zmienia formularza ani wartości domyślnych.
 */
export function readPlanningSettingsForm(form: PlanningSettingsForm): PlanningFormResult {
  void form
  return notImplemented('readPlanningSettingsForm')
}

/**
 * „Zapisz zmiany”: parametry z formularza zapisuje `save` (akcja `savePlanningSettings` ze stanu). Po zapisie komunikat
 * „Zapisano parametry.”; gdy `save` się nie uda – „Nie udało się zapisać: <przyczyna>”, a formularz zostaje bez zmian.
 * Formularz z błędami nie jest zapisywany.
 */
export function submitPlanningSettingsForm(
  form: PlanningSettingsForm,
  save: (settings: PlanningSettings) => Promise<void>,
): Promise<PlanningSubmitResult> {
  void form
  void save
  return notImplemented('submitPlanningSettingsForm')
}
