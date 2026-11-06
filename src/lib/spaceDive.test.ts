import { expect, it } from 'vitest'
import type { Vec3 } from './astro'
import { ALIGN_K, DIVE_PHASE_MS, bridgePoint, bridgePose, bridgeVector, coneTan, diveFades, diveFrame, divePose, diveScale, diveTotalMs, ease, lerpPose, makeBridge, nearFar, startScale, turnWeight, unbridgePoint, type DiveDirection, type Pose } from './spaceDive'

// Baza kadru: dowolny obrót (osie ortonormalne, x × y = −center).
const center: Vec3 = [0.6, 0.48, 0.64]
const x: Vec3 = [0.8, -0.36, -0.48]
const y: Vec3 = [0, 0.8, -0.6]
const bridge = makeBridge([-26.7, 0, 0], { center, x, y }, [0, 0, 70])
const seam: Pose = { position: [0, 42, 185], target: [0, 8, -30], up: [0, 1, 0] }
const close = (a: Vec3, b: Vec3, digits = 9) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i], digits))

const IN_MS = diveTotalMs('in')
const OUT_MS = diveTotalMs('out')

it('oś czasu: początek i koniec w obu kierunkach, fazy w kolejności nurkowanie → wejście', () => {
  expect(diveFrame(0, 'in')).toEqual({ s: 0, phase: 'dive', k: 0, e: 0, done: false })
  expect(diveFrame(IN_MS, 'in')).toEqual({ s: 1, phase: 'enter', k: 1, e: 1, done: true })
  expect(diveFrame(0, 'out')).toMatchObject({ s: 1, phase: 'enter', e: 1, done: false })
  expect(diveFrame(OUT_MS + 500, 'out')).toEqual({ s: 0, phase: 'dive', k: 0, e: 0, done: true })
  expect(diveFrame(DIVE_PHASE_MS.in.dive / 2, 'in').e).toBeCloseTo(0.5, 9)
  expect(diveFrame(DIVE_PHASE_MS.in.dive + 1, 'in').phase).toBe('enter')
  expect(diveFrame(DIVE_PHASE_MS.out.enter - 1, 'out').phase).toBe('enter')
  expect(diveFrame(DIVE_PHASE_MS.out.enter + 1, 'out').phase).toBe('dive')
})

it('wejście do Obserwatorium trwa 1,25 raza dłużej niż powrót, w każdej fazie', () => {
  expect(IN_MS).toBeCloseTo(1.25 * OUT_MS, 9)
  expect(DIVE_PHASE_MS.in.dive).toBeCloseTo(1.25 * DIVE_PHASE_MS.out.dive, 9)
  expect(DIVE_PHASE_MS.in.enter).toBeCloseTo(1.25 * DIVE_PHASE_MS.out.enter, 9)
})

it('ruch wstecz jest lustrem ruchu naprzód w tym samym położeniu s (każdy kierunek w swoim czasie)', () => {
  for (let f = 0; f <= 1.0001; f += 0.02) {
    const back = diveFrame(f * OUT_MS, 'out')
    const forward = diveFrame((1 - f) * IN_MS, 'in')
    expect(back.s).toBeCloseTo(forward.s, 9)
    expect(back.phase).toBe(forward.phase)
    expect(back.k).toBeCloseTo(forward.k, 9)
    expect(back.e).toBeCloseTo(forward.e, 9)
    const a = diveFades(back.k), b = diveFades(forward.k)
    for (const key of Object.keys(a) as (keyof typeof a)[]) expect(a[key]).toBeCloseTo(b[key], 9)
  }
})

/** Krycie warstwy w chwili ms przejścia (w fazie wejścia jak na końcu nurkowania). */
function fadeAt(ms: number, direction: DiveDirection, key: keyof ReturnType<typeof diveFades>): number {
  const f = diveFrame(ms, direction)
  return diveFades(f.phase === 'dive' ? f.k : 1)[key]
}

it('przenikanie scen trwa co najmniej 0,5 s w każdym elemencie i kierunku, bez skoku w jednej klatce', () => {
  const frame = 1000 / 60
  for (const direction of ['in', 'out'] as DiveDirection[]) {
    for (const key of Object.keys(diveFades(0)) as (keyof ReturnType<typeof diveFades>)[]) {
      let first = Infinity, last = -Infinity, worst = 0
      for (let ms = 0; ms <= diveTotalMs(direction); ms += 1) {
        const v = fadeAt(ms, direction, key)
        if (v > 1e-6 && v < 1 - 1e-6) { first = Math.min(first, ms); last = Math.max(last, ms) }
        if (ms >= frame) worst = Math.max(worst, Math.abs(v - fadeAt(ms - frame, direction, key)))
      }
      expect(last - first, `${key} (${direction})`).toBeGreaterThanOrEqual(500)
      // Najszybsza zmiana krycia w jednej klatce 60 Hz.
      expect(worst, `${key} (${direction})`).toBeLessThanOrEqual(0.05)
    }
  }
})

it('krańce nurkowania: pełna Droga Mleczna albo pełne Obserwatorium (faza wejścia bez skoku krycia)', () => {
  const start = diveFades(0), end = diveFades(1)
  for (const key of ['layers', 'labels', 'guide', 'cone', 'coneFaces', 'spaceEarth'] as const) {
    expect(start[key]).toBe(1)
    expect(end[key]).toBe(0)
  }
  for (const key of ['earth', 'pyramid', 'axis', 'photo', 'grid'] as const) {
    expect(start[key]).toBe(0)
    expect(end[key]).toBe(1)
  }
})

it('elementy Obserwatorium pojawiają się dopiero, gdy obie sceny pokrywają się na ekranie', () => {
  // Obrót kamery i stożek kończą się w ALIGN_K; od tej chwili most pokrywa obie sceny.
  expect(turnWeight(ALIGN_K)).toBe(1)
  const real: [number, number] = [0.0087, 0.0088], pyramid: [number, number] = [50 / 70, 50.5 / 70]
  coneTan(ALIGN_K, real, pyramid).forEach((v, i) => expect(v).toBeCloseTo(pyramid[i], 12))
  close(divePose({ position: [-20, 6, 5], target: [-24, 0, 1], up: [0, 1, 0] }, bridge, seam, { e: ease(ALIGN_K), k: ALIGN_K }, 0.3, 0.001).position,
    bridgePose(bridge, seam, diveScale(ease(ALIGN_K), 0.3, 0.001)).position)
  const before = diveFades(ALIGN_K - 1e-9)
  for (const key of ['earth', 'pyramid', 'axis', 'photo', 'grid'] as const) expect(before[key]).toBe(0)
  // Odpowiedniki z Drogi Mlecznej (linia widzenia, stożek, Ziemia) są jeszcze w pełni widoczne.
  for (const key of ['guide', 'cone', 'spaceEarth'] as const) expect(before[key]).toBe(1)
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
  for (let k = 0.001; k <= 1; k += 0.001) {
    const now = coneTan(k, real, pyramid)[0]
    expect(now).toBeGreaterThanOrEqual(last)
    // Krok 0,001 w k zmienia kąt najwyżej o kilka procent (bez skoków).
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

it('nurkowanie zaczyna się w bieżącej kamerze, kończy w pozie szwu i nigdy się nie oddala od Ziemi', () => {
  const start: Pose = { position: [-20, 6, 5], target: [-24, 0, 1], up: [0, 1, 0] }
  const u1 = 0.001
  const u0 = startScale(start, bridge, seam, u1)
  const distance = (p: Vec3) => Math.hypot(p[0] + 26.7, p[1], p[2])
  close(divePose(start, bridge, seam, { e: 0, k: 0 }, u0, u1).position, start.position)
  close(divePose(start, bridge, seam, { e: 0, k: 0 }, u0, u1).target, start.target)
  const end = bridgePose(bridge, seam, u1)
  close(divePose(start, bridge, seam, { e: 1, k: 1 }, u0, u1).position, end.position)
  close(divePose(start, bridge, seam, { e: 1, k: 1 }, u0, u1).up, end.up)
  let last = Infinity
  for (let k = 0; k <= 1.0001; k += 0.01) {
    const d = distance(divePose(start, bridge, seam, { e: ease(k), k }, u0, u1).position)
    expect(d).toBeLessThanOrEqual(last + 1e-9)
    last = d
  }
  // Kamera bliżej Ziemi niż koniec nurkowania: skala startowa nie spada poniżej u1 (bez oddalania na końcu).
  expect(startScale({ ...start, position: [-26.7, 0, 0.0001] }, bridge, seam, u1)).toBe(u1)
})
