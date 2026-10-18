// P8: zanim Worker odpowie, zakładka pokazuje „Liczenie widoczności…”, a lista z filtrami atrybutów działa od razu [AC7];
// „bez blokowania” sprawdzane stanem „Liczenie…” z atrapą Workera („Pytania”).
// P11: wczytywanie i błąd wczytania katalogu (z „Spróbuj ponownie”), błąd Workera.
import { beforeAll, describe, expect, it } from 'vitest'
import { catalogView, requestsToSend, type CatalogView } from '../../../src/features/catalog/catalogTabModel'
import type { CatalogFilterState } from '../../../src/services/catalogFilters'
import { createCatalogClient } from '../../../src/workers/catalogClient'
import { createCatalogEngine } from '../../../src/workers/catalogEngine'
import type { CatalogWorkerResponse, ErrorResponse, ResultResponse } from '../../../src/workers/catalogMessages'
import {
  CATALOG,
  FLAT,
  FakeWorker,
  KLASYKI,
  OCT_16,
  elementsOf,
  filtersWith,
  names,
  parseMarkup,
  ready,
  renderMessages,
  spaces,
  tabState,
  textOf,
  viewInput,
  visibleText,
  workerResult,
} from './helpers'

const COMPUTING = 'Liczenie widoczności…'

/** Filtry M + galaktyka + Wielka Niedźwiedzica: M 81, M 82, M 101, M 108, M 109 (oznaczenia z katalogu). */
const UMA_GALAXIES: CatalogFilterState = filtersWith({ catalogs: ['M'], types: ['galaxy'], constellation: 'UMa' })

/**
 * Filtry katalogu, typu, gwiazdozbioru, jasności, rozmiaru i kadru (Mój zestaw: 16,2′–51,84′) i oczekiwana lista,
 * w porządku oznaczeń (bez wyników wszystkie obiekty są „bez wartości”, sortowanie P8).
 * V [mag] / wielka oś [′]: M 81 6,92 / 21,63; M 82 8,3 / 10,99; M 101 7,9 / 23,99; M 108 10,05 / 3,98; M 109 9,88 / 8,07.
 */
const ATTRIBUTE_CASES: readonly (readonly [string, CatalogFilterState, readonly string[]])[] = [
  ['katalog M, typ galaktyka, gwiazdozbiór UMa', UMA_GALAXIES, ['M 81', 'M 82', 'M 101', 'M 108', 'M 109']],
  [
    '… i jasność 0–9 mag bez obiektów bez jasności',
    { ...UMA_GALAXIES, magnitude: { min: 0, max: 9 }, showWithoutMagnitude: false },
    ['M 81', 'M 82', 'M 101'],
  ],
  ['… i rozmiar 8–30′', { ...UMA_GALAXIES, size: { min: 8, max: 30 } }, ['M 81', 'M 82', 'M 101', 'M 109']],
  ['… i „Pasuje do kadru” Mojego zestawu', { ...UMA_GALAXIES, fitsFrame: true }, ['M 81', 'M 101']],
]

/** Odpowiedź Workera na noc 16/17.10.2026 dla całego katalogu (liczona raz dla pliku). */
let fullOctober: ResultResponse

beforeAll(() => {
  fullOctober = workerResult(FLAT, OCT_16, CATALOG)
}, 120_000)

const sortedNames = (view: CatalogView) => [...names(view.objects)].sort()

describe('P8 Worker jeszcze nie odpowiedział', () => {
  it('P8: zakładka pokazuje „Liczenie widoczności…”, a karty nie mają jeszcze wyników nocy', () => {
    const view = catalogView(viewInput())
    expect(view.status).toBe(COMPUTING)
    expect(view.results).toBeNull()
    expect(view.retry).toBe(false)
    expect(visibleText(renderMessages(view))).toContain(COMPUTING)
  })

  it.each(ATTRIBUTE_CASES)('P8: lista działa od razu: %s', (_, filters, expected) => {
    const view = catalogView(viewInput({ filters }))
    expect(view.status).toBe(COMPUTING)
    expect(names(view.objects)).toEqual(expected)
    expect(spaces(view.count)).toBe(`${expected.length} z 16 516 obiektów`)
  })

  it.each(ATTRIBUTE_CASES)('P8: po odpowiedzi Workera te same obiekty: %s', (_, filters, expected) => {
    const view = catalogView(viewInput({ filters, tonight: fullOctober }))
    expect(view.status).toBeNull()
    expect(view.results).toEqual(fullOctober.objects)
    expect(sortedNames(view)).toEqual([...expected].sort())
  })

  it('P8: z atrapą Workera: przed odpowiedzią „Liczenie widoczności…” i pełna lista; po odpowiedzi wyniki nocy bez komunikatu', () => {
    const worker = new FakeWorker()
    const accepted: CatalogWorkerResponse[] = []
    const client = createCatalogClient((response) => accepted.push(response), worker)
    client.sendCatalog(KLASYKI)
    for (const params of requestsToSend(null, tabState())) client.request(params)
    const latest = (): ResultResponse | ErrorResponse | null =>
      accepted.filter((response): response is ResultResponse | ErrorResponse => response.type !== 'ready').at(-1) ?? null

    const before = catalogView(viewInput({ catalog: ready(KLASYKI), tonight: latest() }))
    expect(before.status).toBe(COMPUTING)
    expect(before.count).toBe('26 z 26 obiektów')
    expect(before.objects).toHaveLength(26)

    const engine = createCatalogEngine()
    for (const message of worker.sent) worker.reply(engine.handle(structuredClone(message)))
    const tonight = latest()
    if (tonight?.type !== 'result') throw new Error('Worker nie odpowiedział wynikiem nocy D')
    expect(tonight.objects).toHaveLength(26)

    const after = catalogView(viewInput({ catalog: ready(KLASYKI), tonight }))
    expect(after.status).toBeNull()
    expect(after.results).toEqual(tonight.objects)
    expect(after.count).toBe('26 z 26 obiektów')
    expect(visibleText(renderMessages(after))).not.toContain(COMPUTING)
  })
})

describe('P11 wczytywanie katalogu i błędy', () => {
  it('P11: katalog się wczytuje → „Wczytywanie katalogu…”, bez przycisku „Spróbuj ponownie”', () => {
    const view = catalogView(viewInput({ catalog: { status: 'loading' } }))
    expect(view.status).toBe('Wczytywanie katalogu…')
    expect(view.retry).toBe(false)
    const markup = renderMessages(view)
    expect(visibleText(markup)).toContain('Wczytywanie katalogu…')
    expect(visibleText(markup)).not.toContain('Spróbuj ponownie')
  })

  it.each(['Nie udało się wczytać katalogu (HTTP 404)', 'Failed to fetch'])(
    'P11: błąd wczytania („%s”) → komunikat z przyczyną i przycisk „Spróbuj ponownie”',
    (message) => {
      const view = catalogView(viewInput({ catalog: { status: 'error', message } }))
      expect(view.status).toContain(message)
      expect(view.retry).toBe(true)
      const markup = renderMessages(view)
      expect(visibleText(markup)).toContain(message)
      const buttons = elementsOf(parseMarkup(markup)).filter((element) => element.tag === 'button')
      const retry = buttons.filter((button) => textOf(button) === 'Spróbuj ponownie')
      expect(retry).toHaveLength(1)
      expect((retry[0].attrs.class ?? '').split(/\s+/)).toContain('button')
    },
  )

  it.each(['Katalog nie jest wczytany', 'Out of memory'])(
    'P11: odpowiedź Workera z błędem („%s”) → „Nie udało się policzyć widoczności: …” z treścią błędu',
    (message) => {
      const tonight: ErrorResponse = { type: 'error', requestId: 3, message }
      const view = catalogView(viewInput({ tonight }))
      expect(view.status).toBe(`Nie udało się policzyć widoczności: ${message}`)
      expect(view.results).toBeNull()
      expect(visibleText(renderMessages(view))).toContain(`Nie udało się policzyć widoczności: ${message}`)
    },
  )
})
