// Ukryte testy funkcji „tlo-mapy”: te same reguły co w testach widocznych, ale z innymi wartościami (inny środek,
// inne pole, inne jasności, biegun południowy, siatka wokół M 42). Oczekiwane położenia z rzutu TAN (`skyToCutout`)
// albo policzone programem (zaczepienia opisów przy M 42).
import { describe, expect, it } from 'vitest'
import { mapBackground, starRadius } from '../../../../src/features/framing/mapBackground'
import { skyToCutout } from '../../../../src/services/framing'
import {
  ARCMIN,
  RA_MIN,
  RA_SEC,
  cutout,
  distanceToPolyline,
  expectDense,
  expectGridFinite,
  expectLineFollowsSky,
  expectNear,
  expectPoint,
  gridStar,
  key,
  labelsOf,
  lineByLabel,
  linesOf,
  ruleRadius,
  star,
  stepOf,
} from '../helpers'

const R_TOL = 0.01
const STEP_TOL = 1e-6

describe('tlo-mapy (ukryte): gwiazdy', () => {
  it('test_hidden_p1_rzut_wokol_m42', () => {
    const cut = cutout(83.8187, -5.3897, 3.05)
    const input = [star(83.8187, -5.3897, 4), star(84.3, -5.0, 6), star(83.2, -6.1, 7), star(84.9, -4.2, 9)]
    const { stars } = mapBackground(input, cut)
    expect(stars).toHaveLength(4)
    for (const s of input) {
      const p = skyToCutout(cut, s)
      const dot = stars.find((d) => Math.abs(d.x - p.x) <= 1 && Math.abs(d.y - p.y) <= 1)
      expectPoint(dot, p.x, p.y, 1, `gwiazda (${s.raDeg}; ${s.decDeg})`)
      expectNear(dot!.radius, ruleRadius(s.mag), R_TOL, `promień V ${s.mag}`)
    }
  })

  it('test_hidden_p2_brzegi_lewy_prawy_i_dolny', () => {
    const cut = cutout(0, 0, 2)
    const inside = [star(0.99, 0, 6), star(359.01, 0, 6), star(0, -0.99, 6)]
    const outside = [star(1.01, 0, 6), star(358.99, 0, 6), star(0, -1.01, 6)]
    const { stars } = mapBackground([...outside, ...inside], cut)
    expect(stars).toHaveLength(3)
    expectPoint(stars.find((d) => d.x < 100), 5, 500, 1, 'RA 0,99° przy lewym brzegu')
    expectPoint(stars.find((d) => d.x > 900), 995, 500, 1, 'RA 359,01° przy prawym brzegu')
    expectPoint(stars.find((d) => d.y > 900), 500, 995, 1, 'Dec −0,99° przy dolnym brzegu')
  })

  it('test_hidden_p3_przejscie_przez_ra_0_z_drugiej_strony', () => {
    const cut = cutout(359.6, 10, 2)
    const s = star(0.3, 10.2, 5)
    const { stars } = mapBackground([s], cut)
    expect(stars).toHaveLength(1)
    const p = skyToCutout(cut, s)
    expectPoint(stars[0], p.x, p.y, 1, 'RA 0,3° przy środku RA 359,6°')
    expect(p.x).toBeLessThan(500)
  })

  it('test_hidden_p4_punkty_90_stopni_i_dalej_bez_kropek', () => {
    const cut = cutout(83.8, -5.4, 2)
    const far = [star(263.8, 5.4, 1), star(173.8, 0, 1), star(83.8, 84.6, 1), star(300, 40, 1)]
    const result = mapBackground([...far, star(83.8, -5.4, 6)], cut)
    expect(result.stars).toHaveLength(1)
    expectPoint(result.stars[0], 500, 500, 1, 'gwiazda w środku')
    expectGridFinite(result.grid)
  })

  it('test_hidden_p5_inne_jasnosci', () => {
    const cases: [number, number][] = [
      [9, 1.6],
      [7.5, 2.5],
      [1, 6.4],
      [-0.5, 7.3],
      [-1.66666, 8],
      [12, 1],
      [-5, 8],
      [9.9, 1.06],
    ]
    for (const [mag, radius] of cases) expectNear(starRadius(mag), radius, R_TOL, `starRadius(V ${mag})`)
  })

  it('test_hidden_p6_remis_jasnosci_decyduje_kolejnosc_wejscia', () => {
    const cut = cutout(0, 0, 2)
    const input = Array.from({ length: 3005 }, (_, i) => gridStar(i, 8.5))
    const { stars } = mapBackground(input, cut)
    expect(stars).toHaveLength(3000)
    expect(new Set(stars.map(key)), 'pierwsze 3000 gwiazd z listy').toEqual(new Set(input.slice(0, 3000).map((s) => key(skyToCutout(cut, s)))))
  })

  it('test_hidden_p6_gwiazdy_poza_widokiem_nie_zajmuja_limitu', () => {
    const cut = cutout(0, 0, 2)
    const outsideBright = Array.from({ length: 20 }, (_, i) => star(2 + i * 0.1, 0, 1))
    const inside = Array.from({ length: 3000 }, (_, i) => gridStar(i, 9.0))
    const { stars } = mapBackground([...outsideBright, ...inside], cut)
    expect(stars).toHaveLength(3000)
    expect(stars.every((d) => Math.abs(d.radius - 1.6) <= R_TOL), 'tylko gwiazdy z widoku').toBe(true)
  })

  it('test_hidden_p6_mniej_niz_limit_wszystkie', () => {
    const input = Array.from({ length: 1234 }, (_, i) => gridStar(i, 3 + (i % 7)))
    expect(mapBackground(input, cutout(0, 0, 2)).stars).toHaveLength(1234)
  })

  it('test_hidden_p7_kolejnosc_czterech_gwiazd', () => {
    const cut = cutout(120, 30, 3)
    const input = [star(120, 30, 6), star(120.5, 30.2, 2), star(119.6, 29.7, 9), star(120.2, 30.6, 4)]
    const { stars } = mapBackground(input, cut)
    expect(stars).toHaveLength(4)
    ;[input[2], input[0], input[3], input[1]].forEach((s, i) => {
      const p = skyToCutout(cut, s)
      expectPoint(stars[i], p.x, p.y, 1, `kropka ${i + 1}`)
      expectNear(stars[i].radius, ruleRadius(s.mag), R_TOL, `kropka ${i + 1} promień`)
    })
  })
})

describe('tlo-mapy (ukryte): siatka', () => {
  const steps = (fov: number, dec = 0, ra = 0) => {
    const { grid } = mapBackground([], cutout(ra, dec, fov))
    return { dec: stepOf(grid, 'dec'), ra: stepOf(grid, 'ra', ra) }
  }

  it('test_hidden_p8_kroki_inne_pola', () => {
    expectNear(steps(0.9).dec, 10 * ARCMIN, STEP_TOL, 'pole 0,9°: Dec 10′')
    expectNear(steps(0.9).ra, RA_MIN, STEP_TOL, 'pole 0,9°: RA 1m')
    expectNear(steps(40, 0, 200).dec, 10, STEP_TOL, 'pole 40°: Dec 10°')
    expectNear(steps(40, 0, 200).ra, 30 * RA_MIN, STEP_TOL, 'pole 40°: RA 30m')
    expectNear(steps(0.19).ra, 10 * RA_SEC, STEP_TOL, 'pole 0,19°: RA 10s')
    expectNear(steps(0.19).dec, 2 * ARCMIN, STEP_TOL, 'pole 0,19°: Dec 2′')
  })

  it('test_hidden_p10_dec_45_i_biegun_poludniowy', () => {
    expectNear(steps(2, 45, 50).ra, 2 * RA_MIN, STEP_TOL, 'Dec 45°, pole 2°: RA 2m (0,5° × cos 45° ≥ 1/3°)')
    expectNear(steps(2, -60, 50).ra, 5 * RA_MIN, STEP_TOL, 'Dec −60°, pole 2°: RA 5m')
  })

  it('test_hidden_p11_zaczepienia_innych_linii', () => {
    const cut = cutout(0, 0, 2.4)
    const { grid } = mapBackground([], cut)
    expectPoint(lineByLabel(grid, '0h 02m').labelAnchor, 291.7, 1000, 1, '„0h 02m”')
    expectPoint(lineByLabel(grid, '23h 58m').labelAnchor, 708.3, 1000, 1, '„23h 58m”')
    expectPoint(lineByLabel(grid, '+0°30′').labelAnchor, 0, 291.6, 1, '„+0°30′”')
    expectPoint(lineByLabel(grid, '+1°00′').labelAnchor, 0, 83.3, 1, '„+1°00′”')
    expectPoint(lineByLabel(grid, '−0°30′').labelAnchor, 0, 708.4, 1, '„−0°30′”')
  })

  it('test_hidden_p11_siatka_wokol_m42', () => {
    const cut = cutout(83.81867, -5.38967, 2.4)
    const { grid } = mapBackground([], cut)
    expect(labelsOf(grid, 'ra')).toEqual(['5h 32m', '5h 34m', '5h 36m', '5h 38m', '5h 40m'])
    expect(labelsOf(grid, 'dec')).toEqual(['−4°30′', '−5°00′', '−5°30′', '−6°00′', '−6°30′'].sort())
    for (const line of grid) expectLineFollowsSky(line, cut)
    expectPoint(lineByLabel(grid, '5h 34m').labelAnchor, 631.9, 1000, 1, '„5h 34m”')
    expectPoint(lineByLabel(grid, '5h 36m').labelAnchor, 424.9, 1000, 1, '„5h 36m”')
    expectPoint(lineByLabel(grid, '−5°00′').labelAnchor, 0, 338.1, 1, '„−5°00′”')
    expectPoint(lineByLabel(grid, '−4°30′').labelAnchor, 0, 129.7, 1, '„−4°30′”')
    expectDense(grid)
  })

  it('test_hidden_p11_inne_opisy', () => {
    // M 31: Dec 41,27°, pole 0,2° → krok RA 15s (10s × cos 41,27° < 0,2°/6); linia 0h 42m 45s.
    const m31 = mapBackground([], cutout(10.68479, 41.26906, 0.2)).grid
    expect(labelsOf(m31, 'ra')).toContain('0h 42m 45s')
    expectNear(stepOf(m31, 'ra', 10.68), 15 * RA_SEC, STEP_TOL, 'krok RA 15s')
    const wide = labelsOf(mapBackground([], cutout(0, 30, 40)).grid, 'dec')
    expect(wide).toEqual(expect.arrayContaining(['+20°', '+30°', '+40°']))
    const south = labelsOf(mapBackground([], cutout(0, -20, 40)).grid, 'dec')
    expect(south).toEqual(expect.arrayContaining(['−10°', '−20°', '−30°']))
  })

  it('test_hidden_p12_biegun_poludniowy', () => {
    const cut = cutout(45, -90, 10)
    const { grid } = mapBackground([], cut)
    expectGridFinite(grid)
    expect(linesOf(grid, 'ra')).toHaveLength(12)
    expect(labelsOf(grid, 'dec')).toEqual(['−84°', '−86°', '−88°'].sort())
    for (const line of linesOf(grid, 'ra')) {
      expect(distanceToPolyline({ x: 500, y: 500 }, line.points), `${line.label} dochodzi do bieguna`).toBeLessThanOrEqual(1)
    }
    for (const line of grid) expectLineFollowsSky(line, cut)
    expectDense(grid)
  })

  it('test_hidden_p13_gestosc_przy_polu_60', () => {
    const { grid } = mapBackground([], cutout(30, 30, 60))
    expectGridFinite(grid)
    expectDense(grid)
  })
})
