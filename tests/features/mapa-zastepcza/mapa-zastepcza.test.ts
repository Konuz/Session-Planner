// Testy funkcji „mapa-zastepcza” (spec: .autoloop/features/mapa-zastepcza/spec.md).
// Nazwy wybrał test-author (spec ich nie podaje) – opis w src/features/framing/fallbackMap.ts.
// Wartości pikseli z P1…P17 sprawdzono programem przed zamrożeniem testów (rzut `skyToCutout` z
// `geometria-kadru`, katalog public/catalog/catalog.v1.json, zarysy src/data/outlines.dat).
// Wartości spoza P (np. punkty elipsy NGC 1978, sztuczne obiekty) wynikają z reguł spec: 72 punkty co 5°,
// pierwszy w kierunku PA, wycinek z brzegami, odcinki konturu, reguły 90° i 10°.
import { describe, expect, it } from 'vitest'
import { fallbackMap, type FallbackMapObject } from '../../../src/features/framing/fallbackMap'
import type { EquatorialDeg } from '../../../src/services/astroMath'
import { skyToCutout } from '../../../src/services/framing'
import {
  ASSIGNMENT,
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
} from './helpers'

// Mapa P1 liczona raz na plik, ale dopiero w teście (zaślepka rzuca wyjątek, więc błąd ma trafić do testu).
let p1Cache: FallbackMapObject[] | undefined
function p1Map(): FallbackMapObject[] {
  p1Cache ??= fallbackMap(CATALOG, POLYGONS, M42_CUTOUT)
  return p1Cache
}

const P1_SOLID = ['M 42', 'M 43', 'NGC 1977', 'LBN 963']
const P1_DASHED = [
  'NGC 1973',
  'NGC 1975',
  'NGC 1980',
  'NGC 1981',
  'Sh2-279',
  'Sh2-281',
  'IC 420',
  'vdB 42',
  'vdB 44',
  'LDN 1640',
  'LDN 1641',
  'vdB 36',
]

const NO_POLYGONS: ReadonlyMap<string, EquatorialDeg[][]> = new Map()

describe('mapa w polu 2° wokół M 42 (P1–P5, P8, P9, P13)', () => {
  it(
    'test_p1: dokładnie 16 obiektów – 4 linią ciągłą (wielokąty) i 12 przerywaną',
    () => {
      const map = p1Map()
      expect(map).toHaveLength(16)
      expect(new Set(map.map((o) => o.uid))).toEqual(new Set([...P1_SOLID, ...P1_DASHED].map(uidOf)))
      for (const designation of P1_SOLID) {
        const object = mustEntry(map, designation)
        expect(object.lineStyle, designation).toBe('solid')
        expect(object.kind, designation).toBe('polygon')
      }
      for (const designation of P1_DASHED) {
        const object = mustEntry(map, designation)
        expect(object.lineStyle, designation).toBe('dashed')
        expect(['ellipse', 'circle'], designation).toContain(object.kind)
      }
    },
    FULL_CATALOG_TIMEOUT,
  )

  it(
    'test_p1: każdy obiekt pojawia się raz, a jego kształty mają co najmniej 3 skończone punkty',
    () => {
      const map = p1Map()
      expect(new Set(map.map((o) => o.uid)).size).toBe(map.length)
      for (const object of map) {
        expect(object.shapes.length, object.uid).toBeGreaterThan(0)
        for (const shape of object.shapes) expect(shape.length, object.uid).toBeGreaterThanOrEqual(3)
      }
      expectAllFinite(map)
    },
    FULL_CATALOG_TIMEOUT,
  )

  it(
    'test_p2: etykiety „oznaczenie (pierwsza nazwa)” i samo oznaczenie bez nazwy',
    () => {
      const map = p1Map()
      expect(mustEntry(map, 'M 42').label.text).toBe('M 42 (Great Orion Nebula)')
      expect(mustEntry(map, 'M 43').label.text).toBe("M 43 (Mairan's Nebula)")
      expect(mustEntry(map, 'NGC 1977').label.text).toBe('NGC 1977 (the Running Man Nebula)')
      expect(mustEntry(map, 'NGC 1980').label.text).toBe('NGC 1980 (Lower Sword)')
      expect(mustEntry(map, 'NGC 1975').label.text).toBe('NGC 1975')
      expect(mustEntry(map, 'Sh2-279').label.text).toBe('Sh2-279')
      expect(mustEntry(map, 'vdB 42').label.text).toBe('vdB 42')
    },
    FULL_CATALOG_TIMEOUT,
  )

  it(
    'test_p3: M 42 – jeden wielokąt z 15 punktów (nie elipsa 90′ × 60′), pierwszy punkt (680,1; 553,9), etykieta (501,7; 499,3)',
    () => {
      const m42 = mustEntry(p1Map(), 'M 42')
      expect(m42.kind).toBe('polygon')
      expect(m42.lineStyle).toBe('solid')
      expect(m42.shapes).toHaveLength(1)
      expect(m42.shapes[0]).toHaveLength(15)
      expectPx(m42.shapes[0][0], 680.1, 553.9, 'pierwszy punkt M 42')
      expectPx(m42.label.position, 501.7, 499.3, 'etykieta M 42')
    },
    FULL_CATALOG_TIMEOUT,
  )

  it(
    'test_p3: punkty wielokąta M 42 to punkty zarysu z pliku po rzucie na wycinek, w tej samej kolejności',
    () => {
      const m42 = mustEntry(p1Map(), 'M 42')
      const sky = POLYGONS.get(uidOf('M 42'))![0]
      expect(m42.shapes[0]).toHaveLength(sky.length)
      sky.forEach((point, i) => {
        const expected = skyToCutout(M42_CUTOUT, point)
        expectPx(m42.shapes[0][i], expected.x, expected.y, `punkt ${i}`)
      })
    },
    FULL_CATALOG_TIMEOUT,
  )

  it(
    'test_p3: NGC 1977 (rozmiar 10,2′) ma tylko wielokąt z 8 punktów',
    () => {
      const ngc1977 = mustEntry(p1Map(), 'NGC 1977')
      expect(ngc1977.kind).toBe('polygon')
      expect(ngc1977.lineStyle).toBe('solid')
      expect(ngc1977.shapes).toHaveLength(1)
      expect(ngc1977.shapes[0]).toHaveLength(8)
    },
    FULL_CATALOG_TIMEOUT,
  )

  it(
    'test_p4: NGC 1975 (10′ × 5′, PA puste) – elipsa przerywana, środek i etykieta (498,8; 147,1), pierwszy punkt (498,8; 105,4)',
    () => {
      const ngc1975 = mustEntry(p1Map(), 'NGC 1975')
      expect(ngc1975.kind).toBe('ellipse')
      expect(ngc1975.lineStyle).toBe('dashed')
      expect(ngc1975.shapes).toHaveLength(1)
      const shape = ngc1975.shapes[0]
      expect(shape).toHaveLength(72)
      expectPx(ngc1975.label.position, 498.8, 147.1, 'etykieta')
      expectPx(centroid(shape), 498.8, 147.1, 'środek elipsy')
      expectPx(shape[0], 498.8, 105.4, 'pierwszy punkt (północny koniec osi wielkiej)')
      const range = box(shape)
      expectNear(range.xMin, 478.0, 1, 'x min')
      expectNear(range.xMax, 519.6, 1, 'x max')
      expectNear(range.yMin, 105.4, 1, 'y min')
      expectNear(range.yMax, 188.7, 1, 'y max')
    },
    FULL_CATALOG_TIMEOUT,
  )

  it(
    'test_p5: NGC 1973 (5′ × 5′) i NGC 1980 (9,3′ bez osi mniejszej) to okręgi; NGC 1980 ma środek (482,0; 759,4), y 720,6–798,1',
    () => {
      const map = p1Map()
      const ngc1973 = mustEntry(map, 'NGC 1973')
      expect(ngc1973.kind).toBe('circle')
      expect(ngc1973.lineStyle).toBe('dashed')
      expect(ngc1973.shapes[0]).toHaveLength(72)
      const ngc1980 = mustEntry(map, 'NGC 1980')
      expect(ngc1980.kind).toBe('circle')
      expect(ngc1980.lineStyle).toBe('dashed')
      const shape = ngc1980.shapes[0]
      expect(shape).toHaveLength(72)
      expectPx(centroid(shape), 482.0, 759.4, 'środek NGC 1980')
      expectPx(ngc1980.label.position, 482.0, 759.4, 'etykieta NGC 1980')
      const range = box(shape)
      expectNear(range.yMin, 720.6, 1, 'y min')
      expectNear(range.yMax, 798.1, 1, 'y max')
    },
    FULL_CATALOG_TIMEOUT,
  )

  it(
    'test_p8: vdB 42 – środek (995,2; 656,7) w wycinku, etykieta jest, okrąg wychodzi poza prawy brzeg bez obcinania',
    () => {
      const vdb42 = mustEntry(p1Map(), 'vdB 42')
      expect(vdb42.kind).toBe('circle')
      expectPx(vdb42.label.position, 995.2, 656.7, 'etykieta vdB 42')
      const shape = vdb42.shapes[0]
      expect(shape).toHaveLength(72)
      expectPx(centroid(shape), 995.2, 656.7, 'środek okręgu')
      const range = box(shape)
      // promień ok. 23 px: x do ok. 1018,6, a punkty poza wycinkiem zostają
      expectNear(range.xMax, 1018.6, 1, 'x max')
      expect(shape.filter((p) => p.x > 1000).length).toBeGreaterThan(0)
    },
    FULL_CATALOG_TIMEOUT,
  )

  it(
    'test_p9: LDN 1641 i vdB 36 (środki poza polem) są na mapie bez etykiet; Sh2-276 i LBN 918 – nie',
    () => {
      const map = p1Map()
      const ldn1641 = mustEntry(map, 'LDN 1641')
      expect(ldn1641.label.position).toBeNull()
      expect(ldn1641.label.text).toBe('LDN 1641')
      expect(ldn1641.kind).toBe('circle')
      const vdb36 = mustEntry(map, 'vdB 36')
      expect(vdb36.label.position).toBeNull()
      expect(vdb36.label.text).toBe('vdB 36')
      expect(vdb36.kind).toBe('circle')
      expect(entry(map, 'Sh2-276')).toBeUndefined()
      expect(entry(map, 'LBN 918')).toBeUndefined()
    },
    FULL_CATALOG_TIMEOUT,
  )

  it(
    'test_p13: zarys „NGC 1978” leży przy NGC 1977, a NGC 1978 z katalogu jest w LMC – w P1 nie ma NGC 1978',
    () => {
      expect(POLYGONS.get(uidOf('NGC 1978'))?.length).toBe(1)
      expect(entry(p1Map(), 'NGC 1978')).toBeUndefined()
    },
    FULL_CATALOG_TIMEOUT,
  )
})

describe('P6 i kształty z rozmiaru (72 punkty co 5°, pierwszy w kierunku PA)', () => {
  it(
    'test_p6: NGC 1924 (1,6′ × 1,15′, PA 133°) w polu 0,1° – punkt 1. (402,5; 590,9), punkt 37. (597,5; 409,1)',
    () => {
      const map = fallbackMap(CATALOG, POLYGONS, cutout(82.00804, -5.31075, 0.1))
      const ngc1924 = mustEntry(map, 'NGC 1924')
      expect(ngc1924.kind).toBe('ellipse')
      expect(ngc1924.lineStyle).toBe('dashed')
      const shape = ngc1924.shapes[0]
      expect(shape).toHaveLength(72)
      expectPx(shape[0], 402.5, 590.9, 'punkt 1.')
      expectPx(shape[36], 597.5, 409.1, 'punkt 37.')
      expectPx(ngc1924.label.position, 500, 500, 'etykieta')
    },
    FULL_CATALOG_TIMEOUT,
  )

  it('test_p6: sztuczna elipsa 10′ × 5′ z PA 90° – oś wielka E–W, pierwszy punkt na wschodzie (po lewej)', () => {
    const object = syntheticObject('9001', { ra: 0, dec: 0, major: 10, minor: 5, pa: 90 })
    const [ellipse] = fallbackMap([object], NO_POLYGONS, cutout(0, 0))
    expect(ellipse.kind).toBe('ellipse')
    const shape = ellipse.shapes[0]
    expect(shape).toHaveLength(72)
    expectPx(shape[0], 458.3, 500.0, 'punkt 1. (koniec osi wielkiej na E)')
    expectPx(shape[36], 541.7, 500.0, 'punkt 37. (koniec osi wielkiej na W)')
    // punkty 19. i 55. to końce osi małej (2,5′ ≈ 20,8 px od środka)
    expectNear(distance(shape[18], { x: 500, y: 500 }), 20.8, 1, 'punkt 19.')
    expectNear(distance(shape[54], { x: 500, y: 500 }), 20.8, 1, 'punkt 55.')
    expectNear(shape[18].x, 500, 1, 'punkt 19. x')
    expectNear(shape[54].x, 500, 1, 'punkt 55. x')
  })

  it('test_p6: okrąg 6′ – 72 punkty w odległości 25 px od środka, co 5°, pierwszy na północy', () => {
    const object = syntheticObject('9002', { ra: 0, dec: 0, major: 6 })
    const [circle] = fallbackMap([object], NO_POLYGONS, cutout(0, 0))
    expect(circle.kind).toBe('circle')
    expect(circle.lineStyle).toBe('dashed')
    const shape = circle.shapes[0]
    expect(shape).toHaveLength(72)
    const center = { x: 500, y: 500 }
    expectPx(shape[0], 500, 475, 'punkt 1. (N)')
    expectPx(shape[36], 500, 525, 'punkt 37. (S)')
    shape.forEach((point, i) => expectNear(distance(point, center), 25, 0.5, `promień punktu ${i}`))
    shape.forEach((point, i) => {
      const next = shape[(i + 1) % shape.length]
      const a = Math.atan2(point.y - 500, point.x - 500)
      const b = Math.atan2(next.y - 500, next.x - 500)
      const step = Math.abs(((((b - a) * 180) / Math.PI + 540) % 360) - 180)
      expectNear(step, 5, 0.05, `krok kąta ${i}`)
    })
  })

  it('obiekt bez wielokąta z rozmiarem 0 albo ujemnym („Pytania”) nie jest rysowany', () => {
    const zero = syntheticObject('9003', { ra: 0, dec: 0, major: 0 })
    const negative = syntheticObject('9004', { ra: 0, dec: 0, major: -5, minor: -2 })
    const none = syntheticObject('9005', { ra: 0, dec: 0 })
    expect(fallbackMap([zero, negative, none], NO_POLYGONS, cutout(0, 0))).toEqual([])
  })
})

describe('brzegi wycinka i odcinki konturu (P7, P9)', () => {
  it('test_p7: okrąg 6′ w Dec −4,36° – środek y ≈ −15,6 poza wycinkiem, okrąg sięga y ≈ 9,5: jest, bez etykiety', () => {
    const inside = syntheticObject('9010', { ra: 83.8221, dec: -4.36, major: 6 })
    const map = fallbackMap([inside], NO_POLYGONS, M42_CUTOUT)
    expect(map).toHaveLength(1)
    expect(map[0].uid).toBe(inside.uid)
    expect(map[0].label.position).toBeNull()
    expect(map[0].label.text).toBe('NGC 9010')
    expectPx(centroid(map[0].shapes[0]), 500, -15.6, 'środek okręgu')
    expectNear(box(map[0].shapes[0]).yMax, 9.5, 1, 'y max')
  })

  it('test_p7: okrąg 6′ w Dec −4,30° kończy się w y ≈ −20,6 – nie ma go na mapie', () => {
    const outside = syntheticObject('9011', { ra: 83.8221, dec: -4.3, major: 6 })
    expect(fallbackMap([outside], NO_POLYGONS, M42_CUTOUT)).toEqual([])
  })

  it('test_p7: etykieta tylko w wycinku – pozycja 1 px od brzegu wewnątrz ma etykietę, 1 px na zewnątrz nie', () => {
    // okrąg 0,01′ (ok. 0,04 px), więc o obecności decyduje sama pozycja
    const right = syntheticObject('9012', { ...raDec(skyAt(M42_CUTOUT, 999, 500)), major: 0.01 })
    const top = syntheticObject('9013', { ...raDec(skyAt(M42_CUTOUT, 500, 1)), major: 0.01 })
    const rightOut = syntheticObject('9014', { ...raDec(skyAt(M42_CUTOUT, 1001, 500)), major: 0.01 })
    const topOut = syntheticObject('9015', { ...raDec(skyAt(M42_CUTOUT, 500, -1)), major: 0.01 })
    const map = fallbackMap([right, top, rightOut, topOut], NO_POLYGONS, M42_CUTOUT)
    expect(map.map((o) => o.uid)).toEqual([right.uid, top.uid])
    expectPx(map[0].label.position, 999, 500, 'etykieta przy prawym brzegu')
    expectPx(map[1].label.position, 500, 1, 'etykieta przy górnym brzegu')
  })

  it('test_p9: trójkąt bez wierzchołka w wycinku, którego bok przecina róg wycinka, jest na mapie (sprawdzanie odcinków)', () => {
    const polygon = [skyAt(M42_CUTOUT, -100, 150), skyAt(M42_CUTOUT, 150, -100), skyAt(M42_CUTOUT, -300, -300)]
    const object = syntheticObject('9020', { ...raDec(polygon[2]) })
    const map = fallbackMap([object], new Map([[object.uid, [polygon]]]), M42_CUTOUT)
    expect(map).toHaveLength(1)
    expect(map[0].kind).toBe('polygon')
    expect(map[0].lineStyle).toBe('solid')
    expect(map[0].label.position).toBeNull()
    expectPx(map[0].shapes[0][0], -100, 150, 'pierwszy punkt')
    expectPx(map[0].shapes[0][1], 150, -100, 'drugi punkt')
  })

  it('test_p9: wielokąt, który przecina wycinek tylko odcinkiem od ostatniego punktu do pierwszego, jest na mapie', () => {
    const polygon = [skyAt(M42_CUTOUT, -200, 500), skyAt(M42_CUTOUT, 500, -2000), skyAt(M42_CUTOUT, 1200, 500)]
    const object = syntheticObject('9021', { ...raDec(polygon[0]) })
    const map = fallbackMap([object], new Map([[object.uid, [polygon]]]), M42_CUTOUT)
    expect(map.map((o) => o.uid)).toEqual([object.uid])
    expect(map[0].label.position).toBeNull()
    expect(map[0].shapes[0]).toHaveLength(3)
  })

  it('test_p9: wielokąt, który obejmuje cały wycinek, ale go nie przecina, nie jest na mapie', () => {
    const polygon = [
      skyAt(M42_CUTOUT, -100, -100),
      skyAt(M42_CUTOUT, 1100, -100),
      skyAt(M42_CUTOUT, 1100, 1100),
      skyAt(M42_CUTOUT, -100, 1100),
    ]
    const object = syntheticObject('9022', { ...raDec(skyAt(M42_CUTOUT, -150, -150)) })
    expect(fallbackMap([object], new Map([[object.uid, [polygon]]]), M42_CUTOUT)).toEqual([])
  })

  it('test_p9: okrąg, który obejmuje cały wycinek (środek poza polem, promień 3°), nie jest na mapie', () => {
    const object = syntheticObject('9023', { ...raDec(skyAt(M42_CUTOUT, -50, 500)), major: 360 })
    expect(fallbackMap([object], NO_POLYGONS, M42_CUTOUT)).toEqual([])
  })
})

describe('obiekty bez rozmiaru, kilka wielokątów, zarysy bez obiektu (P10–P12)', () => {
  it(
    'test_p10: pole 1° wokół IC 427 – bez IC 427 i IC 428 (brak rozmiaru i zarysu); NGC 1999 wielokąt, vdB 46 okrąg',
    () => {
      const map = fallbackMap(CATALOG, POLYGONS, cutout(84.0751, -6.6164, 1))
      expect(entry(map, 'IC 427')).toBeUndefined()
      expect(entry(map, 'IC 428')).toBeUndefined()
      const ngc1999 = mustEntry(map, 'NGC 1999')
      expect(ngc1999.kind).toBe('polygon')
      expect(ngc1999.lineStyle).toBe('solid')
      const vdb46 = mustEntry(map, 'vdB 46')
      expect(vdb46.kind).toBe('circle')
      expect(vdb46.lineStyle).toBe('dashed')
    },
    FULL_CATALOG_TIMEOUT,
  )

  it(
    'test_p11: pole 2° wokół NGC 6334 – 4 wielokąty linią ciągłą i jedna etykieta „NGC 6334”',
    () => {
      const map = fallbackMap(CATALOG, POLYGONS, cutout(260.2071, -36.1027))
      const uid = uidOf('NGC 6334')
      const entries = map.filter((o) => o.uid === uid)
      expect(entries).toHaveLength(1)
      const [ngc6334] = entries
      expect(ngc6334.kind).toBe('polygon')
      expect(ngc6334.lineStyle).toBe('solid')
      expect(ngc6334.shapes).toHaveLength(4)
      expect(ngc6334.label.text).toBe('NGC 6334')
      expectPx(ngc6334.label.position, 500, 500, 'etykieta')
    },
    FULL_CATALOG_TIMEOUT,
  )

  it(
    'test_p12: pole 5° wokół RA 188,4°, Dec −61,5° nie ma wielokąta „C 99” (zarys bez obiektu katalogu)',
    () => {
      const cut = cutout(188.4, -61.5, 5)
      const c99 = ASSIGNMENT.outlines.filter((outline) => outline.label === 'C 99')
      expect(c99).toHaveLength(1)
      expect(c99[0].uid).toBeNull()
      // zarys leży w tym wycinku, więc test ma sens
      const first = skyToCutout(cut, c99[0].points[0])
      expect(first.x >= 0 && first.x <= 1000 && first.y >= 0 && first.y <= 1000).toBe(true)
      const map = fallbackMap(CATALOG, POLYGONS, cut)
      expect(map.length).toBeGreaterThan(0)
      expect(map.filter((o) => o.kind === 'polygon')).toEqual([])
      const c99Pixels = c99[0].points.map((point) => skyToCutout(cut, point))
      for (const object of map) {
        for (const shape of object.shapes) {
          const shared = shape.filter((p) => c99Pixels.some((q) => distance(p, q) < 0.01))
          expect(shared, object.uid).toEqual([])
        }
      }
    },
    FULL_CATALOG_TIMEOUT,
  )

  it('test_p12: wielokąty pod uid, którego nie ma w katalogu, nie są rysowane', () => {
    const polygon = [skyAt(M42_CUTOUT, 400, 400), skyAt(M42_CUTOUT, 600, 400), skyAt(M42_CUTOUT, 500, 600)]
    const object = syntheticObject('9030', { ra: 83.8221, dec: -5.3911 })
    expect(fallbackMap([object], new Map([['BRAK-W-KATALOGU', [polygon]]]), M42_CUTOUT)).toEqual([])
  })
})

describe('reguła 10° (P13) i reguła 90° (P15)', () => {
  const cut = cutout(0, 0)
  /** Trójkąt przecinający wycinek, z pierwszym punktem `firstDec` stopni na północ od (0°, 0°). */
  const farTriangle = (firstDec: number): EquatorialDeg[] => [
    { raDeg: 0, decDeg: firstDec },
    { raDeg: 0.3, decDeg: 0.3 },
    { raDeg: 359.7, decDeg: 0.3 },
  ]

  it(
    'test_p13: pole 1° wokół NGC 1978 – elipsa 4′ × 2,7′ z PA 160° (zarys odrzucony) z etykietą „NGC 1978”',
    () => {
      const map = fallbackMap(CATALOG, POLYGONS, cutout(82.18804, -66.23592, 1))
      const ngc1978 = mustEntry(map, 'NGC 1978')
      expect(ngc1978.kind).toBe('ellipse')
      expect(ngc1978.lineStyle).toBe('dashed')
      expect(ngc1978.shapes).toHaveLength(1)
      expect(ngc1978.shapes[0]).toHaveLength(72)
      expect(ngc1978.label.text).toBe('NGC 1978')
      expectPx(ngc1978.label.position, 500, 500, 'etykieta')
      // z reguły: pierwszy punkt to koniec osi wielkiej w kierunku PA 160° (na S i trochę na E)
      expectPx(ngc1978.shapes[0][0], 488.6, 531.3, 'punkt 1.')
      expectPx(ngc1978.shapes[0][36], 511.4, 468.7, 'punkt 37.')
    },
    FULL_CATALOG_TIMEOUT,
  )

  it('test_p13: pierwszy punkt wielokąta 9,5° od pozycji – wielokąt zostaje', () => {
    const object = syntheticObject('9040', { ra: 0, dec: 0, major: 6 })
    const [result] = fallbackMap([object], new Map([[object.uid, [farTriangle(9.5)]]]), cut)
    expect(result.kind).toBe('polygon')
    expect(result.lineStyle).toBe('solid')
    expect(result.shapes).toHaveLength(1)
    expect(result.shapes[0]).toHaveLength(3)
  })

  it('test_p13: pierwszy punkt 10,5° od pozycji – wielokąt odrzucony, obiekt z rozmiarem dostaje okrąg', () => {
    const object = syntheticObject('9041', { ra: 0, dec: 0, major: 6 })
    const [result] = fallbackMap([object], new Map([[object.uid, [farTriangle(10.5)]]]), cut)
    expect(result.kind).toBe('circle')
    expect(result.lineStyle).toBe('dashed')
    expect(result.shapes).toHaveLength(1)
    expect(result.shapes[0]).toHaveLength(72)
  })

  it('test_p13: wszystkie wielokąty odrzucone i brak rozmiaru – obiektu nie ma na mapie', () => {
    const object = syntheticObject('9042', { ra: 0, dec: 0 })
    expect(fallbackMap([object], new Map([[object.uid, [farTriangle(10.5)]]]), cut)).toEqual([])
  })

  it('test_p13: odrzucony jeden z dwóch wielokątów – zostaje tylko zgodny, bez elipsy', () => {
    const near: EquatorialDeg[] = [
      { raDeg: 0.1, decDeg: 0.1 },
      { raDeg: 359.9, decDeg: 0.1 },
      { raDeg: 0, decDeg: -0.1 },
    ]
    const object = syntheticObject('9043', { ra: 0, dec: 0, major: 6 })
    const [result] = fallbackMap([object], new Map([[object.uid, [farTriangle(10.5), near]]]), cut)
    expect(result.kind).toBe('polygon')
    expect(result.shapes).toHaveLength(1)
    const expected = skyToCutout(cut, near[0])
    expectPx(result.shapes[0][0], expected.x, expected.y, 'pierwszy punkt zgodnego wielokąta')
  })

  it('test_p15: obiekt w punkcie przeciwległym do środka (RA 263,8221°, Dec +5,3911°, 30′) nie jest na mapie', () => {
    const antipode = syntheticObject('9050', { ra: 263.8221, dec: 5.3911, major: 30 })
    const map = fallbackMap([antipode], NO_POLYGONS, M42_CUTOUT)
    expect(map).toEqual([])
    expectAllFinite(map)
  })

  it('test_p15: wielokąt z wierzchołkiem 91° od środka wycinka jest pomijany, z wierzchołkiem 89° zostaje; bez NaN', () => {
    const object = syntheticObject('9051', { ra: 0.3, dec: 0 })
    const small: EquatorialDeg[] = [
      { raDeg: 0.3, decDeg: 0.1 },
      { raDeg: 0.2, decDeg: -0.1 },
      { raDeg: 0.4, decDeg: -0.1 },
    ]
    const reaching = (raDeg: number): EquatorialDeg[] => [
      { raDeg: 0.3, decDeg: 0.2 },
      { raDeg, decDeg: 0 },
      { raDeg: 0.3, decDeg: 0.3 },
    ]
    const kept = fallbackMap([object], new Map([[object.uid, [small, reaching(89)]]]), cut)
    expect(kept).toHaveLength(1)
    expect(kept[0].shapes).toHaveLength(2)
    expect(kept[0].shapes[1]).toHaveLength(3)
    expectAllFinite(kept)
    const dropped = fallbackMap([object], new Map([[object.uid, [small, reaching(91)]]]), cut)
    expect(dropped).toHaveLength(1)
    expect(dropped[0].shapes).toHaveLength(1)
    const expected = skyToCutout(cut, small[0])
    expectPx(dropped[0].shapes[0][0], expected.x, expected.y, 'pierwszy punkt małego wielokąta')
    expectAllFinite(dropped)
  })
})

describe('RA przez 0°, niezależność od kadru, kolejność (P14, P16, P17)', () => {
  it('test_p14: wycinek RA 0,5°, Dec 0°, okrąg 6′ w RA 359,8° – środek w (850,0; 500)', () => {
    const object = syntheticObject('9060', { ra: 359.8, dec: 0, major: 6 })
    const map = fallbackMap([object], NO_POLYGONS, cutout(0.5, 0))
    expect(map).toHaveLength(1)
    expectPx(map[0].label.position, 850.0, 500, 'etykieta')
    expectPx(centroid(map[0].shapes[0]), 850.0, 500, 'środek okręgu')
  })

  it('test_p16: mapa zależy tylko od wycinka i katalogu – ten sam wycinek przy innym PA, mozaice i OAG daje tę samą mapę', () => {
    // `fallbackMap` nie przyjmuje kadru ani profilu; dwa niezależnie zbudowane, równe wycinki dają równy wynik.
    const near = catalogNear(M42_CUTOUT.center, 4)
    const first = fallbackMap(near, POLYGONS, cutout(83.8221, -5.3911))
    const second = fallbackMap(near, POLYGONS, cutout(83.8221, -5.3911))
    expect(first.length).toBeGreaterThan(0)
    expect(second).toEqual(first)
  })

  it('test_p17: obiekty w kolejności katalogu – odwrócony katalog daje odwróconą listę', () => {
    const near = catalogNear(M42_CUTOUT.center, 4)
    const forward = fallbackMap(near, POLYGONS, M42_CUTOUT).map((o) => o.uid)
    const backward = fallbackMap([...near].reverse(), POLYGONS, M42_CUTOUT).map((o) => o.uid)
    expect(forward.length).toBeGreaterThan(5)
    expect(backward).toEqual([...forward].reverse())
    const catalogOrder = near.map((o) => o.uid).filter((uid) => forward.includes(uid))
    expect(forward).toEqual(catalogOrder)
  })

  it(
    'test_p17: wielokąty NGC 6334 w kolejności z pliku (34, 16, 16 i 21 punktów)',
    () => {
      const cut = cutout(260.2071, -36.1027)
      const ngc6334 = mustEntry(fallbackMap(CATALOG, POLYGONS, cut), 'NGC 6334')
      const sky = POLYGONS.get(uidOf('NGC 6334'))!
      expect(ngc6334.shapes.map((shape) => shape.length)).toEqual([34, 16, 16, 21])
      sky.forEach((polygon, i) => {
        const expected = skyToCutout(cut, polygon[0])
        expectPx(ngc6334.shapes[i][0], expected.x, expected.y, `pierwszy punkt wielokąta ${i}`)
      })
    },
    FULL_CATALOG_TIMEOUT,
  )

  it('test_p17: pusty katalog daje pustą mapę', () => {
    expect(fallbackMap([], POLYGONS, M42_CUTOUT)).toEqual([])
  })
})

function raDec(point: EquatorialDeg): { ra: number; dec: number } {
  return { ra: point.raDeg, dec: point.decDeg }
}
