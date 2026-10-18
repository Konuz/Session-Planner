// P1 w aplikacji: pierwsze uruchomienie z pustą bazą przeglądarki (nic nie zapisano). Zakładka Ustawienia ma sekcję
// „Parametry planowania” pod lokalizacjami („Styk z resztą”), z wartościami domyślnymi.
// Osobny plik, żeby żaden inny test nie zapisał wcześniej parametrów w tej samej bazie.
import 'fake-indexeddb/auto'
import { beforeAll, describe, expect, it } from 'vitest'
import { usePlannerStore } from '../../../src/state/plannerStore'
import {
  DEFAULT_FORM,
  DISCARD,
  RESTORE,
  SAVE,
  UNSAVED,
  defaults,
  headingsOf,
  isDisabled,
  parseMarkup,
  planningPart,
  renderSettingsTab,
  settingsTabValues,
  textOf,
  textPart,
  visibleText,
  type MarkupElement,
} from './helpers'

beforeAll(async () => {
  await usePlannerStore.getState().loadLocations()
})

/** Jedyny element `tag` (np. 'select') w sekcji „Parametry planowania”, wybrany przez `match`. */
function onlyIn(after: readonly MarkupElement[], match: (element: MarkupElement) => boolean, what: string): MarkupElement {
  const found = after.filter(match)
  expect(found, what).toHaveLength(1)
  return found[0]
}

const planningButton = (markup: string, text: string) =>
  onlyIn(planningPart(markup).after, (element) => element.tag === 'button' && textOf(element) === text, `przyciski „${text}”`)

describe('pierwsze uruchomienie', () => {
  it('P1: po starcie z pustą bazą stan aplikacji ma parametry domyślne', () => {
    expect(usePlannerStore.getState().planningSettings).toEqual(defaults())
  })

  it('P1: sekcja „Parametry planowania” w Ustawieniach pokazuje wartości domyślne we wszystkich 17 polach', () => {
    const markup = renderSettingsTab()
    const values = settingsTabValues(markup, defaults(), DEFAULT_FORM)
    expect(values).toEqual(textPart(DEFAULT_FORM))
    expect(values.minAltitudeDeg).toBe('30')
    expect(values.seeingArcsec).toBe('2,5')
  })

  it('P1, P2: w sekcji wybrany próg −18° z listy −18°, −15°, −12°; obniżanie progu zaznaczone', () => {
    const { after } = planningPart(renderSettingsTab())
    const select = onlyIn(after, (element) => element.tag === 'select', 'pola <select> w sekcji')
    const options = after.filter((element) => element.tag === 'option' && isInside(element, select))
    expect(options.map((option) => textOf(option).slice(0, 4))).toEqual(['−18°', '−15°', '−12°'])
    expect(options.filter((option) => 'selected' in option.attrs).map((option) => textOf(option).slice(0, 4))).toEqual(['−18°'])
    const checkbox = onlyIn(after, (element) => element.tag === 'input' && element.attrs.type === 'checkbox', 'pola wyboru w sekcji')
    expect('checked' in checkbox.attrs).toBe(true)
  })

  it('Styk: sekcja „Parametry planowania” jest pod lokalizacjami (pod listą i pod edycją lokalizacji)', () => {
    const markup = renderSettingsTab()
    const headings = headingsOf(parseMarkup(markup)).map((heading) => textOf(heading))
    const planning = headings.indexOf('Parametry planowania')
    expect(planning).toBeGreaterThanOrEqual(0)
    expect(headings.indexOf('Lokalizacje')).toBeGreaterThanOrEqual(0)
    expect(headings.indexOf('Lokalizacje')).toBeLessThan(planning)
    const editing = headings.findIndex((heading) => heading.startsWith('Edycja:'))
    expect(editing).toBeGreaterThanOrEqual(0)
    expect(editing).toBeLessThan(planning)
  })

  it('P8, P9: bez zmian → bez „Niezapisane zmiany”; „Zapisz zmiany”, „Odrzuć zmiany” i „Przywróć domyślne” nieaktywne', () => {
    const markup = renderSettingsTab()
    expect(visibleText(markup)).not.toContain(UNSAVED)
    for (const text of [SAVE, DISCARD, RESTORE]) expect(isDisabled(planningButton(markup, text)), text).toBe(true)
  })
})

function isInside(element: MarkupElement, ancestor: MarkupElement): boolean {
  for (let node = element.parent; node; node = node.parent) if (node === ancestor) return true
  return false
}
