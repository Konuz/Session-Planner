import { expect, it } from 'vitest'
import { photoAnchorKind, circleIntersectsImage, photoColumns, photoPose, photoStageHeight, coveredPhotoCircles, type PhotoCut } from './photo'

it('uwzględnia wycinek przecinający brzeg mimo środka poza zdjęciem', () => {
  expect(circleIntersectsImage(-5, 50, 10, 100, 100)).toBe(true)
  expect(circleIntersectsImage(-15, 50, 10, 100, 100)).toBe(false)
  expect(circleIntersectsImage(-8, -8, 10, 100, 100)).toBe(false)
})

it('nie nadaje fikcyjnej głębokości obiektom bez odległości i poza skalą', () => {
  expect(photoAnchorKind(null, 'galaxy')).toBe('direction')
  expect(photoAnchorKind(2e6, 'galaxy')).toBe('outside')
  expect(photoAnchorKind(1500, 'universe')).toBe('local')
  expect(photoAnchorKind(1500, 'galaxy')).toBe('position')
  expect(photoAnchorKind(2e6, 'universe')).toBe('position')
})

it('wycinek na początku dokładnie zgadza się z fotografią, a przewijanie jest odwracalne', () => {
  const cut = { x: 200, y: 100, radius: 50 } as PhotoCut
  const frame = { x: 10, y: 20, scale: 0.5 }
  const destination = { x: 600, y: 300, radius: 40 }
  expect(photoPose(cut, frame, destination, 0)).toEqual({ x: 110, y: 70, radius: 25 })
  expect(photoPose(cut, frame, destination, 1)).toEqual(destination)
  const half = photoPose(cut, frame, destination, 0.5)
  photoPose(cut, frame, destination, 1)
  expect(photoPose(cut, frame, destination, 0.5)).toEqual(half)
  expect(cut).toEqual({ x: 200, y: 100, radius: 50 })
})

it('rozkłada wycinki zgodnie ze stroną zdjęcia i kolejnością od góry do dołu', () => {
  const cuts = [
    { id: 'prawy dolny', x: 850, y: 800 },
    { id: 'lewy dolny', x: 200, y: 700 },
    { id: 'prawy górny', x: 700, y: 100 },
    { id: 'lewy górny', x: 100, y: 200 },
  ] as PhotoCut[]
  const [left, right] = photoColumns(cuts, 1000)
  expect(left.map((c) => c.id)).toEqual(['lewy górny', 'lewy dolny'])
  expect(right.map((c) => c.id)).toEqual(['prawy górny', 'prawy dolny'])
  expect(cuts.map((c) => c.id)).toEqual(['prawy dolny', 'lewy dolny', 'prawy górny', 'lewy górny'])
})

it('zachowuje stronę również przy nierównej liczbie obiektów i na brzegu kadru', () => {
  const cuts = [
    { x: 900, y: 100 }, { x: -10, y: 200 }, { x: 500, y: 300 }, { x: 1100, y: 400 },
  ] as PhotoCut[]
  const [left, right] = photoColumns(cuts, 1000)
  expect(left.map((c) => c.x)).toEqual([-10])
  expect(right.map((c) => c.x)).toEqual([900, 500, 1100])
  expect(photoColumns([], 1000)).toEqual([[], []])
})

it('zapewnia miejsce na okręgi i podpisy przy siedmiu obiektach po jednej stronie', () => {
  const cuts = Array.from({ length: 7 }, (_, i) => ({ x: 100, y: i * 30, enabled: true })) as PhotoCut[]
  const height = photoStageHeight(cuts, 1000)
  expect(height).toBe(653)
  expect((height - 305) / 6).toBeGreaterThanOrEqual(2 * 13 + 32)
  expect(photoStageHeight([], 1000)).toBe(520)
})

it('zachowuje wysokość sceny przy zaznaczaniu i odznaczaniu wycinków po obu stronach zdjęcia', () => {
  for (const x of [100, 900]) {
    const cuts = Array.from({ length: 7 }, (_, i) => ({ x, y: i * 30, enabled: true })) as PhotoCut[]
    cuts.push({ x: 1000 - x, y: 100, enabled: true } as PhotoCut)
    for (let count = 0; count <= cuts.length; count++) {
      expect(photoStageHeight(cuts.map((c, i) => ({ ...c, enabled: i < count })), 1000)).toBe(653)
    }
  }
})

it('oznacza tylko niżej narysowane okręgi, których obszary nachodzą na późniejsze', () => {
  expect(coveredPhotoCircles([
    { x: 0, y: 0, radius: 10 },
    { x: 15, y: 0, radius: 10 },
    { x: 100, y: 0, radius: 10 },
  ])).toEqual([true, false, false])
  expect(coveredPhotoCircles([
    { x: 0, y: 0, radius: 30 },
    { x: 0, y: 0, radius: 5 },
    { x: 5, y: 0, radius: 5 },
  ])).toEqual([true, true, false])
  expect(coveredPhotoCircles([
    { x: 0, y: 0, radius: 10 },
    { x: 20, y: 0, radius: 10 },
  ])).toEqual([false, false])
  expect(coveredPhotoCircles([])).toEqual([])
})
