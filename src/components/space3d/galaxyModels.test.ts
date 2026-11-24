import * as THREE from 'three'
import { expect, it } from 'vitest'
import { galacticVector } from '../../lib/astro'
import type { DSO } from '../../lib/catalog'
import { LOCAL_GROUP_SHAPES, MILKY_WAY_MAX_POINTS, localGroupGalaxy, milkyWayPointCount, milkyWayProgressive, toThree } from './galaxyModels'

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

// Pola z public/data/catalog.json; spłaszczenie 1 − ε z McConnachie 2012 (WLM 0,35, NGC 3109 0,18).
const WLM = { id: 'PGC 143', raDeg: 0.492, decDeg: -15.461, majArcmin: 10.5, minArcmin: 3.6, paDeg: 5, distLy: 3120000 } as DSO
const N3109 = { id: 'NGC 3109', raDeg: 150.779, decDeg: -26.16, majArcmin: 16, minArcmin: 2.7, paDeg: 93, distLy: 4340000 } as DSO

it.each([['WLM', WLM, 5], ['NGC 3109', N3109, 93]] as const)('%s: model wydłużony na niebie wzdłuż PA z katalogu', (_name, o, paDeg) => {
  const model = localGroupGalaxy(o, LOCAL_GROUP_SHAPES[o.id], new THREE.Texture())
  const p = model.geometry.getAttribute('position')
  const sight = toThree(galacticVector(o)).normalize()
  const north = toThree(galacticVector({ raDeg: o.raDeg, decDeg: o.decDeg + 0.01 }))
  north.addScaledVector(sight, -north.dot(sight)).normalize()
  const east = north.clone().cross(sight).normalize()
  let nn = 0, ee = 0, ne = 0
  const v = new THREE.Vector3()
  for (let i = 0; i < p.count; i++) {
    v.set(p.getX(i), p.getY(i), p.getZ(i)).applyQuaternion(model.quaternion)
    const n = v.dot(north), e = v.dot(east)
    nn += n * n
    ee += e * e
    ne += n * e
  }
  const pa = ((0.5 * Math.atan2(2 * ne, nn - ee) * 180) / Math.PI + 180) % 180
  const diff = Math.abs(pa - paDeg)
  expect(Math.min(diff, 180 - diff)).toBeLessThan(10)
  // Stosunek osi z momentów: wyraźnie wydłużone, nie okrągłe.
  const tr = nn + ee, det = nn * ee - ne * ne
  const l1 = tr / 2 + Math.sqrt(tr * tr / 4 - det), l2 = tr / 2 - Math.sqrt(tr * tr / 4 - det)
  expect(Math.sqrt(l2 / l1)).toBeLessThan(0.5)
})

it('Droga Mleczna: z daleka 16 tys. punktów, z bliska cały bufor, pomiędzy monotonicznie', () => {
  expect(milkyWayPointCount(2400)).toBe(16_000)
  expect(milkyWayPointCount(100)).toBe(MILKY_WAY_MAX_POINTS)
  const counts = [1200, 800, 400, 200, 150].map(milkyWayPointCount)
  for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeGreaterThan(counts[i - 1])
})

it('Droga Mleczna: dopisywanie porcjami daje te same punkty co pierwsze 85 tys.', async () => {
  const model = milkyWayProgressive(new THREE.Texture(), () => {})
  const start = model.filled()
  expect(start).toBe(85_000)
  const before = (model.points.geometry.getAttribute('position').array as Float32Array).slice(0, start * 3)
  // Kilka porcji w tle (setTimeout poza przeglądarką).
  await new Promise((resolve) => setTimeout(resolve, 200))
  expect(model.filled()).toBeGreaterThan(start)
  // Porcje po ok. 8 ms co 16 ms: w 200 ms nie powstaje cały bufor naraz (dawny błąd: stały termin 8 ms liczył wszystko).
  expect(model.filled()).toBeLessThan(MILKY_WAY_MAX_POINTS)
  const after = model.points.geometry.getAttribute('position').array as Float32Array
  expect(before.findIndex((v, i) => v !== after[i])).toBe(-1)
  // Dopisane punkty leżą w dysku modelu (promień 50 j. z rozrzutem).
  let maxR = 0
  for (let i = start; i < model.filled(); i++) maxR = Math.max(maxR, Math.hypot(after[i * 3], after[i * 3 + 2]))
  expect(maxR).toBeLessThan(60)
  model.dispose()
})
