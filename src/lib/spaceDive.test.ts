import { expect, it } from 'vitest'
import type { Vec3 } from './astro'
import { DIVE_PHASE_MS, DIVE_TOTAL_MS, bridgePoint, bridgePose, bridgeVector, coneTan, diveFades, diveFrame, diveScale, lerpPose, makeBridge, nearFar, unbridgePoint, type Pose } from './spaceDive'

// Baza kadru: dowolny obrót (osie ortonormalne, x × y = −center).
const center: Vec3 = [0.6, 0.48, 0.64]
const x: Vec3 = [0.8, -0.36, -0.48]
const y: Vec3 = [0, 0.8, -0.6]
const bridge = makeBridge([-26.7, 0, 0], { center, x, y }, [0, 0, 70])
const seam: Pose = { position: [0, 42, 185], target: [0, 8, -30], up: [0, 1, 0] }
const close = (a: Vec3, b: Vec3, digits = 9) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i], digits))

it('oś czasu: początek i koniec w obu kierunkach, fazy w kolejności ustawienie → nurkowanie → wejście', () => {
  expect(diveFrame(0, 'in')).toEqual({ s: 0, phase: 'setup', k: 0, e: 0, done: false })
  expect(diveFrame(DIVE_TOTAL_MS, 'in')).toEqual({ s: 1, phase: 'enter', k: 1, e: 1, done: true })
  expect(diveFrame(0, 'out')).toMatchObject({ s: 1, phase: 'enter', e: 1, done: false })
  expect(diveFrame(DIVE_TOTAL_MS + 500, 'out')).toEqual({ s: 0, phase: 'setup', k: 0, e: 0, done: true })
  expect(diveFrame(DIVE_PHASE_MS.setup + 1, 'in').phase).toBe('dive')
  expect(diveFrame(DIVE_PHASE_MS.setup + DIVE_PHASE_MS.dive / 2, 'in').e).toBeCloseTo(0.5, 9)
  expect(diveFrame(DIVE_PHASE_MS.setup + DIVE_PHASE_MS.dive + 1, 'in').phase).toBe('enter')
})

it('ruch wstecz jest lustrem ruchu naprzód (t → 1 − t)', () => {
  for (let t = 0; t <= DIVE_TOTAL_MS; t += 175) {
    const back = diveFrame(t, 'out')
    const forward = diveFrame(DIVE_TOTAL_MS - t, 'in')
    expect(back.s).toBeCloseTo(forward.s, 12)
    expect(back.phase).toBe(forward.phase)
    expect(back.k).toBeCloseTo(forward.k, 12)
    expect(back.e).toBeCloseTo(forward.e, 12)
    expect(diveFades(back.e)).toEqual(diveFades(forward.e))
  }
})

it('skala mostu jest logarytmiczna: u(0,5) = √(u0·u1)', () => {
  expect(diveScale(0, 0.33, 0.001)).toBeCloseTo(0.33, 12)
  expect(diveScale(1, 0.33, 0.001)).toBeCloseTo(0.001, 12)
  expect(diveScale(0.5, 0.33, 0.001)).toBeCloseTo(Math.sqrt(0.33 * 0.001), 12)
})

it('most jest podobieństwem: Ziemia na Ziemię, linia widzenia na kierunek kadru, długości razy u', () => {
  close(bridgePoint(bridge, [0, 0, 70], 0.2), [-26.7, 0, 0])
  // Oś Obserwatorium (−z) prowadzi w stronę środka kadru.
  close(bridgeVector(bridge, [0, 0, -1]), center)
  const a: Vec3 = [10, -4, 20], b: Vec3 = [-30, 12, -150]
  const u = 0.05
  const pa = bridgePoint(bridge, a, u), pb = bridgePoint(bridge, b, u)
  expect(Math.hypot(pa[0] - pb[0], pa[1] - pb[1], pa[2] - pb[2])).toBeCloseTo(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) * u, 9)
})

it('most w e = 1 daje pozę szwu: kamera Drogi Mlecznej wraca odwrotnością do widoku „Z Ziemi”', () => {
  const u1 = diveScale(1, 0.33, 0.001)
  const pose = bridgePose(bridge, seam, u1)
  close(unbridgePoint(bridge, pose.position, u1), seam.position)
  close(unbridgePoint(bridge, pose.target, u1), seam.target)
  close(pose.up, bridgeVector(bridge, [0, 1, 0]))
})

it('kąt stożka zmienia się w sposób ciągły od pola zdjęcia do ostrosłupa Obserwatorium', () => {
  const real: [number, number] = [0.0087, 0.0088]
  const pyramid: [number, number] = [50 / 70, 50.5 / 70]
  coneTan(0, real, pyramid).forEach((v, i) => expect(v).toBeCloseTo(real[i], 12))
  coneTan(1, real, pyramid).forEach((v, i) => expect(v).toBeCloseTo(pyramid[i], 12))
  let last = coneTan(0, real, pyramid)[0]
  for (let e = 0.001; e <= 1; e += 0.001) {
    const now = coneTan(e, real, pyramid)[0]
    expect(now).toBeGreaterThanOrEqual(last)
    // Krok 0,001 w e zmienia kąt najwyżej o kilka procent (bez skoków).
    expect(now / last).toBeLessThan(1.05)
    last = now
  }
})

it('przelot kamery zaczyna się i kończy w pozach krańcowych, near rośnie z odległością od Ziemi', () => {
  const a: Pose = { position: [10, 20, 30], target: [0, 0, 0], up: [0, 1, 0] }
  const b = bridgePose(bridge, seam, 0.33)
  close(lerpPose(a, b, 0).position, a.position)
  close(lerpPose(a, b, 1).position, b.position)
  close(lerpPose(a, b, 1).up, b.up)
  expect(nearFar(10)).toEqual({ near: 0.1, far: 5000 })
  expect(nearFar(0.12).near).toBeCloseTo(0.0012, 12)
  expect(nearFar(0.12).far).toBeGreaterThan(300)
})
