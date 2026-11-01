import { describe, expect, it } from 'vitest'
import { baseAt, baseInverse, DEFAULT_LEVELS, gammaToSlider, histogram, isDefaultLevels, levelsLut, makeCurve, makeTransfer, normalizeLevels, normalizePoints, sliderToGamma, tableValues } from './stretch'

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

  it('krzywa bez punktów jest prosta, a z punktami przechodzi przez nie', () => {
    const line = makeCurve(undefined)
    for (const u of [0, 0.25, 0.5, 1]) expect(line(u)).toBeCloseTo(u, 10)
    const c = makeCurve([[0.2, 0.5], [0.6, 0.8]])
    expect(c(0)).toBe(0)
    expect(c(0.2)).toBeCloseTo(0.5, 10)
    expect(c(0.6)).toBeCloseTo(0.8, 10)
    expect(c(1)).toBe(1)
  })

  it('krzywa przez rosnące punkty jest niemalejąca i nie wychodzi poza 0–1 (bez przestrzeleń)', () => {
    const c = makeCurve([[0.05, 0.6], [0.1, 0.62], [0.9, 0.63]])
    let prev = 0
    for (let k = 0; k <= 1000; k++) {
      const v = c(k / 1000)
      expect(v).toBeGreaterThanOrEqual(prev - 1e-12)
      expect(v).toBeLessThanOrEqual(1)
      prev = v
    }
  })

  it('punkty krzywej działają po poziomach, a odwrotność poziomów trafia w to samo wejście', () => {
    const l = normalizeLevels({ black: 20, white: 200, gamma: 2, points: [[0.5, 0.9]] })
    const x = baseInverse(l, 0.5)
    expect(baseAt(l, x)).toBeCloseTo(0.5, 10)
    expect(makeTransfer(l)(x)).toBeCloseTo(0.9, 10)
    expect(levelsLut(l)[10]).toBe(0)
    expect(levelsLut(l)[230]).toBe(255)
    expect(isDefaultLevels(normalizeLevels({ points: [[0.5, 0.5]] }))).toBe(false)
  })

  it('porządkuje zapisane punkty: sortuje, obcina do 0–1, usuwa zbyt bliskie, końce i śmieci', () => {
    expect(normalizePoints([[0.7, 1.4], [0.3, 0.2], [0.305, 0.9], 'x', [0, 0.5], [0.999, 0.1], [Number.NaN, 0.1]])).toEqual([[0.3, 0.2], [0.7, 1]])
    expect(normalizePoints(undefined)).toEqual([])
    expect(normalizeLevels({ points: [] })).toEqual(DEFAULT_LEVELS)
  })
})
