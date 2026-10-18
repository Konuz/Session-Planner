// P7 i P9 w aplikacji: zapis przez akcję `savePlanningSettings` ze stanu (IndexedDB, fake-indexeddb), potem „ponowne
// otwarcie aplikacji”: stan bez parametrów z poprzedniej sesji i wczytanie z bazy jak przy starcie (`loadLocations`).
// Zakładka Noc podpisuje czas efektywny „próg …, h_min …” (parametry-planowania, P14).
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { appDb } from '../../../src/data/appDb'
import { DEMO_LOCATION } from '../../../src/data/demo'
import { planningSettingsRepository } from '../../../src/data/repositories'
import {
  planningSettingsToForm,
  submitPlanningSettingsForm,
  type PlanningSettingsForm,
} from '../../../src/features/settings/planningSettingsForm'
import { DEFAULT_MOON_RULES, DEFAULT_PLANNING_SETTINGS } from '../../../src/services/planningSettings'
import { usePlannerStore } from '../../../src/state/plannerStore'
import type { PlanningSettings } from '../../../src/types'
import {
  DEFAULT_FORM,
  RESTORE,
  SAVED_TEXT,
  click,
  defaultMoonRules,
  defaults,
  editorButton,
  formWith,
  isDisabled,
  planningButtonProps,
  planningPart,
  renderSettingsTab,
  renderedNightTabText,
  rounded,
  settingsTabValues,
  settingsWith,
  settingsWithMoon,
  textOf,
  textPart,
} from './helpers'

const SAVED_25 = settingsWith({ minAltitudeDeg: 25 })
const FORM_25 = formWith({ minAltitudeDeg: '25' })

/** „Ponowne otwarcie aplikacji”: parametry w stanie jak przed wczytaniem bazy, potem start (`loadLocations`). */
async function reopen(): Promise<void> {
  usePlannerStore.setState({ planningSettings: defaults() })
  await usePlannerStore.getState().loadLocations()
}

/** „Zapisz zmiany” z formularzem `form` przez akcję zapisu ze stanu aplikacji. */
const submit = (form: PlanningSettingsForm) => submitPlanningSettingsForm(form, usePlannerStore.getState().savePlanningSettings)

const current = () => rounded(usePlannerStore.getState().planningSettings)
const inDatabase = async () => rounded(await planningSettingsRepository.load(appDb))

/** Zakładka Noc w nocy 16/17.10.2026 w lokalizacji demonstracyjnej. */
function nightCaption(): string {
  usePlannerStore.getState().selectLocation(DEMO_LOCATION.id)
  usePlannerStore.getState().setNightDate('2026-10-16')
  return renderedNightTabText()
}

const restoreButton = (markup: string) => {
  const found = planningPart(markup).after.filter((element) => element.tag === 'button' && textOf(element) === RESTORE)
  expect(found, `przyciski „${RESTORE}” w sekcji`).toHaveLength(1)
  return found[0]
}

beforeEach(async () => {
  await appDb.settings.clear()
  await reopen()
})

describe('P7 zapis i ponowne otwarcie aplikacji', () => {
  it('P7: h_min „25” i „Zapisz zmiany” → „Zapisano parametry.”; stan aplikacji i baza mają h_min 25°', async () => {
    const result = await submit(FORM_25)
    expect(result.message).toEqual({ kind: 'saved', text: SAVED_TEXT })
    expect(current()).toEqual(SAVED_25)
    expect(await inDatabase()).toEqual(SAVED_25)
  })

  it('P7: po ponownym otwarciu aplikacji pole h_min w Ustawieniach pokazuje „25”', async () => {
    await submit(FORM_25)
    await reopen()
    expect(current()).toEqual(SAVED_25)
    const values = settingsTabValues(renderSettingsTab(), SAVED_25, FORM_25)
    expect(values).toEqual(textPart(FORM_25))
    expect(values.minAltitudeDeg).toBe('25')
  })

  it('P7: po ponownym otwarciu zakładka Noc (16/17.10.2026) podpisuje „h_min 25°”', async () => {
    await submit(FORM_25)
    await reopen()
    const text = nightCaption()
    expect(text).toContain('próg −18°, h_min 25°')
    expect(text).not.toContain('h_min 30°')
  })

  it('P7: inny zapis (h_min „35”, próg −15°) → po ponownym otwarciu pole „35” i podpis „próg −15°, h_min 35°”', async () => {
    const form = formWith({ minAltitudeDeg: '35', darknessThresholdDeg: -15 })
    const saved = settingsWith({ minAltitudeDeg: 35, darknessThresholdDeg: -15 })
    expect((await submit(form)).message).toEqual({ kind: 'saved', text: SAVED_TEXT })
    await reopen()
    expect(current()).toEqual(saved)
    expect(settingsTabValues(renderSettingsTab(), saved, form).minAltitudeDeg).toBe('35')
    const text = nightCaption()
    expect(text).toContain('próg −15°, h_min 35°')
    expect(text).not.toContain('h_min 25°')
  })

  it('P3, P4, P7: seeing „3.5” i kadr „20”–„90” → po ponownym otwarciu 3,5″ i 0,2–0,9, w polach „3,5”, „20”, „90”', async () => {
    await submit(formWith({ seeingArcsec: '3.5', fitMinPercent: '20', fitMaxPercent: '90' }))
    await reopen()
    const saved = settingsWith({ seeingArcsec: 3.5, fitRange: [0.2, 0.9] })
    expect(current()).toEqual(saved)
    const values = settingsTabValues(renderSettingsTab(), saved, formWith({ seeingArcsec: '3,5', fitMinPercent: '20', fitMaxPercent: '90' }))
    expect(values).toMatchObject({ seeingArcsec: '3,5', fitMinPercent: '20', fitMaxPercent: '90' })
  })
})

describe('P9 „Przywróć domyślne” przy zapisanym h_min 25', () => {
  it('P9: zapisane h_min 25 → w Ustawieniach „Przywróć domyślne” aktywny', async () => {
    await submit(FORM_25)
    await reopen()
    expect(isDisabled(restoreButton(renderSettingsTab()))).toBe(false)
  })

  it('P9: kliknięcie „Przywróć domyślne” w Ustawieniach niczego nie zapisuje: stan i baza nadal h_min 25°', async () => {
    await submit(FORM_25)
    await reopen()
    click(planningButtonProps(RESTORE))
    // Zapis wywołany kliknięciem (gdyby był) zdąży trafić do bazy przed odczytem: transakcje IndexedDB idą po kolei.
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    expect(current()).toEqual(SAVED_25)
    expect(await inDatabase()).toEqual(SAVED_25)
    await reopen()
    expect(current()).toEqual(SAVED_25)
  })

  it('P9: „Przywróć domyślne” w edytorze z zapisanymi parametrami → formularz domyślny (h_min „30”)', async () => {
    await submit(FORM_25)
    await reopen()
    const onFormChange = vi.fn<(form: PlanningSettingsForm) => void>()
    click(editorButton({ saved: usePlannerStore.getState().planningSettings, form: FORM_25, onFormChange }, RESTORE))
    expect(onFormChange).toHaveBeenCalledWith(DEFAULT_FORM)
    expect(current()).toEqual(SAVED_25)
  })

  it('P9: „Przywróć domyślne”, potem „Zapisz zmiany” → zapisują się wartości domyślne; po otwarciu „30” i przycisk nieaktywny', async () => {
    await submit(FORM_25)
    expect((await submit(DEFAULT_FORM)).message).toEqual({ kind: 'saved', text: SAVED_TEXT })
    expect(current()).toEqual(defaults())
    await reopen()
    expect(await inDatabase()).toEqual(defaults())
    const markup = renderSettingsTab()
    expect(settingsTabValues(markup, defaults(), DEFAULT_FORM).minAltitudeDeg).toBe('30')
    expect(isDisabled(restoreButton(markup))).toBe(true)
  })
})

describe('wspólne wartości domyślne (DEFAULT_PLANNING_SETTINGS) zostają bez zmian', () => {
  it('P9: po zapisie zmienionych progów Księżyca i h_min wartości domyślne są nadal domyślne, a przywrócenie daje „30” i „75”', async () => {
    const result = await submit(
      formWith({ minAltitudeDeg: '25', oxygenGreenMaxIllumPercent: '60', broadbandYellowMinSepDeg: '120', fitMaxPercent: '70' }),
    )
    expect(result.message).toEqual({ kind: 'saved', text: SAVED_TEXT })
    const saved: PlanningSettings = {
      ...settingsWithMoon({ oxygen: { greenMaxIllum: 0.6 }, broadband: { yellowMinSepDeg: 120 } }),
      minAltitudeDeg: 25,
      fitRange: [0.25, 0.7],
    }
    expect(current()).toEqual(saved)
    expect(DEFAULT_PLANNING_SETTINGS).toEqual(defaults())
    expect(DEFAULT_MOON_RULES).toEqual(defaultMoonRules())
    expect(planningSettingsToForm(DEFAULT_PLANNING_SETTINGS)).toEqual(DEFAULT_FORM)

    const onFormChange = vi.fn<(form: PlanningSettingsForm) => void>()
    click(editorButton({ saved: usePlannerStore.getState().planningSettings, form: planningSettingsToForm(saved), onFormChange }, RESTORE))
    const [restored] = onFormChange.mock.calls[0]
    expect(restored).toEqual(DEFAULT_FORM)
    expect(restored).toMatchObject({ minAltitudeDeg: '30', oxygenGreenMaxIllumPercent: '75' })
  })
})
