// Filtr „Polecane na miesiąc” [Z22]: czas efektywny ≥ minimum godzin w nocy odniesienia, nie w nocy D (P4–P10).
import { describe, expect, it } from 'vitest'
import { DEFAULT_PLANNING_SETTINGS } from '../../../src/services/planningSettings'
import { filterCatalog } from '../../../src/services/catalogFilters'
import {
  B33,
  KLASYKI,
  M101,
  M42,
  MY_SET,
  NGC2237,
  NO_WINDOW,
  OCT_15,
  OCT_24,
  P5_OBJECTS,
  filtersWith,
  names,
  nightResults,
  recommended,
  run,
  summary,
  syntheticObject,
  visibleTonight,
  type MonthCase,
} from './helpers'

/** Wyniki „Klasyki” (26) z parametrami P5 (52,0°N, 19,0°E, 150 m, płaski, −18°, h_min 30°, krok 5 min). */
const NIGHT_OCT_24 = nightResults(KLASYKI, OCT_24)
const NIGHT_OCT_15 = nightResults(KLASYKI, OCT_15)

/** P5: noc D 24/25.10.2026, wyniki nocy D i nocy odniesienia 15/16.10.2026. */
const P5_CASE: MonthCase = { nightDate: OCT_24, results: NIGHT_OCT_24, referenceResults: NIGHT_OCT_15 }

describe('P5 noc D 24/25.10.2026 → wyniki nocy 15/16.10.2026', () => {
  it('P5: minimum 3 h → „Polecane na miesiąc” przyjmuje M 31, NGC 7000, IC 1396 i M 45, a odrzuca M 42', () => {
    expect(recommended(P5_OBJECTS, P5_CASE)).toEqual(['M 31', 'NGC 7000', 'IC 1396', 'M 45'])
  })

  it('P5: „Klasyki” (26), minimum 3 h → wśród przyjętych są M 31, NGC 7000, IC 1396 i M 45, nie ma M 42', () => {
    const result = recommended(KLASYKI, P5_CASE)
    for (const name of ['M 31', 'NGC 7000', 'IC 1396', 'M 45']) expect(result).toContain(name)
    expect(result).not.toContain('M 42')
  })

  // Reguła [Z22]: liczy się czas efektywny w nocy 15/16.10 (computeCatalogNight, parametry P5, krok 5 min):
  // B 33 ma tam ok. 2 h 25 min, NGC 2237 ok. 2 h 40 min, a w nocy D 24/25.10 ok. 3 h 18 min i 3 h 28 min.
  it('P5: B 33 i NGC 2237 (poniżej 3 h w nocy 15/16.10) odpadają z „Polecane”, choć „Widoczne w wybraną noc” 24/25.10 je przyjmuje', () => {
    expect(recommended([B33, NGC2237], P5_CASE)).toEqual([])
    expect(visibleTonight([B33, NGC2237], P5_CASE)).toEqual(['B 33', 'NGC 2237'])
  })

  // Reguła [Z22] z czasami nocy 15/16.10 (parametry P5): poniżej 3 h są tylko M 42 (ok. 1 h 55 min),
  // M 101 (ok. 1 h), B 33 i NGC 2237; pozostałe 22 obiekty mają co najmniej ok. 5 h.
  it('P5: „Klasyki” (26), minimum 3 h → odpadają dokładnie M 42, M 101, B 33 i NGC 2237; 22 obiekty w kolejności wejścia', () => {
    const rejected = new Set([M42, M101, B33, NGC2237])
    expect(recommended(KLASYKI, P5_CASE)).toEqual(names(KLASYKI.filter((object) => !rejected.has(object))))
  })

  // Reguła: minimum godzin z `parametry-planowania` („Styk z resztą”); domyślnie 3 h.
  it('P5: parametry domyślne z parametry-planowania (minimum 3 h) → ten sam wybór co w P5', () => {
    const context = { nightDate: OCT_24, results: NIGHT_OCT_24, referenceResults: NIGHT_OCT_15, settings: DEFAULT_PLANNING_SETTINGS, profile: MY_SET }
    const result = filterCatalog(P5_OBJECTS, filtersWith({ recommendedThisMonth: true }), context)
    expect(names(result)).toEqual(['M 31', 'NGC 7000', 'IC 1396', 'M 45'])
  })
})

describe('P4 noc D jest nocą odniesienia', () => {
  it('P4: noc D 15/16.10.2026 bez drugiego zestawu wyników → „Polecane” używa wyników nocy D: M 31, NGC 7000, IC 1396, M 45; bez M 42', () => {
    const data: MonthCase = { nightDate: OCT_15, results: NIGHT_OCT_15, referenceResults: null }
    expect(recommended(P5_OBJECTS, data)).toEqual(['M 31', 'NGC 7000', 'IC 1396', 'M 45'])
  })

  it('P4: noc D 15/16.10.2026 bez drugiego zestawu wyników → „Polecane” daje to samo co „Widoczne w wybraną noc” dla „Klasyki”', () => {
    const data: MonthCase = { nightDate: OCT_15, results: NIGHT_OCT_15, referenceResults: null }
    expect(recommended(KLASYKI, data)).toEqual(visibleTonight(KLASYKI, data))
  })

  it('P4: noc D 15/16.11.2026, wyniki podane wprost tylko dla nocy D (200 i 100 min), minimum 3 h → przechodzi tylko obiekt z 200 min', () => {
    const long = syntheticObject('test-200-min')
    const short = syntheticObject('test-100-min')
    const data: MonthCase = {
      nightDate: '2026-11-15',
      results: [summary(long.uid, 200), summary(short.uid, 100)],
      referenceResults: null,
    }
    expect(recommended([long, short], data)).toEqual([long.uid])
  })
})

describe('P6 „Polecane” a „Widoczne w wybraną noc”', () => {
  const a = syntheticObject('test-A')
  const b = syntheticObject('test-B')
  const c = syntheticObject('test-C')
  /** A: 4 h w nocy D, 1 h w nocy 15.; B: 1 h w nocy D, 5 h w nocy 15.; C: 3 h 20 min w obu nocach. */
  const data: MonthCase = {
    nightDate: OCT_24,
    results: [summary(a.uid, 240), summary(b.uid, 60), summary(c.uid, 200)],
    referenceResults: [summary(a.uid, 60), summary(b.uid, 300), summary(c.uid, 200)],
  }

  it('P6: minimum 3 h → „Polecane” odrzuca A (1 h w nocy 15.) i przyjmuje B (5 h w nocy 15.)', () => {
    expect(recommended([a, b], data)).toEqual([b.uid])
  })

  it('P6: minimum 3 h → „Widoczne w wybraną noc” przyjmuje A (4 h w nocy D) i odrzuca B (1 h w nocy D)', () => {
    expect(visibleTonight([a, b], data)).toEqual([a.uid])
  })

  it('P6: oba filtry naraz → nie przechodzi ani A, ani B', () => {
    expect(run([a, b], { recommendedThisMonth: true, visibleTonight: true }, data)).toEqual([])
  })

  // Reguła: filtry łączą się przez „i” (P10); obiekt widoczny w obu nocach spełnia oba.
  it('P6: oba filtry naraz → przechodzi C, który ma 3 h 20 min w nocy D i w nocy 15.', () => {
    expect(run([a, b, c], { recommendedThisMonth: true, visibleTonight: true }, data)).toEqual([c.uid])
  })
})

describe('P7 granica minimum godzin włącznie', () => {
  it('P7: minimum 3 h → 180 min w nocy 15. przechodzi, 179 min nie (w nocy D odwrotnie: 179 i 180 min)', () => {
    const at180 = syntheticObject('test-180-min')
    const at179 = syntheticObject('test-179-min')
    const data: MonthCase = {
      nightDate: OCT_24,
      results: [summary(at180.uid, 179), summary(at179.uid, 180)],
      referenceResults: [summary(at180.uid, 180), summary(at179.uid, 179)],
    }
    expect(recommended([at180, at179], data)).toEqual([at180.uid])
  })

  it('P7: minimum 1,5 h → 90 min w nocy 15. przechodzi, 89 min nie (w nocy D odwrotnie)', () => {
    const at90 = syntheticObject('test-90-min')
    const at89 = syntheticObject('test-89-min')
    const data: MonthCase = {
      nightDate: OCT_24,
      results: [summary(at90.uid, 89), summary(at89.uid, 90)],
      referenceResults: [summary(at90.uid, 90), summary(at89.uid, 89)],
      minEffectiveHours: 1.5,
    }
    expect(recommended([at90, at89], data)).toEqual([at90.uid])
  })
})

describe('P8 minimum godzin z parametrów planowania', () => {
  const inMonth = syntheticObject('test-150-min-w-nocy-15')
  const onlyTonight = syntheticObject('test-150-min-w-nocy-D')
  /** Obiekt z 2 h 30 min w nocy 15. (1 h w nocy D) i obiekt z 2 h 30 min tylko w nocy D (1 h w nocy 15.). */
  const withMinimum = (minEffectiveHours: number): MonthCase => ({
    nightDate: OCT_24,
    results: [summary(inMonth.uid, 60), summary(onlyTonight.uid, 150)],
    referenceResults: [summary(inMonth.uid, 150), summary(onlyTonight.uid, 60)],
    minEffectiveHours,
  })

  it('P8: minimum 2 h → obiekt z 2 h 30 min w nocy 15. przechodzi; obiekt z 2 h 30 min tylko w nocy D nie', () => {
    expect(recommended([inMonth, onlyTonight], withMinimum(2))).toEqual([inMonth.uid])
  })

  it('P8: minimum 3 h → obiekt z 2 h 30 min w nocy 15. nie przechodzi', () => {
    expect(recommended([inMonth, onlyTonight], withMinimum(3))).toEqual([])
  })

  // Reguła P7: granica włącznie, tu przy minimum z parametrów równym 2 h 30 min.
  it('P8: minimum 2,5 h → obiekt z 2 h 30 min w nocy 15. przechodzi (granica włącznie)', () => {
    expect(recommended([inMonth, onlyTonight], withMinimum(2.5))).toEqual([inMonth.uid])
  })

  // Reguła [Z22] z czasami nocy 15/16.10 (parametry P5): M 31 ok. 9 h 35 min, IC 1396 ok. 9 h 05 min, M 45 ok. 7 h 05 min,
  // NGC 7000 ok. 6 h 55 min, M 42 ok. 1 h 55 min.
  it('P8: noc D 24/25.10.2026, minimum 1,5 h → wszystkie pięć z P5, także M 42', () => {
    expect(recommended(P5_OBJECTS, { ...P5_CASE, minEffectiveHours: 1.5 })).toEqual([
      'M 31',
      'NGC 7000',
      'IC 1396',
      'M 45',
      'M 42',
    ])
  })

  it('P8: noc D 24/25.10.2026, minimum 8 h → tylko M 31 i IC 1396', () => {
    expect(recommended(P5_OBJECTS, { ...P5_CASE, minEffectiveHours: 8 })).toEqual(['M 31', 'IC 1396'])
  })
})

describe('P9 noc 15. bez okna albo w trakcie liczenia', () => {
  const a = syntheticObject('test-A')
  const b = syntheticObject('test-B')
  /** W nocy D oba obiekty mają po 10 h. */
  const tonight = [summary(a.uid, 600), summary(b.uid, 600)]

  it('P9: noc 15. ma stan „brak okna” (czas efektywny null) → „Polecane” nie przyjmuje żadnego obiektu, nawet przy minimum 0,5 h', () => {
    const data: MonthCase = {
      nightDate: OCT_24,
      results: tonight,
      referenceResults: [summary(a.uid, null, NO_WINDOW), summary(b.uid, null, NO_WINDOW)],
      minEffectiveHours: 0.5,
    }
    expect(recommended([a, b], data)).toEqual([])
  })

  it('P9: wynik nocy 15. jeszcze się liczy (null) → „Polecane” nie przyjmuje żadnego obiektu, choć w nocy D mają po 10 h', () => {
    const data: MonthCase = { nightDate: OCT_24, results: tonight, referenceResults: null, minEffectiveHours: 0.5 }
    expect(recommended([a, b], data)).toEqual([])
  })

  it('P9: noc D 24/25.10.2026, wynik nocy 15/16.10 jeszcze się liczy → z „Klasyki” nie przechodzi nic', () => {
    expect(recommended(KLASYKI, { ...P5_CASE, referenceResults: null })).toEqual([])
  })

  // Noc D 1/2.06.2026 na 54,83°N ma okno przy obniżonym progu −12° (ok. 1 h 57 min dla NGC 7000 i IC 1396);
  // noc odniesienia 15/16.06.2026 ma „brak okna nawet przy progu −12°” (computeCatalogNight, parametry P5).
  it('P9: „brak okna” w prawdziwej nocy 15/16.06.2026 na 54,83°N → „Polecane” przy nocy D 1/2.06 nie przyjmuje nic; „Widoczne” przyjmuje NGC 7000 i IC 1396', () => {
    const june15 = nightResults(P5_OBJECTS, '2026-06-15', 54.83)
    expect(june15.map((object) => object.darkness.kind)).toEqual(['none', 'none', 'none', 'none', 'none'])
    const data: MonthCase = {
      nightDate: '2026-06-01',
      results: nightResults(P5_OBJECTS, '2026-06-01', 54.83),
      referenceResults: june15,
      minEffectiveHours: 1.5,
    }
    expect(recommended(P5_OBJECTS, data)).toEqual([])
    expect(visibleTonight(P5_OBJECTS, data)).toEqual(['NGC 7000', 'IC 1396'])
  })

  // Reguła P6: filtry są od siebie niezależne; „Widoczne” korzysta tylko z wyników nocy D.
  it('P9: wynik nocy 15. jeszcze się liczy → „Widoczne w wybraną noc” nadal działa z wyników nocy D: M 31, NGC 7000, IC 1396, M 45', () => {
    expect(visibleTonight(P5_OBJECTS, { ...P5_CASE, referenceResults: null })).toEqual(['M 31', 'NGC 7000', 'IC 1396', 'M 45'])
  })
})

describe('P10 „Polecane” łączy się z pozostałymi filtrami przez „i”', () => {
  it('P10: „Polecane” razem z typem „galaktyka” wśród obiektów z P5 → tylko M 31', () => {
    expect(run(P5_OBJECTS, { recommendedThisMonth: true, types: ['galaxy'] }, P5_CASE)).toEqual(['M 31'])
  })

  it('P10: „Polecane” razem z katalogiem M wśród obiektów z P5 → M 31 i M 45 (M 42 odpada przez „Polecane”)', () => {
    expect(run(P5_OBJECTS, { recommendedThisMonth: true, catalogs: ['M'] }, P5_CASE)).toEqual(['M 31', 'M 45'])
  })

  // Reguła [Z22]: M 101 ma w nocy 15/16.10 ok. 1 h (parametry P5), więc odpada; same galaktyki to M 31, M 33, M 101, M 81.
  it('P10: „Polecane” razem z typem „galaktyka” w „Klasyki” → M 31, M 33, M 81 (bez M 101)', () => {
    expect(run(KLASYKI, { types: ['galaxy'] }, P5_CASE)).toEqual(['M 31', 'M 33', 'M 101', 'M 81'])
    expect(run(KLASYKI, { recommendedThisMonth: true, types: ['galaxy'] }, P5_CASE)).toEqual(['M 31', 'M 33', 'M 81'])
  })

  // Reguła: wyłączony filtr nie jest warunkiem „i”.
  it('P10: „Polecane” wyłączone (false) niczego nie ogranicza, także gdy wynik nocy 15. jeszcze się liczy', () => {
    expect(run(P5_OBJECTS, { recommendedThisMonth: false }, { ...P5_CASE, referenceResults: null })).toEqual(names(P5_OBJECTS))
  })
})
