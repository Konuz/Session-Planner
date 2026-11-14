import { expect, it } from 'vitest'
import { kinematicDistance, modelVlsr, REID19_A5, solveKinematic } from '../../scripts/kinematicDistance.ts'

// Wartości odniesienia: Russeil 2003 (J/A+A/397/133, tabela 3; płaska krzywa rotacji) i prototyp z 14.11.2026.
it('bliska odległość w I ćwiartce zgodna z Russeil 2003 (≤ 7 %)', () => {
  expect(solveKinematic(10.4, 0, 63, REID19_A5)!.near).toBeCloseTo(5.5, 0)
  expect(Math.abs(solveKinematic(13.2, 0, 52, REID19_A5)!.near / 4.5 - 1)).toBeLessThan(0.07)
})

it('daleka odległość w I ćwiartce zgodna z Russeil 2003 (≤ 7 %)', () => {
  expect(Math.abs(solveKinematic(30.6, 0, 48, REID19_A5)!.far! / 11.4 - 1)).toBeLessThan(0.07)
})

it('II ćwiartka: jedno rozwiązanie, model A5 (Sh2-180 według prędkości z Russeil)', () => {
  const s = solveKinematic(122.6, 0.1, -42.3, REID19_A5)!
  expect(s.far).toBeNull()
  // Płaska krzywa Russeil daje 3,8 kpc; A5 z ruchami własnymi obszarów daje mniej.
  expect(s.near).toBeCloseTo(2.89, 1)
})

it('obieg: v(d) i rozwiązanie z powrotem', () => {
  for (const [l, d] of [[40, 3], [40, 12], [140, 4], [250, 2]]) {
    const s = solveKinematic(l, 0, modelVlsr(l, 0, d, REID19_A5), REID19_A5)!
    expect(Math.min(Math.abs(s.near - d), Math.abs((s.far ?? s.near) - d))).toBeLessThan(0.01)
  }
})

it('prędkość dodatnia w II ćwiartce nie ma rozwiązania', () => {
  expect(solveKinematic(120, 0, 30, REID19_A5)).toBeNull()
})

it('prędkość poza punktem stycznym daje punkt styczny', () => {
  const s = solveKinematic(30, 0, 200, REID19_A5)!
  expect(s.near).toBeCloseTo(8.15 * Math.cos(30 * Math.PI / 180), 2)
  expect(s.far).toBe(s.near)
})

it('Monte Carlo: Sh2-181 ok. 2,5 kpc z σ < 50 %, antycentrum niepewne, wynik powtarzalny', () => {
  const sh181 = kinematicDistance({ seed: 'Sh2-181', lDeg: 122.92, bDeg: 2.39, vlsr: -38.8, kda: null })!
  expect(sh181.kpc).toBeGreaterThan(2.2)
  expect(sh181.kpc).toBeLessThan(2.8)
  expect(sh181.sigmaKpc / sh181.kpc).toBeLessThan(0.5)
  expect(kinematicDistance({ seed: 'Sh2-181', lDeg: 122.92, bDeg: 2.39, vlsr: -38.8, kda: null })).toEqual(sh181)
  const anti = kinematicDistance({ seed: 'Sh2-252', lDeg: 190.0, bDeg: 0.5, vlsr: 7.4, kda: null })
  expect(anti === null || anti.sigmaKpc / anti.kpc > 0.5).toBe(true)
})

it('Monte Carlo: KDA F wybiera daleką odległość', () => {
  const far = kinematicDistance({ seed: 'x', lDeg: 30.6, bDeg: 0, vlsr: 48, kda: 'F' })!
  expect(far.kpc).toBeGreaterThan(9)
})
