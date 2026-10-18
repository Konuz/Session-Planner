// P2–P4: liczba wyników „N z M obiektów” (format pl-PL) i komunikat o pustej liście; model widoku i jego komunikaty.
// Filtry atrybutów nie potrzebują wyników Workera, więc Worker w tych przykładach jeszcze nie odpowiedział.
import { describe, expect, it } from 'vitest'
import { catalogView } from '../../../src/features/catalog/catalogTabModel'
import type { CatalogFilterState } from '../../../src/services/catalogFilters'
import { KLASYKI, filtersWith, names, ready, renderMessages, spaces, viewInput, visibleText } from './helpers'

const EMPTY_NOTE = 'Żaden obiekt nie spełnia filtrów.'

const viewWith = (filters: CatalogFilterState) => catalogView(viewInput({ filters }))

describe('liczba wyników', () => {
  it('P2: bez filtrów → „16 516 z 16 516 obiektów”, bez komunikatu o pustej liście', () => {
    const view = catalogView(viewInput())
    expect(spaces(view.count)).toBe('16 516 z 16 516 obiektów')
    expect(view.objects).toHaveLength(16_516)
    expect(view.emptyNote).toBeNull()
  })

  it('P2: liczby w formacie pl-PL: „16 516” z odstępem, „2137” bez odstępu', () => {
    const count = catalogView(viewInput({ filters: filtersWith({ types: ['dark_nebula'] }) })).count ?? ''
    expect(count).toMatch(/^2137 z 16\s516 obiektów$/)
  })

  it('P3: typ „mgławica ciemna” → „2137 z 16 516 obiektów”', () => {
    const view = viewWith(filtersWith({ types: ['dark_nebula'] }))
    expect(spaces(view.count)).toBe('2137 z 16 516 obiektów')
    expect(view.objects).toHaveLength(2137)
    expect(view.objects.every((object) => object.type === 'dark_nebula')).toBe(true)
  })

  it.each([
    ['typ galaktyka', '10 522 z 16 516 obiektów', filtersWith({ types: ['galaxy'] })],
    ['typy galaktyka i mgławica ciemna naraz', '12 659 z 16 516 obiektów', filtersWith({ types: ['galaxy', 'dark_nebula'] })],
    ['katalogi NGC i IC naraz', '12 516 z 16 516 obiektów', filtersWith({ catalogs: ['NGC', 'IC'] })],
    ['katalog M', '108 z 16 516 obiektów', filtersWith({ catalogs: ['M'] })],
    ['gwiazdozbiór Cep', '400 z 16 516 obiektów', filtersWith({ constellation: 'Cep' })],
  ] as const)('P2: %s → „%s”', (_, expected, filters) => {
    expect(spaces(viewWith(filters).count)).toBe(expected)
  })

  it('P2: M to liczba obiektów wczytanego katalogu: „Klasyki” → „26 z 26 obiektów”, typ galaktyka → „4 z 26 obiektów”', () => {
    expect(catalogView(viewInput({ catalog: ready(KLASYKI) })).count).toBe('26 z 26 obiektów')
    const galaxies = catalogView(viewInput({ catalog: ready(KLASYKI), filters: filtersWith({ types: ['galaxy'] }) }))
    expect(galaxies.count).toBe('4 z 26 obiektów')
    expect([...names(galaxies.objects)].sort()).toEqual(['M 101', 'M 31', 'M 33', 'M 81'])
  })
})

describe('pusta lista', () => {
  it('P4: filtry, przy których nic nie zostaje (katalog M i typ mgławica ciemna) → „0 z 16 516 obiektów” i „Żaden obiekt nie spełnia filtrów.”', () => {
    const view = viewWith(filtersWith({ catalogs: ['M'], types: ['dark_nebula'] }))
    expect(spaces(view.count)).toBe('0 z 16 516 obiektów')
    expect(view.objects).toEqual([])
    expect(view.emptyNote).toBe(EMPTY_NOTE)
  })

  it('P4: inny zestaw bez wyników (gwiazdozbiór Cep i typ gromada kulista) → „0 z 16 516 obiektów” i ten sam komunikat', () => {
    const view = viewWith(filtersWith({ constellation: 'Cep', types: ['globular_cluster'] }))
    expect(spaces(view.count)).toBe('0 z 16 516 obiektów')
    expect(view.emptyNote).toBe(EMPTY_NOTE)
  })

  it('P4: przy jednym obiekcie na liście nie ma komunikatu', () => {
    const view = catalogView(viewInput({ catalog: ready(KLASYKI), filters: filtersWith({ types: ['open_cluster'] }) }))
    expect(names(view.objects)).toEqual(['M 45'])
    expect(view.count).toBe('1 z 26 obiektów')
    expect(view.emptyNote).toBeNull()
  })
})

describe('komunikaty w zakładce (CatalogMessages)', () => {
  it('P2: zakładka pokazuje liczbę wyników „16 516 z 16 516 obiektów”', () => {
    expect(visibleText(renderMessages(catalogView(viewInput())))).toContain('16 516 z 16 516 obiektów')
  })

  it('P4: zakładka pokazuje „0 z 16 516 obiektów” i „Żaden obiekt nie spełnia filtrów.”', () => {
    const text = visibleText(renderMessages(viewWith(filtersWith({ catalogs: ['M'], types: ['dark_nebula'] }))))
    expect(text).toContain('0 z 16 516 obiektów')
    expect(text).toContain(EMPTY_NOTE)
  })

  it('P3: przy niepustej liście zakładka nie pokazuje komunikatu o pustej liście', () => {
    const text = visibleText(renderMessages(viewWith(filtersWith({ types: ['dark_nebula'] }))))
    expect(text).toContain('2137 z 16 516 obiektów')
    expect(text).not.toContain(EMPTY_NOTE)
  })
})
