// P1, P4: przycisk na karcie w katalogu otwiera obiekt tej karty na wykresie nocy. CatalogList podaje każdej karcie
// (`ObjectCard`) właściwość `onShowOnNight`, która wywołuje akcję stanu `openObject(uid)` dla obiektu karty.
// Karta jest tu podmieniona na atrapę, która zapisuje właściwości z renderu listy; test wywołuje zapisane
// `onShowOnNight` (kliknięcie samego przycisku karty sprawdza card.test.ts) i patrzy na stan aplikacji.
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CatalogListProps } from '../../../src/features/catalog/CatalogList'
import type { ObjectCardProps } from '../../../src/features/catalog/ObjectCard'
import type { DsoObject } from '../../../src/types'
import {
  M13,
  M31,
  M42,
  MY_SET,
  SCREEN,
  cardContext,
  nightPlaceCursor,
  prepareCatalogTab,
  startApp,
  summaries,
} from './helpers'

const rendered = vi.hoisted(() => {
  const cards: { primary: string; onShowOnNight: unknown }[] = []
  return {
    cards,
    record: (props: ObjectCardProps) => {
      cards.push({ primary: props.card.primary, onShowOnNight: props.onShowOnNight })
      return null
    },
  }
})

vi.mock('../../../src/features/catalog/ObjectCard', () => ({ ObjectCard: rendered.record }))

beforeEach(() => {
  rendered.cards.length = 0
})

afterEach(() => {
  vi.unstubAllGlobals()
})

/** Aplikacja na zakładce Katalog (noc 16/17.10.2026, lokalizacja demonstracyjna, kursor 01:30 CEST) z listą `objects`. */
async function catalogWith(objects: readonly DsoObject[]) {
  const app = await startApp()
  prepareCatalogTab(app.store)
  const props: CatalogListProps = {
    objects,
    results: summaries(objects),
    context: cardContext(),
    profile: MY_SET,
    moonRules: app.store.getState().planningSettings.moonRules,
    initialRect: SCREEN,
  }
  app.render(createElement(app.CatalogList, props))
  return app
}

/** „Kliknięcie” przycisku karty o oznaczeniu `primary`: wywołanie `onShowOnNight` podanego karcie przez listę. */
function showOnNight(primary: string): void {
  const found = rendered.cards.filter((card) => card.primary === primary)
  expect(found, `karty ${primary} na liście`).toHaveLength(1)
  const { onShowOnNight } = found[0]
  if (typeof onShowOnNight !== 'function') throw new Error(`Karta ${primary} nie dostała onShowOnNight od listy`)
  ;(onShowOnNight as () => void)()
}

describe('przycisk na karcie w katalogu', () => {
  it('P1: karta M 13 w katalogu → przycisk → zakładka Noc z M 13; noc, lokalizacja i kursor czasu bez zmian', async () => {
    const app = await catalogWith([M31, M13, M42])
    const before = nightPlaceCursor(app.store.getState())
    expect(rendered.cards.map((card) => card.primary)).toEqual(['M 31', 'M 13', 'M 42'])

    showOnNight('M 13')

    expect(app.store.getState().tab).toBe('night')
    expect(app.store.getState().objectUid).toBe('NGC6205')
    expect(nightPlaceCursor(app.store.getState())).toEqual(before)
  })

  it('P1: przyciski różnych kart otwierają swoje obiekty: M 42 → NGC1976, potem M 13 → NGC6205', async () => {
    const app = await catalogWith([M42, M31, M13])
    showOnNight('M 42')
    expect(app.store.getState()).toMatchObject({ tab: 'night', objectUid: 'NGC1976' })

    app.store.getState().setTab('catalog')
    showOnNight('M 13')
    expect(app.store.getState()).toMatchObject({ tab: 'night', objectUid: 'NGC6205' })
  })

  it('P4: karta M 31 (jest w „Klasyki”) → przycisk → zakładka Noc, objectUid NGC224', async () => {
    const app = await catalogWith([M13, M42, M31])
    showOnNight('M 31')
    expect(app.store.getState()).toMatchObject({ tab: 'night', objectUid: 'NGC224' })
  })
})
