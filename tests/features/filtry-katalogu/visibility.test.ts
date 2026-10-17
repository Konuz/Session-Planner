// „Widoczne w wybraną noc”: czas efektywny ≥ minimum godzin [Z7] z wyników nocy D (P2, P3) [AC2].
import { describe, expect, it } from 'vitest'
import { createCatalogEngine } from '../../../src/workers/catalogEngine'
import {
  IC1396,
  KLASYKI,
  M31,
  M42,
  M45,
  NGC7000,
  NO_WINDOW,
  OCT_16_PARAMS,
  T9_OBJECTS,
  names,
  nightResults,
  run,
  settingsWith,
  summary,
  syntheticObject,
  targetsOf,
} from './helpers'

/**
 * Wyniki nocy 16/17.10.2026 (krok 5 min) dla całych „Klasyki”, jak z Workera, który liczy cały przekazany katalog.
 * Wynik obiektu to podsumowanie z jego uid (`ObjectNightSummary.uid` z widocznosc-katalogu).
 */
const OCTOBER = nightResults(KLASYKI)

const visible = (minEffectiveHours: number, results = OCTOBER, objects = T9_OBJECTS) =>
  names(run(objects, { visibleTonight: true }, { results, settings: settingsWith({ minEffectiveHours }) }))

describe('P2 „Widoczne w wybraną noc” 16/17.10.2026 [AC2]', () => {
  it('P2: „Klasyki” (26), minimum 3 h → odrzuca M 42 (2 h 03 min), przyjmuje M 31, NGC 7000, IC 1396 i M 45', () => {
    const result = visible(3, OCTOBER, KLASYKI)
    expect(result).not.toContain('M 42')
    for (const name of ['M 31', 'NGC 7000', 'IC 1396', 'M 45']) expect(result).toContain(name)
  })

  it('P2: „Klasyki” (26), minimum 1,5 h → przyjmuje też M 42', () => {
    const result = visible(1.5, OCTOBER, KLASYKI)
    for (const name of ['M 31', 'NGC 7000', 'IC 1396', 'M 45', 'M 42']) expect(result).toContain(name)
  })

  it('P2: pięć obiektów z T9, minimum 3 h → dokładnie M 31, IC 1396, M 45, NGC 7000 (w kolejności wejścia)', () => {
    expect(visible(3)).toEqual(['M 31', 'IC 1396', 'M 45', 'NGC 7000'])
  })

  it('P2: pięć obiektów z T9, minimum 1,5 h → wszystkie pięć', () => {
    expect(visible(1.5)).toEqual(['M 31', 'IC 1396', 'M 45', 'NGC 7000', 'M 42'])
  })

  it('P2: odpowiedź „wynik” prosto z silnika Workera (obliczenia-w-tle) → ten sam wybór przy 3 h', () => {
    const engine = createCatalogEngine()
    engine.handle({ type: 'catalog', objects: targetsOf(KLASYKI) })
    const response = engine.handle({ type: 'compute', requestId: 1, params: OCT_16_PARAMS })
    if (response.type !== 'result') throw new Error(`Oczekiwano „wynik”, jest ${response.type}`)
    expect(visible(3, response.objects)).toEqual(['M 31', 'IC 1396', 'M 45', 'NGC 7000'])
  })

  // Reguła: czas efektywny ≥ minimum godzin z parametrów (7A, Z7); czasy z T9 (krok 5 min: ±5 min).
  it('P2: minimum z parametrów 7 h → M 31 (9 h 39 min), IC 1396 (9 h 02 min), M 45 (7 h 14 min); NGC 7000 (6 h 50 min) i M 42 odpadają', () => {
    expect(visible(7)).toEqual(['M 31', 'IC 1396', 'M 45'])
  })

  it('P2: minimum z parametrów 9,5 h → tylko M 31 (9 h 39 min)', () => {
    expect(visible(9.5)).toEqual(['M 31'])
  })

  // Reguła: wynik w kolejności wejścia („Styk z resztą”).
  it('P2: kolejność wejścia: M 42, NGC 7000, M 45, IC 1396, M 31 przy 3 h → NGC 7000, M 45, IC 1396, M 31', () => {
    expect(visible(3, OCTOBER, [M42, NGC7000, M45, IC1396, M31])).toEqual(['NGC 7000', 'M 45', 'IC 1396', 'M 31'])
  })

  // Reguła: różne filtry łączą się przez „i” (P9).
  it('P2: „Widoczne” i katalog M (przez „i”) wśród obiektów z T9 → M 31, M 45', () => {
    const result = run(T9_OBJECTS, { visibleTonight: true, catalogs: ['M'] }, { results: OCTOBER })
    expect(names(result)).toEqual(['M 31', 'M 45'])
  })
})

describe('P3 granica minimum godzin i brak wyniku', () => {
  const at180 = syntheticObject('test-180-min')
  const at179 = syntheticObject('test-179-min')
  const at150 = syntheticObject('test-150-min')
  const at149 = syntheticObject('test-149-min')
  const at90 = syntheticObject('test-90-min')
  const at89 = syntheticObject('test-89-min')
  const objects = [at180, at179, at150, at149, at90, at89]
  const results = [
    summary(at180.uid, 180),
    summary(at179.uid, 179),
    summary(at150.uid, 150),
    summary(at149.uid, 149),
    summary(at90.uid, 90),
    summary(at89.uid, 89),
  ]
  const passing = (minEffectiveHours: number) =>
    names(run(objects, { visibleTonight: true }, { results, settings: settingsWith({ minEffectiveHours }) }))

  it('P3: minimum 3 h → obiekt ze 180 min przechodzi, ze 179 min nie (granica włącznie)', () => {
    expect(passing(3)).toEqual([at180.uid])
  })

  it('P3: minimum 2,5 h → przechodzą 180, 179 i 150 min; 149 min nie', () => {
    expect(passing(2.5)).toEqual([at180.uid, at179.uid, at150.uid])
  })

  it('P3: minimum 1,5 h → przechodzi 90 min, a 89 min nie', () => {
    expect(passing(1.5)).toEqual([at180.uid, at179.uid, at150.uid, at149.uid, at90.uid])
  })

  it('P3: stan „brak okna” (czas efektywny null) → obiekt nie przechodzi nawet przy minimum 0,5 h', () => {
    const noWindow = syntheticObject('test-no-window')
    const result = run([noWindow, at180], { visibleTonight: true }, {
      results: [summary(noWindow.uid, null, NO_WINDOW), summary(at180.uid, 180)],
      settings: settingsWith({ minEffectiveHours: 0.5 }),
    })
    expect(names(result)).toEqual([at180.uid])
  })

  it('P3: „brak okna” w prawdziwej nocy 21/22.06.2026 na 54,83°N → żaden obiekt z T9 nie przechodzi przy minimum 0,5 h', () => {
    const june = nightResults(T9_OBJECTS, {
      ...OCT_16_PARAMS,
      location: { ...OCT_16_PARAMS.location, latDeg: 54.83 },
      nightDate: '2026-06-21',
    })
    expect(june.map((object) => object.darkness.kind)).toEqual(['none', 'none', 'none', 'none', 'none'])
    expect(visible(0.5, june)).toEqual([])
  })

  it('P3: wynik jeszcze się liczy (brak wyników) → przy „Widoczne” nie przechodzi żaden obiekt', () => {
    expect(names(run(KLASYKI, { visibleTonight: true }, { results: null }))).toEqual([])
  })

  // Reguła: z wyników nocy D korzysta tylko „Widoczne” (7A, Z7); pozostałe filtry opierają się na danych obiektu („Styk z resztą”).
  it('P3: wynik jeszcze się liczy → filtry bez widoczności działają: typ galaktyka → M 31, M 33, M 101, M 81', () => {
    expect(names(run(KLASYKI, { types: ['galaxy'] }, { results: null }))).toEqual(['M 31', 'M 33', 'M 101', 'M 81'])
  })

  // Reguła P3: obiekt bez wyniku widoczności nie przechodzi; tu wyniki nie mają podsumowania z jego uid.
  it('P3: obiekt bez wyniku widoczności (brak podsumowania z jego uid) nie przechodzi', () => {
    const missing = syntheticObject('test-missing')
    expect(names(run([missing, at180], { visibleTonight: true }, { results }))).toEqual([at180.uid])
  })

  // Reguła: czas efektywny ≥ minimum godzin (7A, Z7); 0 min to obiekt niewidoczny w oknie.
  it('P3: obiekt z czasem efektywnym 0 min nie przechodzi nawet przy minimum 0,5 h; 30 min przechodzi', () => {
    const zero = syntheticObject('test-0-min')
    const half = syntheticObject('test-30-min')
    const result = run([zero, half], { visibleTonight: true }, {
      results: [summary(zero.uid, 0), summary(half.uid, 30)],
      settings: settingsWith({ minEffectiveHours: 0.5 }),
    })
    expect(names(result)).toEqual([half.uid])
  })
})
