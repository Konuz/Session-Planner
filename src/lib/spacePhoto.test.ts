import { describe, expect, it } from 'vitest'
import { GALACTIC_LIMIT_LY } from './space3d'
import { depthLayers, layerLifts, milkyWayCone, windowPoint, windowRows, windowSize, type LayerCut } from './spacePhoto'

/** Deterministyczny generator (LCG), żeby pole testowe było zawsze takie samo. */
function random(seed: number) {
  let s = seed
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

/** Pole jak Abell 1656: 120 galaktyk gromady o odległościach z przesunięcia ku czerwieni (ok. 321 mln lś ± 15%),
 *  trzy galaktyki pierwszego planu i sześć tła. */
function comaField(): LayerCut[] {
  const rnd = random(11)
  const members = Array.from({ length: 120 }, (_, i) => ({ id: `PGC ${44000 + i}`, distLy: 321e6 * (0.85 + 0.3 * rnd()), radius: 10 + 20 * rnd() }))
  const near = [62e6, 95e6, 140e6].map((distLy, i) => ({ id: `NGC ${4800 + i}`, distLy, radius: 45 }))
  const far = [0.9e9, 1.0e9, 1.1e9, 1.3e9, 1.8e9, 2.4e9].map((distLy, i) => ({ id: `SDSS ${i}`, distLy, radius: 8 }))
  return [...far, ...members, ...near]
}

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

describe('depthLayers', () => {
  it('ponad 100 galaktyk gromady w wąskim przedziale odległości trafia do jednego głównego planu', () => {
    const cuts = comaField()
    const layers = depthLayers(cuts)!
    expect(layers.counts).toEqual({ near: 3, main: 120, far: 6 })
    expect(layers.lo).toBeGreaterThanOrEqual(321e6 * 0.85)
    expect(layers.hi).toBeLessThanOrEqual(321e6 * 1.15)
    expect(layers.center).toBeGreaterThan(300e6)
    expect(layers.center).toBeLessThan(345e6)
    expect(layers.layer.get('NGC 4800')).toBe('near')
    expect(layers.layer.get('SDSS 5')).toBe('far')
  })

  it('przy kilku bliskich galaktykach głównym planem jest para zajmująca kadr, a nie liczniejsze drobne tło', () => {
    const cuts: LayerCut[] = [
      { id: 'M 51', distLy: 23e6, radius: 700 }, { id: 'NGC 5195', distLy: 25e6, radius: 260 },
      ...[310e6, 330e6, 350e6, 365e6, 380e6].map((distLy, i) => ({ id: `tło ${i}`, distLy, radius: 18 })),
    ]
    const layers = depthLayers(cuts)!
    expect(layers.counts).toEqual({ near: 0, main: 2, far: 5 })
    expect(layers.center).toBe(23e6)
    expect([layers.lo, layers.hi]).toEqual([23e6, 25e6])
  })

  it('nie zależy od kolejności wycinków i nie zmienia danych', () => {
    const cuts = comaField()
    const before = structuredClone(cuts)
    const a = depthLayers(cuts)!, b = depthLayers([...cuts].reverse())!
    expect([...a.layer].sort()).toEqual([...b.layer].sort())
    expect([a.lo, a.hi, a.center]).toEqual([b.lo, b.hi, b.center])
    expect(cuts).toEqual(before)
  })

  it('pojedynczy obiekt tworzy główny plan, a brak obiektów nie daje planów', () => {
    expect(depthLayers([{ id: 'M 81', distLy: 12e6, radius: 70 }])!.counts).toEqual({ near: 0, main: 1, far: 0 })
    expect(depthLayers([])).toBeNull()
  })
})

describe('layerLifts', () => {
  it('główny plan zostaje w płaszczyźnie okna, pierwszy plan wysuwa się przed nie, tło za nie', () => {
    const cuts = comaField()
    const layers = depthLayers(cuts)!
    const lifts = layerLifts(cuts, layers)
    for (const c of cuts) {
      const lift = lifts.get(c.id)!
      const kind = layers.layer.get(c.id)
      if (kind === 'main') expect(lift).toBe(0)
      if (kind === 'near') { expect(lift).toBeLessThanOrEqual(-0.2); expect(lift).toBeGreaterThanOrEqual(-1) }
      if (kind === 'far') { expect(lift).toBeGreaterThanOrEqual(0.2); expect(lift).toBeLessThanOrEqual(1) }
    }
  })

  it('zachowuje kolejność odległości', () => {
    const cuts = comaField().sort((a, b) => a.distLy - b.distLy)
    const lifts = layerLifts(cuts, depthLayers(cuts)!)
    for (let i = 1; i < cuts.length; i++) expect(lifts.get(cuts[i].id)!).toBeGreaterThanOrEqual(lifts.get(cuts[i - 1].id)!)
    expect(lifts.get('NGC 4800')).toBeCloseTo(-1, 9)
    expect(lifts.get('SDSS 5')).toBeCloseTo(1, 9)
  })

  it('pojedynczy obiekt tuż za głównym planem nie odlatuje na skraj wysunięcia', () => {
    const cuts: LayerCut[] = [{ id: 'A', distLy: 100e6, radius: 300 }, { id: 'B', distLy: 190e6, radius: 10 }]
    const lifts = layerLifts(cuts, depthLayers(cuts)!)
    expect(lifts.get('B')).toBeGreaterThan(0.2)
    expect(lifts.get('B')).toBeLessThan(1)
  })
})

describe('okno zdjęcia', () => {
  const image = { width: 3200, height: 2000 }

  it('rozmiar okna rośnie z odległością w scenie w granicach czytelności i podaje powiększenie', () => {
    const size = windowSize(99, image, Math.tan(0.75 * Math.PI / 180))
    expect(size.width).toBeCloseTo(99 * 0.36, 9)
    expect(size.height).toBeCloseTo(size.width * 2000 / 3200, 9)
    expect(size.magnification).toBeGreaterThan(10)
    expect(windowSize(0.2, image, 0.01).width).toBe(3)
    expect(windowSize(500, image, 0.01).width).toBe(40)
    // Kadr pionowy: granice dotyczą dłuższego boku.
    expect(windowSize(500, { width: 2000, height: 3200 }, 0.01).height).toBe(40)
  })

  it('wysunięty obiekt leży na promieniu z wirtualnego oka przez swój piksel („Z Ziemi” wygląda jak fotografia)', () => {
    const size = windowSize(99, image, 0.013)
    const flat = windowPoint(2900, 300, 0, image, size)
    expect(flat.z).toBe(0)
    expect(flat.scale).toBe(1)
    expect(flat.x).toBeGreaterThan(0)
    expect(flat.y).toBeGreaterThan(0)
    for (const lift of [-1, -0.4, 0.3, 1]) {
      const p = windowPoint(2900, 300, lift, image, size)
      // Rzut z oka (0, 0, eye) na płaszczyznę okna z = 0.
      const t = size.eye / (size.eye - p.z)
      expect(p.x * t).toBeCloseTo(flat.x, 9)
      expect(p.y * t).toBeCloseTo(flat.y, 9)
      expect(p.scale * t).toBeCloseTo(1, 9)
      expect(Math.sign(p.z)).toBe(-Math.sign(lift))
    }
  })
})

describe('windowRows', () => {
  const cuts = comaField()
  const layers = depthLayers(cuts)!

  it('grupuje plany od najbliższego i sortuje obiekty po odległości', () => {
    const rows = windowRows(cuts, layers)
    expect(rows).toHaveLength(129 + 3)
    expect(rows.filter((r) => r.kind === 'header')).toEqual([
      { kind: 'header', layer: 'near', count: 3 }, { kind: 'header', layer: 'main', count: 120 }, { kind: 'header', layer: 'far', count: 6 },
    ])
    const distances = rows.flatMap((r) => r.kind === 'cut' ? [r.distLy] : [])
    expect(distances).toEqual([...distances].sort((a, b) => a - b))
  })

  it('wyszukiwanie i filtr planu zostawiają tylko pasujące wiersze z nagłówkiem', () => {
    expect(windowRows(cuts, layers, 'ngc 4801')).toEqual([{ kind: 'header', layer: 'near', count: 1 }, { kind: 'cut', layer: 'near', id: 'NGC 4801', distLy: 95e6 }])
    expect(windowRows(cuts, layers, '', 'far')).toHaveLength(7)
    expect(windowRows(cuts, layers, 'brak takiego')).toEqual([])
    expect(windowRows(cuts, null)).toEqual([])
  })
})
