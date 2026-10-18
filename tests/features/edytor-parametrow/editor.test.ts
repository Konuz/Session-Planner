// Edytor „Parametry planowania” (komponent prezentacyjny `PlanningSettingsEditor`, render w Node bez DOM): pola i ich
// tekst (P1), lista progu i pole wyboru obniżania (P2), błędy przy polach i blokada zapisu (P5, P6), komunikaty zapisu
// (P7, P10), „Niezapisane zmiany” i „Odrzuć zmiany” (P8), „Przywróć domyślne” (P9), klasy `control` i `button` („Styk”).
import { describe, expect, it, vi } from 'vitest'
import type { PlanningSettingsForm } from '../../../src/features/settings/planningSettingsForm'
import { validatePlanningSettings } from '../../../src/services/planningSettings'
import {
  CUSTOM,
  CUSTOM_FORM,
  DEFAULT_FORM,
  DISCARD,
  FIT_ORDER,
  H_MIN_NOT_A_NUMBER,
  H_MIN_RANGE,
  RESTORE,
  SAVE,
  SAVED_TEXT,
  SAVE_FAILED_PREFIX,
  TEXT_FIELDS,
  UNSAVED,
  buttonIn,
  checkboxIn,
  click,
  controlsWithoutClass,
  defaults,
  editorButton,
  editorElement,
  elementsOf,
  fieldLabel,
  formWith,
  isDisabled,
  minHeightPx,
  nearField,
  parseMarkup,
  probeAll,
  renderEditor,
  settingsWith,
  settingsWithMoon,
  textPart,
  thresholdSelect,
  toggle,
  valuesOf,
  visibleText,
  type HostProps,
} from './helpers'

const SAVED_25 = settingsWith({ minAltitudeDeg: 25 })
const FORM_25 = formWith({ minAltitudeDeg: '25' })

const spies = () => ({
  onFormChange: vi.fn<(form: PlanningSettingsForm) => void>(),
  onSave: vi.fn<() => void>(),
})

/** Stan przycisków edytora (atrybut disabled). */
function buttonsDisabled(markup: string): { save: boolean; discard: boolean; restore: boolean } {
  const root = parseMarkup(markup)
  return {
    save: isDisabled(buttonIn(root, SAVE)),
    discard: isDisabled(buttonIn(root, DISCARD)),
    restore: isDisabled(buttonIn(root, RESTORE)),
  }
}

/** Jedyne pole wyboru edytora (z sondy). */
function checkboxProps(form: PlanningSettingsForm, onFormChange: (form: PlanningSettingsForm) => void): HostProps {
  const { found } = probeAll(editorElement({ form, onFormChange }), (host) => host.tag === 'input' && host.props.type === 'checkbox')
  expect(found).toHaveLength(1)
  return found[0].props
}

function selectProps(form: PlanningSettingsForm, onFormChange: (form: PlanningSettingsForm) => void): HostProps {
  const { found } = probeAll(editorElement({ form, onFormChange }), (host) => host.tag === 'select')
  expect(found).toHaveLength(1)
  return found[0].props
}

describe('P1 pola i ich tekst', () => {
  it('P1: wartości domyślne → każde z 17 pól pokazuje tekst ze spec (h_min „30”, seeing „2,5”, kadr „25”–„80” …)', () => {
    const { inputs } = renderEditor({ saved: defaults(), form: DEFAULT_FORM })
    expect(valuesOf(inputs)).toEqual(textPart(DEFAULT_FORM))
    expect(inputs.minAltitudeDeg.attrs.value).toBe('30')
    expect(inputs.seeingArcsec.attrs.value).toBe('2,5')
  })

  it('P1: inne parametry (każde pole inne) → każde pole pokazuje swój tekst, a nie stały', () => {
    const { inputs } = renderEditor({ saved: CUSTOM, form: CUSTOM_FORM })
    expect(valuesOf(inputs)).toEqual(textPart(CUSTOM_FORM))
  })

  it('P1: wpis w każdym z 17 pól zmienia w formularzu tylko swoje pole (sprawdza renderEditor)', () => {
    const { order } = renderEditor({ form: CUSTOM_FORM, saved: CUSTOM })
    expect(new Set(order).size).toBe(TEXT_FIELDS.length)
  })

  it('P1: pola h_min, minimum, krok katalogu, krok wykresu nocy i seeing mają etykiety z tymi nazwami', () => {
    const { root, inputs } = renderEditor()
    const label = (field: keyof typeof inputs) => fieldLabel(root, inputs[field]).toLocaleLowerCase('pl')
    expect(label('minAltitudeDeg')).toContain('h_min')
    expect(label('minEffectiveHours')).toContain('minimum')
    expect(label('catalogStepMin')).toContain('krok katalogu')
    expect(label('detailStepMin')).toContain('krok wykresu nocy')
    expect(label('seeingArcsec')).toContain('seeing')
  })

  it('P1: każde pole tekstowe ma etykietę', () => {
    const { root, inputs } = renderEditor()
    for (const field of TEXT_FIELDS) expect(fieldLabel(root, inputs[field]).length, field).toBeGreaterThan(0)
  })
})

describe('P2 próg ciemności z listy, obniżanie progu jako pole wyboru', () => {
  it('P2: lista progu ma dokładnie opcje −18°, −15°, −12° (w tej kolejności); domyślnie wybrane −18°', () => {
    const { options } = thresholdSelect(parseMarkup(renderEditor().markup))
    expect(options).toHaveLength(3)
    expect(options.map((option) => option.text.slice(0, 4))).toEqual(['−18°', '−15°', '−12°'])
    expect(options.filter((option) => option.selected).map((option) => option.text.slice(0, 4))).toEqual(['−18°'])
  })

  it('P2: próg −12° w formularzu → wybrane −12°, a nie −18°', () => {
    const { options } = thresholdSelect(parseMarkup(renderEditor({ form: formWith({ darknessThresholdDeg: -12 }) }).markup))
    expect(options.filter((option) => option.selected).map((option) => option.text.slice(0, 4))).toEqual(['−12°'])
  })

  it('P2: wybór −15° z listy → formularz z progiem −15, pozostałe pola bez zmian', () => {
    const { options } = thresholdSelect(parseMarkup(renderEditor().markup))
    const option = options.find((candidate) => candidate.text.startsWith('−15°'))
    if (!option) throw new Error('Brak opcji −15°')
    const onFormChange = vi.fn<(form: PlanningSettingsForm) => void>()
    const { onChange } = selectProps(DEFAULT_FORM, onFormChange)
    expect(typeof onChange).toBe('function')
    ;(onChange as (event: unknown) => void)({ target: { value: option.value }, currentTarget: { value: option.value } })
    expect(onFormChange).toHaveBeenCalledTimes(1)
    expect(onFormChange).toHaveBeenCalledWith(formWith({ darknessThresholdDeg: -15 }))
  })

  it('P2: wybór −18° przy progu −12° → formularz z progiem −18', () => {
    const form = formWith({ darknessThresholdDeg: -12 })
    const { options } = thresholdSelect(parseMarkup(renderEditor({ form }).markup))
    const option = options.find((candidate) => candidate.text.startsWith('−18°'))
    if (!option) throw new Error('Brak opcji −18°')
    const onFormChange = vi.fn<(form: PlanningSettingsForm) => void>()
    const { onChange } = selectProps(form, onFormChange)
    ;(onChange as (event: unknown) => void)({ target: { value: option.value }, currentTarget: { value: option.value } })
    expect(onFormChange).toHaveBeenCalledWith(DEFAULT_FORM)
  })

  it('P2: obniżanie progu to pole wyboru (checkbox), zaznaczone przy wartościach domyślnych', () => {
    expect('checked' in checkboxIn(parseMarkup(renderEditor().markup)).attrs).toBe(true)
  })

  it('P2: obniżanie wyłączone w formularzu → pole wyboru odznaczone', () => {
    const markup = renderEditor({ form: formWith({ autoLowerThreshold: false }) }).markup
    expect('checked' in checkboxIn(parseMarkup(markup)).attrs).toBe(false)
  })

  it('P2: odznaczenie i zaznaczenie pola wyboru zmienia w formularzu tylko obniżanie progu', () => {
    const onFormChange = vi.fn<(form: PlanningSettingsForm) => void>()
    toggle(checkboxProps(DEFAULT_FORM, onFormChange), false)
    expect(onFormChange).toHaveBeenLastCalledWith(formWith({ autoLowerThreshold: false }))
    toggle(checkboxProps(CUSTOM_FORM, onFormChange), true)
    expect(onFormChange).toHaveBeenLastCalledWith({ ...CUSTOM_FORM, autoLowerThreshold: true })
    expect(onFormChange).toHaveBeenCalledTimes(2)
  })
})

describe('P5, P6 błędy przy polach i blokada zapisu', () => {
  it('P5: h_min puste → przy polu h_min „h_min: wpisz liczbę”, „Zapisz zmiany” nieaktywny', () => {
    const { markup, root, inputs } = renderEditor({ form: formWith({ minAltitudeDeg: '' }) })
    expect(nearField(root, [inputs.minAltitudeDeg], H_MIN_NOT_A_NUMBER)).toBe(true)
    expect(buttonsDisabled(markup).save).toBe(true)
  })

  it('P5: h_min „abc” → komunikat przy polu h_min, a nie przy polu minimum; „Zapisz zmiany” nieaktywny', () => {
    const { markup, root, inputs } = renderEditor({ form: formWith({ minAltitudeDeg: 'abc' }) })
    expect(inputs.minAltitudeDeg.attrs.value).toBe('abc')
    expect(nearField(root, [inputs.minAltitudeDeg], H_MIN_NOT_A_NUMBER)).toBe(true)
    expect(nearField(root, [inputs.minEffectiveHours], H_MIN_NOT_A_NUMBER)).toBe(false)
    expect(buttonsDisabled(markup).save).toBe(true)
  })

  it('P6: h_min „95” → przy polu „h_min: dozwolony zakres 0–90°”; zapis zablokowany', () => {
    const { markup, root, inputs } = renderEditor({ form: formWith({ minAltitudeDeg: '95' }) })
    expect(nearField(root, [inputs.minAltitudeDeg], H_MIN_RANGE)).toBe(true)
    expect(nearField(root, [inputs.seeingArcsec], H_MIN_RANGE)).toBe(false)
    expect(buttonsDisabled(markup).save).toBe(true)
  })

  it('P6: kadr od „80” do „25” → przy polach kadru „Pasuje do kadru: dolna granica…”; zapis zablokowany', () => {
    const { markup, root, inputs } = renderEditor({ form: formWith({ fitMinPercent: '80', fitMaxPercent: '25' }) })
    expect(nearField(root, [inputs.fitMinPercent, inputs.fitMaxPercent], FIT_ORDER)).toBe(true)
    expect(nearField(root, [inputs.minAltitudeDeg], FIT_ORDER)).toBe(false)
    expect(buttonsDisabled(markup).save).toBe(true)
  })

  it('P5, P6: dwa błędy naraz → każdy przy swoim polu', () => {
    const { root, inputs } = renderEditor({ form: formWith({ minAltitudeDeg: 'abc', fitMinPercent: '80', fitMaxPercent: '25' }) })
    expect(nearField(root, [inputs.minAltitudeDeg], H_MIN_NOT_A_NUMBER)).toBe(true)
    expect(nearField(root, [inputs.fitMinPercent, inputs.fitMaxPercent], FIT_ORDER)).toBe(true)
    expect(nearField(root, [inputs.minAltitudeDeg], FIT_ORDER)).toBe(false)
  })

  it('P6: seeing „0,4” i separacja OIII zielony „200” → komunikaty z „Parametry planowania” przy swoich polach', () => {
    const seeing = validatePlanningSettings(settingsWith({ seeingArcsec: 0.4 }))[0].message
    const oxygen = validatePlanningSettings(settingsWithMoon({ oxygen: { greenMinSepDeg: 200 } }))[0].message
    const { markup, root, inputs } = renderEditor({ form: formWith({ seeingArcsec: '0,4', oxygenGreenMinSepDeg: '200' }) })
    expect(nearField(root, [inputs.seeingArcsec], seeing)).toBe(true)
    expect(nearField(root, [inputs.oxygenGreenMinSepDeg], oxygen)).toBe(true)
    expect(nearField(root, [inputs.oxygenYellowMinSepDeg], oxygen)).toBe(false)
    expect(buttonsDisabled(markup).save).toBe(true)
  })

  it('P6: bez błędów (h_min „25”) żaden komunikat zakresu nie jest widoczny, a „Zapisz zmiany” jest aktywny', () => {
    const { markup } = renderEditor({ form: FORM_25 })
    const text = visibleText(markup)
    expect(text).not.toContain('dozwolony zakres')
    expect(text).not.toContain('wpisz liczbę')
    expect(buttonsDisabled(markup).save).toBe(false)
  })
})

describe('P7 „Zapisz zmiany” i komunikat zapisu', () => {
  it('P7: h_min „25” → kliknięcie „Zapisz zmiany” wywołuje onSave raz, bez zmiany formularza', () => {
    const { onFormChange, onSave } = spies()
    click(editorButton({ form: FORM_25, onFormChange, onSave }, SAVE))
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onFormChange).not.toHaveBeenCalled()
  })

  it('P7: komunikat po zapisie → widoczne „Zapisano parametry.”, bez „Niezapisane zmiany”', () => {
    const { markup, inputs } = renderEditor({ saved: SAVED_25, form: FORM_25, message: { kind: 'saved', text: SAVED_TEXT } })
    const text = visibleText(markup)
    expect(text).toContain(SAVED_TEXT)
    expect(text).not.toContain(UNSAVED)
    expect(inputs.minAltitudeDeg.attrs.value).toBe('25')
  })
})

describe('P8 „Niezapisane zmiany” i „Odrzuć zmiany”', () => {
  it('P8: zmiana h_min bez zapisu → „Niezapisane zmiany”, „Odrzuć zmiany” i „Zapisz zmiany” aktywne', () => {
    const { markup } = renderEditor({ saved: defaults(), form: FORM_25 })
    expect(visibleText(markup)).toContain(UNSAVED)
    expect(buttonsDisabled(markup)).toMatchObject({ save: false, discard: false })
  })

  it('P8: zmiana progu Księżyca, progu ciemności albo obniżania bez zapisu → „Niezapisane zmiany”', () => {
    for (const form of [
      formWith({ oxygenGreenMaxIllumPercent: '60' }),
      formWith({ darknessThresholdDeg: -15 }),
      formWith({ autoLowerThreshold: false }),
    ]) {
      expect(visibleText(renderEditor({ saved: defaults(), form }).markup)).toContain(UNSAVED)
    }
  })

  it('P8: formularz równy zapisanym parametrom → bez „Niezapisane zmiany”; „Odrzuć” i „Zapisz” nieaktywne (jak w edytorze lokalizacji)', () => {
    const { markup } = renderEditor({ saved: defaults(), form: DEFAULT_FORM })
    expect(visibleText(markup)).not.toContain(UNSAVED)
    expect(buttonsDisabled(markup)).toMatchObject({ save: true, discard: true })
  })

  it('P8: zapisane h_min 25 i pole „25” → bez „Niezapisane zmiany” (porównanie z zapisanymi, a nie z domyślnymi)', () => {
    const { markup } = renderEditor({ saved: SAVED_25, form: FORM_25 })
    expect(visibleText(markup)).not.toContain(UNSAVED)
    expect(buttonsDisabled(markup)).toMatchObject({ save: true, discard: true })
  })

  it('P8: zapisane CUSTOM i formularz CUSTOM → bez „Niezapisane zmiany”; zmiana seeingu → „Niezapisane zmiany”', () => {
    expect(visibleText(renderEditor({ saved: CUSTOM, form: CUSTOM_FORM }).markup)).not.toContain(UNSAVED)
    expect(visibleText(renderEditor({ saved: CUSTOM, form: { ...CUSTOM_FORM, seeingArcsec: '2' } }).markup)).toContain(UNSAVED)
  })

  it('P8: „Odrzuć zmiany” przy zapisanych domyślnych i h_min „25” → formularz wartości domyślnych, bez zapisu', () => {
    const { onFormChange, onSave } = spies()
    click(editorButton({ saved: defaults(), form: FORM_25, onFormChange, onSave }, DISCARD))
    expect(onFormChange).toHaveBeenCalledTimes(1)
    expect(onFormChange).toHaveBeenCalledWith(DEFAULT_FORM)
    expect(onSave).not.toHaveBeenCalled()
  })

  it('P8: „Odrzuć zmiany” przy zapisanym h_min 25 i polu „40” → wraca do „25” (zapisane), a nie do „30”', () => {
    const { onFormChange, onSave } = spies()
    click(editorButton({ saved: SAVED_25, form: formWith({ minAltitudeDeg: '40' }), onFormChange, onSave }, DISCARD))
    expect(onFormChange).toHaveBeenCalledWith(FORM_25)
    expect(onSave).not.toHaveBeenCalled()
  })

  it('P8: „Odrzuć zmiany” przy zapisanych CUSTOM → formularz CUSTOM (także próg i obniżanie)', () => {
    const { onFormChange } = spies()
    const edited = { ...CUSTOM_FORM, darknessThresholdDeg: -18 as const, autoLowerThreshold: true, oxygenYellowMinSepDeg: '10' }
    click(editorButton({ saved: CUSTOM, form: edited, onFormChange }, DISCARD))
    expect(onFormChange).toHaveBeenCalledWith(CUSTOM_FORM)
  })
})

describe('P9 „Przywróć domyślne”', () => {
  it('P9: zapisane h_min 25 → „Przywróć domyślne” aktywny; kliknięcie daje formularz domyślny (h_min „30”) bez zapisu', () => {
    const { onFormChange, onSave } = spies()
    expect(buttonsDisabled(renderEditor({ saved: SAVED_25, form: FORM_25 }).markup).restore).toBe(false)
    click(editorButton({ saved: SAVED_25, form: FORM_25, onFormChange, onSave }, RESTORE))
    expect(onFormChange).toHaveBeenCalledTimes(1)
    expect(onFormChange).toHaveBeenCalledWith(DEFAULT_FORM)
    expect(onSave).not.toHaveBeenCalled()
  })

  it('P9: po „Przywróć domyślne” (zapisane h_min 25) → pole „30”, „Niezapisane zmiany”, „Zapisz zmiany” aktywny', () => {
    const { markup, inputs } = renderEditor({ saved: SAVED_25, form: DEFAULT_FORM })
    expect(inputs.minAltitudeDeg.attrs.value).toBe('30')
    expect(visibleText(markup)).toContain(UNSAVED)
    expect(buttonsDisabled(markup).save).toBe(false)
  })

  it('P9: formularz z samymi wartościami domyślnymi → „Przywróć domyślne” nieaktywny (po przywróceniu i przy zapisanych domyślnych)', () => {
    expect(buttonsDisabled(renderEditor({ saved: SAVED_25, form: DEFAULT_FORM }).markup).restore).toBe(true)
    expect(buttonsDisabled(renderEditor({ saved: defaults(), form: DEFAULT_FORM }).markup).restore).toBe(true)
  })

  it('P9: niezapisane h_min „25” przy zapisanych domyślnych → „Przywróć domyślne” aktywny i daje formularz domyślny', () => {
    const { onFormChange } = spies()
    expect(buttonsDisabled(renderEditor({ saved: defaults(), form: FORM_25 }).markup).restore).toBe(false)
    click(editorButton({ saved: defaults(), form: FORM_25, onFormChange }, RESTORE))
    expect(onFormChange).toHaveBeenCalledWith(DEFAULT_FORM)
  })

  it('P9: zapisane CUSTOM → „Przywróć domyślne” daje formularz domyślny, także próg −18° i obniżanie zaznaczone', () => {
    const { onFormChange, onSave } = spies()
    click(editorButton({ saved: CUSTOM, form: CUSTOM_FORM, onFormChange, onSave }, RESTORE))
    expect(onFormChange).toHaveBeenCalledWith(DEFAULT_FORM)
    expect(onSave).not.toHaveBeenCalled()
  })
})

describe('P10 nieudany zapis', () => {
  it('P10: komunikat „Nie udało się zapisać: …” z przyczyną; pola zachowują wpisane wartości', () => {
    const text = `${SAVE_FAILED_PREFIX}baza danych przeglądarki jest niedostępna`
    const form = formWith({ minAltitudeDeg: '25', seeingArcsec: '3.5' })
    const { markup, inputs } = renderEditor({ saved: defaults(), form, message: { kind: 'error', text } })
    expect(visibleText(markup)).toContain(text)
    expect(inputs.minAltitudeDeg.attrs.value).toBe('25')
    expect(inputs.seeingArcsec.attrs.value).toBe('3.5')
    // P8: zmiany nie zostały zapisane.
    expect(visibleText(markup)).toContain(UNSAVED)
  })
})

describe('wygląd jak w edytorze lokalizacji („Styk z resztą”)', () => {
  it('Styk: przyciski „Zapisz zmiany”, „Odrzuć zmiany”, „Przywróć domyślne” – po jednym', () => {
    const root = parseMarkup(renderEditor({ form: FORM_25 }).markup)
    for (const text of [SAVE, DISCARD, RESTORE]) expect(buttonIn(root, text).tag).toBe('button')
  })

  it('Styk: pola mają klasę `control`, przyciski klasę `button` (przy wartościach domyślnych i przy błędach)', () => {
    for (const form of [DEFAULT_FORM, formWith({ minAltitudeDeg: 'abc', fitMinPercent: '80', fitMaxPercent: '25' })]) {
      const root = parseMarkup(renderEditor({ form }).markup)
      expect(elementsOf(root).some((element) => element.tag === 'button')).toBe(true)
      expect(controlsWithoutClass(root)).toEqual([])
    }
  })

  it('Styk: przyciski, pola tekstowe i lista progu mają co najmniej 44 px wysokości', () => {
    const root = parseMarkup(renderEditor({ form: FORM_25 }).markup)
    const targets = elementsOf(root).filter(
      (element) => element.tag === 'button' || element.tag === 'select' || (element.tag === 'input' && element.attrs.type !== 'checkbox'),
    )
    expect(targets.length).toBeGreaterThanOrEqual(TEXT_FIELDS.length + 4)
    for (const element of targets) expect(minHeightPx(element), `<${element.tag} class="${element.attrs.class ?? ''}">`).toBeGreaterThanOrEqual(44)
  })
})
