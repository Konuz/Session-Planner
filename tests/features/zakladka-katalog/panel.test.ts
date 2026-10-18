// P13: panel filtrów i sortowania (komponent prezentacyjny, render w Node): 5 opcji sortowania, domyślnie „czas
// efektywny”; 88 skrótów IAU gwiazdozbiorów alfabetycznie, bez polskich nazw („Pytania”); katalogi i typy po kilka naraz;
// „pokaż obiekty bez jasności” domyślnie zaznaczone. Pola i przyciski z klasami `control` i `button`, kolory z tokenów.
import { describe, expect, it } from 'vitest'
import type { CatalogPanelProps } from '../../../src/features/catalog/CatalogPanel'
import { usePlannerStore } from '../../../src/state/plannerStore'
import {
  CONSTELLATIONS,
  choiceNamed,
  choicesOf,
  colorsOutsideTokens,
  controlsWithoutClass,
  elementsOf,
  filtersWith,
  groupOf,
  labelIs,
  parseMarkup,
  renderPanel,
  type Choice,
} from './helpers'

const panelChoices = (patch: Partial<CatalogPanelProps> = {}): Choice[] => choicesOf(parseMarkup(renderPanel(patch)))

/** Opcje sortowania (grupa z opcją „czas efektywny”) i etykieta zaznaczonej. */
function sortOptions(patch: Partial<CatalogPanelProps> = {}): { labels: string[]; selected: string[] } {
  const choices = panelChoices(patch)
  const group = groupOf(choices, choiceNamed(choices, 'czas efektywny'))
  return { labels: group.map((choice) => choice.label), selected: group.filter((c) => c.selected).map((c) => c.label) }
}

/** Gwiazdozbiory w panelu: elementy wyboru, których etykieta to dokładnie skrót IAU, w kolejności panelu. */
function constellationChoices(patch: Partial<CatalogPanelProps> = {}): Choice[] {
  return panelChoices(patch).filter((choice) => CONSTELLATIONS.has(choice.label))
}

/** Etykiety typów z karty obiektu (karta-obiektu P10); P3 wybiera typ po etykiecie „mgławica ciemna”. */
const TYPE_LABELS = [
  'galaktyka',
  'grupa galaktyk',
  'mgławica emisyjna',
  'mgławica refleksyjna',
  'mgławica ciemna',
  'mgławica planetarna',
  'pozostałość po supernowej',
  'gromada otwarta',
  'gromada kulista',
  'gromada z mgławicą',
  'inny obiekt',
]

describe('sortowanie', () => {
  it('P13: sortowanie ma 5 opcji, domyślnie (stan aplikacji) „czas efektywny”', () => {
    const { catalogSort, catalogFilters } = usePlannerStore.getState()
    expect(catalogSort).toBe('effectiveTime')
    const { labels, selected } = sortOptions({ sort: catalogSort, filters: catalogFilters })
    expect(labels).toHaveLength(5)
    expect(selected).toHaveLength(1)
    expect(labelIs(selected[0], 'czas efektywny')).toBe(true)
  })

  it('P13: sortowanie „rozmiar” → zaznaczona opcja „rozmiar”, a nie „czas efektywny”', () => {
    const { labels, selected } = sortOptions({ sort: 'size' })
    expect(labels).toHaveLength(5)
    expect(selected).toHaveLength(1)
    expect(labelIs(selected[0], 'rozmiar')).toBe(true)
  })
})

describe('gwiazdozbiory', () => {
  it('P13: 88 skrótów IAU w porządku alfabetycznym', () => {
    const labels = constellationChoices().map((choice) => choice.label)
    expect(new Set(labels).size).toBe(88)
    expect(labels).toHaveLength(88)
    // Porządek alfabetyczny: z rozróżnianiem wielkości liter (CMa przed Cae) albo bez (Cae przed CMa).
    const byCodePoint = [...CONSTELLATIONS].sort()
    const byLocale = [...CONSTELLATIONS].sort((a, b) => a.localeCompare(b, 'pl'))
    expect([byCodePoint, byLocale]).toContainEqual(labels)
  })

  it('Pytania: gwiazdozbiory jako same skróty IAU, bez polskich nazw; poza nimi grupa ma najwyżej opcję „wszystkie”', () => {
    const choices = panelChoices()
    const and = choices.find((choice) => choice.label === 'And')
    if (!and) throw new Error('Brak gwiazdozbioru „And” wśród elementów wyboru panelu')
    const group = groupOf(choices, and)
    const others = group.filter((choice) => !CONSTELLATIONS.has(choice.label))
    expect(others.length).toBeLessThanOrEqual(1)
    expect(group.length - others.length).toBe(88)
  })

  it('P13: gwiazdozbiór Cep w filtrach → zaznaczony Cep i tylko on', () => {
    const selected = constellationChoices({ filters: filtersWith({ constellation: 'Cep' }) }).filter((c) => c.selected)
    expect(selected.map((choice) => choice.label)).toEqual(['Cep'])
  })

  it('P13: bez gwiazdozbioru w filtrach żaden skrót nie jest zaznaczony', () => {
    expect(constellationChoices().filter((choice) => choice.selected)).toEqual([])
  })
})

describe('katalogi i typy po kilka naraz', () => {
  it('P13: katalogi NGC i IC naraz → oba zaznaczone, LDN nie', () => {
    const choices = panelChoices({ filters: filtersWith({ catalogs: ['NGC', 'IC'] }) })
    expect(choiceNamed(choices, 'NGC').selected).toBe(true)
    expect(choiceNamed(choices, 'IC').selected).toBe(true)
    expect(choiceNamed(choices, 'LDN').selected).toBe(false)
  })

  it('P13: bez filtrów żaden z katalogów NGC, IC, LDN nie jest zaznaczony', () => {
    const choices = panelChoices()
    for (const name of ['NGC', 'IC', 'LDN']) expect(choiceNamed(choices, name).selected, name).toBe(false)
  })

  it('P13: typy galaktyka i mgławica ciemna naraz → oba zaznaczone, mgławica emisyjna nie', () => {
    const choices = panelChoices({ filters: filtersWith({ types: ['galaxy', 'dark_nebula'] }) })
    expect(choiceNamed(choices, 'galaktyka').selected).toBe(true)
    expect(choiceNamed(choices, 'mgławica ciemna').selected).toBe(true)
    expect(choiceNamed(choices, 'mgławica emisyjna').selected).toBe(false)
  })

  it('P13: do wyboru wszystkie typy, z etykietami kart (P3: „mgławica ciemna”)', () => {
    const choices = panelChoices()
    for (const label of TYPE_LABELS) expect(choiceNamed(choices, label).selected, label).toBe(false)
  })
})

describe('obiekty bez jasności', () => {
  const showWithout = (choices: readonly Choice[]) => {
    const found = choices.filter((choice) => choice.label.toLocaleLowerCase('pl').includes('pokaż obiekty bez jasności'))
    if (found.length !== 1) throw new Error(`Oczekiwano jednego pola „pokaż obiekty bez jasności”, jest ${found.length}`)
    return found[0]
  }

  it('P13: „pokaż obiekty bez jasności” jest domyślnie (stan aplikacji) zaznaczone', () => {
    const { catalogFilters } = usePlannerStore.getState()
    expect(showWithout(panelChoices({ filters: catalogFilters })).selected).toBe(true)
  })

  it('P13: po odznaczeniu (showWithoutMagnitude: false) pole jest niezaznaczone', () => {
    expect(showWithout(panelChoices({ filters: filtersWith({ showWithoutMagnitude: false }) })).selected).toBe(false)
  })
})

describe('klasy i kolory panelu', () => {
  it('Styk: pola mają klasę `control`, a przyciski klasę `button` (co najmniej 44 px)', () => {
    for (const filters of [filtersWith({}), filtersWith({ magnitude: { min: 0, max: 10 }, size: { min: 10, max: 60 } })]) {
      const markup = renderPanel({ filters })
      const fields = elementsOf(parseMarkup(markup)).filter((element) => ['select', 'input', 'button'].includes(element.tag))
      expect(fields.length).toBeGreaterThan(0)
      expect(controlsWithoutClass(markup)).toEqual([])
    }
  })

  it('Styk: kolory panelu tylko z tokenów (Red Mode)', () => {
    expect(colorsOutsideTokens(renderPanel())).toEqual([])
    expect(colorsOutsideTokens(renderPanel({ filters: filtersWith({ catalogs: ['NGC'], types: ['galaxy'], fitsFrame: true }) }))).toEqual([])
  })
})
