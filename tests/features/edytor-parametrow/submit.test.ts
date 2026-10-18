// „Zapisz zmiany” jako czysta funkcja `submitPlanningSettingsForm(form, save)`: `save` to akcja zapisu ze stanu
// (`savePlanningSettings`), tu atrapa. P7: „Zapisano parametry.”; P10: „Nie udało się zapisać: …” z przyczyną, formularz
// zostaje; P5/P6: formularz z błędami się nie zapisuje.
import { describe, expect, it, vi } from 'vitest'
import { submitPlanningSettingsForm, type PlanningSettingsForm } from '../../../src/features/settings/planningSettingsForm'
import type { PlanningSettings } from '../../../src/types'
import {
  CUSTOM,
  CUSTOM_FORM,
  SAVED_TEXT,
  SAVE_FAILED_PREFIX,
  UNSAVED,
  formWith,
  renderEditor,
  rounded,
  settingsWith,
  visibleText,
} from './helpers'

type Save = (settings: PlanningSettings) => Promise<void>

const resolvingSave = () => vi.fn<Save>(() => Promise.resolve())
const rejectingSave = (error: Error) => vi.fn<Save>(() => Promise.reject(error))

/** Parametry przekazane do jedynego wywołania `save` (zaokrąglone do 9 miejsc). */
function savedArgument(save: ReturnType<typeof resolvingSave>): PlanningSettings {
  expect(save).toHaveBeenCalledTimes(1)
  return rounded(save.mock.calls[0][0])
}

describe('P7 udany zapis', () => {
  it('P7: h_min „25” → zapis parametrów z h_min 25° (pozostałe domyślne) i komunikat „Zapisano parametry.”', async () => {
    const save = resolvingSave()
    const result = await submitPlanningSettingsForm(formWith({ minAltitudeDeg: '25' }), save)
    expect(savedArgument(save)).toEqual(settingsWith({ minAltitudeDeg: 25 }))
    expect(result.message).toEqual({ kind: 'saved', text: SAVED_TEXT })
  })

  it('P7: po zapisie edytor (zapisane = parametry z zapisu) pokazuje „25” i „Zapisano parametry.”, bez „Niezapisane zmiany”', async () => {
    const save = resolvingSave()
    const result = await submitPlanningSettingsForm(formWith({ minAltitudeDeg: '25' }), save)
    const { markup, inputs } = renderEditor({ saved: savedArgument(save), form: result.form, message: result.message })
    expect(inputs.minAltitudeDeg.attrs.value).toBe('25')
    expect(visibleText(markup)).toContain(SAVED_TEXT)
    expect(visibleText(markup)).not.toContain(UNSAVED)
  })

  it('P3, P7: seeing „3.5” → zapis 3,5″; po zapisie bez „Niezapisane zmiany” (P8)', async () => {
    const save = resolvingSave()
    const result = await submitPlanningSettingsForm(formWith({ seeingArcsec: '3.5' }), save)
    const saved = savedArgument(save)
    expect(saved).toEqual(settingsWith({ seeingArcsec: 3.5 }))
    expect(visibleText(renderEditor({ saved, form: result.form, message: result.message }).markup)).not.toContain(UNSAVED)
  })

  it('P4, P7: formularz CUSTOM (każde pole inne) → zapis parametrów CUSTOM', async () => {
    const save = resolvingSave()
    const result = await submitPlanningSettingsForm(CUSTOM_FORM, save)
    expect(savedArgument(save)).toEqual(rounded(CUSTOM))
    expect(result.message).toEqual({ kind: 'saved', text: SAVED_TEXT })
  })
})

describe('P10 nieudany zapis', () => {
  const CAUSES = ['Baza danych przeglądarki jest niedostępna', 'QuotaExceededError: brak miejsca na dysku']

  it.each(CAUSES)('P10: zapis odrzucony z przyczyną „%s” → „Nie udało się zapisać: <przyczyna>”', async (cause) => {
    const form = formWith({ minAltitudeDeg: '25' })
    const result = await submitPlanningSettingsForm(form, rejectingSave(new Error(cause)))
    expect(result.message?.kind).toBe('error')
    const text = result.message?.text ?? ''
    expect(text.startsWith(SAVE_FAILED_PREFIX), text).toBe(true)
    expect(text).toContain(cause)
  })

  it('P10: po nieudanym zapisie formularz zachowuje wpisane wartości (także „3.5” z kropką i zmieniony próg)', async () => {
    const form: PlanningSettingsForm = formWith({
      minAltitudeDeg: '25',
      seeingArcsec: '3.5',
      darknessThresholdDeg: -12,
      autoLowerThreshold: false,
      oxygenGreenMaxIllumPercent: '60',
    })
    const result = await submitPlanningSettingsForm(form, rejectingSave(new Error(CAUSES[0])))
    expect(result.form).toEqual(form)
  })

  it('P10: edytor po nieudanym zapisie: komunikat z przyczyną, pole h_min „25”, „Niezapisane zmiany”', async () => {
    const form = formWith({ minAltitudeDeg: '25' })
    const result = await submitPlanningSettingsForm(form, rejectingSave(new Error(CAUSES[1])))
    const { markup, inputs } = renderEditor({ form: result.form, message: result.message })
    expect(visibleText(markup)).toContain(`${SAVE_FAILED_PREFIX}`)
    expect(visibleText(markup)).toContain(CAUSES[1])
    expect(inputs.minAltitudeDeg.attrs.value).toBe('25')
    expect(visibleText(markup)).toContain(UNSAVED)
  })
})

describe('P5, P6 formularz z błędami się nie zapisuje', () => {
  const INVALID: readonly (readonly [string, PlanningSettingsForm])[] = [
    ['h_min puste', formWith({ minAltitudeDeg: '' })],
    ['h_min „abc”', formWith({ minAltitudeDeg: 'abc' })],
    ['h_min „95”', formWith({ minAltitudeDeg: '95' })],
    ['kadr od „80” do „25”', formWith({ fitMinPercent: '80', fitMaxPercent: '25' })],
  ]

  it.each(INVALID)('P5, P6: %s → `save` nie jest wywołane, formularz bez zmian', async (_, form) => {
    const save = resolvingSave()
    const result = await submitPlanningSettingsForm(form, save)
    expect(save).not.toHaveBeenCalled()
    expect(result.form).toEqual(form)
    expect(result.message?.text ?? '').not.toContain(SAVED_TEXT)
  })
})
