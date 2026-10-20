// Testy funkcji „tlo-mapy” (spec: .autoloop/features/tlo-mapy/spec.md): model tła (gwiazdy i siatka RA/Dec)
// i jego rysunek w `FramingView`. Zakładka (wczytanie gwiazd, Red Mode) jest w tlo-mapy-tab.test.ts.
//
// Model: `mapBackground(stars, cutout)` z src/features/framing/mapBackground.ts (nazwy w helpers.ts). Gwiazdy podaje
// się parametrem, bez pliku `stars.v1.bin`. Widok renderuje renderer haków z tests/features/zoom-kadru/hookRenderer.ts
// (drzewo elementów z właściwościami, bez DOM).
//
// Liczby ze spec sprawdzone programem (rzut TAN jak `skyToCutout`): P1 250,02 i 749,98; P2 y = 5,00 i −5,00;
// P3 849,98; P11 916,65 / 708,31 / 291,69 / 83,35; P12 600,67 / 399,63 / 199,57 i 803,2. Spec zaokrągla promień
// dla V −1,46 do 7,9; z reguły wychodzi 7,876 i tak sprawdza test (±0,01, bo przy ±1 przycięcia z P5 by nie odpadały).
import { createElement } from 'react'
import { describe, expect, it } from 'vitest'
import { DEMO_PROFILES } from '../../../src/data/demo'
import { mapBackground, starRadius, type GridLine } from '../../../src/features/framing/mapBackground'
import { FramingView, type FramingViewProps } from '../../../src/features/framing/FramingView'
import type { FallbackMapObject } from '../../../src/features/framing/fallbackMap'
import { skyToCutout } from '../../../src/services/framing'
import type { Star } from '../../../src/services/stars'
import type { EquipmentProfile, Framing } from '../../../src/types'
import { HookRenderer, ancestorsOf, descendantsOf, textOf, type HostElement } from '../zoom-kadru/hookRenderer'
import {
  ARCMIN,
  RA_HOUR,
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
  star,
  stepOf,
} from './helpers'

const R_TOL = 0.01
const STEP_TOL = 1e-6

function findDot(dots: readonly { x: number; y: number; radius: number }[], x: number, y: number) {
  return dots.find((dot) => Math.abs(dot.x - x) <= 1 && Math.abs(dot.y - y) <= 1)
}

// ---------- Gwiazdy ----------

describe('tlo-mapy: gwiazdy w tle', () => {
  it('test_p1_rzut_gwiazd_na_widok', () => {
    const cut = cutout(0, 0, 2)
    const { stars } = mapBackground([star(0, 0, 5), star(0, 0.5, 5), star(359.5, 0, 5)], cut)
    expect(stars).toHaveLength(3)
    expectPoint(findDot(stars, 500, 500), 500, 500, 1, 'gwiazda (0°; 0°)')
    expectPoint(findDot(stars, 500, 250), 500, 250.0, 1, 'gwiazda (0°; +0,5°)')
    expectPoint(findDot(stars, 750, 500), 750.0, 500, 1, 'gwiazda (359,5°; 0°)')
  })

  it('test_p2_brzeg_pola_u_gory', () => {
    const cut = cutout(0, 0, 2)
    const inside = mapBackground([star(0, 0.99, 6)], cut).stars
    expect(inside, 'Dec +0,99° (y ≈ 5) jest w tle').toHaveLength(1)
    expectPoint(inside[0], 500, 5, 1, 'Dec +0,99°')
    expect(mapBackground([star(0, 1.01, 6)], cut).stars, 'Dec +1,01° (y ≈ −5) nie jest w tle').toHaveLength(0)
    const both = mapBackground([star(0, 1.01, 6), star(0, 0.99, 6)], cut).stars
    expect(both).toHaveLength(1)
    expectPoint(both[0], 500, 5, 1, 'z pary zostaje tylko Dec +0,99°')
  })

  it('test_p3_przejscie_przez_ra_0', () => {
    const { stars } = mapBackground([star(359.8, 0, 5)], cutout(0.5, 0, 2))
    expect(stars).toHaveLength(1)
    expectPoint(stars[0], 850.0, 500, 1, 'RA 359,8°')
  })

  it('test_p4_druga_strona_nieba_bez_kropki_i_bez_nan', () => {
    const cut = cutout(0, 0, 2)
    const result = mapBackground([star(180, 0, 3)], cut)
    expect(result.stars, 'punkt przeciwległy do środka nie ma kropki').toHaveLength(0)
    expectGridFinite(result.grid)
    const mixed = mapBackground([star(180, 0, 3), star(0, 0, 4)], cut)
    expect(mixed.stars).toHaveLength(1)
    expectPoint(mixed.stars[0], 500, 500, 1, 'gwiazda w środku obok przeciwległej')
    for (const dot of mixed.stars) {
      expect([dot.x, dot.y, dot.radius].every(Number.isFinite), 'kropka bez NaN i nieskończoności').toBe(true)
    }
  })

  it('test_p5_promienie_kropek', () => {
    const cases: [number, number][] = [
      [10, 1],
      [5, 4],
      [0, 7],
      [-1.46, 7.876], // spec: „7,9” (zaokrąglone); 1 + 0,6·11,46 = 7,876
      [-2, 8],
      [10.5, 1],
    ]
    for (const [mag, radius] of cases) expectNear(starRadius(mag), radius, R_TOL, `starRadius(V ${mag})`)
  })

  it('test_p5_promien_kropki_w_wyniku_modelu', () => {
    const cut = cutout(0, 0, 2)
    for (const [mag, radius] of [[5, 4], [-2, 8], [10.5, 1]] as const) {
      const { stars } = mapBackground([star(0, 0, mag)], cut)
      expect(stars).toHaveLength(1)
      expectNear(stars[0].radius, radius, R_TOL, `kropka V ${mag}`)
    }
  })

  it('test_p6_limit_3000_najjasniejszych', () => {
    const bright = Array.from({ length: 3000 }, (_, i) => gridStar(i, 9.0))
    const faint = Array.from({ length: 5 }, (_, i) => gridStar(3000 + i, 9.5))
    const cut = cutout(0, 0, 2)
    const { stars } = mapBackground([...bright, ...faint], cut)
    expect(stars).toHaveLength(3000)
    expect(stars.every((dot) => Math.abs(dot.radius - 1.6) <= R_TOL), 'wszystkie kropki z V 9,0 (promień 1,6)').toBe(true)
    const expected = new Set(bright.map((s) => key(skyToCutout(cut, s))))
    expect(new Set(stars.map(key)), 'kropki to dokładnie gwiazdy V 9,0').toEqual(expected)
  })

  it('test_p6_limit_niezaleznie_od_kolejnosci_wejscia', () => {
    const bright = Array.from({ length: 3000 }, (_, i) => gridStar(i + 5, 9.0))
    const faint = Array.from({ length: 5 }, (_, i) => gridStar(i, 9.5))
    const { stars } = mapBackground([...faint, ...bright], cutout(0, 0, 2))
    expect(stars).toHaveLength(3000)
    expect(stars.every((dot) => Math.abs(dot.radius - 1.6) <= R_TOL), 'słabsze V 9,5 podane najpierw odpadają').toBe(true)
  })

  it('test_p6_bez_gwiazd_pusty_wynik_a_siatka_zostaje', () => {
    const result = mapBackground([], cutout(0, 0, 2))
    expect(result.stars).toEqual([])
    expect(result.grid.length, 'siatka nie zależy od gwiazd').toBeGreaterThan(0)
  })

  it('test_p7_kolejnosc_od_najslabszej', () => {
    const input = [star(0, 0, 3), star(0.3, 0, 8), star(0, 0.3, 5)]
    const cut = cutout(0, 0, 2)
    const { stars } = mapBackground(input, cut)
    expect(stars).toHaveLength(3)
    const radii = stars.map((dot) => dot.radius)
    ;[2.2, 4, 5.2].forEach((radius, i) => expectNear(radii[i], radius, R_TOL, `kropka ${i + 1}`))
    const order = [input[1], input[2], input[0]].map((s) => skyToCutout(cut, s))
    order.forEach((p, i) => expectPoint(stars[i], p.x, p.y, 1, `kropka ${i + 1} na swojej gwieździe`))
  })
})

// ---------- Siatka: kroki ----------

describe('tlo-mapy: kroki siatki', () => {
  const steps = (fov: number, dec = 0, ra = 0) => {
    const { grid } = mapBackground([], cutout(ra, dec, fov))
    return { dec: stepOf(grid, 'dec'), ra: stepOf(grid, 'ra', ra) }
  }

  it('test_p8_kroki_przy_dec_0', () => {
    const cases: [number, number, number][] = [
      [0.5, 5 * ARCMIN, 30 * RA_SEC],
      [2, 30 * ARCMIN, 2 * RA_MIN],
      [20, 5, 15 * RA_MIN],
      [60, 10, RA_HOUR],
    ]
    for (const [fov, dec, ra] of cases) {
      const got = steps(fov)
      expectNear(got.dec, dec, STEP_TOL, `pole ${fov}°: krok Dec`)
      expectNear(got.ra, ra, STEP_TOL, `pole ${fov}°: krok RA`)
    }
  })

  it('test_p9_kroki_przy_progach', () => {
    expectNear(steps(2.9).ra, 2 * RA_MIN, STEP_TOL, 'pole 2,9°: RA 2m')
    expectNear(steps(3.1).ra, 5 * RA_MIN, STEP_TOL, 'pole 3,1°: RA 5m')
    expectNear(steps(5.9).dec, 1, STEP_TOL, 'pole 5,9°: Dec 1°')
    expectNear(steps(6.1).dec, 2, STEP_TOL, 'pole 6,1°: Dec 2°')
  })

  it('test_p10_wysokie_dec_krok_ra', () => {
    expectNear(steps(2, 60).ra, 5 * RA_MIN, STEP_TOL, 'Dec 60°, pole 2°: RA 5m')
    expectNear(steps(2, 60).dec, 30 * ARCMIN, STEP_TOL, 'Dec 60°, pole 2°: Dec 30′')
  })
})

// ---------- Siatka: P11 ----------

describe('tlo-mapy: siatka P11 (RA 0°, Dec 0°, pole 2,4°)', () => {
  const cut = cutout(0, 0, 2.4)
  const grid = (): GridLine[] => mapBackground([], cut).grid

  it('test_p11_poludniki_polozenie_i_opisy', () => {
    const lines = grid()
    const meridians = linesOf(lines, 'ra')
    expect(meridians, 'dokładnie 5 południków').toHaveLength(5)
    const raValues = meridians.map((line) => line.valueDeg).sort((a, b) => a - b)
    ;[0, 0.5, 1, 359, 359.5].forEach((value, i) => expectNear(raValues[i], value, 1e-6, `południk ${i + 1}`))
    const expected: [string, number, number][] = [
      ['23h 56m', 359, 916.6],
      ['23h 58m', 359.5, 708.3],
      ['0h 00m', 0, 500],
      ['0h 02m', 0.5, 291.7],
      ['0h 04m', 1, 83.4],
    ]
    expect(labelsOf(lines, 'ra')).toEqual(expected.map(([label]) => label).sort())
    for (const [label, value, x] of expected) {
      const line = lineByLabel(meridians, label)
      expectNear(line.valueDeg, value, 1e-6, `${label}: RA`)
      for (const y of [10, 250, 500, 750, 990]) {
        const d = distanceToPolyline({ x, y }, line.points)
        expect(d, `${label}: pionowa linia w x ≈ ${x} (y = ${y})`).toBeLessThanOrEqual(1)
      }
      expectLineFollowsSky(line, cut)
    }
  })

  it('test_p11_zaczepienie_opisu_poludnika_0h', () => {
    expectPoint(lineByLabel(grid(), '0h 00m').labelAnchor, 500, 1000, 1, 'zaczepienie „0h 00m”')
  })

  it('test_p11_rownolezniki_i_rownik', () => {
    const lines = grid()
    const parallels = linesOf(lines, 'dec')
    expect(parallels, 'dokładnie 5 równoleżników: −1°, −0,5°, 0°, +0,5°, +1°').toHaveLength(5)
    const decValues = parallels.map((line) => line.valueDeg).sort((a, b) => a - b)
    ;[-1, -0.5, 0, 0.5, 1].forEach((value, i) => expectNear(decValues[i], value, 1e-6, `równoleżnik ${i + 1}`))
    // Opisy −1°00′, −0°30′ i +1°00′ wynikają z reguły „krok < 1° → ±D°MM′” (P11 podaje 0°00′ i +0°30′).
    expect(labelsOf(lines, 'dec')).toEqual(['+0°30′', '+1°00′', '0°00′', '−0°30′', '−1°00′'].sort())
    const equator = lineByLabel(parallels, '0°00′')
    for (const x of [10, 250, 500, 750, 990]) {
      expect(distanceToPolyline({ x, y: 500 }, equator.points), `równik y = 500 (x = ${x})`).toBeLessThanOrEqual(1)
    }
    expectPoint(equator.labelAnchor, 0, 500, 1, 'zaczepienie „0°00′”')
    const half = lineByLabel(parallels, '+0°30′')
    expect(distanceToPolyline({ x: 500, y: 291.7 }, half.points), '+0°30′ w środkowej kolumnie y ≈ 291,7').toBeLessThanOrEqual(1)
    for (const line of parallels) expectLineFollowsSky(line, cut)
  })

  it('test_p11_bez_rownoleznika_1_5', () => {
    const values = linesOf(grid(), 'dec').map((line) => line.valueDeg)
    expect(values.some((value) => Math.abs(Math.abs(value) - 1.5) < 1e-6), 'równoleżnika ±1,5° nie ma').toBe(false)
  })
})

// ---------- Siatka: P12, P13 ----------

describe('tlo-mapy: biegun w widoku (P12) i gęstość (P13)', () => {
  const cut = cutout(0, 90, 10)

  it('test_p12_poludniki_zbiegaja_sie_w_biegunie', () => {
    const { grid } = mapBackground([], cut)
    expectGridFinite(grid)
    const meridians = linesOf(grid, 'ra')
    expect(meridians, '12 południków co 2h').toHaveLength(12)
    const values = meridians.map((line) => line.valueDeg).sort((a, b) => a - b)
    values.forEach((value, i) => expectNear(value, i * 30, 1e-6, `południk ${i}`))
    const hours = Array.from({ length: 12 }, (_, i) => `${i * 2}h 00m`)
    expect(labelsOf(grid, 'ra')).toEqual(hours.sort())
    for (const line of meridians) {
      expect(distanceToPolyline({ x: 500, y: 500 }, line.points), `${line.label} dochodzi do (500; 500)`).toBeLessThanOrEqual(1)
      expectLineFollowsSky(line, cut)
    }
  })

  it('test_p12_rownolezniki_okregi_wokol_bieguna', () => {
    const { grid } = mapBackground([], cut)
    const parallels = linesOf(grid, 'dec')
    expect(parallels, 'tylko +84°, +86°, +88° (bez +82° i +90°)').toHaveLength(3)
    expect(labelsOf(grid, 'dec')).toEqual(['+84°', '+86°', '+88°'])
    for (const [label, radius] of [['+84°', 600.7], ['+86°', 399.6], ['+88°', 199.6]] as const) {
      const line = lineByLabel(parallels, label)
      for (const angle of [0, 45, 90, 135, 180, 225, 270, 315]) {
        const p = { x: 500 + radius * Math.cos((angle * Math.PI) / 180), y: 500 + radius * Math.sin((angle * Math.PI) / 180) }
        if (p.x < 0 || p.x > 1000 || p.y < 0 || p.y > 1000) continue
        expect(distanceToPolyline(p, line.points), `${label}: okrąg r ≈ ${radius} (kąt ${angle}°)`).toBeLessThanOrEqual(1)
      }
      expectLineFollowsSky(line, cut)
    }
  })

  it('test_p13_gestosc_punktow_linii', () => {
    expectDense(mapBackground([], cutout(0, 0, 2.4)).grid)
    expectDense(mapBackground([], cut).grid)
  })
})

// ---------- Opisy linii (reguły z „Przykłady”) ----------

describe('tlo-mapy: opisy linii', () => {
  it('test_p11_opis_ra_z_sekundami_przy_kroku_ponizej_1m', () => {
    // Reguła: krok < 1m → „5h 35m 10s”. Środek RA 83,7917° (5h 35m 10s), Dec 0°, pole 0,2° → krok 10s.
    const { grid } = mapBackground([], cutout(83.79166666666667, 0, 0.2))
    expect(labelsOf(grid, 'ra')).toContain('5h 35m 10s')
    expectNear(stepOf(grid, 'ra', 83.79), 10 * RA_SEC, STEP_TOL, 'krok RA 10s')
  })

  it('test_p11_ra_360_to_0h_00m_tylko_raz', () => {
    const { grid } = mapBackground([], cutout(359.9, 0, 2.4))
    const meridians = linesOf(grid, 'ra')
    expect(meridians.every((line) => line.valueDeg >= 0 && line.valueDeg < 360), 'RA w [0, 360)').toBe(true)
    expect(meridians.filter((line) => line.label === '0h 00m'), 'jedna linia „0h 00m”').toHaveLength(1)
    expect(meridians.some((line) => line.label.startsWith('24h')), 'bez „24h”').toBe(false)
  })

  it('test_p11_opisy_dec_przy_kroku_od_1_stopnia', () => {
    // Pole 20° → krok 5° (P8); opisy „+5°”, „−5°”, „0°” z reguły „krok ≥ 1°”.
    const labels = labelsOf(mapBackground([], cutout(0, 0, 20)).grid, 'dec')
    expect(labels).toEqual(expect.arrayContaining(['+5°', '−5°', '0°']))
    expect(labels.some((label) => label === '+0°' || label === '−0°' || label === '-0°'), 'równik bez znaku').toBe(false)
    expect(labels.every((label) => !label.includes('-')), 'minus to U+2212').toBe(true)
  })

  it('test_p11_opisy_dec_ujemne_z_minutami', () => {
    // Środek Dec −5°, pole 2° → krok 30′; opis „−5°00′” z reguły „krok < 1°”.
    const labels = labelsOf(mapBackground([], cutout(0, -5, 2)).grid, 'dec')
    expect(labels).toEqual(expect.arrayContaining(['−5°00′', '−4°30′', '−5°30′']))
  })
})

// ---------- Niezależność w modelu (P14) ----------

describe('tlo-mapy: niezależność (P14)', () => {
  it('test_p14_pole_widoku_zmienia_kroki_a_nie_promienie', () => {
    const narrow = mapBackground([star(0, 0, 5)], cutout(0, 0, 2))
    const wide = mapBackground([star(0, 0, 5)], cutout(0, 0, 20))
    expectNear(narrow.stars[0].radius, 4, R_TOL, 'pole 2°')
    expectNear(wide.stars[0].radius, 4, R_TOL, 'pole 20°')
    expect(stepOf(narrow.grid, 'dec')).not.toBeCloseTo(stepOf(wide.grid, 'dec'), 6)
  })
})

// ---------- Rysunek w FramingView ----------

function demoProfile(id: string): EquipmentProfile {
  const found = DEMO_PROFILES.find((profile) => profile.id === id)
  if (!found) throw new Error(`Brak profilu ${id}`)
  return structuredClone(found)
}

const mySet = (): EquipmentProfile => demoProfile('demo-moj-zestaw')
const withOag = (profile: EquipmentProfile): EquipmentProfile => ({
  ...profile,
  oag: { prismWidthMm: 8, prismHeightMm: 4, offsetFromCenterMm: 8, angleDeg: 0 },
})

function frameAt(raDeg: number, decDeg: number, paDeg = 0, cols = 1, rows = 1): Framing {
  return { centerRaDeg: raDeg, centerDecDeg: decDeg, paDeg, mosaic: { cols, rows, overlapPct: 20 } }
}

const MAP_OBJECT: FallbackMapObject = {
  uid: 'test-obiekt',
  kind: 'circle',
  lineStyle: 'solid',
  shapes: [[{ x: 450, y: 450 }, { x: 550, y: 450 }, { x: 550, y: 550 }, { x: 450, y: 550 }]],
  label: { text: 'Obiekt testowy', position: { x: 500, y: 500 } },
}

function renderView(props: Partial<FramingViewProps> & Pick<FramingViewProps, 'fovDeg' | 'framing'>): HostElement {
  const full: FramingViewProps = { profile: mySet(), mapObjects: [], ...props }
  const r = new HookRenderer(() => createElement(FramingView, full)).mount()
  const svg = r.hosts().filter((host) => host.tag === 'svg' && host.props.viewBox === '0 0 1000 1000')
  expect(svg, 'jeden svg widoku').toHaveLength(1)
  return svg[0]
}

const roleGroups = (svg: HostElement, role: string): HostElement[] =>
  descendantsOf(svg).filter((host) => host.props['data-role'] === role)

function oneGroup(svg: HostElement, role: string): HostElement {
  const groups = roleGroups(svg, role)
  expect(groups, `jedna grupa data-role="${role}"`).toHaveLength(1)
  return groups[0]
}

const circlesIn = (group: HostElement): HostElement[] => [group, ...descendantsOf(group)].filter((host) => host.tag === 'circle')
const textsIn = (group: HostElement): string[] =>
  descendantsOf(group)
    .filter((host) => host.tag === 'text')
    .map((host) => textOf(host))

/** Klasy elementu i jego przodków aż do grupy tła włącznie. */
function classChain(host: HostElement, group: HostElement): string[] {
  const chain = [host]
  for (const ancestor of ancestorsOf(host)) {
    chain.push(ancestor)
    if (ancestor === group) break
  }
  return chain.flatMap((element) => (typeof element.props.className === 'string' ? element.props.className.split(/\s+/) : []))
}

const hasToken = (classes: readonly string[], token: string): boolean =>
  classes.some((name) => new RegExp(`^(?:[a-z-]+:)*(?:fill|stroke|text)-${token}(?:/[0-9]+)?$`).test(name))

/** Serializacja poddrzewa (znacznik, właściwości bez funkcji, dzieci) do porównań. */
function serialize(host: HostElement): unknown {
  const props = Object.fromEntries(Object.entries(host.props).filter(([name, value]) => name !== 'children' && typeof value !== 'function'))
  return { tag: host.tag, props, children: host.children.map((child) => (typeof child === 'string' ? child : serialize(child))) }
}

const STARS: Star[] = [star(0, 0, 5), star(0.3, 0.2, 8), star(359.6, -0.4, 2)]

describe('tlo-mapy: rysunek w FramingView', () => {
  it('test_p15_kolejnosc_warstw_w_svg', () => {
    // Zdjęcie STScI: kwadrat 1° w widoku 3° (bok ≈ 333 jednostki w środku widoku).
    const svg = renderView({
      fovDeg: 3,
      framing: frameAt(0, 0),
      profile: withOag(mySet()),
      mapObjects: [MAP_OBJECT],
      stars: [star(0, 0, 5), star(1.2, 1.2, 7)],
      photo: { href: 'blob:zdjecie', rect: { x: 333.3, y: 333.3, width: 333.3, height: 333.3 } },
    })
    const all = descendantsOf(svg)
    const index = (predicate: (host: HostElement) => boolean, what: string) => {
      const i = all.findIndex(predicate)
      expect(i, `${what} jest w svg`).toBeGreaterThanOrEqual(0)
      return i
    }
    const order = [
      index((h) => h.tag === 'rect' && typeof h.props.className === 'string' && h.props.className.includes('background'), 'tło'),
      index((h) => h.props['data-role'] === 'grid', 'siatka'),
      index((h) => h.props['data-role'] === 'stars', 'gwiazdy'),
      index((h) => h.props['data-role'] === 'photo', 'zdjęcie'),
      index((h) => h.props['data-map-uid'] !== undefined, 'obiekt mapy'),
      index((h) => h.props['data-panel'] !== undefined, 'panel'),
      index((h) => h.props['data-role'] === 'oag', 'pryzmat OAG'),
    ]
    expect(order, 'tło, siatka, gwiazdy, zdjęcie, mapa, panele, OAG').toEqual([...order].sort((a, b) => a - b))
    const photo = all.find((h) => h.props['data-role'] === 'photo')!
    for (const role of ['grid', 'stars']) {
      const group = oneGroup(svg, role)
      expect(descendantsOf(group).includes(photo), `zdjęcie nie leży w grupie ${role}`).toBe(false)
      expect(ancestorsOf(group).includes(photo), `grupa ${role} nie leży w zdjęciu`).toBe(false)
    }
  })

  it('test_p15_tlo_bez_atrybutow_obiektow_paneli_oag_i_transform', () => {
    const svg = renderView({ fovDeg: 3, framing: frameAt(0, 0), profile: withOag(mySet()), mapObjects: [MAP_OBJECT], stars: STARS })
    for (const role of ['grid', 'stars']) {
      const group = oneGroup(svg, role)
      for (const host of [group, ...descendantsOf(group)]) {
        expect(host.props['data-map-uid'], `${role} <${host.tag}>: data-map-uid`).toBeUndefined()
        expect(host.props['data-panel'], `${role} <${host.tag}>: data-panel`).toBeUndefined()
        expect(host.props['data-role'] === 'oag', `${role} <${host.tag}>: data-role="oag"`).toBe(false)
        expect(host.props.transform, `${role} <${host.tag}>: transform`).toBeUndefined()
      }
      for (const ancestor of ancestorsOf(group).filter((host) => host.tag !== 'svg' && host.tag !== '#root')) {
        expect(ancestor.props.transform, `przodek grupy ${role}: transform`).toBeUndefined()
      }
    }
  })

  it('test_p15_widok_rysuje_kropki_i_opisy_z_modelu', () => {
    const frame = frameAt(0, 0)
    const svg = renderView({ fovDeg: 2.4, framing: frame, stars: STARS })
    const model = mapBackground(STARS, cutout(0, 0, 2.4))
    expect(textsIn(oneGroup(svg, 'grid')).sort(), 'opisy siatki P11').toEqual(model.grid.map((line) => line.label).sort())
    expect(textsIn(oneGroup(svg, 'grid')).sort()).toEqual(
      ['23h 56m', '23h 58m', '0h 00m', '0h 02m', '0h 04m', '−1°00′', '−0°30′', '0°00′', '+0°30′', '+1°00′'].sort(),
    )
    const circles = circlesIn(oneGroup(svg, 'stars'))
    expect(circles, 'jedna kropka na gwiazdę w widoku').toHaveLength(3)
    model.stars.forEach((dot, i) => {
      expectNear(Number(circles[i].props.cx), dot.x, 0.5, `kropka ${i + 1} cx`)
      expectNear(Number(circles[i].props.cy), dot.y, 0.5, `kropka ${i + 1} cy`)
      expectNear(Number(circles[i].props.r), dot.radius, 0.02, `kropka ${i + 1} r`)
    })
    expectNear(Number(circles[2].props.r), 5.8, 0.02, 'ostatnia (najjaśniejsza) kropka V 2')
  })

  it('test_p16_widok_bez_gwiazd_rysuje_sama_siatke', () => {
    for (const stars of [undefined, null, []] as const) {
      const props: Partial<FramingViewProps> & Pick<FramingViewProps, 'fovDeg' | 'framing'> = { fovDeg: 2.4, framing: frameAt(0, 0) }
      if (stars !== undefined) props.stars = stars
      const svg = renderView(props)
      const grid = oneGroup(svg, 'grid')
      expect(textsIn(grid).length, `siatka z opisami (stars = ${JSON.stringify(stars)})`).toBe(10)
      expect(descendantsOf(svg).filter((host) => host.tag === 'circle'), 'bez kropek').toHaveLength(0)
      expect(textOf(svg), 'bez komunikatu o gwiazdach').not.toMatch(/gwiazd/i)
      expect(descendantsOf(svg).filter((host) => host.props['data-panel'] !== undefined), 'ramka zostaje').toHaveLength(1)
    }
  })

  it('test_p17_kolory_z_tokenow', () => {
    const svg = renderView({ fovDeg: 2.4, framing: frameAt(0, 0), stars: STARS })
    const grid = oneGroup(svg, 'grid')
    const starsGroup = oneGroup(svg, 'stars')
    for (const circle of circlesIn(starsGroup)) {
      expect(hasToken(classChain(circle, starsGroup), 'foreground'), 'kropka: klasa tokenu foreground').toBe(true)
    }
    const shapes = descendantsOf(grid).filter((host) => ['polyline', 'path', 'line', 'polygon'].includes(host.tag))
    expect(shapes.length, 'linie siatki').toBeGreaterThanOrEqual(10)
    for (const shape of shapes) expect(hasToken(classChain(shape, grid), 'border'), `<${shape.tag}> siatki: klasa border`).toBe(true)
    const texts = descendantsOf(grid).filter((host) => host.tag === 'text')
    for (const text of texts) expect(hasToken(classChain(text, grid), 'muted'), `opis „${textOf(text)}”: klasa muted`).toBe(true)
    const colorPattern = /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|okl(?:ch|ab)\(|\b(?:white|black|red|gray|grey|yellow|blue|green|orange)\b/i
    for (const host of [grid, ...descendantsOf(grid), starsGroup, ...descendantsOf(starsGroup)]) {
      for (const attribute of ['fill', 'stroke', 'color']) {
        const value = host.props[attribute]
        if (value === undefined || value === 'none' || value === 'currentColor') continue
        expect(JSON.stringify(value), `<${host.tag}> ${attribute}`).not.toMatch(colorPattern)
        expect(typeof value === 'string' && /^[a-z]/i.test(value), `<${host.tag}> ${attribute}=${JSON.stringify(value)}: kolor na sztywno`).toBe(false)
      }
      if (host.props.style !== undefined) {
        expect(JSON.stringify(host.props.style), `<${host.tag}> style`).not.toMatch(colorPattern)
        expect(JSON.stringify(host.props.style), `<${host.tag}> style bez fill/stroke/color`).not.toMatch(/fill|stroke|color/i)
      }
    }
  })

  it('test_p14_tlo_nie_zalezy_od_pa_mozaiki_ani_oag', () => {
    const base = renderView({ fovDeg: 3, framing: frameAt(10, 20), profile: mySet(), stars: [star(10, 20, 5), star(10.4, 20.3, 9)] })
    const other = renderView({
      fovDeg: 3,
      framing: frameAt(10, 20, 45, 2, 2),
      profile: withOag(mySet()),
      stars: [star(10, 20, 5), star(10.4, 20.3, 9)],
    })
    for (const role of ['grid', 'stars']) {
      expect(serialize(oneGroup(other, role)), `grupa ${role} bez zmian po zmianie PA, mozaiki i OAG`).toEqual(serialize(oneGroup(base, role)))
    }
  })

  it('test_p14_zmiana_pola_nowe_kroki_te_same_promienie', () => {
    const input = [star(10, 20, 5), star(10.4, 20.3, 9)]
    const narrow = renderView({ fovDeg: 3, framing: frameAt(10, 20), stars: input })
    const wide = renderView({ fovDeg: 20, framing: frameAt(10, 20), stars: input })
    const radii = (svg: HostElement) => circlesIn(oneGroup(svg, 'stars')).map((circle) => Number(circle.props.r))
    expect(radii(narrow)).toHaveLength(2)
    expect(radii(wide), 'te same promienie').toEqual(radii(narrow))
    expect(textsIn(oneGroup(wide, 'grid')).sort(), 'nowe kroki siatki').not.toEqual(textsIn(oneGroup(narrow, 'grid')).sort())
  })
})
