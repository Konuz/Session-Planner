// Ustawienia → „Parametry planowania” (komponent prezentacyjny): pola wszystkich parametrów planowania, błędy przy polach,
// „Zapisz zmiany”, „Odrzuć zmiany”, „Przywróć domyślne” i „Niezapisane zmiany”. Stan formularza trzyma SettingsTab.
import { RotateCcw, Save, Undo2 } from 'lucide-react'
import { DEFAULT_PLANNING_SETTINGS } from '../../services/planningSettings'
import type { PlanningSettings } from '../../types'
import { Field } from './Field'
import {
  planningSettingsToForm,
  readPlanningSettingsForm,
  type PlanningSaveMessage,
  type PlanningSettingsForm,
  type PlanningTextField,
} from './planningSettingsForm'

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

const THRESHOLDS: readonly PlanningSettings['darknessThresholdDeg'][] = [-18, -15, -12]

function sameForm(a: PlanningSettingsForm, b: PlanningSettingsForm): boolean {
  return (Object.keys(a) as (keyof PlanningSettingsForm)[]).every((key) => a[key] === b[key])
}

export function PlanningSettingsEditor({ saved, form, message, onFormChange, onSave }: PlanningSettingsEditorProps) {
  const { issues } = readPlanningSettingsForm(form)
  const savedForm = planningSettingsToForm(saved)
  const defaultForm = planningSettingsToForm(DEFAULT_PLANNING_SETTINGS)
  const dirty = !sameForm(form, savedForm)
  const issueFor = (field: PlanningTextField | 'fitRange') => issues.find((issue) => issue.field === field)?.message

  const fitError = issueFor('fitRange')

  const input = (field: PlanningTextField, error: string | undefined) => (
    <input
      className="control text-sm"
      inputMode="decimal"
      value={form[field]}
      aria-invalid={error !== undefined}
      onChange={(event) => onFormChange({ ...form, [field]: event.target.value })}
    />
  )
  const field = (key: PlanningTextField, label: string) => (
    <Field label={label} error={issueFor(key)}>
      {input(key, issueFor(key))}
    </Field>
  )

  return (
    <section className="card flex flex-col gap-5 p-4" aria-labelledby="planning-settings-title">
      <h2 id="planning-settings-title" className="text-base font-semibold">
        Parametry planowania
      </h2>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Próg ciemności (wysokość Słońca)
          <select
            className="control text-sm"
            value={String(form.darknessThresholdDeg)}
            onChange={(event) =>
              onFormChange({ ...form, darknessThresholdDeg: Number(event.target.value) as PlanningSettings['darknessThresholdDeg'] })
            }
          >
            {THRESHOLDS.map((threshold) => (
              <option key={threshold} value={String(threshold)}>
                {`−${Math.abs(threshold)}°`}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 self-end text-sm">
          <input
            type="checkbox"
            checked={form.autoLowerThreshold}
            onChange={(event) => onFormChange({ ...form, autoLowerThreshold: event.target.checked })}
          />
          Obniżaj próg (−18° → −15° → −12°), gdy Słońce nie schodzi tak nisko
        </label>
        {field('minAltitudeDeg', 'h_min, minimalna wysokość obiektu [°]')}
        {field('minEffectiveHours', 'Minimum czasu efektywnego [h]')}
        {field('catalogStepMin', 'Krok katalogu [min]')}
        {field('detailStepMin', 'Krok wykresu nocy [min]')}
        {field('seeingArcsec', 'Seeing [″]')}
        <div role="group" aria-labelledby="planning-fit-title" className="flex flex-col gap-1 text-xs text-muted">
          <span id="planning-fit-title">Pasuje do kadru [% krótszego boku kadru]</span>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              od
              {input('fitMinPercent', fitError)}
            </label>
            <label className="flex flex-col gap-1">
              do
              {input('fitMaxPercent', fitError)}
            </label>
          </div>
          {fitError && <span className="text-accent">{fitError}</span>}
        </div>
      </div>

      <section aria-labelledby="planning-moon-title" className="flex flex-col gap-3">
        <h3 id="planning-moon-title" className="text-sm font-semibold">
          Księżyc i rekomendacje filtrów
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {field('moonDownMinPercent', 'Księżyc pod horyzontem przez co najmniej [% okna] – wszystkie filtry zielone')}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 text-sm">L, R, G, B, OSC</legend>
            {field('broadbandGreenMaxIllumPercent', 'Zielony: oświetlenie poniżej [%]')}
            {field('broadbandYellowMaxIllumPercent', 'Żółty: oświetlenie poniżej [%]')}
            {field('broadbandYellowMinSepDeg', 'Żółty: separacja od [°]')}
          </fieldset>
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 text-sm">Mgławice refleksyjne i ciemne (L, R, G, B, OSC)</legend>
            {field('faintNebulaGreenMaxIllumPercent', 'Zielony: oświetlenie poniżej [%]')}
          </fieldset>
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 text-sm">Ha, SII</legend>
            {field('hydrogenSulfurGreenMinSepDeg', 'Zielony: separacja od [°]')}
            {field('hydrogenSulfurYellowMinSepDeg', 'Żółty: separacja od [°]')}
          </fieldset>
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 text-sm">OIII, DualBand</legend>
            {field('oxygenGreenMinSepDeg', 'Zielony: separacja od [°]')}
            {field('oxygenGreenMaxIllumPercent', 'Zielony: oświetlenie poniżej [%]')}
            {field('oxygenYellowMinSepDeg', 'Żółty: separacja od [°]')}
          </fieldset>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <button type="button" className="button button-primary" disabled={!dirty || issues.length > 0} onClick={onSave}>
          <Save aria-hidden size={18} /> Zapisz zmiany
        </button>
        <button type="button" className="button" disabled={!dirty} onClick={() => onFormChange(savedForm)}>
          <Undo2 aria-hidden size={18} /> Odrzuć zmiany
        </button>
        <button type="button" className="button" disabled={sameForm(form, defaultForm)} onClick={() => onFormChange(defaultForm)}>
          <RotateCcw aria-hidden size={18} /> Przywróć domyślne
        </button>
        {dirty && <span className="text-sm text-muted">Niezapisane zmiany</span>}
        {message && (
          <span role="status" className={`text-sm ${message.kind === 'error' ? 'text-accent' : 'text-muted'}`}>
            {message.text}
          </span>
        )}
      </div>
    </section>
  )
}
