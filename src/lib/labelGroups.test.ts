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

it('mały wachlarz ma jedną stronę, z góry na dół', () => {
  const { radius, spokes } = fanLayout(4, 16)
  expect(radius).toBe(40)
  expect(spokes.every((s) => !s.left)).toBe(true)
  expect(spokes.map((s) => s.angle)).toEqual([...spokes.map((s) => s.angle)].sort((a, b) => a - b))
  expect(spokes[0].angle).toBeGreaterThan(-FAN_HALF)
  expect(spokes[3].angle).toBeLessThan(FAN_HALF)
  // Ciasno wokół poziomu: sąsiednie ramiona o jeden wiersz, a nie rozrzucone po całym rozwarciu.
  expect((spokes[1].angle - spokes[0].angle) * radius).toBeCloseTo(16)
  expect(spokes[0].angle + spokes[3].angle).toBeCloseTo(0)
})

it('duży wachlarz dzieli ramiona na dwie strony i trzyma odstęp wierszy', () => {
  const pitch = 16
  const { radius, spokes } = fanLayout(34, pitch)
  expect(spokes.filter((s) => !s.left)).toHaveLength(17)
  expect(spokes.filter((s) => s.left)).toHaveLength(17)
  // Sąsiednie ramiona tej samej strony: łuk na promieniu początku tekstu nie krótszy niż wiersz.
  for (let i = 1; i < spokes.length; i++) {
    if (spokes[i].left !== spokes[i - 1].left) continue
    expect((spokes[i].angle - spokes[i - 1].angle) * radius).toBeGreaterThanOrEqual(pitch - 1e-9)
  }
  // Zgodnie z ruchem wskazówek zegara: lewa strona zaczyna na dole (sin > 0) i kończy na górze.
  const left = spokes.filter((s) => s.left)
  expect(Math.sin(left[0].angle)).toBeGreaterThan(0)
  expect(Math.sin(left[16].angle)).toBeLessThan(0)
  expect(left.every((s) => Math.cos(s.angle) < 0)).toBe(true)
})

it('odmienia liczbę obiektów', () => {
  expect([1, 2, 4, 5, 12, 14, 22, 25, 34, 112].map(objectCount)).toEqual(['1 obiekt', '2 obiekty', '4 obiekty', '5 obiektów', '12 obiektów', '14 obiektów', '22 obiekty', '25 obiektów', '34 obiekty', '112 obiektów'])
})

it('zakres odległości pokazuje wspólną jednostkę raz', () => {
  expect(fmtDistanceRange(265e6, 496e6)).toBe('265–496 mln lś')
  expect(fmtDistanceRange(300e6, 300.2e6)).toBe('300 mln lś')
  expect(fmtDistanceRange(900, 2.5e6)).toBe('900 lś – 2,5 mln lś')
})
