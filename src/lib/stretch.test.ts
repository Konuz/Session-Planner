import { describe, expect, it } from 'vitest'
import { DEFAULT_LEVELS, gammaToSlider, histogram, isDefaultLevels, levelsLut, normalizeLevels, sliderToGamma, tableValues } from './stretch'

describe('poziomy zdjęcia kadru', () => {
  it('domyślne ustawienia nie zmieniają pikseli', () => {
    const lut = levelsLut(DEFAULT_LEVELS)
    for (let x = 0; x < 256; x++) expect(lut[x]).toBe(x)
    expect(isDefaultLevels(normalizeLevels(undefined))).toBe(true)
  })

  it('obcina poniżej czerni i powyżej bieli, liniowo pomiędzy', () => {
    const lut = levelsLut({ black: 20, white: 120, gamma: 1 })
    expect(lut[0]).toBe(0)
    expect(lut[20]).toBe(0)
    expect(lut[70]).toBe(128)
    expect(lut[120]).toBe(255)
    expect(lut[200]).toBe(255)
  })

  it('gamma powyżej 1 rozjaśnia środek, poniżej 1 przyciemnia', () => {
    expect(levelsLut({ gamma: 2 })[128]).toBeGreaterThan(170)
    expect(levelsLut({ gamma: 0.5 })[128]).toBeLessThan(80)
  })

  it('krzywa jest niemalejąca', () => {
    const lut = levelsLut({ black: 10, white: 90, gamma: 3 })
    for (let x = 1; x < 256; x++) expect(lut[x]).toBeGreaterThanOrEqual(lut[x - 1])
  })

  it('poprawia złe zapisane wartości (biel ≤ czerń, NaN, gamma poza zakresem)', () => {
    expect(normalizeLevels({ black: 100, white: 50, gamma: 9 })).toEqual({ black: 100, white: 101, gamma: 5 })
    expect(normalizeLevels({ black: Number.NaN, white: 300, gamma: 0 })).toEqual({ black: 0, white: 255, gamma: 0.2 })
    expect(normalizeLevels({ black: 255 })).toEqual({ black: 254, white: 255, gamma: 1 })
    const lut = levelsLut({ black: 100, white: 50 })
    expect(lut[100]).toBe(0)
    expect(lut[101]).toBe(255)
  })

  it('tableValues daje n punktów w 0–1 zgodnych z krzywą', () => {
    const v = tableValues({ black: 0, white: 255, gamma: 1 }, 3).split(' ').map(Number)
    expect(v).toEqual([0, 0.5, 1])
    expect(tableValues(DEFAULT_LEVELS).split(' ')).toHaveLength(256)
  })

  it('histogram liczy luminancję i pomija przezroczyste piksele', () => {
    const px = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255, 255, 0, 0, 255, 9, 9, 9, 0])
    const h = histogram(px)
    expect(h[0]).toBe(1)
    expect(h[255]).toBe(1)
    expect(h[54]).toBe(1)
    expect(h.reduce((a, b) => a + b, 0)).toBe(3)
  })

  it('suwak gammy w skali logarytmicznej ma gammę 1 w środku', () => {
    expect(sliderToGamma(500)).toBe(1)
    expect(sliderToGamma(0)).toBe(0.2)
    expect(sliderToGamma(1000)).toBe(5)
    expect(gammaToSlider(1)).toBe(500)
    expect(sliderToGamma(gammaToSlider(2))).toBeCloseTo(2, 1)
  })
})
