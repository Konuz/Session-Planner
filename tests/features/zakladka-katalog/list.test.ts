// P12: lista wirtualizowana (@tanstack/react-virtual, pierwszy ekran przez `initialRect`); P8: czasy efektywne na kartach
// pojawiają się po odpowiedzi Workera. Karty z modelu karty i rekomendacje `filterAdvice` w wątku głównym („Styk z resztą”).
import { describe, expect, it } from 'vitest'
import { formatDesignation } from '../../../src/services/catalog/records'
import { formatDuration } from '../../../src/services/time'
import { at } from '../../../src/test/fixtures'
import type { DsoObject, EquipmentProfile } from '../../../src/types'
import type { ResultResponse } from '../../../src/workers/catalogMessages'
import {
  CATALOG,
  FLAT,
  KLASYKI,
  M31,
  M42,
  M45,
  MY_SET,
  OCT_16,
  REDCAT,
  SCREEN,
  SETTINGS,
  cardContext,
  colorsOutsideTokens,
  elementsOf,
  parseMarkup,
  renderList,
  requestFor,
  summaryIn,
  tabState,
  textOf,
  workerResult,
  type MarkupElement,
} from './helpers'

/** Kursor 00:00 CEST 17.10.2026 w nocy 16/17.10.2026 na 52,0°N. */
const CONTEXT = cardContext(requestFor(tabState()), at('2026-10-17 00:00', 'CEST'))

/** Znaczniki listy w nocy 16/17.10.2026 (Mój zestaw, progi Księżyca z parametrów), pierwszy ekran 1024 × 800 px. */
function listMarkup(
  objects: readonly DsoObject[],
  results: ResultResponse | null,
  profile: EquipmentProfile = MY_SET,
  initialRect = SCREEN,
): string {
  return renderList({
    objects,
    results: results?.objects ?? null,
    context: { ...CONTEXT, profile },
    profile,
    moonRules: SETTINGS.moonRules,
    initialRect,
  })
}

/** Teksty kart (zewnętrzne elementy <article>, jak w `ObjectCard`) w kolejności listy. */
function cards(markup: string): string[] {
  const insideArticle = (element: MarkupElement) => {
    for (let parent = element.parent; parent; parent = parent.parent) if (parent.tag === 'article') return true
    return false
  }
  return elementsOf(parseMarkup(markup))
    .filter((element) => element.tag === 'article' && !insideArticle(element))
    .map(textOf)
}

const MY_FILTERS = ['L', 'R', 'G', 'B', 'Ha', 'OIII', 'SII'] as const

describe('P12 lista wirtualizowana', () => {
  it('P12: cały katalog przy wysokości 800 px (szerokość 1024 px) → pierwszy ekran ma najwyżej 30 kart, a nie 16 516', () => {
    const shown = cards(listMarkup(CATALOG, null))
    expect(shown.length).toBeGreaterThanOrEqual(3)
    expect(shown.length).toBeLessThanOrEqual(30)
    expect(shown[0]).toContain(formatDesignation(CATALOG[0].primary))
  })

  it('P12: pierwszy ekran zaczyna się od pierwszego obiektu listy (katalog odwrócony → ostatni obiekt katalogu)', () => {
    const reversed = [...CATALOG].reverse()
    const shown = cards(listMarkup(reversed, null))
    expect(shown.length).toBeGreaterThanOrEqual(3)
    expect(shown.length).toBeLessThanOrEqual(30)
    expect(shown[0]).toContain(formatDesignation(reversed[0].primary))
    expect(shown[1]).toContain(formatDesignation(reversed[1].primary))
  })

  // Wirtualizacja: liczba kart pierwszego ekranu zależy od wysokości `initialRect` (stała liczba kart, np. pierwsze 20,
  // nie przejdzie). Bez zakładania wysokości karty: tylko porządek 400 px < 800 px < 2400 px przy tej samej szerokości.
  it('P12: cały katalog przy wysokości 2400 px → więcej kart niż przy 800 px, przy 400 px mniej; nadal nie 16 516', () => {
    const at400 = cards(listMarkup(CATALOG, null, MY_SET, { ...SCREEN, height: 400 }))
    const at800 = cards(listMarkup(CATALOG, null, MY_SET, SCREEN))
    const at2400 = cards(listMarkup(CATALOG, null, MY_SET, { ...SCREEN, height: 2400 }))
    expect(at400.length).toBeGreaterThanOrEqual(1)
    expect(at400.length).toBeLessThan(at800.length)
    expect(at2400.length).toBeGreaterThan(at800.length)
    // Granica rozsądku (nie wysokość karty): trzy razy wyższy ekran to wciąż mały ułamek z 16 516 obiektów.
    expect(at2400.length).toBeLessThanOrEqual(200)
    expect(at2400[0]).toContain(formatDesignation(CATALOG[0].primary))
  })

  it('P12: lista krótsza niż ekran (M 31, M 42, M 45) → trzy karty w kolejności listy', () => {
    const shown = cards(listMarkup([M31, M42, M45], null))
    expect(shown).toHaveLength(3)
    expect(shown[0]).toContain('M 31')
    expect(shown[1]).toContain('M 42')
    expect(shown[2]).toContain('M 45')
  })
})

describe('P8 czasy efektywne po odpowiedzi Workera', () => {
  const october = () => workerResult(FLAT, OCT_16, KLASYKI)

  it('P8: przed odpowiedzią karta M 31 ma oznaczenie i nazwę, ale nie ma czasu efektywnego ani progu', () => {
    const minutes = summaryIn(october(), M31).effectiveMinutes ?? 0
    const [card] = cards(listMarkup([M31, M42], null))
    expect(card).toContain('M 31')
    expect(card).toContain('Andromeda Galaxy')
    expect(card).not.toContain(formatDuration(minutes))
    expect(card).not.toContain('próg −18°')
  })

  it('P8: po odpowiedzi karta M 31 pokazuje czas efektywny z progiem z wyniku Workera („HH:MM, próg −18°”)', () => {
    const response = october()
    const [m31, m42] = cards(listMarkup([M31, M42], response))
    expect(m31).toContain(`${formatDuration(summaryIn(response, M31).effectiveMinutes ?? 0)}, próg −18°`)
    expect(m42).toContain(`${formatDuration(summaryIn(response, M42).effectiveMinutes ?? 0)}, próg −18°`)
  })

  // „Styk z resztą”: rekomendacje `filterAdvice` w wątku głównym, dla filtrów aktywnego zestawu (AC5: M 31 w noc 16/17.10 – wszystkie zielone).
  it('P8: po odpowiedzi karta M 31 ma odznaki filtrów Mojego zestawu: L, R, G, B, Ha, OIII, SII „dobre warunki”', () => {
    const [card] = cards(listMarkup([M31], october()))
    for (const filter of MY_FILTERS) expect(card).toContain(`${filter}: dobre warunki`)
  })

  it('P8: odznaki tylko dla filtrów aktywnego zestawu: RedCat 51 → OSC i DualBand, bez Ha', () => {
    const [card] = cards(listMarkup([M31], october(), REDCAT))
    expect(card).toContain('OSC: dobre warunki')
    expect(card).toContain('DualBand: dobre warunki')
    expect(card).not.toContain('Ha: ')
  })

  it('P8: przed odpowiedzią karta nie ma odznak filtrów', () => {
    const [card] = cards(listMarkup([M31], null))
    expect(card).not.toContain('dobre warunki')
  })
})

describe('kolory listy', () => {
  it('Styk: kolory listy tylko z tokenów (Red Mode), przed odpowiedzią i po niej', () => {
    expect(colorsOutsideTokens(listMarkup(KLASYKI, null))).toEqual([])
    expect(colorsOutsideTokens(listMarkup(KLASYKI, workerResult(FLAT, OCT_16, KLASYKI)))).toEqual([])
  })
})
