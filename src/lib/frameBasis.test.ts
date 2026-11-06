import { expect, it } from 'vitest'
import { galacticVector, type Vec3 } from './astro'
import { frameBasis, halfFieldTan, pixelDirection } from './frameBasis'
import { toScene } from './space3d'

// Zdjęcie IC 434 z konuzastro.pl (2798 × 2827 px): WCS solvera i trzy gwiazdy Gaia z rogów kadru (piksel i RA/Dec).
// Zastępuje zdjęcie M 42 z promptu: projektu M 42 nie ma, IC 434 leży w tym samym polu Oriona.
const width = 2798
const height = 2827
const astrometry = {
  raDeg: 85.38666665842841,
  decDeg: -2.127977037446744,
  wcs: { cd: [[-0.000046206143700459305, 0.00035229624378628905], [-0.00035248318258832885, -0.00004637840645707231]], crpix: [1398.5, 1413] },
}
const stars = [
  { x: 376.26, y: 219.29, raDeg: 85.013846, decDeg: -1.71289 },
  { x: 2342.26, y: 2723.31, raDeg: 85.804329, decDeg: -2.520564 },
  { x: 2549.08, y: 264.31, raDeg: 84.929421, decDeg: -2.479415 },
]

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const det = (a: Vec3, b: Vec3, c: Vec3) => dot(a, cross(b, c))
const angle = (a: Vec3, b: Vec3) => Math.acos(Math.min(1, dot(a, b)))

function checkBasis(basis: NonNullable<ReturnType<typeof frameBasis>>) {
  for (const v of [basis.center, basis.x, basis.y]) expect(Math.hypot(...v)).toBeCloseTo(1, 8)
  expect(dot(basis.center, basis.x)).toBeCloseTo(0, 8)
  expect(dot(basis.center, basis.y)).toBeCloseTo(0, 8)
  expect(dot(basis.x, basis.y)).toBeCloseTo(0, 8)
  // Osie Obserwatorium (x, y, z = −kierunek) przechodzą w Drogę Mleczną obrotem, nie odbiciem.
  expect(det(basis.x, basis.y, [-basis.center[0], -basis.center[1], -basis.center[2]])).toBeCloseTo(1, 8)
}

it('baza kadru jest ortonormalna, ma wyznacznik +1, a środek zgadza się z galacticVector', () => {
  const basis = frameBasis(astrometry, width, height)!
  checkBasis(basis)
  expect(basis.mirrored).toBe(false)
  const center = toScene(galacticVector(astrometry))
  for (let i = 0; i < 3; i++) expect(basis.center[i]).toBeCloseTo(center[i], 12)
})

it('kierunki gwiazd Gaia z pikseli przez bazę różnią się od kierunków z RA/Dec o < 2% szerokości pola', () => {
  const basis = frameBasis(astrometry, width, height)!
  const fieldWidth = 2 * Math.atan(halfFieldTan(basis, width, height)[0])
  for (const star of stars) {
    const fromSky = toScene(galacticVector(star))
    expect(angle(pixelDirection(basis, star.x, star.y), fromSky) / fieldWidth).toBeLessThan(0.02)
  }
})

it('kadr lustrzany: baza nadal jest obrotem, a gwiazdy trafiają w swoje kierunki', () => {
  // Odbicie zdjęcia w poziomie: piksel x → szerokość − 1 − x, pierwsza kolumna CD zmienia znak.
  const cd = astrometry.wcs.cd
  const mirrored = { ...astrometry, wcs: { cd: [[-cd[0][0], cd[0][1]], [-cd[1][0], cd[1][1]]], crpix: [width - 1 - 1398.5, 1413] } }
  const basis = frameBasis(mirrored, width, height)!
  checkBasis(basis)
  expect(basis.mirrored).toBe(true)
  const fieldWidth = 2 * Math.atan(halfFieldTan(basis, width, height)[0])
  for (const star of stars) {
    const fromSky = toScene(galacticVector(star))
    expect(angle(pixelDirection(basis, width - 1 - star.x, star.y), fromSky) / fieldWidth).toBeLessThan(0.02)
  }
})

it('bez poprawnej macierzy CD nie ma bazy', () => {
  expect(frameBasis({ ...astrometry, wcs: null }, width, height)).toBeNull()
  expect(frameBasis({ ...astrometry, wcs: { cd: [[0, 0], [0, 0]] } }, width, height)).toBeNull()
})
