import { describe, expect, it } from 'vitest'
import type { HorizonPoint } from '../../types'
import { addHorizonPoint, moveHorizonPoint, nearestIndex, removeHorizonPoint } from './horizonEditorModel'

const points = (pairs: [number, number][]): HorizonPoint[] => pairs.map(([azDeg, altDeg]) => ({ azDeg, altDeg }))
const HORIZON = points([[0, 12], [90, 15], [180, 8], [270, 18]])

describe('dodawanie punktu', () => {
  it('punkt trafia na miejsce według azymutu; wartości zaokrąglone do 1°', () => {
    expect(addHorizonPoint(HORIZON, { azDeg: 127.4, altDeg: 30.6 })).toEqual(points([[0, 12], [90, 15], [127, 31], [180, 8], [270, 18]]))
  })

  it('ten sam azymut zastępuje wysokość (wygrywa ostatni wpis)', () => {
    expect(addHorizonPoint(HORIZON, { azDeg: 90.2, altDeg: 40 })).toEqual(points([[0, 12], [90, 40], [180, 8], [270, 18]]))
  })

  it('azymut 360 → 0; wysokość przycięta do [−5, 90]', () => {
    expect(addHorizonPoint([], { azDeg: 359.8, altDeg: 95 })).toEqual(points([[0, 90]]))
    expect(addHorizonPoint([], { azDeg: 200, altDeg: -12 })).toEqual(points([[200, -5]]))
  })
})

describe('przeciąganie punktu', () => {
  it('przesuwa punkt i zaokrągla do 1°', () => {
    expect(moveHorizonPoint(HORIZON, 1, { azDeg: 100.4, altDeg: 22.2 })).toEqual(points([[0, 12], [100, 22], [180, 8], [270, 18]]))
  })

  it('azymut zostaje między sąsiadami, więc kolejność punktów się nie zmienia', () => {
    expect(moveHorizonPoint(HORIZON, 1, { azDeg: 250, altDeg: 15 })[1]).toEqual({ azDeg: 179, altDeg: 15 })
    expect(moveHorizonPoint(HORIZON, 1, { azDeg: -30, altDeg: 15 })[1]).toEqual({ azDeg: 1, altDeg: 15 })
  })

  it('pierwszy punkt nie schodzi poniżej 0°, ostatni nie przekracza 359°', () => {
    expect(moveHorizonPoint(HORIZON, 0, { azDeg: -10, altDeg: 12 })[0]).toEqual({ azDeg: 0, altDeg: 12 })
    expect(moveHorizonPoint(HORIZON, 3, { azDeg: 365, altDeg: 18 })[3]).toEqual({ azDeg: 359, altDeg: 18 })
  })

  it('sąsiedzi bliżej niż 2° (ułamkowe azymuty z pliku): zmienia się tylko wysokość', () => {
    const close = points([[10, 5], [10.5, 6], [11, 7]])
    expect(moveHorizonPoint(close, 1, { azDeg: 40, altDeg: 9 })[1]).toEqual({ azDeg: 10.5, altDeg: 9 })
  })

  it('wysokość przycięta do [−5, 90]', () => {
    expect(moveHorizonPoint(HORIZON, 2, { azDeg: 180, altDeg: 120 })[2]).toEqual({ azDeg: 180, altDeg: 90 })
    expect(moveHorizonPoint(HORIZON, 2, { azDeg: 180, altDeg: -40 })[2]).toEqual({ azDeg: 180, altDeg: -5 })
  })
})

describe('usuwanie i trafianie w punkt', () => {
  it('usunięcie punktu', () => {
    expect(removeHorizonPoint(HORIZON, 2)).toEqual(points([[0, 12], [90, 15], [270, 18]]))
  })

  it('najbliższy punkt w promieniu (w pikselach) albo −1', () => {
    const positions = [{ x: 0, y: 0 }, { x: 30, y: 0 }, { x: 60, y: 10 }]
    expect(nearestIndex(positions, 26, 4, 22)).toBe(1)
    expect(nearestIndex(positions, 45, 40, 22)).toBe(-1)
  })
})
