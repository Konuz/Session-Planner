// Ukryte przypadki „mapa-zastepcza”: te same reguły co w testach widocznych, inne wartości
// (wycinek prostokątny i inne pole, inne środki, PA, odległości w regułach 10° i 90°, inne brzegi).
// Wartości policzone regułami spec i rzutem `skyToCutout` z `geometria-kadru`.
import { describe, expect, it } from 'vitest'
import { fallbackMap } from '../../../../src/features/framing/fallbackMap'
import type { EquatorialDeg } from '../../../../src/services/astroMath'
import { skyToCutout } from '../../../../src/services/framing'
import {
  box,
  CATALOG,
  catalogNear,
  centroid,
  cutout,
  distance,
  entry,
  expectAllFinite,
  expectNear,
  expectPx,
  FULL_CATALOG_TIMEOUT,
  M42_CUTOUT,
  mustEntry,
  POLYGONS,
  skyAt,
  syntheticObject,
  uidOf,
} from '../helpers'

const NO_POLYGONS: ReadonlyMap<string, EquatorialDeg[][]> = new Map()

function raDec(point: EquatorialDeg): { ra: number; dec: number } {
  return { ra: point.raDeg, dec: point.decDeg }
}

describe('wycinek 800 × 600 px, pole 1,5° wokół M 42', () => {
  const cut = cutout(83.8221, -5.3911, 1.5, 800, 600)

  it(
    'P1/P3: obiekty, wielokąt M 42 (pierwszy punkt i etykieta) i okrąg NGC 1980 w innym wycinku',
    () => {
      const map = fallbackMap(CATALOG, POLYGONS, cut)
      const expected = ['LDN 1640', 'LDN 1641', 'M 42', 'NGC 1977', 'NGC 1980', 'M 43', 'Sh2-279', 'Sh2-281']
      for (const designation of expected) mustEntry(map, designation)
      expect(entry(map, 'NGC 1975')).toBeUndefined()
      expect(entry(map, 'vdB 42')).toBeUndefined()
      const m42 = mustEntry(map, 'M 42')
      expect(m42.kind).toBe('polygon')
      expect(m42.shapes[0]).toHaveLength(15)
      expectPx(m42.shapes[0][0], 592.1, 357.5, 'pierwszy punkt M 42')
      expectPx(m42.label.position, 401.8, 299.2, 'etykieta M 42')
      const ngc1980 = mustEntry(map, 'NGC 1980')
      expectPx(ngc1980.label.position, 380.8, 576.7, 'etykieta NGC 1980')
      expectNear(box(ngc1980.shapes[0]).yMin, 535.4, 1, 'NGC 1980 y min')
      expectPx(mustEntry(map, 'NGC 1977').label.position, 403.3, 8.4, 'etykieta NGC 1977')
      expect(mustEntry(map, 'Sh2-279').label.position).toBeNull()
    },
    FULL_CATALOG_TIMEOUT,
  )

  it('P7: wysokość wycinka ma znaczenie – pozycja y = 700 (poza 600 px) nie ma etykiety ani obiektu, x = 700 tak', () => {
    const below = syntheticObject('9101', { ...raDec(skyAt(cut, 400, 700)), major: 0.01 })
    const right = syntheticObject('9102', { ...raDec(skyAt(cut, 700, 550)), major: 0.01 })
    const map = fallbackMap([below, right], NO_POLYGONS, cut)
    expect(map.map((o) => o.uid)).toEqual([right.uid])
    expectPx(map[0].label.position, 700, 550, 'etykieta')
  })
})

describe('elipsy i okręgi', () => {
  it(
    'P6: NGC 1924 w polu 0,2° – punkt 1. (451,2; 545,5), punkt 37. (548,8; 454,5)',
    () => {
      const map = fallbackMap(CATALOG, POLYGONS, cutout(82.00804, -5.31075, 0.2))
      const shape = mustEntry(map, 'NGC 1924').shapes[0]
      expect(shape).toHaveLength(72)
      expectPx(shape[0], 451.2, 545.5, 'punkt 1.')
      expectPx(shape[36], 548.8, 454.5, 'punkt 37.')
    },
    FULL_CATALOG_TIMEOUT,
  )

  it('P6: elipsa 10′ × 5′ z PA 45° – pierwszy punkt na NE (lewo-góra), punkt 37. na SW', () => {
    const object = syntheticObject('9110', { ra: 0, dec: 0, major: 10, minor: 5, pa: 45 })
    const [ellipse] = fallbackMap([object], NO_POLYGONS, cutout(0, 0))
    expect(ellipse.kind).toBe('ellipse')
    const shape = ellipse.shapes[0]
    expect(shape).toHaveLength(72)
    expectPx(shape[0], 470.5, 470.5, 'punkt 1.')
    expectPx(shape[36], 529.5, 529.5, 'punkt 37.')
    expectNear(distance(shape[18], { x: 500, y: 500 }), 20.8, 1, 'punkt 19.')
  })

  it('P5: okrąg 12′ (oś mniejsza równa większej) ma promień 50 px i jest okręgiem', () => {
    const object = syntheticObject('9111', { ra: 0, dec: 0, major: 12, minor: 12 })
    const [circle] = fallbackMap([object], NO_POLYGONS, cutout(0, 0))
    expect(circle.kind).toBe('circle')
    expect(circle.lineStyle).toBe('dashed')
    circle.shapes[0].forEach((point, i) => expectNear(distance(point, { x: 500, y: 500 }), 50, 0.5, `promień ${i}`))
  })

  it(
    'P2: pierwsza nazwa zwyczajowa – NGC 4755 i NGC 4609 w polu 5° wokół RA 188,4°, Dec −61,5°',
    () => {
      const map = fallbackMap(CATALOG, POLYGONS, cutout(188.4, -61.5, 5))
      const ngc4755 = mustEntry(map, 'NGC 4755')
      expect(ngc4755.label.text).toBe("NGC 4755 (Herschel's Jewel Box)")
      expectPx(ngc4755.label.position, 5.3, 290.2, 'etykieta NGC 4755')
      expect(mustEntry(map, 'NGC 4609').label.text).toBe('NGC 4609 (Coalsack Cluster)')
    },
    FULL_CATALOG_TIMEOUT,
  )

  it('P2: obiekt z dwiema nazwami ma w etykiecie tylko pierwszą', () => {
    const object = syntheticObject('9112', { ra: 0, dec: 0, major: 3, names: ['Pierwsza', 'Druga'] })
    expect(fallbackMap([object], NO_POLYGONS, cutout(0, 0))[0].label.text).toBe('NGC 9112 (Pierwsza)')
  })
})

describe('brzegi i odcinki', () => {
  it('P7: okrąg 6′ za lewym brzegiem (RA +1,04°) jest bez etykiety, a dalej (RA +1,10°) go nie ma', () => {
    const near = syntheticObject('9120', { ra: 83.8221 + 1.04, dec: -5.3911, major: 6 })
    const far = syntheticObject('9121', { ra: 83.8221 + 1.1, dec: -5.3911, major: 6 })
    const map = fallbackMap([near, far], NO_POLYGONS, M42_CUTOUT)
    expect(map.map((o) => o.uid)).toEqual([near.uid])
    expect(map[0].label.position).toBeNull()
    expectNear(centroid(map[0].shapes[0]).x, -17.7, 1, 'środek x')
  })

  it('P7: okrąg 6′ za prawym (RA −1,04°) i dolnym brzegiem (Dec −1,04°) jest, a Dec −1,06° już nie', () => {
    const right = syntheticObject('9122', { ra: 83.8221 - 1.04, dec: -5.3911, major: 6 })
    const bottom = syntheticObject('9123', { ra: 83.8221, dec: -5.3911 - 1.04, major: 6 })
    const bottomFar = syntheticObject('9124', { ra: 83.8221, dec: -5.3911 - 1.06, major: 6 })
    const map = fallbackMap([right, bottom, bottomFar], NO_POLYGONS, M42_CUTOUT)
    expect(map.map((o) => o.uid)).toEqual([right.uid, bottom.uid])
    expect(map.every((o) => o.label.position === null)).toBe(true)
  })

  it('P9: trójkąt przecinający prawy dolny róg, bez wierzchołka w wycinku, jest na mapie', () => {
    const polygon = [skyAt(M42_CUTOUT, 1100, 850), skyAt(M42_CUTOUT, 850, 1100), skyAt(M42_CUTOUT, 1300, 1300)]
    const object = syntheticObject('9125', { ...raDec(polygon[2]) })
    const map = fallbackMap([object], new Map([[object.uid, [polygon]]]), M42_CUTOUT)
    expect(map).toHaveLength(1)
    expect(map[0].label.position).toBeNull()
  })

  it('P9: trójkąt obok rogu (bok nie dochodzi do wycinka) nie jest na mapie', () => {
    const polygon = [skyAt(M42_CUTOUT, -100, 50), skyAt(M42_CUTOUT, 50, -100), skyAt(M42_CUTOUT, -300, -300)]
    const object = syntheticObject('9126', { ...raDec(polygon[2]) })
    expect(fallbackMap([object], new Map([[object.uid, [polygon]]]), M42_CUTOUT)).toEqual([])
  })
})

describe('RA przez 0°, druga strona nieba, reguły 10° i 90°', () => {
  it('P14: wycinek RA 359,5°, okrąg w RA 0,2° – środek w (150,0; 500)', () => {
    const object = syntheticObject('9130', { ra: 0.2, dec: 0, major: 6 })
    const map = fallbackMap([object], NO_POLYGONS, cutout(359.5, 0))
    expectPx(map[0].label.position, 150.0, 500, 'etykieta')
    expectPx(centroid(map[0].shapes[0]), 150.0, 500, 'środek')
  })

  it('P14: wycinek RA 10°, Dec 30°, okrąg w RA 10,5° – etykieta (283,5; 499,5)', () => {
    const object = syntheticObject('9131', { ra: 10.5, dec: 30, major: 6 })
    const map = fallbackMap([object], NO_POLYGONS, cutout(10, 30))
    expectPx(map[0].label.position, 283.5, 499.5, 'etykieta')
  })

  it('P15: punkt przeciwległy do wycinka RA 10°, Dec +40° (RA 190°, Dec −40°, 60′) nie jest na mapie, bez NaN', () => {
    const object = syntheticObject('9132', { ra: 190, dec: -40, major: 60 })
    const map = fallbackMap([object], NO_POLYGONS, cutout(10, 40))
    expect(map).toEqual([])
    expectAllFinite(map)
  })

  it('P15: wierzchołek 85° od środka – wielokąt zostaje; 95° – pomijany', () => {
    const cut = cutout(0, 0)
    const object = syntheticObject('9133', { ra: 0.3, dec: 0 })
    const small: EquatorialDeg[] = [
      { raDeg: 0.3, decDeg: 0.1 },
      { raDeg: 0.2, decDeg: -0.1 },
      { raDeg: 0.4, decDeg: -0.1 },
    ]
    const reaching = (decDeg: number): EquatorialDeg[] => [
      { raDeg: 0.3, decDeg: 0.2 },
      { raDeg: 0, decDeg },
      { raDeg: 0.3, decDeg: 0.3 },
    ]
    const kept = fallbackMap([object], new Map([[object.uid, [reaching(85), small]]]), cut)
    expect(kept[0].shapes).toHaveLength(2)
    expectAllFinite(kept)
    // (RA 180°, Dec 85°) leży 95° od środka wycinka (0°, 0°)
    const far: EquatorialDeg[] = [
      { raDeg: 0.3, decDeg: 0.2 },
      { raDeg: 180, decDeg: 85 },
      { raDeg: 0.3, decDeg: 0.3 },
    ]
    const droppedFar = fallbackMap([object], new Map([[object.uid, [far, small]]]), cut)
    expect(droppedFar[0].shapes).toHaveLength(1)
    const expected = skyToCutout(cut, small[0])
    expectPx(droppedFar[0].shapes[0][0], expected.x, expected.y, 'pierwszy punkt małego wielokąta')
    expectAllFinite(droppedFar)
  })

  it('P13: pierwszy punkt 8° od pozycji – wielokąt zostaje; 12° – odrzucony (elipsa z rozmiaru)', () => {
    const cut = cutout(0, 0)
    const triangle = (firstDec: number): EquatorialDeg[] => [
      { raDeg: 0, decDeg: -firstDec },
      { raDeg: 0.3, decDeg: -0.3 },
      { raDeg: 359.7, decDeg: -0.3 },
    ]
    const object = syntheticObject('9134', { ra: 0, dec: 0, major: 8, minor: 4 })
    expect(fallbackMap([object], new Map([[object.uid, [triangle(8)]]]), cut)[0].kind).toBe('polygon')
    const rejected = fallbackMap([object], new Map([[object.uid, [triangle(12)]]]), cut)[0]
    expect(rejected.kind).toBe('ellipse')
    expect(rejected.lineStyle).toBe('dashed')
    expect(rejected.shapes[0]).toHaveLength(72)
  })
})

describe('kolejność (P17)', () => {
  it('P17: katalog posortowany malejąco po uid daje mapę w tej samej kolejności', () => {
    const near = catalogNear(M42_CUTOUT.center, 4).sort((a, b) => (a.uid < b.uid ? 1 : a.uid > b.uid ? -1 : 0))
    const uids = fallbackMap(near, POLYGONS, M42_CUTOUT).map((o) => o.uid)
    expect(uids.length).toBeGreaterThan(5)
    expect(uids).toEqual(near.map((o) => o.uid).filter((uid) => uids.includes(uid)))
    expect(uids.indexOf(uidOf('vdB 44'))).toBeLessThan(uids.indexOf(uidOf('M 42')))
  })
})
