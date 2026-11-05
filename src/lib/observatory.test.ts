import { expect, it } from 'vitest'
import { AXIS_LENGTH, PLANE_WIDTH, byDistance, fieldOfView, categoryCounts, distanceAt, distanceDomain, distanceHistogram, matchesFilter, observatoryItems, observatoryPosition, starColor, starSize, type ObservatoryItem } from './observatory'
import type { PhotoCut, PhotoProject, PhotoStar } from './photo'

const image = { width: 2000, height: 1000 }
const domain = distanceDomain([350, 1300, 1.5e6, 5e7])

it('przy progress = 0 wszystko leży na płaszczyźnie zdjęcia w miejscu swoich pikseli', () => {
  for (const distLy of [null, 12, 1300, 5e7]) {
    expect(observatoryPosition({ x: 0, y: 0 }, image, distLy, domain, 0)).toEqual([-PLANE_WIDTH / 2, PLANE_WIDTH / 4, -0])
    expect(observatoryPosition({ x: 1500, y: 750 }, image, distLy, domain, 0)).toEqual([PLANE_WIDTH / 4, -PLANE_WIDTH / 8, -0])
  }
})

it('przy progress = 1 głębia rośnie monotonicznie z odległością, a x i y się nie zmieniają', () => {
  const pixel = { x: 400, y: 300 }
  const depths = [350, 1000, 1300, 2000, 1.5e6, 5e7].map((d) => observatoryPosition(pixel, image, d, domain, 1))
  for (let i = 1; i < depths.length; i++) expect(depths[i][2]).toBeLessThan(depths[i - 1][2])
  for (const p of depths) expect(p.slice(0, 2)).toEqual(observatoryPosition(pixel, image, null, domain, 0).slice(0, 2))
  expect(observatoryPosition(pixel, image, domain.maxLy, domain, 1)[2]).toBe(-AXIS_LENGTH)
  // Bez odległości obiekt zostaje na zdjęciu zamiast udawać głębię.
  expect(observatoryPosition(pixel, image, null, domain, 1)[2]).toBe(-0)
  const half = observatoryPosition(pixel, image, 1300, domain, 0.5)[2]
  expect(half).toBeLessThan(0)
  expect(half).toBeGreaterThan(observatoryPosition(pixel, image, 1300, domain, 1)[2])
})

it('zakres osi obejmuje pełne dekady, a distanceAt odwraca położenie', () => {
  expect(domain).toEqual({ minLy: 100, maxLy: 1e8 })
  expect(distanceDomain([])).toEqual({ minLy: 10, maxLy: 1e4 })
  expect(distanceDomain([400, null, 600])).toEqual({ minLy: 100, maxLy: 1000 })
  expect(distanceDomain([1000])).toEqual({ minLy: 1000, maxLy: 1e4 })
  expect(distanceAt(0.5, { minLy: 100, maxLy: 1e4 })).toBeCloseTo(1000)
})

it('histogram liczy odległości w koszykach logarytmicznych i pomija brak danych', () => {
  const h = distanceHistogram([150, 160, 1100, 9000, null, 50, 2e4], { minLy: 100, maxLy: 1e4 }, 4)
  expect(h.edges.map((e) => Math.round(e))).toEqual([100, 316, 1000, 3162, 10000])
  expect(h.counts).toEqual([2, 0, 1, 1])
  expect(distanceHistogram([1e4], { minLy: 100, maxLy: 1e4 }, 4).counts).toEqual([0, 0, 0, 1])
})

const item = (id: string, category: ObservatoryItem['category'], distLy: number | null, gMag: number | null = null): ObservatoryItem => ({ id, kind: category === 'stars' ? 'star' : 'object', category, type: null, x: 0, y: 0, radius: 0, distLy, distLoLy: null, distHiLy: null, gMag, bpRp: null, parallaxOverError: null, raDeg: 0, decDeg: 0, source: '' })

it('zakres 1000–2000 lś zostawia tylko obiekty z tego przedziału, kategoria zawęża dalej', () => {
  const items = [item('a', 'stars', 900), item('b', 'stars', 1000), item('c', 'nebulae', 1500), item('d', 'stars', 2000), item('e', 'stars', 2001), item('f', 'stars', null), item('g', 'galaxies', 2e7)]
  expect(items.filter((i) => matchesFilter(i, { category: 'all', range: [1000, 2000] })).map((i) => i.id)).toEqual(['b', 'c', 'd'])
  expect(items.filter((i) => matchesFilter(i, { category: 'stars', range: [1000, 2000] })).map((i) => i.id)).toEqual(['b', 'd'])
  expect(items.filter((i) => matchesFilter(i, { category: 'all', range: null }))).toHaveLength(items.length)
  expect(items.filter((i) => matchesFilter(i, { category: 'galaxies', range: null })).map((i) => i.id)).toEqual(['g'])
  expect(categoryCounts(items)).toEqual({ all: 7, stars: 5, nebulae: 1, galaxies: 1 })
  expect([item('x', 'stars', null, 9), item('y', 'stars', 300), item('z', 'stars', null, 6)].sort(byDistance).map((i) => i.id)).toEqual(['y', 'z', 'x'])
})

it('łączy włączone wycinki i gwiazdy zdjęcia', () => {
  const cut = (id: string, enabled: boolean, type: PhotoCut['type']): PhotoCut => ({ id, type, raDeg: 0, decDeg: 0, x: 10, y: 20, radius: 30, enabled, distLy: 1300, distanceSource: 'SIMBAD', uncertaintyLy: 100, distanceScope: 'object' })
  const star: PhotoStar = { id: 'Gaia DR3 1', x: 5, y: 6, raDeg: 0, decDeg: 0, gMag: 8, bpRp: 0.4, parallaxMas: 2.5, parallaxOverError: 30, distLy: 1290, distLoLy: 1250, distHiLy: 1330 }
  const project = { cuts: [cut('IC 434', true, 'EN'), cut('NGC 2024', false, 'EN'), cut('NGC 2023', true, 'G')], stars: { stars: [star], magLimit: 15, fetchedAt: 0 } } as unknown as PhotoProject
  const items = observatoryItems(project)
  expect(items.map((i) => [i.id, i.category])).toEqual([['IC 434', 'nebulae'], ['NGC 2023', 'galaxies'], ['Gaia DR3 1', 'stars']])
  expect(items[0]).toMatchObject({ distLoLy: 1200, distHiLy: 1400, radius: 30 })
  expect(items[2]).toMatchObject({ kind: 'star', distLy: 1290, gMag: 8 })
  expect(observatoryItems({ ...project, stars: null })).toHaveLength(2)
})

it('barwa gwiazdy przechodzi od niebieskiej do czerwonej, rozmiar rośnie z jasnością', () => {
  const [blueR, , blueB] = starColor(-0.5)
  const [redR, , redB] = starColor(3)
  expect(blueB).toBeGreaterThan(blueR)
  expect(redR).toBeGreaterThan(redB)
  expect(starSize(4, 17)).toBe(9)
  expect(starSize(17, 17)).toBe(1.5)
  expect(starSize(12, 17)).toBeGreaterThan(starSize(15, 17))
})

it('rozmiar pola liczy z macierzy CD i porównuje z tarczą Księżyca', () => {
  // IC 434 z konuzastro.pl: 2798 × 2827 px, 1,28″/px.
  const cd = [[-0.000046206143700459305, 0.00035229624378628905], [-0.00035248318258832885, -0.00004637840645707231]]
  const fov = fieldOfView({ cd }, 2798, 2827)!
  expect(fov.widthDeg).toBeCloseTo(2798 * 1.27950 / 3600, 4)
  expect(fov.heightDeg).toBeCloseTo(2827 * 1.27950 / 3600, 4)
  expect(fov.moons).toBeCloseTo(1.94, 2)
  expect(fieldOfView(null, 10, 10)).toBeNull()
  expect(fieldOfView({ cd: [[0, 0], [0, 0]] }, 10, 10)).toBeNull()
})
