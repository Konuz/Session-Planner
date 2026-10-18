// Model formularza (czyste funkcje, „Styk z resztą”): parametry → tekst pól (części całości jako procenty, przecinek
// dziesiętny) i tekst → parametry albo lista błędów. Liczby czyta `parseDecimal`, zakresy i komunikaty są te same co
// w `validatePlanningSettings` (parametry-planowania, P6).
import { describe, expect, it } from 'vitest'
import {
  planningSettingsToForm,
  readPlanningSettingsForm,
  type PlanningSettingsForm,
  type PlanningTextField,
} from '../../../src/features/settings/planningSettingsForm'
import { DEFAULT_MOON_RULES, DEFAULT_PLANNING_SETTINGS, validatePlanningSettings } from '../../../src/services/planningSettings'
import type { PlanningSettings } from '../../../src/types'
import {
  CUSTOM,
  CUSTOM_FORM,
  DEFAULT_FORM,
  FIT_ORDER,
  H_MIN_NOT_A_NUMBER,
  H_MIN_RANGE,
  PERCENT_FIELDS,
  SEPARATION_FIELDS,
  TEXT_FIELDS,
  defaultMoonRules,
  defaults,
  formWith,
  rounded,
  settingsWith,
  settingsWithField,
  settingsWithMoon,
} from './helpers'

const read = (form: PlanningSettingsForm) => readPlanningSettingsForm(form)
const messages = (form: PlanningSettingsForm) => read(form).issues.map((issue) => issue.message)
/** Parametry z formularza (zaokrąglone do 9 miejsc); błąd testu, gdy formularz ma błędy. */
function settingsOf(form: PlanningSettingsForm): PlanningSettings {
  const result = read(form)
  expect(result.issues.map((issue) => issue.message)).toEqual([])
  if (!result.settings) throw new Error('Formularz bez błędów, a parametrów brak')
  return rounded(result.settings)
}
const validationMessages = (settings: PlanningSettings) => validatePlanningSettings(settings).map((problem) => problem.message)

/** Etykieta pola w komunikatach `validatePlanningSettings` (np. „Seeing”, „OIII, DualBand, zielony: separacja”). */
function validationLabel(field: PlanningTextField): string {
  const [message] = validationMessages(settingsWithField(field, 1000))
  return message.replace(/: dozwolony zakres .*$/, '')
}

describe('parametry → tekst pól', () => {
  it('P1: wartości domyślne → próg −18°, obniżanie zaznaczone, h_min „30”, minimum „3”, kroki „5” i „1”, seeing „2,5”', () => {
    const form = planningSettingsToForm(DEFAULT_PLANNING_SETTINGS)
    expect(form.darknessThresholdDeg).toBe(-18)
    expect(form.autoLowerThreshold).toBe(true)
    expect(form.minAltitudeDeg).toBe('30')
    expect(form.minEffectiveHours).toBe('3')
    expect(form.catalogStepMin).toBe('5')
    expect(form.detailStepMin).toBe('1')
    expect(form.seeingArcsec).toBe('2,5')
  })

  it('P1: „Pasuje do kadru” od „25” do „80” %, Księżyc pod horyzontem „80” %', () => {
    const form = planningSettingsToForm(DEFAULT_PLANNING_SETTINGS)
    expect(form.fitMinPercent).toBe('25')
    expect(form.fitMaxPercent).toBe('80')
    expect(form.moonDownMinPercent).toBe('80')
  })

  it('P1: L/R/G/B/OSC zielony poniżej „15” %, żółty poniżej „50” % i od „90”°; mgławice refleksyjne i ciemne „15” %', () => {
    const form = planningSettingsToForm(DEFAULT_PLANNING_SETTINGS)
    expect(form.broadbandGreenMaxIllumPercent).toBe('15')
    expect(form.broadbandYellowMaxIllumPercent).toBe('50')
    expect(form.broadbandYellowMinSepDeg).toBe('90')
    expect(form.faintNebulaGreenMaxIllumPercent).toBe('15')
  })

  it('P1: Ha/SII zielony od „50”°, żółty od „25”°; OIII/DualBand zielony od „70”° i poniżej „75” %, żółty od „40”°', () => {
    const form = planningSettingsToForm(DEFAULT_PLANNING_SETTINGS)
    expect(form.hydrogenSulfurGreenMinSepDeg).toBe('50')
    expect(form.hydrogenSulfurYellowMinSepDeg).toBe('25')
    expect(form.oxygenGreenMinSepDeg).toBe('70')
    expect(form.oxygenGreenMaxIllumPercent).toBe('75')
    expect(form.oxygenYellowMinSepDeg).toBe('40')
  })

  it('P1: cały formularz wartości domyślnych', () => {
    expect(planningSettingsToForm(DEFAULT_PLANNING_SETTINGS)).toEqual(DEFAULT_FORM)
    expect(planningSettingsToForm(defaults())).toEqual(DEFAULT_FORM)
  })

  it('P1, P4: inne parametry (każde pole inne) → procenty bez szumu zmiennoprzecinkowego (0,29 → „29”, 0,07 → „7”, 0,155 → „15,5”)', () => {
    expect(planningSettingsToForm(CUSTOM)).toEqual(CUSTOM_FORM)
  })

  it('P7: zapisane h_min 25 → pole „25”, pozostałe pola domyślne', () => {
    expect(planningSettingsToForm(settingsWith({ minAltitudeDeg: 25 }))).toEqual(formWith({ minAltitudeDeg: '25' }))
  })

  it('P3: liczby ułamkowe z przecinkiem: minimum 2,5 h → „2,5”, seeing 3,5″ → „3,5”', () => {
    const form = planningSettingsToForm(settingsWith({ minEffectiveHours: 2.5, seeingArcsec: 3.5 }))
    expect(form.minEffectiveHours).toBe('2,5')
    expect(form.seeingArcsec).toBe('3,5')
  })

  it('P2: próg −12° bez obniżania → w formularzu −12 i pole wyboru odznaczone', () => {
    const form = planningSettingsToForm(settingsWith({ darknessThresholdDeg: -12, autoLowerThreshold: false }))
    expect(form.darknessThresholdDeg).toBe(-12)
    expect(form.autoLowerThreshold).toBe(false)
  })
})

describe('tekst pól → parametry', () => {
  it('P1: formularz wartości domyślnych → parametry domyślne', () => {
    expect(settingsOf(DEFAULT_FORM)).toEqual(defaults())
  })

  it('P1, P4: formularz CUSTOM (każde pole inne) → parametry CUSTOM', () => {
    expect(settingsOf(CUSTOM_FORM)).toEqual(rounded(CUSTOM))
  })

  it('P2: próg −15° i −12° z listy, obniżanie wyłączone', () => {
    expect(settingsOf(formWith({ darknessThresholdDeg: -15 }))).toEqual(settingsWith({ darknessThresholdDeg: -15 }))
    expect(settingsOf(formWith({ darknessThresholdDeg: -12, autoLowerThreshold: false }))).toEqual(
      settingsWith({ darknessThresholdDeg: -12, autoLowerThreshold: false }),
    )
  })

  it('P3: seeing „3,5” i „3.5” → 3,5″', () => {
    expect(settingsOf(formWith({ seeingArcsec: '3,5' }))).toEqual(settingsWith({ seeingArcsec: 3.5 }))
    expect(settingsOf(formWith({ seeingArcsec: '3.5' }))).toEqual(settingsWith({ seeingArcsec: 3.5 }))
  })

  it('P3: minimum „2,5” → 2,5 h; „2.5” → to samo', () => {
    expect(settingsOf(formWith({ minEffectiveHours: '2,5' }))).toEqual(settingsWith({ minEffectiveHours: 2.5 }))
    expect(settingsOf(formWith({ minEffectiveHours: '2.5' }))).toEqual(settingsWith({ minEffectiveHours: 2.5 }))
  })

  it('P3: h_min „25,5” i „25.5” → 25,5°; spacje wokół liczby pomija parseDecimal („ 25 ” → 25°)', () => {
    expect(settingsOf(formWith({ minAltitudeDeg: '25,5' })).minAltitudeDeg).toBe(25.5)
    expect(settingsOf(formWith({ minAltitudeDeg: '25.5' })).minAltitudeDeg).toBe(25.5)
    expect(settingsOf(formWith({ minAltitudeDeg: ' 25 ' })).minAltitudeDeg).toBe(25)
  })

  it.each(PERCENT_FIELDS)('P4: procenty → części całości: %s „15” → 0,15, „15,5” → 0,155', (field) => {
    expect(settingsOf(formWith({ [field]: '15' }))).toEqual(rounded(settingsWithField(field, 0.15)))
    expect(settingsOf(formWith({ [field]: '15,5' }))).toEqual(rounded(settingsWithField(field, 0.155)))
    expect(settingsOf(formWith({ [field]: '15.5' }))).toEqual(rounded(settingsWithField(field, 0.155)))
  })

  it('P4: kadr od „20” do „90” → 0,2–0,9', () => {
    expect(settingsOf(formWith({ fitMinPercent: '20', fitMaxPercent: '90' }))).toEqual(settingsWith({ fitRange: [0.2, 0.9] }))
  })

  it('P4: kadr od „12,5” do „60” → 0,125–0,6', () => {
    expect(settingsOf(formWith({ fitMinPercent: '12,5', fitMaxPercent: '60' }))).toEqual(settingsWith({ fitRange: [0.125, 0.6] }))
  })

  it.each(SEPARATION_FIELDS)('P1: separacja %s w stopniach, nie w procentach: „15” → 15°', (field) => {
    expect(settingsOf(formWith({ [field]: '15' }))).toEqual(settingsWithField(field, 15))
  })

  it('P4: części całości: oświetlenie zielone OIII „60” → 0,6, a pozostałe progi Księżyca bez zmian', () => {
    expect(settingsOf(formWith({ oxygenGreenMaxIllumPercent: '60' }))).toEqual(settingsWithMoon({ oxygen: { greenMaxIllum: 0.6 } }))
  })
})

describe('błędy pól', () => {
  it('P5: h_min puste → „h_min: wpisz liczbę”, bez parametrów', () => {
    const result = read(formWith({ minAltitudeDeg: '' }))
    expect(result.settings).toBeNull()
    expect(result.issues.map((issue) => issue.message)).toEqual([H_MIN_NOT_A_NUMBER])
  })

  it('P5: h_min „abc” → „h_min: wpisz liczbę”, bez parametrów', () => {
    const result = read(formWith({ minAltitudeDeg: 'abc' }))
    expect(result.settings).toBeNull()
    expect(result.issues.map((issue) => issue.message)).toEqual([H_MIN_NOT_A_NUMBER])
  })

  // „Pytania”: tekst „wpisz liczbę” jak w edytorze lokalizacji („<pole>: wpisz liczbę”), z etykietą pola z komunikatów
  // `validatePlanningSettings` (P6: komunikaty takie same jak w „Parametry planowania”).
  it.each(TEXT_FIELDS.filter((field) => field !== 'minAltitudeDeg'))('P5: %s „abc” → „<pole>: wpisz liczbę”', (field) => {
    const result = read(formWith({ [field]: 'abc' }))
    expect(result.settings).toBeNull()
    expect(result.issues.map((issue) => issue.message)).toEqual([`${validationLabel(field)}: wpisz liczbę`])
  })

  it('P6: h_min „95” → „h_min: dozwolony zakres 0–90°”, bez parametrów', () => {
    const result = read(formWith({ minAltitudeDeg: '95' }))
    expect(result.settings).toBeNull()
    expect(result.issues.map((issue) => issue.message)).toEqual([H_MIN_RANGE])
  })

  it('P6: kadr od „80” do „25” → „Pasuje do kadru: dolna granica musi być mniejsza od górnej”, bez parametrów', () => {
    const result = read(formWith({ fitMinPercent: '80', fitMaxPercent: '25' }))
    expect(result.settings).toBeNull()
    expect(result.issues.map((issue) => issue.message)).toEqual([FIT_ORDER])
  })

  it('P6: kadr od „50” do „50” → ten sam błąd kolejności', () => {
    expect(messages(formWith({ fitMinPercent: '50', fitMaxPercent: '50' }))).toEqual([FIT_ORDER])
  })

  it('P5, P6: h_min „abc” i kadr od „80” do „25” → oba błędy naraz', () => {
    const found = messages(formWith({ minAltitudeDeg: 'abc', fitMinPercent: '80', fitMaxPercent: '25' }))
    expect(found).toHaveLength(2)
    expect(found).toEqual(expect.arrayContaining([H_MIN_NOT_A_NUMBER, FIT_ORDER]))
  })

  /** Pole, tekst i ta sama wartość w parametrach (części całości dla procentów). */
  const OUT_OF_RANGE: readonly (readonly [PlanningTextField, string, number])[] = [
    ['minAltitudeDeg', '-5', -5],
    ['minAltitudeDeg', '90,5', 90.5],
    ['minEffectiveHours', '0', 0],
    ['minEffectiveHours', '0,4', 0.4],
    ['minEffectiveHours', '24,5', 24.5],
    ['catalogStepMin', '2,5', 2.5],
    ['catalogStepMin', '0', 0],
    ['catalogStepMin', '31', 31],
    ['detailStepMin', '1,5', 1.5],
    ['detailStepMin', '31', 31],
    ['seeingArcsec', '0,4', 0.4],
    ['seeingArcsec', '10,5', 10.5],
    ['fitMinPercent', '-10', -0.1],
    ['fitMaxPercent', '120', 1.2],
    ['moonDownMinPercent', '120', 1.2],
    ['moonDownMinPercent', '-1', -0.01],
    ['broadbandGreenMaxIllumPercent', '101', 1.01],
    ['broadbandYellowMaxIllumPercent', '150', 1.5],
    ['faintNebulaGreenMaxIllumPercent', '-5', -0.05],
    ['oxygenGreenMaxIllumPercent', '100,5', 1.005],
    ['broadbandYellowMinSepDeg', '200', 200],
    ['hydrogenSulfurGreenMinSepDeg', '-1', -1],
    ['hydrogenSulfurYellowMinSepDeg', '181', 181],
    ['oxygenGreenMinSepDeg', '200', 200],
    ['oxygenYellowMinSepDeg', '-10', -10],
  ]

  it.each(OUT_OF_RANGE)('P6: %s „%s” → ten sam komunikat co w „Parametry planowania”', (field, text, value) => {
    const expected = validationMessages(settingsWithField(field, value))
    expect(expected).toHaveLength(1)
    const result = read(formWith({ [field]: text }))
    expect(result.settings).toBeNull()
    expect(result.issues.map((issue) => issue.message)).toEqual(expected)
  })

  it('P6: kilka błędów zakresu naraz → wszystkie komunikaty', () => {
    const found = messages(formWith({ minAltitudeDeg: '95', catalogStepMin: '0', oxygenGreenMinSepDeg: '200' }))
    expect(found).toHaveLength(3)
    expect(found).toEqual(
      expect.arrayContaining([
        H_MIN_RANGE,
        'Krok katalogu: dozwolony zakres 1–30 min',
        ...validationMessages(settingsWithMoon({ oxygen: { greenMinSepDeg: 200 } })),
      ]),
    )
  })
})

describe('granice zakresów (włącznie, jak w „Parametry planowania”)', () => {
  /** Pole, tekst na granicy i wartość w parametrach. */
  const BOUNDARIES: readonly (readonly [PlanningTextField, string, number])[] = [
    ['minAltitudeDeg', '0', 0],
    ['minAltitudeDeg', '90', 90],
    ['minEffectiveHours', '0,5', 0.5],
    ['minEffectiveHours', '24', 24],
    ['catalogStepMin', '1', 1],
    ['catalogStepMin', '30', 30],
    ['detailStepMin', '1', 1],
    ['detailStepMin', '30', 30],
    ['seeingArcsec', '0,5', 0.5],
    ['seeingArcsec', '10', 10],
    ['moonDownMinPercent', '0', 0],
    ['moonDownMinPercent', '100', 1],
    ['broadbandGreenMaxIllumPercent', '100', 1],
    ['faintNebulaGreenMaxIllumPercent', '0', 0],
    ['oxygenGreenMaxIllumPercent', '100', 1],
    ['broadbandYellowMinSepDeg', '180', 180],
    ['hydrogenSulfurGreenMinSepDeg', '0', 0],
    ['oxygenYellowMinSepDeg', '180', 180],
  ]

  it.each(BOUNDARIES)('P6: %s „%s” przechodzi', (field, text, value) => {
    expect(settingsOf(formWith({ [field]: text }))).toEqual(rounded(settingsWithField(field, value)))
  })

  it('P4, P6: kadr od „0” do „100” → 0–1 przechodzi', () => {
    expect(settingsOf(formWith({ fitMinPercent: '0', fitMaxPercent: '100' }))).toEqual(settingsWith({ fitRange: [0, 1] }))
  })
})

describe('bez zmian w danych wejściowych i w wartościach domyślnych', () => {
  it('odczyt nie zmienia formularza', () => {
    const form = formWith({ minAltitudeDeg: '25', oxygenGreenMaxIllumPercent: '60', fitMinPercent: '80', fitMaxPercent: '25' })
    const copy = structuredClone(form)
    read(form)
    read({ ...form, fitMinPercent: '20' })
    expect(form).toEqual(copy)
  })

  it('P9: po odczycie i zamianie formularzy wartości domyślne (DEFAULT_PLANNING_SETTINGS) zostają bez zmian', () => {
    planningSettingsToForm(DEFAULT_PLANNING_SETTINGS)
    settingsOf(CUSTOM_FORM)
    settingsOf(formWith({ minAltitudeDeg: '25', oxygenGreenMaxIllumPercent: '60', broadbandYellowMinSepDeg: '120' }))
    expect(DEFAULT_PLANNING_SETTINGS).toEqual(defaults())
    expect(DEFAULT_MOON_RULES).toEqual(defaultMoonRules())
    expect(planningSettingsToForm(DEFAULT_PLANNING_SETTINGS)).toEqual(DEFAULT_FORM)
  })
})
