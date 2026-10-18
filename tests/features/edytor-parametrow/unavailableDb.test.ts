// P10 w aplikacji: baza przeglądarki niedostępna. Ten plik celowo nie ładuje fake-indexeddb, więc IndexedDB nie istnieje
// (jak w przeglądarce bez dostępu do bazy) i akcja `savePlanningSettings` ze stanu kończy się błędem Dexie.
import { describe, expect, it } from 'vitest'
import { submitPlanningSettingsForm } from '../../../src/features/settings/planningSettingsForm'
import { usePlannerStore } from '../../../src/state/plannerStore'
import type { PlanningSettings } from '../../../src/types'
import { SAVE_FAILED_PREFIX, UNSAVED, defaults, formWith, renderEditor, visibleText } from './helpers'

describe('P10 baza przeglądarki niedostępna', () => {
  it('P10: h_min „25” i „Zapisz zmiany” → „Nie udało się zapisać: <przyczyna>”, pole zachowuje „25”, stan bez zmian', async () => {
    expect(globalThis.indexedDB, 'w tym pliku IndexedDB ma nie istnieć').toBeUndefined()
    await usePlannerStore.getState().loadLocations()
    expect(usePlannerStore.getState().planningSettings).toEqual(defaults())

    // Akcja zapisu ze stanu; przyczynę odrzucenia zapamiętujemy, żeby porównać ją z komunikatem.
    const failure: { cause: string | null } = { cause: null }
    const save = async (settings: PlanningSettings) => {
      try {
        await usePlannerStore.getState().savePlanningSettings(settings)
      } catch (error) {
        failure.cause = error instanceof Error ? error.message : String(error)
        throw error
      }
    }

    const form = formWith({ minAltitudeDeg: '25' })
    const result = await submitPlanningSettingsForm(form, save)
    expect(failure.cause, 'zapis w stanie aplikacji miał się nie udać').not.toBeNull()
    const cause = failure.cause ?? ''
    expect(cause.length).toBeGreaterThan(0)

    expect(result.message?.kind).toBe('error')
    const text = result.message?.text ?? ''
    expect(text.startsWith(SAVE_FAILED_PREFIX), text).toBe(true)
    expect(text).toContain(cause)
    expect(result.form).toEqual(form)
    expect(usePlannerStore.getState().planningSettings).toEqual(defaults())

    const { markup, inputs } = renderEditor({
      saved: usePlannerStore.getState().planningSettings,
      form: result.form,
      message: result.message,
    })
    expect(visibleText(markup)).toContain(text)
    expect(inputs.minAltitudeDeg.attrs.value).toBe('25')
    expect(visibleText(markup)).toContain(UNSAVED)
  })
})
