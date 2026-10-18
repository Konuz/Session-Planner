// P9, P10: żądania do Workera po zmianie stanu. Żądania budowane funkcją z `obliczenia-w-tle` (`buildCatalogRequest`).
import { describe, expect, it } from 'vitest'
import { requestsToSend, type CatalogTabState } from '../../../src/features/catalog/catalogTabModel'
import { HOME_LOCATION } from '../../../src/data/locations'
import { DEMO_HORIZON } from '../../../src/test/fixtures'
import {
  FLAT,
  OCT_15,
  OCT_17,
  OCT_24,
  OCT_31,
  REDCAT,
  filtersWith,
  requestFor,
  settingsWith,
  tabState,
} from './helpers'

const BASE = tabState()

describe('pierwsze żądanie zakładki', () => {
  it('P9: pierwsze otwarcie (noc 16/17.10.2026, filtr „Polecane” wyłączony) → jedno żądanie o noc D', () => {
    expect(requestsToSend(null, BASE)).toEqual([requestFor(BASE)])
  })
})

describe('P9 zmiany, które wysyłają jedno nowe żądanie (filtr „Polecane” wyłączony)', () => {
  it.each([
    ['noc 16.10 → 17.10', { nightDate: OCT_17 }],
    ['lokalizacja 52,0°N 19,0°E → Chrząstawa Wielka', { location: HOME_LOCATION }],
    ['horyzont płaski → demonstracyjny (6.4)', { location: { ...FLAT, horizon: DEMO_HORIZON } }],
    ['próg −18° → −15°', { settings: settingsWith({ darknessThresholdDeg: -15 }) }],
    ['obniżanie progu włączone → wyłączone', { settings: settingsWith({ autoLowerThreshold: false }) }],
    ['h_min 30° → 20°', { settings: settingsWith({ minAltitudeDeg: 20 }) }],
    ['krok katalogu 5 → 1 min', { settings: settingsWith({ catalogStepMin: 1 }) }],
  ] satisfies [string, Partial<CatalogTabState>][])('P9: %s → jedno nowe żądanie z nowymi parametrami', (_, patch) => {
    const next = tabState(patch)
    const sent = requestsToSend(BASE, next)
    expect(sent).toEqual([requestFor(next)])
    expect(sent[0]).not.toEqual(requestFor(BASE))
  })
})

describe('P9 zmiany, które nie wysyłają żądania', () => {
  it.each([
    ['minimum godzin 3 → 2 h', { settings: settingsWith({ minEffectiveHours: 2 }) }],
    ['zakres „Pasuje do kadru” 25–80% → 10–50%', { settings: settingsWith({ fitRange: [0.1, 0.5] }) }],
    ['zestaw Mój zestaw → RedCat 51 + ASI2600MC Pro', { profile: REDCAT }],
    ['filtry: katalog NGC, typ galaktyka, gwiazdozbiór Cep', { filters: filtersWith({ catalogs: ['NGC'], types: ['galaxy'], constellation: 'Cep' }) }],
    [
      'filtry: jasność 0–10 mag bez obiektów bez jasności, rozmiar 10–60′',
      { filters: filtersWith({ magnitude: { min: 0, max: 10 }, showWithoutMagnitude: false, size: { min: 10, max: 60 } }) },
    ],
    ['filtry: „Widoczne w wybraną noc” i „Pasuje do kadru”', { filters: filtersWith({ visibleTonight: true, fitsFrame: true }) }],
    ['sortowanie czas efektywny → rozmiar', { sort: 'size' }],
    ['sortowanie czas efektywny → godzina górowania', { sort: 'transit' }],
  ] satisfies [string, Partial<CatalogTabState>][])('P9: %s → bez żądania', (_, patch) => {
    expect(requestsToSend(BASE, tabState(patch))).toEqual([])
  })

  it('P9: ten sam stan zapisany od nowa (kopie obiektów lokalizacji i parametrów) → bez żądania', () => {
    expect(requestsToSend(BASE, structuredClone(BASE))).toEqual([])
  })
})

describe('P10 „Polecane na miesiąc” i noc z 15. dnia miesiąca', () => {
  const night24 = tabState({ nightDate: OCT_24 })
  const night24Recommended = tabState({ nightDate: OCT_24, filters: filtersWith({ recommendedThisMonth: true }) })

  it('P10: włączenie „Polecane na miesiąc” przy nocy 24/25.10.2026 → drugie żądanie, o noc 15/16.10.2026', () => {
    const sent = requestsToSend(night24, night24Recommended)
    expect(sent).toEqual([requestFor(night24, OCT_15)])
    expect(sent[0].nightDate).toBe('2026-10-15')
  })

  it('P10: przy wyłączonym filtrze nie ma żądania o noc 15.: pierwsze żądanie przy nocy 24/25.10 → tylko noc D', () => {
    expect(requestsToSend(null, night24)).toEqual([requestFor(night24)])
  })

  it('P10: zakładka otwarta z włączonym filtrem przy nocy 24/25.10 → żądania o noc 24/25.10 i o noc 15/16.10', () => {
    const sent = requestsToSend(null, night24Recommended)
    expect(sent).toHaveLength(2)
    expect(sent).toEqual(expect.arrayContaining([requestFor(night24), requestFor(night24, OCT_15)]))
  })

  it('P10: przy wyłączonym filtrze zmiana nocy 24.10 → 31.10 wysyła tylko żądanie o noc D', () => {
    expect(requestsToSend(night24, tabState({ nightDate: OCT_31 }))).toEqual([requestFor(tabState({ nightDate: OCT_31 }))])
  })

  it('P10: wyłączenie filtru → bez żądania', () => {
    expect(requestsToSend(night24Recommended, night24)).toEqual([])
  })

  // Noc 15. liczy się z tymi samymi parametrami co noc D (polecane-na-miesiac, „Pytania”), więc zmiana h_min przy
  // włączonym filtrze daje nowe żądania o obie noce.
  it('P10: przy włączonym filtrze zmiana h_min 30° → 20° → żądania o noc 24/25.10 i o noc 15/16.10 z h_min 20°', () => {
    const changed = { ...night24Recommended, settings: settingsWith({ minAltitudeDeg: 20 }) }
    const sent = requestsToSend(night24Recommended, changed)
    expect(sent).toHaveLength(2)
    expect(sent).toEqual(expect.arrayContaining([requestFor(changed), requestFor(changed, OCT_15)]))
    for (const params of sent) expect(params.settings.minAltitudeDeg).toBe(20)
  })
})
