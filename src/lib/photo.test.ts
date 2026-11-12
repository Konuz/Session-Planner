import { expect, it } from 'vitest'
import { photoAnchorKind, circleIntersectsImage, photoCropSquare, photoPose, photoCutLayout, coveredPhotoCircles, migratePhotoProject, cutsInThreeD, type PhotoCut } from './photo'
import { hasDistance } from './distance'

it('dopasowuje kadr wycinka do zdjęcia, także na brzegu i dla promienia większego od kadru', () => {
  expect(photoCropSquare({ x: 300, y: 180, radius: 50 }, 640, 400)).toEqual({ x: 250, y: 130, side: 100 })
  expect(photoCropSquare({ x: 5, y: 395, radius: 50 }, 640, 400)).toEqual({ x: 0, y: 300, side: 100 })
  expect(photoCropSquare({ x: 350, y: 190, radius: 700 }, 640, 400)).toEqual({ x: 150, y: 0, side: 400 })
})

it('rozsuwa małe wycinki przy zbieżnych celach bez zmiany kotwic', () => {
  const targets = Array.from({ length: 12 }, (_, i) => ({ x: 300 + i, y: 240 }))
  const saved = structuredClone(targets)
  const layout = photoCutLayout(targets, 600, 700)
  expect(targets).toEqual(saved)
  expect(layout.every(c => c.radius <= 28)).toBe(true)
  for (let i = 0; i < layout.length; i++) {
    for (let j = 0; j < i; j++) {
      expect(Math.hypot(layout[i].x - layout[j].x, layout[i].y - layout[j].y)).toBeGreaterThanOrEqual(layout[i].radius + layout[j].radius + 8)
    }
  }
  expect(photoCutLayout([{ x: 200, y: 200 }], 600, 700)[0]).toEqual({ x: 200, y: 200, radius: 28 })
})

it('zachowuje kolejność celów po obu stronach ciasnej grupy zamiast rozsypywać zdjęcia po scenie', () => {
  const targets = [304, 218, 275, 221, 302, 273, 220].map(y => ({ x: 1320, y }))
  const layout = photoCutLayout(targets, 2600, 750)
  for (const side of [-1, 1]) {
    const indices = targets.map((_, i) => i).filter(i => Math.sign(layout[i].x - targets[i].x) === side).sort((a, b) => targets[a].y - targets[b].y)
    expect(indices.length).toBeGreaterThan(0)
    for (let i = 1; i < indices.length; i++) expect(layout[indices[i]].y).toBeGreaterThan(layout[indices[i - 1]].y)
  }
  expect(layout.every((p, i) => Math.hypot(p.x - targets[i].x, p.y - targets[i].y) < 180)).toBe(true)
})

it.each([390, 600])('mieści siedem wycinków z odstępami w oknie szerokości %i', width => {
  const layout = photoCutLayout(Array.from({ length: 7 }, (_, i) => ({ x: width / 2 + i, y: 180 + i * 5 })), width, 700)
  layout.forEach((p, i) => {
    expect(p.x - p.radius).toBeGreaterThanOrEqual(0)
    expect(p.x + p.radius).toBeLessThanOrEqual(width)
    expect(p.y - p.radius).toBeGreaterThanOrEqual(0)
    expect(p.y + p.radius + 27).toBeLessThan(700 - 100)
    layout.slice(0, i).forEach(q => expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeGreaterThanOrEqual(p.radius + q.radius + 8))
  })
})

it('uwzględnia miejsce zajęte przez podpisy dwóch sąsiednich grup po ich rozsunięciu', () => {
  const layout = photoCutLayout([120, 122, 124, 220, 222].map(y => ({ x: 400, y })), 1200, 700)
  for (let i = 0; i < layout.length; i++) for (let j = 0; j < i; j++) {
    if (layout[i].x === layout[j].x) expect(Math.abs(layout[i].y - layout[j].y)).toBeGreaterThanOrEqual(92)
  }
})

it('pozostawia widoczny punkt Ziemi, kiedy szereg zdjęć dochodzi do początku tras', () => {
  const origin = { x: 240, y: 390 }
  const layout = photoCutLayout([120, 122, 124, 220, 222, 270, 272].map(y => ({ x: 336, y })), 600, 700, origin)
  layout.forEach(p => expect(Math.hypot(p.x - origin.x, p.y - origin.y)).toBeGreaterThanOrEqual(p.radius + 40))
})

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
