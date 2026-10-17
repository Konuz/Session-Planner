// P3–P12: kolory filtrów z danych Księżyca podanych wprost (tabela z 7A, progi `MoonRuleThresholds` [Z12]).
import { describe, expect, it } from 'vitest'
import { filterAdvice, type FilterAdviceColor, type MoonConditions } from '../../../src/services/filterAdvice'
import { DEFAULT_MOON_RULES } from '../../../src/services/planningSettings'
import type { DsoType, FilterId, MoonRuleThresholds } from '../../../src/types'
import { LDN1235, MY_SET, REDCAT, VDB141, colorsOf, moon, pairs, rules, seven, type RulesPatch } from './helpers'

const LRGB: readonly FilterId[] = ['L', 'R', 'G', 'B']
const HA_SII: readonly FilterId[] = ['Ha', 'SII']

/** Kolory Mojego zestawu dla galaktyki przy progach domyślnych (albo podanych). */
function galaxy(data: MoonConditions, thresholds: MoonRuleThresholds = DEFAULT_MOON_RULES) {
  return pairs(filterAdvice(data, 'galaxy', thresholds, MY_SET))
}

function lrgbOf(data: MoonConditions, type: DsoType = 'galaxy', thresholds: MoonRuleThresholds = DEFAULT_MOON_RULES) {
  return colorsOf(filterAdvice(data, type, thresholds, MY_SET), LRGB)
}

function haSiiOf(data: MoonConditions) {
  return colorsOf(filterAdvice(data, 'galaxy', DEFAULT_MOON_RULES, MY_SET), HA_SII)
}

function oiiiOf(data: MoonConditions, filters: readonly FilterId[] = MY_SET, filter: FilterId = 'OIII') {
  return colorsOf(filterAdvice(data, 'galaxy', DEFAULT_MOON_RULES, filters), [filter])[0]
}

const all = (color: FilterAdviceColor, count = 4) => Array.from({ length: count }, () => color)

describe('P3, P11 wiersz 1 tabeli: Księżyc pod horyzontem przez ≥ moonDownMinFraction okna efektywnego → wszystkie zielone', () => {
  it('P3: galaktyka, pod horyzontem dokładnie 80%, oświetlenie 90%, separacja 10° → wszystkie siedem filtrów zielone (granica włącznie)', () => {
    expect(galaxy(moon(0.8, 0.9, 10))).toEqual(seven('green', 'green', 'green'))
  })

  it('P3: te same dane dla zestawu RedCat → OSC i DualBand zielone', () => {
    expect(pairs(filterAdvice(moon(0.8, 0.9, 10), 'galaxy', DEFAULT_MOON_RULES, REDCAT))).toEqual([
      ['OSC', 'green'],
      ['DualBand', 'green'],
    ])
  })

  it('P3, druga strona granicy: pod horyzontem 79% przy oświetleniu 90% i separacji 10° → wiersz 3, wszystkie czerwone', () => {
    // L, R, G, B: 90% ≥ 50% → czerwony; Ha, SII: 10° < 25° → czerwony; OIII: 10° < 40° → czerwony.
    expect(galaxy(moon(0.79, 0.9, 10))).toEqual(seven('red', 'red', 'red'))
  })

  it('P3: Księżyc pod horyzontem przez całe okno (100%) → wszystkie zielone także dla mgławicy ciemnej przy pełni i separacji 0°', () => {
    expect(pairs(filterAdvice(moon(1, 1, 0), 'dark_nebula', DEFAULT_MOON_RULES, MY_SET))).toEqual(seven('green', 'green', 'green'))
  })

  it('P11: dane z P3 przy progu „pod horyzontem” 95% zamiast 80% → L, R, G, B, Ha, SII i OIII czerwone', () => {
    expect(galaxy(moon(0.8, 0.9, 10), rules({ moonDownMinFraction: 0.95 }))).toEqual(seven('red', 'red', 'red'))
  })

  it('P11: próg 95% i pod horyzontem dokładnie 95% → wszystkie zielone (granica włącznie także przy zmienionym progu)', () => {
    expect(galaxy(moon(0.95, 0.9, 10), rules({ moonDownMinFraction: 0.95 }))).toEqual(seven('green', 'green', 'green'))
  })

  it('P11: próg obniżony do 40% → pod horyzontem 50% wystarcza, dane z P4 dają wszystkie zielone', () => {
    expect(galaxy(moon(0.5, 0.1, 30), rules({ moonDownMinFraction: 0.4 }))).toEqual(seven('green', 'green', 'green'))
  })
})

describe('P4–P8 wiersz 3 tabeli: Księżyc obecny, galaktyka', () => {
  it('P4: pod horyzontem 50%, oświetlenie 10%, separacja 30° → L, R, G, B zielone; Ha i SII żółte; OIII czerwony', () => {
    expect(galaxy(moon(0.5, 0.1, 30))).toEqual(seven('green', 'yellow', 'red'))
  })

  it('P5: pod horyzontem 50%, oświetlenie 40%, separacja 95° → L, R, G, B żółte; Ha i SII zielone; OIII zielony', () => {
    expect(galaxy(moon(0.5, 0.4, 95))).toEqual(seven('yellow', 'green', 'green'))
  })

  it('P6: oświetlenie dokładnie 15% i separacja dokładnie 90° → L, R, G, B żółte (15% to nie „poniżej 15%”, 90° spełnia „od 90°”)', () => {
    expect(lrgbOf(moon(0.5, 0.15, 90))).toEqual(all('yellow'))
  })

  it('P6: oświetlenie 50% i separacja 120° → L, R, G, B czerwone', () => {
    expect(lrgbOf(moon(0.5, 0.5, 120))).toEqual(all('red'))
  })

  it('P6, druga strona granic: oświetlenie 14,9% → zielone (także przy separacji 10°); 49,9% przy 90° → żółte; 40% przy 89,9° → czerwone', () => {
    expect(lrgbOf(moon(0.5, 0.149, 10))).toEqual(all('green'))
    expect(lrgbOf(moon(0.5, 0.499, 90))).toEqual(all('yellow'))
    expect(lrgbOf(moon(0.5, 0.4, 89.9))).toEqual(all('red'))
  })

  it('P7: oświetlenie 40%: Ha i SII przy separacji 50° → zielony; 25° → żółty; 24,9° → czerwony', () => {
    expect(haSiiOf(moon(0.5, 0.4, 50))).toEqual(['green', 'green'])
    expect(haSiiOf(moon(0.5, 0.4, 25))).toEqual(['yellow', 'yellow'])
    expect(haSiiOf(moon(0.5, 0.4, 24.9))).toEqual(['red', 'red'])
  })

  it('P7, druga strona granicy zielonej: Ha i SII przy 49,9° → żółty; oświetlenie nie zmienia koloru (50° przy 100% → zielony)', () => {
    expect(haSiiOf(moon(0.5, 0.4, 49.9))).toEqual(['yellow', 'yellow'])
    expect(haSiiOf(moon(0.5, 1, 50))).toEqual(['green', 'green'])
  })

  it('P8: OIII przy separacji 70° i oświetleniu 75% → żółty; 70° przy 74% → zielony; 39,9° przy 40% → czerwony', () => {
    expect(oiiiOf(moon(0.5, 0.75, 70))).toBe('yellow')
    expect(oiiiOf(moon(0.5, 0.74, 70))).toBe('green')
    expect(oiiiOf(moon(0.5, 0.4, 39.9))).toBe('red')
  })

  it('P8, druga strona granic: OIII przy 69,9° i 74% → żółty; 40° przy 40% → żółty; 40° przy 100% → żółty', () => {
    expect(oiiiOf(moon(0.5, 0.74, 69.9))).toBe('yellow')
    expect(oiiiOf(moon(0.5, 0.4, 40))).toBe('yellow')
    expect(oiiiOf(moon(0.5, 1, 40))).toBe('yellow')
  })

  it('P8: DualBand (zestaw RedCat) ma progi OIII: 70° przy 75% → żółty; 70° przy 74% → zielony; 39,9° → czerwony', () => {
    expect(oiiiOf(moon(0.5, 0.75, 70), REDCAT, 'DualBand')).toBe('yellow')
    expect(oiiiOf(moon(0.5, 0.74, 70), REDCAT, 'DualBand')).toBe('green')
    expect(oiiiOf(moon(0.5, 0.4, 39.9), REDCAT, 'DualBand')).toBe('red')
  })
})

describe('P9 wiersz 2 tabeli: mgławice refleksyjne i ciemne', () => {
  const FAINT: readonly (readonly [string, DsoType])[] = [
    ['vdB 141 (mgławica refleksyjna)', VDB141.type],
    ['LDN 1235 (mgławica ciemna)', LDN1235.type],
  ]

  it('P9: typy z katalogu: vdB 141 to reflection_nebula, LDN 1235 to dark_nebula', () => {
    expect(VDB141.type).toBe('reflection_nebula')
    expect(LDN1235.type).toBe('dark_nebula')
  })

  it.each(FAINT)('P9: %s, pod horyzontem 30%, oświetlenie 40%, separacja 120° → L, R, G, B czerwone, Ha i SII zielone, OIII zielony', (_, type) => {
    expect(pairs(filterAdvice(moon(0.3, 0.4, 120), type, DEFAULT_MOON_RULES, MY_SET))).toEqual(seven('red', 'green', 'green'))
  })

  it.each(FAINT)('P9: %s przy oświetleniu 10% → L, R, G, B zielone', (_, type) => {
    expect(lrgbOf(moon(0.3, 0.1, 120), type)).toEqual(all('green'))
  })

  it.each(FAINT)('P9: %s, granica wyłączna: oświetlenie 15% → czerwone, 14,9% → zielone (separacja nie ma znaczenia)', (_, type) => {
    expect(lrgbOf(moon(0.3, 0.15, 180), type)).toEqual(all('red'))
    expect(lrgbOf(moon(0.3, 0.149, 1), type)).toEqual(all('green'))
  })

  it.each(FAINT)('P9: %s, Ha, SII i OIII jak w wierszu 3: separacja 30° przy oświetleniu 40% → Ha, SII żółte, OIII czerwony', (_, type) => {
    expect(pairs(filterAdvice(moon(0.3, 0.4, 30), type, DEFAULT_MOON_RULES, MY_SET))).toEqual(seven('red', 'yellow', 'red'))
  })

  it.each(FAINT)('P9: %s z zestawem RedCat: OSC jak L, R, G, B (czerwony, bez stanu żółtego), DualBand jak OIII (zielony)', (_, type) => {
    expect(pairs(filterAdvice(moon(0.3, 0.4, 120), type, DEFAULT_MOON_RULES, REDCAT))).toEqual([
      ['OSC', 'red'],
      ['DualBand', 'green'],
    ])
  })

  const OTHER_TYPES: readonly DsoType[] = [
    'galaxy',
    'galaxy_group',
    'emission_nebula',
    'planetary_nebula',
    'supernova_remnant',
    'open_cluster',
    'globular_cluster',
    'cluster_nebula',
    'other',
  ]

  it.each(OTHER_TYPES)('P5, P9: %s to „pozostałe obiekty” z wierszem 3, więc dane z P5 dają L, R, G, B żółte', (type) => {
    expect(lrgbOf(moon(0.5, 0.4, 95), type)).toEqual(all('yellow'))
  })
})

describe('P10 tylko filtry aktywnego zestawu, w ich kolejności', () => {
  it('P10: dane z P5, zestaw RedCat 51 + ASI2600MC Pro → tylko dwie rekomendacje: OSC żółty (jak L, R, G, B), DualBand zielony (jak OIII)', () => {
    expect(REDCAT).toEqual(['OSC', 'DualBand'])
    expect(pairs(filterAdvice(moon(0.5, 0.4, 95), 'galaxy', DEFAULT_MOON_RULES, REDCAT))).toEqual([
      ['OSC', 'yellow'],
      ['DualBand', 'green'],
    ])
  })

  it('P10: dane z P5, Mój zestaw → siedem rekomendacji w kolejności L, R, G, B, Ha, OIII, SII', () => {
    expect(MY_SET).toEqual(['L', 'R', 'G', 'B', 'Ha', 'OIII', 'SII'])
    const advice = filterAdvice(moon(0.5, 0.4, 95), 'galaxy', DEFAULT_MOON_RULES, MY_SET)
    expect(advice.map((item) => item.filter)).toEqual(['L', 'R', 'G', 'B', 'Ha', 'OIII', 'SII'])
    expect(pairs(advice)).toEqual(seven('yellow', 'green', 'green'))
  })

  it('P10: kolejność wyniku to kolejność filtrów zestawu: SII, OIII, B, Ha, OSC, L przy danych z P4', () => {
    const filters: FilterId[] = ['SII', 'OIII', 'B', 'Ha', 'OSC', 'L']
    expect(pairs(filterAdvice(moon(0.5, 0.1, 30), 'galaxy', DEFAULT_MOON_RULES, filters))).toEqual([
      ['SII', 'yellow'],
      ['OIII', 'red'],
      ['B', 'green'],
      ['Ha', 'yellow'],
      ['OSC', 'green'],
      ['L', 'green'],
    ])
  })

  it('P10: zestaw bez filtrów → brak rekomendacji', () => {
    expect(filterAdvice(moon(0.5, 0.4, 95), 'galaxy', DEFAULT_MOON_RULES, [])).toEqual([])
  })
})

describe('P12 obiekt bez czasu efektywnego', () => {
  it('P12: brak danych Księżyca (0 min albo „brak okna”) → brak rekomendacji dla Mojego zestawu i dla RedCat', () => {
    expect(filterAdvice(null, 'galaxy', DEFAULT_MOON_RULES, MY_SET)).toEqual([])
    expect(filterAdvice(null, 'reflection_nebula', DEFAULT_MOON_RULES, REDCAT)).toEqual([])
  })
})

describe('progi z parametrów planowania („Cel”, P11): każde pole MoonRuleThresholds zmienia wynik', () => {
  // [opis, zmiana progów, typ, dane, filtr, kolor przy progach domyślnych, kolor przy zmienionych]
  const CASES: readonly (readonly [string, RulesPatch, DsoType, MoonConditions, FilterId, FilterAdviceColor, FilterAdviceColor])[] = [
    ['broadband.greenMaxIllum 5%: L przy 10% i 95°', { broadband: { greenMaxIllum: 0.05 } }, 'galaxy', moon(0.5, 0.1, 95), 'L', 'green', 'yellow'],
    ['broadband.yellowMaxIllum 30%: L przy 40% i 95°', { broadband: { yellowMaxIllum: 0.3 } }, 'galaxy', moon(0.5, 0.4, 95), 'L', 'yellow', 'red'],
    ['broadband.yellowMinSepDeg 100°: B przy 40% i 95°', { broadband: { yellowMinSepDeg: 100 } }, 'galaxy', moon(0.5, 0.4, 95), 'B', 'yellow', 'red'],
    ['broadband.greenMaxIllum 60%: R przy 40% i 30°', { broadband: { greenMaxIllum: 0.6 } }, 'galaxy', moon(0.5, 0.4, 30), 'R', 'red', 'green'],
    [
      'broadbandFaintNebula.greenMaxIllum 5%: L dla mgławicy refleksyjnej przy 10%',
      { broadbandFaintNebula: { greenMaxIllum: 0.05 } },
      'reflection_nebula',
      moon(0.3, 0.1, 120),
      'L',
      'green',
      'red',
    ],
    [
      'broadbandFaintNebula.greenMaxIllum 50%: G dla mgławicy ciemnej przy 40%',
      { broadbandFaintNebula: { greenMaxIllum: 0.5 } },
      'dark_nebula',
      moon(0.3, 0.4, 120),
      'G',
      'red',
      'green',
    ],
    ['hydrogenSulfur.greenMinSepDeg 60°: Ha przy 55°', { hydrogenSulfur: { greenMinSepDeg: 60 } }, 'galaxy', moon(0.5, 0.4, 55), 'Ha', 'green', 'yellow'],
    ['hydrogenSulfur.yellowMinSepDeg 35°: SII przy 30°', { hydrogenSulfur: { yellowMinSepDeg: 35 } }, 'galaxy', moon(0.5, 0.4, 30), 'SII', 'yellow', 'red'],
    ['hydrogenSulfur.yellowMinSepDeg 15°: Ha przy 20°', { hydrogenSulfur: { yellowMinSepDeg: 15 } }, 'galaxy', moon(0.5, 0.4, 20), 'Ha', 'red', 'yellow'],
    ['oxygen.greenMinSepDeg 80°: OIII przy 75° i 40%', { oxygen: { greenMinSepDeg: 80 } }, 'galaxy', moon(0.5, 0.4, 75), 'OIII', 'green', 'yellow'],
    ['oxygen.greenMaxIllum 50%: OIII przy 75° i 60%', { oxygen: { greenMaxIllum: 0.5 } }, 'galaxy', moon(0.5, 0.6, 75), 'OIII', 'green', 'yellow'],
    ['oxygen.yellowMinSepDeg 50°: OIII przy 45°', { oxygen: { yellowMinSepDeg: 50 } }, 'galaxy', moon(0.5, 0.4, 45), 'OIII', 'yellow', 'red'],
    ['oxygen.yellowMinSepDeg 50°: DualBand przy 45°', { oxygen: { yellowMinSepDeg: 50 } }, 'galaxy', moon(0.5, 0.4, 45), 'DualBand', 'yellow', 'red'],
    ['broadband.yellowMinSepDeg 100°: OSC przy 40% i 95°', { broadband: { yellowMinSepDeg: 100 } }, 'galaxy', moon(0.5, 0.4, 95), 'OSC', 'yellow', 'red'],
  ]

  it.each(CASES)('%s', (_, patch, type, data, filter, before, after) => {
    expect(filterAdvice(data, type, DEFAULT_MOON_RULES, [filter])).toEqual([{ filter, color: before }])
    expect(filterAdvice(data, type, rules(patch), [filter])).toEqual([{ filter, color: after }])
  })
})
