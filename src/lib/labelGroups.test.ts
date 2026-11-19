import { expect, it } from 'vitest'
import { fmtDistanceRange } from './format'
import { FAN_HALF, fanLayout, objectCount, overlapGroups } from './labelGroups'

const box = (left: number, top: number, width = 100, height = 37) => ({ left, top, right: left + width, bottom: top + height })

it('łączy nakładające się ramki w grupy, także łańcuchem, a osobne zostawia pojedynczo', () => {
  const groups = overlapGroups([box(0, 0), box(300, 0), box(60, 20), box(120, 40), box(300, 200), box(100, 37)])
  // 0–2–3 łańcuchem; 5 styka się z 0 tylko krawędzią, ale nakłada z 2.
  expect(groups).toEqual([[0, 2, 3, 5], [1], [4]])
  expect(overlapGroups([])).toEqual([])
})

it('stykające się krawędziami ramki nie tworzą grupy', () => {
  expect(overlapGroups([box(0, 0), box(100, 0), box(0, 37)])).toEqual([[0], [1], [2]])
})

it.each([1, 2, 4, 5, 10])('mały wachlarz (%i) ma tylko lewą stronę, z dołu do góry', (count) => {
  const pitch = 30
  const width = 220
  const { radius, pivotShift, spokes } = fanLayout(count, pitch, width)
  expect(spokes).toHaveLength(count)
  expect(spokes.every((s) => s.left)).toBe(true)
  expect(spokes.map((s) => s.angle)).toEqual([...spokes.map((s) => s.angle)].sort((a, b) => a - b))
  expect(spokes[0].angle).toBeGreaterThan(Math.PI - FAN_HALF)
  expect(spokes[count - 1].angle).toBeLessThan(Math.PI + FAN_HALF)
  expect(spokes[0].angle + spokes[count - 1].angle).toBeCloseTo(2 * Math.PI)
  expect(radius - pivotShift).toBeGreaterThanOrEqual(40 - 1e-9)
  for (let i = 1; i < spokes.length; i++) {
    const step = spokes[i].angle - spokes[i - 1].angle
    // Na zewnętrznym końcu paski leżą jeden tuż pod drugim (dokładnie `pitch`), a przy środku się nie nakładają.
    expect(step * (radius + width)).toBeCloseTo(pitch)
    expect(step * radius).toBeGreaterThanOrEqual(14 - 1e-9)
  }
})

it('po zapełnieniu lewej strony kolejny pasek rozkłada wszystkie po obu stronach', () => {
  const pitch = 30
  const width = 220
  const { radius, spokes } = fanLayout(11, pitch, width)
  const right = spokes.filter((spoke) => !spoke.left)
  const left = spokes.filter((spoke) => spoke.left)
  expect(left).toHaveLength(6)
  expect(right).toHaveLength(5)
  for (let i = 1; i < spokes.length; i++) {
    if (spokes[i].left !== spokes[i - 1].left) continue
    const step = spokes[i].angle - spokes[i - 1].angle
    expect(step * (radius + width)).toBeCloseTo(pitch)
    expect(step * radius).toBeGreaterThanOrEqual(14 - 1e-9)
  }
})

it.each([12, 14, 34, 40])('rozkłada %i ramion symetrycznie po obu stronach i trzyma stały odstęp', (count) => {
  const pitch = 30
  const width = 220
  const { radius, pivotShift, maxHalfArc, spokes } = fanLayout(count, pitch, width)
  const right = spokes.filter((spoke) => !spoke.left)
  const left = spokes.filter((spoke) => spoke.left).reverse()
  expect(left).toHaveLength(count / 2)
  expect(right).toHaveLength(count / 2)
  right.forEach((spoke, i) => expect(spoke.angle + left[i].angle).toBeCloseTo(Math.PI))
  expect(radius * Math.cos(maxHalfArc) - 5.88 * Math.sin(maxHalfArc) - pivotShift).toBeGreaterThanOrEqual(4 - 1e-9)
  for (let i = 1; i < right.length; i++) {
    expect((right[i].angle - right[i - 1].angle) * (radius + width)).toBeCloseTo(pitch)
  }
})

it('duży wachlarz przy krótkich paskach mieści się w zakresie 2 * FAN_HALF bez nakładania', () => {
  const pitch = 30
  const width = 100
  const { radius, spokes } = fanLayout(40, pitch, width)
  const right = spokes.filter((s) => !s.left)
  const left = spokes.filter((s) => s.left)
  expect(right).toHaveLength(20)
  expect(left).toHaveLength(20)
  expect(right[19].angle - right[0].angle).toBeLessThan(2 * FAN_HALF)
  for (let i = 1; i < right.length; i++) {
    const step = right[i].angle - right[i - 1].angle
    expect(step * (radius + width)).toBeCloseTo(pitch)
    expect(step * radius).toBeGreaterThanOrEqual(14 - 1e-9)
  }
  expect(Math.sin(left[0].angle)).toBeGreaterThan(0)
  expect(Math.sin(left[19].angle)).toBeLessThan(0)
  expect(left.every((s) => Math.cos(s.angle) < 0)).toBe(true)
})

it('odmienia liczbę obiektów', () => {
  expect([1, 2, 4, 5, 12, 14, 22, 25, 34, 112].map(objectCount)).toEqual(['1 obiekt', '2 obiekty', '4 obiekty', '5 obiektów', '12 obiektów', '14 obiektów', '22 obiekty', '25 obiektów', '34 obiekty', '112 obiektów'])
})

it('trzyma środkowe ramię dokładnie w odległości wallOffset od środka i obsługuje stronę prawą', () => {
  for (const count of [2, 5, 10]) {
    const left = fanLayout(count, 30, 180, { wallOffset: 54, side: 'left' })
    expect(left.radius - left.pivotShift).toBeCloseTo(54, 9)
    expect(left.spokes.every((s) => s.left)).toBe(true)

    const right = fanLayout(count, 30, 180, { wallOffset: 54, side: 'right' })
    expect(right.radius - right.pivotShift).toBeCloseTo(54, 9)
    expect(right.spokes.every((s) => !s.left)).toBe(true)
    expect(right.spokes.map((s) => s.angle)).toEqual([...right.spokes.map((s) => s.angle)].sort((a, b) => a - b))
    expect(right.spokes[0].angle + right.spokes[count - 1].angle).toBeCloseTo(0, 9)
  }
  const both = fanLayout(12, 30, 180, { wallOffset: 54 })
  expect(both.radius - both.pivotShift).toBeCloseTo(54, 9)
})

it('zakres odległości pokazuje wspólną jednostkę raz', () => {
  expect(fmtDistanceRange(265e6, 496e6)).toBe('265–496 mln lś')
  expect(fmtDistanceRange(300e6, 300.2e6)).toBe('300 mln lś')
  expect(fmtDistanceRange(900, 2.5e6)).toBe('900 lś – 2,5 mln lś')
})
