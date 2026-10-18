// Ustawienia → „Parametry planowania” (komponent prezentacyjny): pola wszystkich parametrów planowania, błędy przy polach,
// „Zapisz zmiany”, „Odrzuć zmiany”, „Przywróć domyślne” i „Niezapisane zmiany”. Stan formularza trzyma SettingsTab.
// ZAŚLEPKA funkcji „edytor-parametrow”: komponent zgłasza NotImplementedError.
import type { PlanningSaveMessage, PlanningSettingsForm } from './planningSettingsForm'
import type { PlanningSettings } from '../../types'

export interface PlanningSettingsEditorProps {
  /** Zapisane parametry (stan aplikacji). Formularz różny od nich: napis „Niezapisane zmiany”. */
  saved: PlanningSettings
  /** Bieżący tekst pól. */
  form: PlanningSettingsForm
  /** Komunikat ostatniego zapisu (`submitPlanningSettingsForm`); null = brak komunikatu. */
  message: PlanningSaveMessage | null
  /**
   * Nowy stan formularza: wpis w polu, wybór progu ciemności, pole wyboru obniżania progu, a także „Odrzuć zmiany”
   * (formularz zapisanych parametrów) i „Przywróć domyślne” (formularz `DEFAULT_PLANNING_SETTINGS`, bez zapisu).
   */
  onFormChange: (form: PlanningSettingsForm) => void
  /** „Zapisz zmiany”; przycisk jest nieaktywny, gdy formularz ma błędy. */
  onSave: () => void
}

function notImplemented(name: string): never {
  throw new Error(`NotImplementedError: ${name}`)
}

export function PlanningSettingsEditor(props: PlanningSettingsEditorProps) {
  void props
  return notImplemented('PlanningSettingsEditor')
}
