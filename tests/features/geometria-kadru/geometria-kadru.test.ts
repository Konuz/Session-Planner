// Testy funkcji „geometria-kadru” (spec: .autoloop/features/geometria-kadru/spec.md).
// Nazwy funkcji i typów wybrał test-author (spec ich nie podaje) – opis w helpers.ts i w src/services/framing.ts.
// Wartości dodatkowych przypadków (poza P1…P17) policzono ze wzorów 7B i reguł P7/P8/P11/P15 (podane przy testach).
import { describe, expect, it } from 'vitest'
import {
  cutoutToSky,
  mosaicPanels,
  mosaicSizeDeg,
  normalizeFraming,
  oagPrisms,
  skyToCutout,
} from '../../../src/services/framing'
import {
  collectNumbers,
  cutout,
  expectAngle,
  expectBox,
  expectNear,
  expectPa,
  expectPx,
  expectRa,
  expectSky,
  framing,
  newton150,
  P15_OAG,
  pixelBox,
  redcat,
  separationDeg,
  withOag,
} from './helpers'

describe('geometria-kadru: panele mozaiki na niebie', () => {
  it.each([
    { dec: 0, dRa: 4.305, paEast: 0, paWest: 0 },
    { dec: 60, dRa: 8.598, paEast: 3.72, paWest: 356.28 },
    { dec: 85, dRa: 46.659, paEast: 23.24, paWest: 336.76 },
  ])('test_p1_T12: Dec $dec° – odległość 4,305°, różnica RA $dRa°, PA $paEast° / $paWest°', ({ dec, dRa, paEast, paWest }) => {
    const panels = mosaicPanels(redcat(), framing({ dec }))
    expect(panels).toHaveLength(2)
    const [east, west] = panels
    expectAngle(separationDeg(east.center, west.center), 4.305, 'odległość środków')
    expectAngle(east.center.raDeg - west.center.raDeg, dRa, 'różnica RA')
    expectAngle(east.center.decDeg, west.center.decDeg, 'Dec obu paneli')
    expectPa(east.paDeg, paEast, 'PA panelu wschodniego')
    expectPa(west.paDeg, paWest, 'PA panelu zachodniego')
  })

  it('test_p2: Dec −60° – znak się odwraca: wschodni 356,28°, zachodni 3,72°', () => {
    const [east, west] = mosaicPanels(redcat(), framing({ dec: -60 }))
    expect(east.center.raDeg).toBeGreaterThan(west.center.raDeg)
    expectAngle(separationDeg(east.center, west.center), 4.305, 'odległość środków')
    expectAngle(east.center.raDeg - west.center.raDeg, 8.598, 'różnica RA (jak przy +60°)')
    expectPa(east.paDeg, 356.28, 'PA panelu wschodniego')
    expectPa(west.paDeg, 3.72, 'PA panelu zachodniego')
  })

  it('test_p3: PA 0°, 2×1 – pierwszy panel wschodni (większe RA), drugi zachodni; col/row wierszami od lewej', () => {
    const panels = mosaicPanels(redcat(), framing())
    expect(panels).toHaveLength(2)
    expect(panels.map((p) => [p.col, p.row])).toEqual([[0, 0], [1, 0]])
    expect(panels[0].center.raDeg).toBeGreaterThan(panels[1].center.raDeg)
    expectSky(panels[0].center, 32.153, 0, 'panel 1 (wschodni)')
    expectSky(panels[1].center, 27.847, 0, 'panel 2 (zachodni)')
  })

  it('test_p3: 1×2 przy PA 0° – pierwszy panel (górny wiersz kadru) jest północny', () => {
    // Wzór 7B: dy = ((rows−1)/2 − j)·(1 − overlap)·H, H = 15,70/250 rad → Dec ±1,439°.
    const panels = mosaicPanels(redcat(), framing({ cols: 1, rows: 2 }))
    expect(panels).toHaveLength(2)
    expect(panels.map((p) => [p.col, p.row])).toEqual([[0, 0], [0, 1]])
    expectSky(panels[0].center, 30, 1.4391, 'panel 1 (północny)')
    expectSky(panels[1].center, 30, -1.4391, 'panel 2 (południowy)')
    expectPa(panels[0].paDeg, 0)
    expectPa(panels[1].paDeg, 0)
  })

  it('test_p3: 3×2 przy PA 0° – sześć paneli wierszami od góry, w wierszu od wschodu (lewa strona kadru)', () => {
    // Wzór 7B dla RedCat, Dec 0°, zakładka 20%.
    const panels = mosaicPanels(redcat(), framing({ cols: 3, rows: 2 }))
    expect(panels).toHaveLength(6)
    expect(panels.map((p) => [p.col, p.row])).toEqual([[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]])
    const expected: [number, number][] = [
      [34.2992, 1.4351], [30, 1.4391], [25.7008, 1.4351],
      [34.2992, -1.4351], [30, -1.4391], [25.7008, -1.4351],
    ]
    panels.forEach((panel, k) => expectSky(panel.center, expected[k][0], expected[k][1], `panel ${k + 1}`))
  })

  it('test_p4: PA 90°, Dec 0° – mozaika 2×1 w osi N–S: Dec −2,153° i +2,153°, oba RA 30°', () => {
    const panels = mosaicPanels(redcat(), framing({ pa: 90 }))
    expect(panels).toHaveLength(2)
    expectSky(panels[0].center, 30, -2.153, 'panel 1')
    expectSky(panels[1].center, 30, 2.153, 'panel 2')
    expectPa(panels[0].paDeg, 90)
    expectPa(panels[1].paDeg, 90)
  })

  it('test_p5: środek RA 359° – wschodni panel RA 1,153° (nie 361,153°), zachodni 356,847°', () => {
    const [east, west] = mosaicPanels(redcat(), framing({ ra: 359 }))
    expectSky(east.center, 1.153, 0, 'panel wschodni')
    expectSky(west.center, 356.847, 0, 'panel zachodni')
    for (const corner of [...east.corners, ...west.corners]) {
      expect(corner.raDeg).toBeGreaterThanOrEqual(0)
      expect(corner.raDeg).toBeLessThan(360)
    }
  })

  it('test_p6: środek w biegunie – RA 120° i 300°, Dec 87,847°, odległość 4,305°, bez NaN', () => {
    const profile = withOag(redcat(), P15_OAG)
    const panels = mosaicPanels(profile, framing({ dec: 90 }))
    expect(panels).toHaveLength(2)
    expectSky(panels[0].center, 120, 87.847, 'panel 1')
    expectSky(panels[1].center, 300, 87.847, 'panel 2')
    expectAngle(separationDeg(panels[0].center, panels[1].center), 4.305, 'odległość środków')
    const numbers = collectNumbers([panels, oagPrisms(profile, framing({ dec: 90 })), mosaicSizeDeg(profile, framing({ dec: 90 }))])
    expect(numbers.length).toBeGreaterThan(0)
    for (const value of numbers) expect(Number.isFinite(value), `liczba ${value}`).toBe(true)
  })

  it('narożniki paneli w kolejności LG, PG, PD, LD (strony kadru) i w [0, 360) dla RA', () => {
    // P9 utrwala kolejność narożników ramki; dla PA 0° lewa strona kadru to E (większe RA), góra to N.
    const [panel] = mosaicPanels(redcat(), framing({ cols: 1 }))
    const [tl, tr, br, bl] = panel.corners
    expect(tl.raDeg).toBeGreaterThan(tr.raDeg)
    expect(bl.raDeg).toBeGreaterThan(br.raDeg)
    expect(tl.decDeg).toBeGreaterThan(bl.decDeg)
    expect(tr.decDeg).toBeGreaterThan(br.decDeg)
  })
})

describe('geometria-kadru: rozmiar mozaiki i zakresy', () => {
  it('test_p7: 1×1 → 5,380° × 3,597° (jak T1); 2×1 z zakładką 20% → 9,668° × 3,597° (nie 9,684°)', () => {
    const single = mosaicSizeDeg(redcat(), framing({ cols: 1 }))
    expectAngle(single.widthDeg, 5.38, 'szerokość 1×1')
    expectAngle(single.heightDeg, 3.597, 'wysokość 1×1')
    const double = mosaicSizeDeg(redcat(), framing())
    expectAngle(double.widthDeg, 9.668, 'szerokość 2×1')
    expectAngle(double.heightDeg, 3.597, 'wysokość 2×1')
  })

  it('P7: zakładka 10% i 30% zmienia rozmiar i odległość paneli (wzór P7 i 7B)', () => {
    expectAngle(mosaicSizeDeg(redcat(), framing({ overlap: 10 })).widthDeg, 10.2027, 'szerokość przy 10%')
    expectAngle(mosaicSizeDeg(redcat(), framing({ overlap: 30 })).widthDeg, 9.1335, 'szerokość przy 30%')
    const at10 = mosaicPanels(redcat(), framing({ overlap: 10 }))
    const at30 = mosaicPanels(redcat(), framing({ overlap: 30 }))
    expectAngle(separationDeg(at10[0].center, at10[1].center), 4.8428, 'odległość przy 10%')
    expectAngle(separationDeg(at30[0].center, at30[1].center), 3.7675, 'odległość przy 30%')
  })

  it('P7: wiersze liczone jak kolumny – 1×3 z zakładką 25% → 5,380° × 8,978°', () => {
    const size = mosaicSizeDeg(redcat(), framing({ cols: 1, rows: 3, overlap: 25 }))
    expectAngle(size.widthDeg, 5.3801, 'szerokość')
    expectAngle(size.heightDeg, 8.978, 'wysokość')
  })

  it('wymiar [rad] = mm / F_eff: reduktor 0,8× powiększa pole, binning 2 go nie zmienia', () => {
    // „Styk z resztą”: F_eff z computeOptics = 250 · 0,8 = 200 mm.
    const reduced = { ...redcat(), reducerFactor: 0.8 }
    const size = mosaicSizeDeg(reduced, framing({ cols: 1 }))
    expectAngle(size.widthDeg, 6.7224, 'szerokość z reduktorem')
    expectAngle(size.heightDeg, 4.4959, 'wysokość z reduktorem')
    const panels = mosaicPanels(reduced, framing())
    expectAngle(separationDeg(panels[0].center, panels[1].center), 5.3801, 'odległość paneli z reduktorem')

    const base = redcat()
    const binned = { ...base, camera: { ...base.camera, binning: 2 as const } }
    const binnedSize = mosaicSizeDeg(binned, framing({ cols: 1 }))
    expectAngle(binnedSize.widthDeg, 5.38, 'szerokość przy binningu 2')
    expectAngle(binnedSize.heightDeg, 3.597, 'wysokość przy binningu 2')
  })

  it('test_p8: normalizeFraming przycina mozaikę i zakładkę i sprowadza PA do [0°, 360°)', () => {
    const low = normalizeFraming(framing({ cols: 0, rows: 0, overlap: 5, pa: -30 }))
    expect(low.mosaic).toEqual({ cols: 1, rows: 1, overlapPct: 10 })
    expectPa(low.paDeg, 330)
    expect(low.centerRaDeg).toBe(30)
    expect(low.centerDecDeg).toBe(0)

    const high = normalizeFraming(framing({ cols: 6, rows: 6, overlap: 40, pa: 360 }))
    expect(high.mosaic).toEqual({ cols: 5, rows: 5, overlapPct: 30 })
    expectPa(high.paDeg, 0)

    const edges = normalizeFraming(framing({ cols: 5, rows: 1, overlap: 10, pa: 0 }))
    expect(edges.mosaic).toEqual({ cols: 5, rows: 1, overlapPct: 10 })
    expect(normalizeFraming(framing({ cols: 1, rows: 5, overlap: 30, pa: 12.5 })).mosaic).toEqual({ cols: 1, rows: 5, overlapPct: 30 })
  })

  it('test_p8: wyniki liczą się z wartości przyciętych – 0×1 → 1 panel, 6×1 → 5, wiersze 0 → 1 i 6 → 5', () => {
    const one = mosaicPanels(redcat(), framing({ cols: 0, rows: 1 }))
    expect(one).toHaveLength(1)
    expectSky(one[0].center, 30, 0, 'jedyny panel')
    expect(mosaicPanels(redcat(), framing({ cols: 6, rows: 1 }))).toHaveLength(5)
    expect(mosaicPanels(redcat(), framing({ cols: 1, rows: 0 }))).toHaveLength(1)
    expect(mosaicPanels(redcat(), framing({ cols: 1, rows: 6 }))).toHaveLength(5)
    expect(mosaicPanels(redcat(), framing({ cols: 5, rows: 5, overlap: 30 }))).toHaveLength(25)
    const size0 = mosaicSizeDeg(redcat(), framing({ cols: 0, rows: 1 }))
    expectAngle(size0.widthDeg, 5.38, '0×1 jak 1×1')
  })

  it('test_p8: zakładka 5% liczy się jak 10%, 40% jak 30%; PA −30° jak 330°, PA 360° jak 0°', () => {
    expectAngle(mosaicSizeDeg(redcat(), framing({ overlap: 5 })).widthDeg, 10.2027, 'zakładka 5% → 10%')
    expectAngle(mosaicSizeDeg(redcat(), framing({ overlap: 40 })).widthDeg, 9.1335, 'zakładka 40% → 30%')
    expectPa(mosaicPanels(redcat(), framing({ cols: 1, pa: -30 }))[0].paDeg, 330, 'PA −30°')
    expectPa(mosaicPanels(redcat(), framing({ cols: 1, pa: 360 }))[0].paDeg, 0, 'PA 360°')
  })
})

describe('geometria-kadru: wycinek TAN', () => {
  const p9Cut = cutout(30, 0)

  it('test_p9_T24: Newton 150/600 + Ares-M Pro, 1×1, PA 0° – narożniki (230;230), (770;230), (770;770), (230;770)', () => {
    const panels = mosaicPanels(newton150(), framing({ cols: 1 }))
    expect(panels).toHaveLength(1)
    const px = panels[0].corners.map((corner) => skyToCutout(p9Cut, corner))
    expectPx(px[0], 230, 230, 'lewy górny')
    expectPx(px[1], 770, 230, 'prawy górny')
    expectPx(px[2], 770, 770, 'prawy dolny')
    expectPx(px[3], 230, 770, 'lewy dolny')
  })

  it('test_p10: mozaika 2×1 – panel 1 x 14–554, panel 2 x 446–986, y 230–770, pas zakładki 108 px', () => {
    const panels = mosaicPanels(newton150(), framing())
    expect(panels).toHaveLength(2)
    const first = pixelBox(p9Cut, panels[0].corners)
    const second = pixelBox(p9Cut, panels[1].corners)
    expectBox(first, [14, 554], [230, 770], 'panel 1')
    expectBox(second, [446, 986], [230, 770], 'panel 2')
    expectNear(first.xMax - second.xMin, 108, 1, 'szerokość pasa zakładki')
  })

  it('test_p11: wycinek 20° – RA 40° wypada w (0; 500), Dec −10° w (500; 1000)', () => {
    const cut = cutout(30, 0, 20)
    expectPx(skyToCutout(cut, { raDeg: 40, decDeg: 0 }), 0, 500, 'RA 40°')
    expectPx(skyToCutout(cut, { raDeg: 30, decDeg: -10 }), 500, 1000, 'Dec −10°')
    expectPx(skyToCutout(cut, { raDeg: 30, decDeg: 0 }), 500, 500, 'środek wycinka')
  })

  it('test_p12: wycinek 2000 × 1000 px, pole 20° dla dłuższego boku – RA 40° w (0; 500)', () => {
    const cut = cutout(30, 0, 20, 2000, 1000)
    expectPx(skyToCutout(cut, { raDeg: 40, decDeg: 0 }), 0, 500, 'RA 40°')
    expectPx(skyToCutout(cut, { raDeg: 20, decDeg: 0 }), 2000, 500, 'RA 20°')
  })

  it('test_p13: kadr z P9 przesunięty na Dec +0,2° na starym wycinku – górna krawędź y 130, dolna 670', () => {
    const [panel] = mosaicPanels(newton150(), framing({ cols: 1, dec: 0.2 }))
    const box = pixelBox(p9Cut, panel.corners)
    expectBox(box, [230, 770], [130, 670], 'kadr przesunięty')
  })

  it.each([
    { pa: 30, x: 365.0, y: 266.2 },
    { pa: 330, x: 635.0, y: 266.2 },
    { pa: 90, x: 230, y: 500 },
  ])('test_p14: PA $pa° – środek górnej krawędzi w ($x; $y) (obrót przeciwny do ruchu wskazówek zegara)', ({ pa, x, y }) => {
    const [panel] = mosaicPanels(newton150(), framing({ cols: 1, pa }))
    const [tl, tr] = panel.corners.map((corner) => skyToCutout(p9Cut, corner))
    expectPx({ x: (tl.x + tr.x) / 2, y: (tl.y + tr.y) / 2 }, x, y, 'środek górnej krawędzi')
  })

  it('test_p17: przesuwanie tła wokół M 42 – (400; 500) → RA 84,023°, (500; 400) → Dec −5,191°', () => {
    const cut = cutout(83.8221, -5.3911)
    expectSky(cutoutToSky(cut, { x: 400, y: 500 }), 84.023, -5.391, 'tło w prawo')
    expectSky(cutoutToSky(cut, { x: 500, y: 400 }), 83.822, -5.191, 'tło w dół')
    expectSky(cutoutToSky(cut, { x: 500, y: 500 }), 83.8221, -5.3911, 'środek wycinka')
  })

  it('cutoutToSky odwraca skyToCutout (ten sam rzut TAN) na wycinku 20°', () => {
    const cut = cutout(30, 0, 20)
    const sky = cutoutToSky(cut, { x: 0, y: 500 })
    expectSky(sky, 40, 0, 'lewy brzeg')
    expectSky(cutoutToSky(cut, { x: 500, y: 1000 }), 30, -10, 'dolny brzeg')
  })
})

describe('geometria-kadru: pryzmat OAG', () => {
  const p9Cut = cutout(30, 0)

  it.each([
    { label: 'kąt 0°, PA 0°', angle: 0, pa: 0, x: [309.0, 691.0], y: [22.6, 213.5] },
    { label: 'kąt 90°, PA 0° (na prawo od matrycy)', angle: 90, pa: 0, x: [786.5, 977.4], y: [309.0, 691.0] },
    { label: 'kąt 0°, PA 90° (obraca się z kadrem)', angle: 0, pa: 90, x: [22.6, 213.5], y: [309.0, 691.0] },
  ])('test_p15: $label', ({ angle, pa, x, y }) => {
    const profile = withOag(newton150(), { ...P15_OAG, angleDeg: angle })
    const prisms = oagPrisms(profile, framing({ cols: 1, pa }))
    expect(prisms).toHaveLength(1)
    expect(prisms[0]).toHaveLength(4)
    // Spec podaje tylko zakres x i y pryzmatu, więc kolejność punktów nie jest sprawdzana.
    expectBox(pixelBox(p9Cut, prisms[0]), [x[0], x[1]], [y[0], y[1]], 'pryzmat')
  })

  it('P15 (Pytania [Z20]): kąt 180° – pryzmat pod dolną krawędzią matrycy, x 309–691, y 786,5–977,4', () => {
    const profile = withOag(newton150(), { ...P15_OAG, angleDeg: 180 })
    const prisms = oagPrisms(profile, framing({ cols: 1 }))
    expect(prisms).toHaveLength(1)
    expectBox(pixelBox(p9Cut, prisms[0]), [309.0, 691.0], [786.5, 977.4], 'pryzmat')
  })

  it('test_p16: profil z oag: null nie ma prostokąta pryzmatu', () => {
    expect(newton150().oag).toBeNull()
    expect(oagPrisms(newton150(), framing({ cols: 1 }))).toEqual([])
    expect(oagPrisms(newton150(), framing())).toEqual([])
  })

  it('test_p16: mozaika 2×1 z OAG – dwa pryzmaty: x 93–475 i 525–907, oba y 22,6–213,5', () => {
    const prisms = oagPrisms(withOag(newton150(), P15_OAG), framing())
    expect(prisms).toHaveLength(2)
    expectBox(pixelBox(p9Cut, prisms[0]), [93.0, 475.0], [22.6, 213.5], 'pryzmat panelu 1')
    expectBox(pixelBox(p9Cut, prisms[1]), [525.0, 907.0], [22.6, 213.5], 'pryzmat panelu 2')
  })
})

describe('geometria-kadru: narożniki na płaszczyźnie stycznej środka kadru', () => {
  // „Styk z resztą” i „Pytania”: narożniki paneli i pryzmatu leżą na płaszczyźnie stycznej ŚRODKA KADRU
  // (środek panelu ± pół szerokości wzdłuż r ± pół wysokości wzdłuż u, potem rzut odwrotny ze środka kadru),
  // a nie na płaszczyźnie każdego panelu. Przy szerokim polu (RedCat 5×1) różnica dla skrajnego panelu to ok. 0,03–0,08°.
  it('RedCat 5×1, Dec 0°, PA 0° – narożniki panelu 1 (LG, PG, PD, LD) z płaszczyzny środka kadru', () => {
    const panels = mosaicPanels(redcat(), framing({ cols: 5 }))
    expect(panels).toHaveLength(5)
    const expected: [number, number][] = [[41.1631, 1.7647], [35.9015, 1.7892], [35.9015, -1.7892], [41.1631, -1.7647]]
    panels[0].corners.forEach((corner, k) => expectSky(corner, expected[k][0], expected[k][1], `narożnik ${k + 1}`))
  })

  it('RedCat 5×1, OAG 8 × 4 mm, 8 mm, kąt 270° – pryzmat panelu 1 z płaszczyzny środka kadru', () => {
    const prisms = oagPrisms(withOag(redcat(), { ...P15_OAG, angleDeg: 270 }), framing({ cols: 5 }))
    expect(prisms).toHaveLength(5)
    // Kolejność punktów pryzmatu nie jest w spec, więc sprawdzany jest zakres RA i Dec.
    const ra = prisms[0].map((p) => p.raDeg)
    const dec = prisms[0].map((p) => p.decDeg)
    expectAngle(Math.min(...ra), 39.8902, 'RA min')
    expectAngle(Math.max(...ra), 40.7774, 'RA max')
    expectAngle(Math.min(...dec), -0.903, 'Dec min')
    expectAngle(Math.max(...dec), 0.903, 'Dec max')
  })
})

// Kontrola pomocnicza: RA w [0, 360) również dla środka przy RA 0° (zawinięcie w drugą stronę).
describe('geometria-kadru: zawinięcie RA', () => {
  it('P5: środek RA 0° – panel zachodni ma RA 357,847° (nie −2,153°), wschodni 2,153°', () => {
    // Te same przesunięcia co w P3 (±2,1526° przy Dec 0°).
    const [east, west] = mosaicPanels(redcat(), framing({ ra: 0 }))
    expectRa(east.center.raDeg, 2.1526, 'panel wschodni')
    expectRa(west.center.raDeg, 357.8474, 'panel zachodni')
  })
})
