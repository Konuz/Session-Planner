import { describe, expect, it } from 'vitest'
import { moonLitPath } from './MoonDisc'

const parse = (d: string) => d.match(/-?\d+(\.\d+)?/g)!.map(Number)

describe('moonLitPath', () => {
  it('przy nowiu nie tworzy oświetlonego sierpa przy brzegu', () => {
    expect(moonLitPath(0, true)).toBe('')
    expect(moonLitPath(0, false)).toBe('')
  })

  it('półoś terminatora rośnie płynnie z |1 − 2k|', () => {
    // M cx y0 A R R 0 0 lit cx y1 L cx y2 A rx r 0 0 sweep cx y3 Z
    expect(parse(moonLitPath(0.5, true))[11]).toBe(0)
    expect(parse(moonLitPath(0.05, true))[11]).toBeCloseTo(0.9 * 255)
    expect(parse(moonLitPath(0.95, true))[11]).toBeCloseTo(0.9 * 255)
    expect(parse(moonLitPath(0.31, true))[11]).toBeGreaterThan(parse(moonLitPath(0.32, true))[11])
  })

  it('przybywający oświetla prawy brzeg, ubywający lewy; garb odwraca terminator', () => {
    const flags = (k: number, waxing: boolean) => { const n = parse(moonLitPath(k, waxing)); return [n[6], n[15]] }
    expect(flags(0.3, true)).toEqual([1, 0])
    expect(flags(0.7, true)).toEqual([1, 1])
    expect(flags(0.3, false)).toEqual([0, 1])
    expect(flags(0.7, false)).toEqual([0, 0])
  })
})
