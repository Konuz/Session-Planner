import { expect, it } from 'vitest'
import { photoAnchorKind, circleIntersectsImage, photoColumnCapacity, photoColumns, photoPose, coveredPhotoCircles, migratePhotoProject, cutsInThreeD, type PhotoCut } from './photo'
import { hasDistance } from './distance'

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

it('nadmiar w kolumnie przenosi na drugą stronę', () => {
  const cuts = Array.from({ length: 13 }, (_, i) => ({ x: 100 + i, y: i * 30, enabled: true })) as PhotoCut[]
  expect(photoColumnCapacity(cuts)).toBe(7)
  const [left, right] = photoColumns(cuts, 1000, photoColumnCapacity(cuts))
  expect(left.map((c) => c.x)).toEqual([100, 101, 102, 103, 104, 105, 106])
  expect(right.map((c) => c.x)).toEqual([107, 108, 109, 110, 111, 112])
  expect(photoColumnCapacity([])).toBe(1)
})

it('nie zmienia pojemności kolumn przy przesuwaniu okręgów przez środek zdjęcia ani przy zaznaczaniu', () => {
  const cuts = Array.from({ length: 13 }, (_, i) => ({ x: 900, y: i * 30, enabled: true })) as PhotoCut[]
  for (let moved = 0; moved <= cuts.length; moved++) {
    const shifted = cuts.map((c, i) => ({ ...c, x: i < moved ? 100 : 900, enabled: i % 3 !== 0 }))
    expect(photoColumnCapacity(shifted)).toBe(photoColumnCapacity(cuts))
    const capacity = photoColumnCapacity(shifted)
    for (const column of photoColumns(shifted.filter((c) => c.enabled), 1000, capacity)) expect(column.length).toBeLessThanOrEqual(capacity)
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

it('migruje zapis w wersji 1 bez gwiazd i odrzuca nieznane wersje', () => {
  const v1 = { version: 1, id: 'a', name: 'IC 434', image: '', width: 10, height: 10, createdAt: 0, cuts: [], astrometry: { raDeg: 0, decDeg: 0, rmsPx: 0, matches: 0, edgeMatches: 0, edgeRmsPx: null, totalMs: 0, wcs: {} } }
  expect(migratePhotoProject(v1)).toEqual({ ...v1, version: 3, stars: null })
  const stars = { stars: [], magLimit: 15, fetchedAt: 1 }
  expect(migratePhotoProject({ ...v1, version: 2, stars })?.stars).toEqual(stars)
  expect(migratePhotoProject({ ...v1, version: 2, stars: { broken: true } })?.stars).toBeNull()
  expect(migratePhotoProject({ ...v1, version: 3, stars })?.stars).toEqual(stars)
  expect(migratePhotoProject({ ...v1, version: 4 })).toBeNull()
  expect(migratePhotoProject(undefined)).toBeNull()
})

it('migruje wycinki wersji 2: wartość katalogu do odświeżenia, wybór z SIMBAD zostaje, kompleks to populacja', () => {
  const base = { type: 'EN', raDeg: 0, decDeg: 0, x: 1, y: 1, radius: 5, enabled: true, uncertaintyLy: null }
  const v2 = {
    version: 2, id: 'a', name: 'IC 434', image: '', width: 10, height: 10, createdAt: 0, stars: null, astrometry: {},
    cuts: [
      { ...base, id: 'B 33', distLy: 1500, distanceSource: 'Wikidata — katalog aplikacji', distanceScope: 'object' },
      { ...base, id: 'NGC 2024', distLy: 1300, uncertaintyLy: 50, distanceSource: 'SIMBAD — 2018A&A...619A.106K — paral', distanceScope: 'complex' },
      { ...base, id: 'IC 435', distLy: null, distanceSource: '', distanceScope: 'object' },
    ],
  }
  const cuts = migratePhotoProject(v2)!.cuts
  expect(cuts[0]).toMatchObject({ distLy: 1500, distanceScope: 'object', distanceMethod: 'Wikidata, niezweryfikowane', distanceSource: 'Wikidata (P2583)', distanceRef: '', distanceOrigin: 'catalog' })
  expect(cuts[1]).toMatchObject({ distLy: 1300, uncertaintyLy: 50, distanceScope: 'population', distanceSource: 'SIMBAD — 2018A&A...619A.106K — paral', distanceOrigin: 'user' })
  expect(cuts[2]).toMatchObject({ distLy: null, distanceSource: '', distanceMethod: '', distanceOrigin: 'catalog' })
})

it('w 3D pokazuje tylko włączone wycinki z ustaloną odległością (σ ≤ 20 %)', () => {
  const cut = (id: string, distLy: number | null, uncertaintyLy: number | null, enabled = true) => ({ id, distLy, uncertaintyLy, enabled }) as PhotoCut
  const cuts = [cut('a', 1000, null), cut('b', null, null), cut('c', 1000, 200), cut('d', 1000, 201), cut('e', 1000, 10, false), cut('f', 0, null)]
  expect(cutsInThreeD(cuts).map((c) => c.id)).toEqual(['a', 'c'])
  expect(hasDistance({ distLy: 5, uncertaintyLy: null })).toBe(true)
  expect(hasDistance({ distLy: Number.NaN, uncertaintyLy: null })).toBe(false)
})
