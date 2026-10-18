// P8: karta obiektu z `karta-obiektu` dostaje przycisk „Pokaż na wykresie nocy” z ikoną, tekstem i co najmniej 44 px
// wysokości. P1: kliknięcie przycisku wywołuje `onShowOnNight` karty (nowa, opcjonalna właściwość `ObjectCard`;
// CatalogList podaje tu otwarcie obiektu karty – zob. list.test.ts). Bez DOM: `onClick` przycisku przez sondę.
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ObjectCard } from '../../../src/features/catalog/ObjectCard'
import type { DsoObject } from '../../../src/types'
import {
  M13,
  M42,
  buttonWithText,
  cardModel,
  click,
  elementsOf,
  minHeightPx,
  parseMarkup,
  probe,
  textOf,
  type MarkupElement,
} from './helpers'

const LABEL = 'Pokaż na wykresie nocy'

function card(object: DsoObject, onShowOnNight: () => void = () => undefined) {
  return createElement(ObjectCard, { card: cardModel(object), onShowOnNight })
}

/** Jedyny przycisk karty o tekście „Pokaż na wykresie nocy”. */
function showButton(markup: string): MarkupElement {
  const buttons = elementsOf(parseMarkup(markup)).filter((element) => element.tag === 'button' && textOf(element) === LABEL)
  expect(buttons, `przyciski „${LABEL}”`).toHaveLength(1)
  return buttons[0]
}

describe('P8 przycisk „Pokaż na wykresie nocy”', () => {
  it('P8: karta M 13 ma przycisk z tekstem „Pokaż na wykresie nocy”', () => {
    const markup = renderToStaticMarkup(card(M13))
    expect(textOf(showButton(markup))).toBe(LABEL)
  })

  it('P8: przycisk ma ikonę (svg w przycisku)', () => {
    const button = showButton(renderToStaticMarkup(card(M13)))
    expect(elementsOf(button).some((element) => element.tag === 'svg')).toBe(true)
  })

  it('P8: przycisk ma co najmniej 44 px wysokości (klasa `button` z 2,75rem albo klasa wysokości Tailwind)', () => {
    const button = showButton(renderToStaticMarkup(card(M13)))
    expect(minHeightPx(button)).toBeGreaterThanOrEqual(44)
  })

  it('P8: karta innego obiektu (M 42) ma ten sam przycisk z ikoną i co najmniej 44 px wysokości', () => {
    const button = showButton(renderToStaticMarkup(card(M42)))
    expect(elementsOf(button).some((element) => element.tag === 'svg')).toBe(true)
    expect(minHeightPx(button)).toBeGreaterThanOrEqual(44)
  })
})

describe('P1 kliknięcie przycisku na karcie', () => {
  it('P1: kliknięcie „Pokaż na wykresie nocy” na karcie M 13 → onShowOnNight wywołane raz', () => {
    const onShowOnNight = vi.fn()
    const { props } = probe(card(M13, onShowOnNight), buttonWithText(LABEL))
    expect(onShowOnNight).not.toHaveBeenCalled()
    click(props)
    expect(onShowOnNight).toHaveBeenCalledTimes(1)
  })

  it('P1: dwie karty (M 13, M 42) → kliknięcie na karcie M 42 wywołuje tylko jej onShowOnNight', () => {
    const forM13 = vi.fn()
    const forM42 = vi.fn()
    probe(card(M13, forM13), buttonWithText(LABEL))
    click(probe(card(M42, forM42), buttonWithText(LABEL)).props)
    expect(forM42).toHaveBeenCalledTimes(1)
    expect(forM13).not.toHaveBeenCalled()
  })
})
