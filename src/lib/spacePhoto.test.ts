import { describe, expect, it } from 'vitest'
import { GALACTIC_LIMIT_LY } from './space3d'
import { milkyWayCone, universeCone } from './spacePhoto'

describe('milkyWayCone', () => {
  it('kończy stożek tuż za najdalszym obiektem zdjęcia w Drodze Mlecznej, nie na krawędzi dysku', () => {
    const cone = milkyWayCone([1300, 1500, 2000])
    expect(cone.farthest).toBeCloseTo(2, 9)
    expect(cone.length).toBeGreaterThan(2)
    expect(cone.length).toBeLessThan(2.5)
    expect(cone.outside).toBe(0)
  })

  it('obiekt spoza Drogi Mlecznej nie wydłuża stożka', () => {
    const cone = milkyWayCone([1300, 2000, 2.5e6, GALACTIC_LIMIT_LY])
    expect(cone.length).toBe(milkyWayCone([1300, 2000]).length)
    expect(cone.outside).toBe(2)
  })

  it('bez obiektów w Drodze Mlecznej daje krótki stożek umowny', () => {
    expect(milkyWayCone([]).length).toBe(4)
    expect(milkyWayCone([23e6, 31e6])).toEqual({ length: 4, farthest: 0, outside: 2 })
  })
})

describe('universeCone', () => {
  it('kończy stożek tuż za najdalszym znacznikiem', () => {
    expect(universeCone([96, 99.5, 101])).toBeGreaterThan(101)
    expect(universeCone([96, 99.5, 101])).toBeLessThan(115)
  })

  it('bez znaczników daje krótki stożek umowny (dawne 4 j. Wszechświata × 1/0,12)', () => {
    expect(universeCone([])).toBeCloseTo(4 / 0.12, 12)
    expect(universeCone([0])).toBeCloseTo(4 / 0.12, 12)
  })
})
