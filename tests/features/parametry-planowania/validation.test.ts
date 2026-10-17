// Parametry planowania: wartości domyślne (P1, P2) i walidacja zakresów (P4–P9).
import { describe, expect, it } from 'vitest'
import { DEFAULT_MOON_RULES, DEFAULT_PLANNING_SETTINGS, validatePlanningSettings } from '../../../src/services/planningSettings'
import type { PlanningSettings } from '../../../src/types'
import { ILLUMINATION_RULES, SEPARATION_RULES, defaultMoonRules, defaults, settingsWith, settingsWithRule } from './helpers'

const messages = (settings: PlanningSettings) => validatePlanningSettings(settings).map((problem) => problem.message)

const H_MIN_RANGE = 'h_min: dozwolony zakres 0–90°'
const CATALOG_STEP_INTEGER = 'Krok katalogu: wpisz liczbę całkowitą'
const CATALOG_STEP_RANGE = 'Krok katalogu: dozwolony zakres 1–30 min'
const MIN_HOURS_RANGE = 'Minimum czasu efektywnego: dozwolony zakres 0,5–24 h'
const FIT_ORDER = 'Pasuje do kadru: dolna granica musi być mniejsza od górnej'

describe('wartości domyślne', () => {
  it('P1: próg −18°, obniżanie włączone, h_min 30°, minimum 3 h, kroki 5 i 1 min, seeing 2,5″, kadr 25–80%', () => {
    expect(DEFAULT_PLANNING_SETTINGS).toEqual(defaults())
  })

  it('P1: wartości domyślne przechodzą walidację', () => {
    expect(validatePlanningSettings(DEFAULT_PLANNING_SETTINGS)).toEqual([])
  })

  it('P2: domyślne progi Księżyca z sekcji 5', () => {
    expect(DEFAULT_MOON_RULES).toEqual(defaultMoonRules())
  })

  it('P2: parametry domyślne zawierają domyślne progi Księżyca', () => {
    expect(DEFAULT_PLANNING_SETTINGS.moonRules).toEqual(DEFAULT_MOON_RULES)
    expect(DEFAULT_PLANNING_SETTINGS.moonRules).toEqual(defaultMoonRules())
  })
})

describe('P4 dozwolone zakresy, granice włącznie', () => {
  it('P4: h_min 0° i 90° przechodzą', () => {
    expect(validatePlanningSettings(settingsWith({ minAltitudeDeg: 0 }))).toEqual([])
    expect(validatePlanningSettings(settingsWith({ minAltitudeDeg: 90 }))).toEqual([])
  })

  it('P4: krok katalogu i krok wykresu 1 min i 30 min przechodzą', () => {
    for (const step of [1, 30]) {
      expect(validatePlanningSettings(settingsWith({ catalogStepMin: step }))).toEqual([])
      expect(validatePlanningSettings(settingsWith({ detailStepMin: step }))).toEqual([])
    }
  })

  it('P4: minimum 0,5 h i 24 h przechodzi', () => {
    expect(validatePlanningSettings(settingsWith({ minEffectiveHours: 0.5 }))).toEqual([])
    expect(validatePlanningSettings(settingsWith({ minEffectiveHours: 24 }))).toEqual([])
  })

  it('P4: seeing 0,5″ i 10″ przechodzi', () => {
    expect(validatePlanningSettings(settingsWith({ seeingArcsec: 0.5 }))).toEqual([])
    expect(validatePlanningSettings(settingsWith({ seeingArcsec: 10 }))).toEqual([])
  })

  it('P4: „Pasuje do kadru” 0–100% przechodzi', () => {
    expect(validatePlanningSettings(settingsWith({ fitRange: [0, 1] }))).toEqual([])
  })

  it('P4: oświetlenie i udział czasu w progach Księżyca 0% i 100% przechodzą', () => {
    for (const value of [0, 1]) {
      expect(validatePlanningSettings(settingsWith({ moonRules: { ...defaultMoonRules(), moonDownMinFraction: value } }))).toEqual([])
      for (const [group, field] of ILLUMINATION_RULES) {
        expect(validatePlanningSettings(settingsWithRule(group, field, value)), `${group}.${field} = ${value}`).toEqual([])
      }
    }
  })

  it('P4: separacje 0° i 180° przechodzą', () => {
    for (const value of [0, 180]) {
      for (const [group, field] of SEPARATION_RULES) {
        expect(validatePlanningSettings(settingsWithRule(group, field, value)), `${group}.${field} = ${value}`).toEqual([])
      }
    }
  })

  it('P4: tuż za granicami: h_min 90,5°, minimum 0,4 h i 24,5 h, krok katalogu 31 min', () => {
    expect(messages(settingsWith({ minAltitudeDeg: 90.5 }))).toEqual([H_MIN_RANGE])
    expect(messages(settingsWith({ minEffectiveHours: 0.4 }))).toEqual([MIN_HOURS_RANGE])
    expect(messages(settingsWith({ minEffectiveHours: 24.5 }))).toEqual([MIN_HOURS_RANGE])
    expect(messages(settingsWith({ catalogStepMin: 31 }))).toEqual([CATALOG_STEP_RANGE])
  })

  it('P4: krok wykresu nocy poza zakresem albo ułamkowy jest błędem', () => {
    for (const detailStepMin of [0, 31, 1.5]) {
      expect(validatePlanningSettings(settingsWith({ detailStepMin })), `krok wykresu ${detailStepMin}`).toHaveLength(1)
    }
  })

  it('P4: seeing 0,4″ i 10,5″ oraz kadr poza 0–100% są błędem', () => {
    expect(validatePlanningSettings(settingsWith({ seeingArcsec: 0.4 }))).toHaveLength(1)
    expect(validatePlanningSettings(settingsWith({ seeingArcsec: 10.5 }))).toHaveLength(1)
    expect(validatePlanningSettings(settingsWith({ fitRange: [-0.1, 0.5] }))).toHaveLength(1)
    expect(validatePlanningSettings(settingsWith({ fitRange: [0.25, 1.2] }))).toHaveLength(1)
  })
})

describe('komunikaty walidacji', () => {
  it('P5: h_min 95° → „h_min: dozwolony zakres 0–90°”', () => {
    expect(messages(settingsWith({ minAltitudeDeg: 95 }))).toEqual([H_MIN_RANGE])
  })

  it('P5: h_min −5° → ten sam błąd', () => {
    expect(messages(settingsWith({ minAltitudeDeg: -5 }))).toEqual([H_MIN_RANGE])
  })

  it('P6: krok katalogu 2,5 min → „Krok katalogu: wpisz liczbę całkowitą”', () => {
    expect(messages(settingsWith({ catalogStepMin: 2.5 }))).toEqual([CATALOG_STEP_INTEGER])
  })

  it('P6: krok katalogu 0 min → „Krok katalogu: dozwolony zakres 1–30 min”', () => {
    expect(messages(settingsWith({ catalogStepMin: 0 }))).toEqual([CATALOG_STEP_RANGE])
  })

  it('P7: minimum 0 h → „Minimum czasu efektywnego: dozwolony zakres 0,5–24 h”', () => {
    expect(messages(settingsWith({ minEffectiveHours: 0 }))).toEqual([MIN_HOURS_RANGE])
  })

  it('P8: „Pasuje do kadru” od 80% do 25% → dolna granica musi być mniejsza od górnej', () => {
    expect(messages(settingsWith({ fitRange: [0.8, 0.25] }))).toEqual([FIT_ORDER])
  })

  it('P8: od 50% do 50% → ten sam błąd', () => {
    expect(messages(settingsWith({ fitRange: [0.5, 0.5] }))).toEqual([FIT_ORDER])
  })

  it('P9: oświetlenie 120% w progu Księżyca → błąd kończący się „dozwolony zakres 0–100%”', () => {
    for (const [group, field] of ILLUMINATION_RULES) {
      const found = messages(settingsWithRule(group, field, 1.2))
      expect(found, `${group}.${field}`).toHaveLength(1)
      expect(found[0].endsWith('dozwolony zakres 0–100%'), `${group}.${field}: ${found[0]}`).toBe(true)
    }
  })

  it('P9: udział czasu i oświetlenie poza 0–100% (także poniżej zera) → błąd „dozwolony zakres 0–100%”', () => {
    const cases = [
      settingsWith({ moonRules: { ...defaultMoonRules(), moonDownMinFraction: 1.2 } }),
      settingsWith({ moonRules: { ...defaultMoonRules(), moonDownMinFraction: -0.1 } }),
      settingsWithRule('oxygen', 'greenMaxIllum', -0.1),
    ]
    for (const settings of cases) {
      const found = messages(settings)
      expect(found).toHaveLength(1)
      expect(found[0].endsWith('dozwolony zakres 0–100%'), found[0]).toBe(true)
    }
  })

  it('P9: separacja 200° → błąd kończący się „dozwolony zakres 0–180°”', () => {
    for (const [group, field] of SEPARATION_RULES) {
      const found = messages(settingsWithRule(group, field, 200))
      expect(found, `${group}.${field}`).toHaveLength(1)
      expect(found[0].endsWith('dozwolony zakres 0–180°'), `${group}.${field}: ${found[0]}`).toBe(true)
    }
  })

  it('P9: separacja ujemna → błąd „dozwolony zakres 0–180°”', () => {
    const found = messages(settingsWithRule('hydrogenSulfur', 'yellowMinSepDeg', -1))
    expect(found).toHaveLength(1)
    expect(found[0].endsWith('dozwolony zakres 0–180°'), found[0]).toBe(true)
  })

  it('lista problemów zawiera wszystkie błędne pola naraz', () => {
    const found = messages(settingsWith({ minAltitudeDeg: 95, catalogStepMin: 0, fitRange: [0.8, 0.25] }))
    expect(found).toHaveLength(3)
    expect(found).toEqual(expect.arrayContaining([H_MIN_RANGE, CATALOG_STEP_RANGE, FIT_ORDER]))
  })

  it('każdy problem wskazuje pole; różne błędne pola dają różne wpisy', () => {
    const problems = validatePlanningSettings(settingsWith({ minAltitudeDeg: 95, minEffectiveHours: 0 }))
    expect(problems).toHaveLength(2)
    for (const problem of problems) expect(problem.field.length).toBeGreaterThan(0)
    expect(new Set(problems.map((problem) => problem.field)).size).toBe(2)
  })
})
