// Kolory karty (P11): kolor typu z tokenów sekcji 8, trzy nowe tokeny odznak w obu paletach; w Red Mode każdy kolor
// karty pochodzi z palety czerwonej (G = 0, B = 0) [T15].
import { describe, expect, it } from 'vitest'
import { colorTokens, darkCosmos, redMode, themeVariables, tokenVariable, type ColorToken } from '../../../src/theme/tokens'
import type { DsoObject, DsoType } from '../../../src/types'
import {
  HCG79,
  IC1090,
  LDN1235,
  M13,
  M31,
  M42,
  M45,
  M57,
  NGC7000,
  SECTION_8_TOKENS,
  SIMEIS147,
  VDB141,
  adviceFor,
  cardOf,
  cardWith,
  channels,
  givenSummary,
} from './helpers'

/** Kolor typu z P11 i obiekt katalogu każdego typu. */
const TYPE_COLORS: readonly (readonly [DsoType, ColorToken, DsoObject])[] = [
  ['galaxy', 'galaxy', M31],
  ['galaxy_group', 'galaxy', HCG79],
  ['emission_nebula', 'emissionNebula', NGC7000],
  ['supernova_remnant', 'emissionNebula', SIMEIS147],
  ['cluster_nebula', 'emissionNebula', M42],
  ['reflection_nebula', 'reflectionNebula', VDB141],
  ['dark_nebula', 'darkNebula', LDN1235],
  ['planetary_nebula', 'planetaryNebula', M57],
  ['open_cluster', 'cluster', M45],
  ['globular_cluster', 'cluster', M13],
  ['other', 'muted', IC1090],
]

/** Tokeny odznak z modelu karty: odznaka zielona, żółta i czerwona. */
function badgeTokens(): { green: ColorToken; yellow: ColorToken; red: ColorToken } {
  const { badges } = cardWith(M31, givenSummary(), adviceFor(['green', 'yellow', 'red', 'green', 'yellow', 'red', 'green']))
  const tokenOf = (color: string) => {
    const badge = badges.find((item) => item.color === color)
    if (!badge) throw new Error(`Brak odznaki w kolorze ${color}`)
    return badge.colorToken
  }
  return { green: tokenOf('green'), yellow: tokenOf('yellow'), red: tokenOf('red') }
}

describe('kolor typu z tokenów sekcji 8', () => {
  it.each(TYPE_COLORS)('P11: typ %s → token %s', (type, token, object) => {
    expect(object.type).toBe(type)
    expect(cardOf(object).typeColor).toBe(token)
  })

  it('P11: galaktyka i grupa galaktyk fiolet; emisyjna, SNR i gromada z mgławicą szkarłat; inny obiekt – tekst pomocniczy', () => {
    expect(darkCosmos[cardOf(M31).typeColor]).toBe('#A78BFA')
    expect(darkCosmos[cardOf(HCG79).typeColor]).toBe('#A78BFA')
    expect(darkCosmos[cardOf(NGC7000).typeColor]).toBe('#F43F5E')
    expect(darkCosmos[cardOf(SIMEIS147).typeColor]).toBe('#F43F5E')
    expect(darkCosmos[cardOf(M42).typeColor]).toBe('#F43F5E')
    expect(darkCosmos[cardOf(VDB141).typeColor]).toBe('#60A5FA')
    expect(darkCosmos[cardOf(LDN1235).typeColor]).toBe('#F59E0B')
    expect(darkCosmos[cardOf(M57).typeColor]).toBe('#2DD4BF')
    expect(darkCosmos[cardOf(M45).typeColor]).toBe('#FACC15')
    expect(darkCosmos[cardOf(M13).typeColor]).toBe('#FACC15')
    expect(darkCosmos[cardOf(IC1090).typeColor]).toBe(darkCosmos.muted)
  })

  it('P11: w Red Mode kolor każdego typu ma G = 0 i B = 0 [T15]', () => {
    for (const [, , object] of TYPE_COLORS) {
      const [, g, b, a] = channels(redMode[cardOf(object).typeColor])
      expect([g, b, a], object.uid).toEqual([0, 0, 1])
    }
  })
})

describe('tokeny odznak (zielony, żółty, czerwony)', () => {
  it('P11: trzy różne, nowe tokeny w `colorTokens`, spoza tabeli sekcji 8', () => {
    const tokens = Object.values(badgeTokens())
    expect(new Set(tokens).size).toBe(3)
    for (const token of tokens) {
      expect(colorTokens).toContain(token)
      expect(SECTION_8_TOKENS).not.toContain(token)
    }
  })

  it('P11: w Red Mode tokeny odznak mają G = 0, B = 0 i pełne krycie [T15]', () => {
    for (const token of Object.values(badgeTokens())) {
      const [, g, b, a] = channels(redMode[token])
      expect([g, b, a], token).toEqual([0, 0, 1])
    }
  })

  it('P11: w Dark Cosmos zielony ma przewagę G, czerwony przewagę R, żółty R i G większe od B', () => {
    const { green, yellow, red } = badgeTokens()
    const [gR, gG, gB] = channels(darkCosmos[green])
    expect(gG).toBeGreaterThan(gR)
    expect(gG).toBeGreaterThan(gB)
    const [rR, rG, rB] = channels(darkCosmos[red])
    expect(rR).toBeGreaterThan(rG)
    expect(rR).toBeGreaterThan(rB)
    const [yR, yG, yB] = channels(darkCosmos[yellow])
    expect(yR).toBeGreaterThan(yB)
    expect(yG).toBeGreaterThan(yB)
  })

  it('P11: klasa red-mode przełącza zmienne CSS tokenów odznak na paletę czerwoną', () => {
    const variables = themeVariables()
    for (const token of Object.values(badgeTokens())) {
      expect(variables[':root'][tokenVariable(token)]).toBe(darkCosmos[token])
      expect(variables['html.red-mode'][tokenVariable(token)]).toBe(redMode[token])
    }
  })
})
