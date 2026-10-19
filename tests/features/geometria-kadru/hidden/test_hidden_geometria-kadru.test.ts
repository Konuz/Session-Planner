// Ukryte przypadki „geometria-kadru”: te same reguły co w testach widocznych, inne wartości
// (inne profile, środki, PA, zakładki, wycinki). Wartości policzone ze wzorów 7B i reguł P7/P8/P11/P12/P15.
import { describe, expect, it } from 'vitest'
import {
  cutoutToSky,
  mosaicPanels,
  mosaicSizeDeg,
  normalizeFraming,
  oagPrisms,
  skyToCutout,
} from '../../../../src/services/framing'
import {
  collectNumbers,
  cutout,
  esprit,
  expectAngle,
  expectBox,
  expectPa,
  expectPx,
  expectSky,
  framing,
  newton150,
  newton200,
  P15_OAG,
  pixelBox,
  redcat,
  separationDeg,
  withOag,
} from '../helpers'

describe('geometria-kadru (ukryte): panele', () => {
  it.each([
    { dec: 45, dRa: 4.2417, paEast: 1.4995, paWest: 358.5005 },
    { dec: 75, dRa: 11.5545, paEast: 5.5797, paWest: 354.4203 },
    { dec: -45, dRa: 4.2417, paEast: 358.5005, paWest: 1.4995 },
  ])('P1/P2: Esprit + ASI6200MM, 2×1, środek RA 100°, Dec $dec° – odległość 3,000°', ({ dec, dRa, paEast, paWest }) => {
    const [east, west] = mosaicPanels(esprit(), framing({ ra: 100, dec }))
    expectAngle(separationDeg(east.center, west.center), 3.0, 'odległość środków')
    expectAngle(east.center.raDeg - west.center.raDeg, dRa, 'różnica RA')
    expectPa(east.paDeg, paEast, 'PA wschodniego')
    expectPa(west.paDeg, paWest, 'PA zachodniego')
  })

  it('P3/P4: Esprit, 3×2, PA 45°, zakładka 30%, środek RA 200°, Dec 40° – środki i lokalne PA', () => {
    const panels = mosaicPanels(esprit(), framing({ ra: 200, dec: 40, pa: 45, cols: 3, rows: 2, overlap: 30 }))
    expect(panels).toHaveLength(6)
    expect(panels.map((p) => [p.col, p.row])).toEqual([[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]])
    const expected: [number, number, number][] = [
      [203.1712, 38.72, 46.9916],
      [200.8157, 40.6164, 45.5277],
      [198.3245, 42.4621, 43.9154],
      [201.5583, 37.5155, 45.9959],
      [199.1989, 39.378, 44.4884],
      [196.712, 41.1904, 42.84],
    ]
    panels.forEach((panel, k) => {
      expectSky(panel.center, expected[k][0], expected[k][1], `panel ${k + 1}`)
      expectPa(panel.paDeg, expected[k][2], `PA panelu ${k + 1}`)
    })
  })

  it('P3: PA 180°, 2×1 – pierwszy panel (lewa strona kadru) jest teraz zachodni', () => {
    const [first, second] = mosaicPanels(redcat(), framing({ pa: 180 }))
    expectSky(first.center, 27.8474, 0, 'panel 1')
    expectSky(second.center, 32.1526, 0, 'panel 2')
    expectPa(first.paDeg, 180)
  })

  it('P5: Esprit, środek RA 1° – panele RA 2,5° i 359,5°', () => {
    const [east, west] = mosaicPanels(esprit(), framing({ ra: 1 }))
    expectSky(east.center, 2.5, 0, 'wschodni')
    expectSky(west.center, 359.5, 0, 'zachodni')
  })

  it('P6: biegun południowy (Dec −90°, RA 50°), Esprit – RA 140° i 320°, Dec −88,5°, bez NaN', () => {
    const profile = withOag(esprit(), P15_OAG)
    const panels = mosaicPanels(profile, framing({ ra: 50, dec: -90 }))
    expectSky(panels[0].center, 140, -88.5, 'panel 1')
    expectSky(panels[1].center, 320, -88.5, 'panel 2')
    expectAngle(separationDeg(panels[0].center, panels[1].center), 3.0, 'odległość')
    for (const value of collectNumbers([panels, oagPrisms(profile, framing({ ra: 50, dec: -90 }))])) {
      expect(Number.isFinite(value)).toBe(true)
    }
  })
})

describe('geometria-kadru (ukryte): płaszczyzna styczna środka kadru', () => {
  const fr = framing({ ra: 150, dec: 50, pa: 20, cols: 5, rows: 3, overlap: 10 })

  it('Esprit 5×3, Dec 50°, PA 20°, zakładka 10% – narożniki panelu 1', () => {
    const panels = mosaicPanels(esprit(), fr)
    expect(panels).toHaveLength(15)
    const expected: [number, number][] = [[164.2762, 49.4556], [159.2261, 51.2599], [157.5036, 49.029], [162.4187, 47.3154]]
    panels[0].corners.forEach((corner, k) => expectSky(corner, expected[k][0], expected[k][1], `narożnik ${k + 1}`))
  })

  it('Esprit 5×3, OAG 10 × 5 mm, 20 mm, kąt 0° – zakres pryzmatu panelu 1', () => {
    const oag = { prismWidthMm: 10, prismHeightMm: 5, offsetFromCenterMm: 20, angleDeg: 0 }
    const prisms = oagPrisms(withOag(esprit(), oag), fr)
    expect(prisms).toHaveLength(15)
    const ra = prisms[0].map((p) => p.raDeg)
    const dec = prisms[0].map((p) => p.decDeg)
    expectAngle(Math.min(...ra), 161.5316, 'RA min')
    expectAngle(Math.max(...ra), 163.348, 'RA max')
    expectAngle(Math.min(...dec), 50.6205, 'Dec min')
    expectAngle(Math.max(...dec), 51.5791, 'Dec max')
  })
})

describe('geometria-kadru (ukryte): rozmiar i zakresy', () => {
  it('P7: Esprit 3×2 z zakładką 30% → 8,984° × 4,252°', () => {
    const size = mosaicSizeDeg(esprit(), framing({ cols: 3, rows: 2, overlap: 30 }))
    expectAngle(size.widthDeg, 8.9836, 'szerokość')
    expectAngle(size.heightDeg, 4.2517, 'wysokość')
  })

  it('P8: 9×7 z zakładką 50% liczy się jak 5×5 z 30%; PA 725° → 5°, PA −390° → 330°', () => {
    const size = mosaicSizeDeg(redcat(), framing({ cols: 9, rows: 7, overlap: 50 }))
    expectAngle(size.widthDeg, 20.2462, 'szerokość')
    expectAngle(size.heightDeg, 13.6102, 'wysokość')
    expect(mosaicPanels(redcat(), framing({ cols: 9, rows: 7, overlap: 50 }))).toHaveLength(25)
    const n = normalizeFraming(framing({ ra: 123.4, dec: -12.5, cols: -2, rows: 3, overlap: 0, pa: 725 }))
    expect(n.mosaic).toEqual({ cols: 1, rows: 3, overlapPct: 10 })
    expectPa(n.paDeg, 5)
    expect(n.centerRaDeg).toBe(123.4)
    expect(n.centerDecDeg).toBe(-12.5)
    expectPa(normalizeFraming(framing({ pa: -390 })).paDeg, 330)
    expect(normalizeFraming(framing({ cols: 3, rows: 4, overlap: 25 })).mosaic).toEqual({ cols: 3, rows: 4, overlapPct: 25 })
  })
})

describe('geometria-kadru (ukryte): wycinek', () => {
  const cut1 = cutout(30, 0, 1, 800)

  it('P9: Newton 200/1000 + ASI533MM na wycinku 1° 800 px – narożniki 140,8 i 659,2', () => {
    const [panel] = mosaicPanels(newton200(), framing({ cols: 1 }))
    const px = panel.corners.map((corner) => skyToCutout(cut1, corner))
    expectPx(px[0], 140.8, 140.8, 'LG')
    expectPx(px[1], 659.2, 140.8, 'PG')
    expectPx(px[2], 659.2, 659.2, 'PD')
    expectPx(px[3], 140.8, 659.2, 'LD')
  })

  it('P10: Newton 200, 2×2 z zakładką 25% na wycinku 1° 800 px', () => {
    const panels = mosaicPanels(newton200(), framing({ cols: 2, rows: 2, overlap: 25 }))
    expect(panels).toHaveLength(4)
    const boxes: [[number, number], [number, number]][] = [
      [[-53.6, 464.8], [-53.6, 464.8]],
      [[335.2, 853.6], [-53.6, 464.8]],
      [[-53.6, 464.8], [335.2, 853.6]],
      [[335.2, 853.6], [335.2, 853.6]],
    ]
    panels.forEach((panel, k) => expectBox(pixelBox(cut1, panel.corners), boxes[k][0], boxes[k][1], `panel ${k + 1}`))
  })

  it('P11: wycinek 10° 600 px, środek RA 120° – RA 125° w (0; 300), Dec +5° w (300; 0)', () => {
    const cut = cutout(120, 0, 10, 600)
    expectPx(skyToCutout(cut, { raDeg: 125, decDeg: 0 }), 0, 300)
    expectPx(skyToCutout(cut, { raDeg: 120, decDeg: 5 }), 300, 0)
  })

  it('P12: wycinek pionowy 1000 × 2000 px, pole 20° dla wysokości – Dec +10° w (500; 0), RA 40° w (−500; 1000)', () => {
    const cut = cutout(30, 0, 20, 1000, 2000)
    expectPx(skyToCutout(cut, { raDeg: 30, decDeg: 10 }), 500, 0)
    expectPx(skyToCutout(cut, { raDeg: 40, decDeg: 0 }), -500, 1000)
  })

  it('P13: kadr z P9 przesunięty na RA 30,3° na starym wycinku – x 80–620', () => {
    const [panel] = mosaicPanels(newton150(), framing({ cols: 1, ra: 30.3 }))
    expectBox(pixelBox(cutout(30, 0), panel.corners), [80, 620], [230, 770], 'kadr')
  })

  it.each([
    { pa: 60, x: 175.5, y: 270.4 },
    { pa: 270, x: 659.2, y: 400 },
  ])('P14: Newton 200 na wycinku 1° 800 px, PA $pa° – środek górnej krawędzi ($x; $y)', ({ pa, x, y }) => {
    const [panel] = mosaicPanels(newton200(), framing({ cols: 1, pa }))
    const [tl, tr] = panel.corners.map((corner) => skyToCutout(cut1, corner))
    expectPx({ x: (tl.x + tr.x) / 2, y: (tl.y + tr.y) / 2 }, x, y)
  })

  it('P17: M 31 na wycinku 1200 × 800 px, pole 3° – przesuwanie tła', () => {
    const cut = cutout(10.6847, 41.2687, 3, 1200, 800)
    expectSky(cutoutToSky(cut, { x: 500, y: 400 }), 11.0174, 41.2682, 'tło w prawo')
    expectSky(cutoutToSky(cut, { x: 600, y: 300 }), 10.6847, 41.5188, 'tło w dół')
    expectSky(cutoutToSky(cut, { x: 700, y: 400 }), 10.352, 41.2682, 'tło w lewo')
  })

  it('cutoutToSky i skyToCutout są wzajemnie odwrotne przy Dec 60°', () => {
    const cut = cutout(250, 60, 4)
    const sky = cutoutToSky(cut, { x: 123, y: 789 })
    expectSky(sky, 252.9128, 58.8109)
    expectPx(skyToCutout(cut, sky), 123, 789)
  })
})

describe('geometria-kadru (ukryte): OAG', () => {
  const cut = cutout(30, 0)

  it('P15: kąt 270° – pryzmat na lewo od matrycy: x 22,6–213,5, y 309–691', () => {
    const prisms = oagPrisms(withOag(newton150(), { ...P15_OAG, angleDeg: 270 }), framing({ cols: 1 }))
    expect(prisms).toHaveLength(1)
    expectBox(pixelBox(cut, prisms[0]), [22.6, 213.5], [309.0, 691.0], 'pryzmat')
  })

  it('P15: pryzmat 6 × 3 mm, odsunięcie 9 mm, kąt 0° – x 356,8–643,2, y −1,3–141,9', () => {
    const oag = { prismWidthMm: 6, prismHeightMm: 3, offsetFromCenterMm: 9, angleDeg: 0 }
    const prisms = oagPrisms(withOag(newton150(), oag), framing({ cols: 1 }))
    expectBox(pixelBox(cut, prisms[0]), [356.8, 643.2], [-1.3, 141.9], 'pryzmat')
  })

  it('P16: mozaika 1×2 z OAG pod kątem 270° – dwa pryzmaty, po jednym przy każdym panelu', () => {
    const prisms = oagPrisms(withOag(newton150(), { ...P15_OAG, angleDeg: 270 }), framing({ cols: 1, rows: 2 }))
    expect(prisms).toHaveLength(2)
    expectBox(pixelBox(cut, prisms[0]), [22.6, 213.5], [93.0, 475.0], 'pryzmat 1')
    expectBox(pixelBox(cut, prisms[1]), [22.6, 213.5], [525.0, 907.0], 'pryzmat 2')
  })

  it('P16: Esprit z oag: null w mozaice 3×2 – brak pryzmatów', () => {
    expect(oagPrisms(esprit(), framing({ cols: 3, rows: 2 }))).toEqual([])
  })
})
