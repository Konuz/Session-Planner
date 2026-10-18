// P5–P7: komunikat o obniżonym progu albo braku okna ze stanu nocy w odpowiedzi Workera [T6, AC4]; teksty `darknessNote`.
// Odpowiedzi liczy prawdziwy silnik Workera (żądania z `buildCatalogRequest`).
import { describe, expect, it } from 'vitest'
import { catalogView } from '../../../src/features/catalog/catalogTabModel'
import { at } from '../../../src/test/fixtures'
import { buildCatalogRequest } from '../../../src/workers/catalogMessages'
import {
  CATALOG,
  FLAT,
  JUN_21,
  NORTH,
  OCT_16,
  SCREEN,
  MY_SET,
  SETTINGS,
  T9_OBJECTS,
  cardContext,
  elementsOf,
  filtersWith,
  parseMarkup,
  ready,
  renderList,
  renderMessages,
  settingsWith,
  spaces,
  textOf,
  viewInput,
  visibleText,
  workerResult,
} from './helpers'

describe('noc 21/22.06.2026 na 52,0°N, próg −18° z obniżaniem [T6]', () => {
  it('P5: komunikat „Brak okna przy progu −18°; użyto progu −12°.”', () => {
    const tonight = workerResult(FLAT, JUN_21)
    const view = catalogView(viewInput({ catalog: ready(T9_OBJECTS), nightDate: JUN_21, tonight }))
    expect(view.darknessNote).toBe('Brak okna przy progu −18°; użyto progu −12°.')
    expect(view.status).toBeNull()
    expect(visibleText(renderMessages(view))).toContain('Brak okna przy progu −18°; użyto progu −12°.')
  })

  // Reguła `darknessNote` (teksty bez zmian): komunikat podaje próg wybrany w parametrach i próg użyty.
  it('P5: wybrany próg −15° z obniżaniem → „Brak okna przy progu −15°; użyto progu −12°.” (darknessNote)', () => {
    const settings = settingsWith({ darknessThresholdDeg: -15 })
    const tonight = workerResult(FLAT, JUN_21, T9_OBJECTS, settings)
    const view = catalogView(viewInput({ catalog: ready(T9_OBJECTS), nightDate: JUN_21, settings, tonight }))
    expect(view.darknessNote).toBe('Brak okna przy progu −15°; użyto progu −12°.')
  })

  it('P5: próg −18° bez obniżania → „Brak okna ciemności przy progu −18°.” (darknessNote)', () => {
    const settings = settingsWith({ autoLowerThreshold: false })
    const tonight = workerResult(FLAT, JUN_21, T9_OBJECTS, settings)
    const view = catalogView(viewInput({ catalog: ready(T9_OBJECTS), nightDate: JUN_21, settings, tonight }))
    expect(view.darknessNote).toBe('Brak okna ciemności przy progu −18°.')
  })
})

describe('noc 21/22.06.2026 na 54,83°N: brak okna [T6, AC4]', () => {
  const tonight = () => workerResult(NORTH, JUN_21, CATALOG)

  it('P6: komunikat „Brak okna ciemności nawet przy progu −12°.”', () => {
    const view = catalogView(viewInput({ nightDate: JUN_21, tonight: tonight() }))
    expect(view.darknessNote).toBe('Brak okna ciemności nawet przy progu −12°.')
    expect(visibleText(renderMessages(view))).toContain('Brak okna ciemności nawet przy progu −12°.')
  })

  it('P6: „Widoczne w wybraną noc” → „0 z 16 516 obiektów”', () => {
    const view = catalogView(viewInput({ nightDate: JUN_21, tonight: tonight(), filters: filtersWith({ visibleTonight: true }) }))
    expect(view.objects).toEqual([])
    expect(spaces(view.count)).toBe('0 z 16 516 obiektów')
  })

  it('P6: bez filtra „Widoczne” lista ma cały katalog, a karty pokazują „brak okna przy progu −12°”', () => {
    const response = tonight()
    const view = catalogView(viewInput({ nightDate: JUN_21, tonight: response }))
    expect(spaces(view.count)).toBe('16 516 z 16 516 obiektów')
    const params = buildCatalogRequest({ location: NORTH, nightDate: JUN_21, settings: SETTINGS })
    const markup = renderList({
      objects: view.objects,
      results: view.results,
      context: cardContext(params, at('2026-06-22 00:00', 'CEST')),
      profile: MY_SET,
      moonRules: SETTINGS.moonRules,
      initialRect: SCREEN,
    })
    const cards = elementsOf(parseMarkup(markup)).filter((element) => element.tag === 'article')
    expect(cards.length).toBeGreaterThan(0)
    for (const card of cards) expect(textOf(card)).toContain('brak okna przy progu −12°')
  })
})

describe('noc 16/17.10.2026 na 52,0°N', () => {
  it('P7: brak komunikatu o progu', () => {
    const tonight = workerResult(FLAT, OCT_16)
    const view = catalogView(viewInput({ catalog: ready(T9_OBJECTS), tonight }))
    expect(view.darknessNote).toBeNull()
    expect(view.status).toBeNull()
    const text = visibleText(renderMessages(view))
    expect(text).not.toContain('Brak okna')
    expect(text).not.toContain('użyto progu')
  })
})
