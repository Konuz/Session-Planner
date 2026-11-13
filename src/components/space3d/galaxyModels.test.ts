import * as THREE from 'three'
import { expect, it } from 'vitest'
import { galacticVector } from '../../lib/astro'
import type { DSO } from '../../lib/catalog'
import { LOCAL_GROUP_SHAPES, localGroupGalaxy, toThree } from './galaxyModels'

const KPC_LY = 3261.56
// Pola z public/data/catalog.json, potrzebne do budowy modelu.
const M33 = { id: 'M 33', raDeg: 23.462, decDeg: 30.6602, majArcmin: 62.1, minArcmin: 36.7, paDeg: 23, distLy: 2781156 } as DSO
const LMC = { id: 'ESO 56-115', raDeg: 80.8938, decDeg: -69.7561, majArcmin: 646, minArcmin: 550, paDeg: 170, distLy: 161148 } as DSO

it('M33: jasność dysku maleje od środka ze skalą ok. 1,7 kpc', () => {
  const p = localGroupGalaxy(M33, LOCAL_GROUP_SHAPES['M 33'], new THREE.Texture()).geometry.getAttribute('position')
  // Model ma 100 j. średnicy; M33 ma 50 tys. lś.
  const kpcPerUnit = 500 / KPC_LY
  const density = (a: number, b: number) => {
    let n = 0
    for (let i = 0; i < p.count; i++) {
      const r = Math.hypot(p.getX(i), p.getY(i)) * kpcPerUnit
      if (r >= a && r < b) n++
    }
    return n / (Math.PI * (b * b - a * a))
  }
  const rings = [density(0, 1), density(1, 2), density(2, 4), density(4, 6)]
  for (let i = 1; i < rings.length; i++) expect(rings[i]).toBeLessThan(rings[i - 1])
  // Dysk wykładniczy ze skalą 1,7 kpc (Kam i in. 2015): spadek ok. e^(3 / 1,7) ≈ 5,8 między 1,5 a 4,5 kpc.
  expect(density(1, 2) / density(4, 5)).toBeGreaterThan(4)
})

it('LMC: poprzeczka na niebie w PA ok. 121° (Rathore i in. 2025)', () => {
  const model = localGroupGalaxy(LMC, LOCAL_GROUP_SHAPES['ESO 56-115'], new THREE.Texture())
  const p = model.geometry.getAttribute('position')
  const sight = toThree(galacticVector(LMC)).normalize()
  const north = toThree(galacticVector({ raDeg: LMC.raDeg, decDeg: LMC.decDeg + 0.01 }))
  north.addScaledVector(sight, -north.dot(sight)).normalize()
  const east = north.clone().cross(sight).normalize()
  // Momenty drugiego rzędu wewnątrz poprzeczki: kierunek największego rozrzutu na niebie (PA od N przez E).
  let nn = 0, ee = 0, ne = 0
  const v = new THREE.Vector3()
  for (let i = 0; i < p.count; i++) {
    v.set(p.getX(i), p.getY(i), p.getZ(i)).applyQuaternion(model.quaternion)
    const n = v.dot(north), e = v.dot(east)
    if (Math.hypot(n, e) > 20) continue
    nn += n * n
    ee += e * e
    ne += n * e
  }
  const pa = ((0.5 * Math.atan2(2 * ne, nn - ee) * 180) / Math.PI + 180) % 180
  expect(Math.abs(pa - 121)).toBeLessThan(10)
})
