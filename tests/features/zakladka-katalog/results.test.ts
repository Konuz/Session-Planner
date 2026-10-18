// „Styk z resztą”: filtry (`catalogFilters.ts`) i sortowanie (`catalogSort.ts`) działają w wątku głównym na odpowiedziach
// Workera; P10: „Polecane na miesiąc” bierze wyniki z odpowiedzi o noc 15. Wartości oczekiwane z przykładów funkcji
// sortowanie (P1, P2), filtry-katalogu (AC2) i polecane-na-miesiac (P5, P9); odpowiedzi liczy prawdziwy silnik Workera.
import { describe, expect, it } from 'vitest'
import { catalogView } from '../../../src/features/catalog/catalogTabModel'
import {
  FLAT,
  OCT_15,
  OCT_16,
  OCT_24,
  T9_OBJECTS,
  colorsOutsideTokens,
  filtersWith,
  names,
  ready,
  renderMessages,
  viewInput,
  workerResult,
} from './helpers'

const FIVE = ready(T9_OBJECTS)

describe('sortowanie w wątku głównym na wynikach nocy D', () => {
  it('Styk: noc 16/17.10.2026, sortowanie „czas efektywny” → M 31, IC 1396, M 45, NGC 7000, M 42 (sortowanie P1)', () => {
    const view = catalogView(viewInput({ catalog: FIVE, tonight: workerResult(FLAT, OCT_16) }))
    expect(names(view.objects)).toEqual(['M 31', 'IC 1396', 'M 45', 'NGC 7000', 'M 42'])
  })

  it('Styk: noc 16/17.10.2026, sortowanie „godzina górowania” → NGC 7000, IC 1396, M 31, M 45, M 42 (sortowanie P2)', () => {
    const view = catalogView(viewInput({ catalog: FIVE, sort: 'transit', tonight: workerResult(FLAT, OCT_16) }))
    expect(names(view.objects)).toEqual(['NGC 7000', 'IC 1396', 'M 31', 'M 45', 'M 42'])
  })
})

describe('filtr „Widoczne w wybraną noc” w wątku głównym', () => {
  it('Styk: noc 16/17.10.2026, minimum 3 h → „Widoczne” odrzuca M 42: „4 z 5 obiektów” (filtry-katalogu AC2)', () => {
    const filters = filtersWith({ visibleTonight: true })
    const view = catalogView(viewInput({ catalog: FIVE, filters, tonight: workerResult(FLAT, OCT_16) }))
    expect([...names(view.objects)].sort()).toEqual(['IC 1396', 'M 31', 'M 45', 'NGC 7000'])
    expect(view.count).toBe('4 z 5 obiektów')
  })
})

describe('P10 „Polecane na miesiąc” z odpowiedzi o noc 15/16.10.2026', () => {
  const recommended = filtersWith({ recommendedThisMonth: true })

  it('P10: noc D 24/25.10.2026 z odpowiedzią o noc 15/16.10 → M 31, NGC 7000, IC 1396, M 45, bez M 42 (polecane-na-miesiac P5)', () => {
    const view = catalogView(
      viewInput({
        catalog: FIVE,
        nightDate: OCT_24,
        filters: recommended,
        tonight: workerResult(FLAT, OCT_24),
        reference: workerResult(FLAT, OCT_15),
      }),
    )
    expect([...names(view.objects)].sort()).toEqual(['IC 1396', 'M 31', 'M 45', 'NGC 7000'])
    expect(view.count).toBe('4 z 5 obiektów')
  })

  it('P10: odpowiedź o noc 15. jeszcze nie przyszła → „Polecane” nie przyjmuje żadnego obiektu: „0 z 5 obiektów” (polecane-na-miesiac P9)', () => {
    const view = catalogView(
      viewInput({ catalog: FIVE, nightDate: OCT_24, filters: recommended, tonight: workerResult(FLAT, OCT_24), reference: null }),
    )
    expect(view.objects).toEqual([])
    expect(view.count).toBe('0 z 5 obiektów')
  })

  it('P10: przy wyłączonym filtrze odpowiedź o noc 15. nie zmienia listy: wszystkie pięć obiektów', () => {
    const view = catalogView(
      viewInput({
        catalog: FIVE,
        nightDate: OCT_24,
        tonight: workerResult(FLAT, OCT_24),
        reference: workerResult(FLAT, OCT_15),
      }),
    )
    expect(view.count).toBe('5 z 5 obiektów')
  })
})

describe('kolory komunikatów', () => {
  it('Styk: komunikaty zakładki (liczba, stan, błąd z przyciskiem, próg, pusta lista) mają kolory tylko z tokenów', () => {
    const views = [
      catalogView(viewInput({ catalog: { status: 'loading' } })),
      catalogView(viewInput({ catalog: { status: 'error', message: 'Nie udało się wczytać katalogu (HTTP 404)' } })),
      catalogView(viewInput({ catalog: FIVE, tonight: { type: 'error', requestId: 1, message: 'Katalog nie jest wczytany' } })),
      catalogView(viewInput({ catalog: FIVE, nightDate: '2026-06-21', tonight: workerResult(FLAT, '2026-06-21') })),
      catalogView(viewInput({ catalog: FIVE, filters: filtersWith({ types: ['galaxy_group'] }) })),
    ]
    for (const view of views) expect(colorsOutsideTokens(renderMessages(view))).toEqual([])
  })
})
