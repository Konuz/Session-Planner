// Komponent karty (render przez `renderToStaticMarkup`, bez DOM): pokazuje teksty modelu, ikonę typu z Lucide, odznaki
// ze znakiem i opisem, kolory tylko z tokenów (Red Mode) i nie importuje astronomy-engine.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { ObjectCardModel } from '../../../src/features/catalog/objectCardModel'
import type { DsoObject } from '../../../src/types'
import {
  HCG79,
  IC1090,
  LDN1235,
  M101,
  M13,
  M31,
  M42,
  M45,
  M57,
  NGC6960,
  NGC7000,
  NONE_12,
  SH2_155,
  SIMEIS147,
  VDB141,
  adviceFor,
  cardOf,
  cardWith,
  colorsOutsideTokens,
  givenSummary,
  renderCard,
  usesToken,
  visibleText,
  withMount,
} from './helpers'

/** Obiekty wszystkich jedenastu typów. */
const ALL_TYPES: readonly DsoObject[] = [M31, HCG79, NGC7000, VDB141, LDN1235, M57, SIMEIS147, M45, M13, M42, IC1090]

/** Wszystkie teksty modelu, które karta ma pokazać (pola null nie mają wiersza). */
function shownTexts(card: ObjectCardModel): string[] {
  const texts = [
    card.primary,
    card.otherDesignations,
    card.name,
    card.typeLabel,
    card.position,
    card.moonSeparation,
    card.culmination,
    card.flip,
    card.effectiveTime,
    card.minMoonSeparation,
  ]
  return texts.filter((text): text is string => text !== null)
}

describe('teksty karty', () => {
  it('P1: karta M 31 pokazuje „M 31”, „NGC 224”, „Andromeda Galaxy” i typ „galaktyka” z ikoną Lucide', () => {
    const markup = renderCard(cardOf(M31))
    const text = visibleText(markup)
    for (const expected of ['M 31', 'NGC 224', 'Andromeda Galaxy', 'galaktyka']) expect(text).toContain(expected)
    expect(markup).toMatch(/<svg[^>]*class="lucide[\s"]/)
  })

  it('P2: karta Sh2-155 pokazuje „LBN 529, C 9” i „Cave Nebula”; karta M 45 – „Mel 22” i „Pleiades”', () => {
    const sh2 = visibleText(renderCard(cardOf(SH2_155)))
    expect(sh2).toContain('LBN 529, C 9')
    expect(sh2).toContain('Cave Nebula')
    const m45 = visibleText(renderCard(cardOf(M45)))
    expect(m45).toContain('Mel 22')
    expect(m45).toContain('Pleiades')
  })

  it('P3: karta NGC 6960 pokazuje tylko pierwszą nazwę zwyczajową, „Veil Nebula”', () => {
    const text = visibleText(renderCard(cardOf(NGC6960)))
    expect(text).toContain('Veil Nebula')
    expect(text).not.toContain('Filamentary Nebula')
    expect(text).not.toContain('Western Veil')
  })

  it('P4, P5, P7, P8: karta M 31 pokazuje położenie i separację w kursorze, górowanie, przerzut, czas efektywny i separację minimalną', () => {
    const card = cardOf(M31)
    const text = visibleText(renderCard(card))
    expect(text).toContain('wysokość 79,2°, azymut 193,6°')
    expect(text).toContain('112,8°')
    for (const expected of shownTexts(card)) expect(text).toContain(expected)
    expect(text).toContain('09:39, próg −18°')
  })

  it('P6: karta M 101 pokazuje „góruje w dzień” i nie ma wiersza przerzutu', () => {
    const card = cardOf(M101)
    const text = visibleText(renderCard(card))
    expect(text).toContain('góruje w dzień')
    expect(text).toContain(card.culmination)
    expect(text).not.toContain('przerzut')
  })

  it('P6: karta M 31 dla zestawu z montażem widłowym nie ma wiersza przerzutu', () => {
    const text = visibleText(renderCard(cardOf(M31, { profile: withMount({ type: 'fork', flipMinutesAfterMeridian: 10 }) })))
    expect(text).not.toContain('przerzut')
    expect(visibleText(renderCard(cardOf(M31)))).toContain('przerzut')
  })

  it('P7, P8: karta w stanie „brak okna” pokazuje „brak okna przy progu −12°” i separację minimalną „—”', () => {
    const card = cardWith(
      M31,
      givenSummary({ darkness: NONE_12, effectiveMinutes: null, transitMs: null, highest: null, moon: null }),
    )
    const text = visibleText(renderCard(card))
    expect(text).toContain('brak okna przy progu −12°')
    expect(text).toContain('—')
  })

  it.each(ALL_TYPES.map((object) => [object.type, object] as const))(
    'P10: karta typu %s pokazuje etykietę typu z ikoną Lucide i wszystkie teksty modelu',
    (_, object) => {
      const card = cardOf(object)
      const markup = renderCard(card)
      const text = visibleText(markup)
      for (const expected of shownTexts(card)) expect(text).toContain(expected)
      expect(markup).toMatch(/<svg[^>]*class="lucide[\s"]/)
    },
  )
})

describe('odznaki na karcie', () => {
  it('P9: każda odznaka ma nazwę filtra, znak stanu (✓, !, ✗) i opis tekstowy, np. „Ha: średnie warunki”', () => {
    const card = cardWith(M31, givenSummary(), adviceFor(['green', 'green', 'green', 'green', 'yellow', 'red', 'yellow']))
    const markup = renderCard(card)
    for (const description of ['L: dobre warunki', 'Ha: średnie warunki', 'OIII: złe warunki', 'SII: średnie warunki']) {
      expect(markup).toContain(description)
    }
    for (const mark of ['✓', '!', '✗']) expect(markup).toContain(mark)
    const text = visibleText(markup)
    for (const filter of ['L', 'R', 'G', 'B', 'Ha', 'OIII', 'SII']) {
      expect(text, `nazwa filtra ${filter}`).toMatch(new RegExp(`(^|[^\\p{L}])${filter}([^\\p{L}]|$)`, 'u'))
    }
  })

  it('P9: opisy odznak są w kolejności L, R, G, B, Ha, OIII, SII', () => {
    const card = cardWith(M31, givenSummary(), adviceFor(['green', 'green', 'green', 'green', 'yellow', 'red', 'yellow']))
    const markup = renderCard(card)
    const positions = card.badges.map((badge) => markup.indexOf(badge.description))
    expect(positions.every((position) => position >= 0)).toBe(true)
    expect([...positions].sort((a, b) => a - b)).toEqual(positions)
  })

  it('P9: obiekt bez rekomendacji → karta bez odznak (bez znaków ✓ i ✗ i bez opisów warunków)', () => {
    const markup = renderCard(cardWith(M31, givenSummary(), []))
    expect(markup).not.toContain('✓')
    expect(markup).not.toContain('✗')
    expect(markup).not.toContain('warunki')
  })
})

describe('kolory karty tylko z tokenów (Red Mode)', () => {
  it.each(ALL_TYPES.map((object) => [object.type, object] as const))(
    'P11: karta typu %s używa tokenu koloru typu i nie ma kolorów spoza tokenów',
    (_, object) => {
      const card = cardOf(object)
      const markup = renderCard(card)
      expect(usesToken(markup, card.typeColor), `token ${card.typeColor}`).toBe(true)
      expect(colorsOutsideTokens(markup)).toEqual([])
    },
  )

  it('P11: odznaki używają tokenów odznak (zielony, żółty, czerwony) i nie mają kolorów spoza tokenów', () => {
    const card = cardWith(M31, givenSummary(), adviceFor(['green', 'yellow', 'red', 'green', 'yellow', 'red', 'green']))
    const markup = renderCard(card)
    for (const badge of card.badges) expect(usesToken(markup, badge.colorToken), `token ${badge.colorToken}`).toBe(true)
    expect(colorsOutsideTokens(markup)).toEqual([])
  })
})

describe('zależności komponentu', () => {
  it('komponent karty nie importuje astronomy-engine („Styk z resztą”): ObjectCard.tsx nie odwołuje się do niego', () => {
    const source = readFileSync(new URL('../../../src/features/catalog/ObjectCard.tsx', import.meta.url), 'utf8')
    expect(source).not.toMatch(/astronomy-engine/)
  })
})
