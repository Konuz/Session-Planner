import { expect, it } from 'vitest'
import { EARTH_Z, PLANE_WIDTH, distanceDomain, observatoryPosition } from './observatory'
import type { Vec3 } from './astro'
import { SPACE_FAR } from './spaceCamera'
import { ALIGN_K, DIVE_PHASE_MS, bridgePoint, bridgePose, bridgeVector, coneLength, coneTan, diveFades, diveFrame, diveGridScale, diveMarkerPosition, divePose, diveScale, diveTotalMs, ease, guideAlignment, lerpPose, makeBridge, nearFar, reverseElapsedMs, startScale, turnWeight, unbridgePoint, unbridgeVector, uprightRoll, zoomPose, type DiveDirection, type Pose } from './spaceDive'

// Baza kadru: dowolny obrót (osie ortonormalne, x × y = −center).
const center: Vec3 = [0.6, 0.48, 0.64]
const x: Vec3 = [0.8, -0.36, -0.48]
const y: Vec3 = [0, 0.8, -0.6]
const bridge = makeBridge([-26.7, 0, 0], { center, x, y }, [0, 0, 70])
const seam: Pose = { position: [0, 42, 185], target: [0, 8, -30], up: [0, 1, 0] }
const close = (a: Vec3, b: Vec3, digits = 9) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i], digits))

const IN_MS = diveTotalMs('in')
const OUT_MS = diveTotalMs('out')

it('zdjęcie rozkłada się dopiero po nurkowaniu i składa przed powrotem do galaktyki', () => {
  for (const direction of ['in', 'out'] as const) {
    const { dive, enter } = DIVE_PHASE_MS[direction]
    const elapsed = (ms: number) => direction === 'in' ? ms : dive + enter - ms
    const progress = (ms: number) => diveFrame(elapsed(ms), direction).photoProgress
    expect(progress(0)).toBe(0)
    expect(progress(dive / 2)).toBe(0)
    expect(progress(dive)).toBeCloseTo(0, 9)
    expect(progress(dive + enter / 4)).toBeGreaterThan(0)
    expect(progress(dive + enter / 2)).toBeCloseTo(0.5, 9)
    expect(progress(dive + enter * 3 / 4)).toBeLessThan(1)
    expect(progress(dive + enter)).toBe(1)
  }
})

it('oś czasu: początek i koniec w obu kierunkach, fazy w kolejności nurkowanie → wejście', () => {
  expect(diveFrame(0, 'in')).toEqual({ s: 0, phase: 'dive', k: 0, e: 0, photoProgress: 0, done: false })
  expect(diveFrame(IN_MS, 'in')).toEqual({ s: 1, phase: 'enter', k: 1, e: 1, photoProgress: 1, done: true })
  expect(diveFrame(0, 'out')).toMatchObject({ s: 1, phase: 'enter', e: 1, done: false })
  expect(diveFrame(OUT_MS + 500, 'out')).toEqual({ s: 0, phase: 'dive', k: 0, e: 0, photoProgress: 0, done: true })
  expect(diveFrame(DIVE_PHASE_MS.in.dive / 2, 'in').e).toBeCloseTo(0.5, 9)
  expect(diveFrame(DIVE_PHASE_MS.in.dive + 1, 'in').phase).toBe('enter')
  expect(diveFrame(DIVE_PHASE_MS.out.enter - 1, 'out').phase).toBe('enter')
  expect(diveFrame(DIVE_PHASE_MS.out.enter + 1, 'out').phase).toBe('dive')
})

it('rozkładanie i składanie mają tempo Play: pełny przebieg trwa 2 sekundy', () => {
  const duration = 2000
  for (const direction of ['in', 'out'] as const) {
    expect(DIVE_PHASE_MS[direction].enter).toBe(duration)
    for (const fraction of [0, 0.25, 0.5, 0.75, 1]) {
      const ms = duration * fraction
      const elapsed = direction === 'in' ? DIVE_PHASE_MS.in.dive + ms : ms
      expect(diveFrame(elapsed, direction).photoProgress).toBeCloseTo(direction === 'in' ? fraction : 1 - fraction, 9)
    }
  }
})

it('samo nurkowanie do Obserwatorium trwa 1,25 raza dłużej niż powrót', () => {
  expect(DIVE_PHASE_MS.in.dive).toBe(4250)
  expect(DIVE_PHASE_MS.out.dive).toBe(3400)
  expect(DIVE_PHASE_MS.in.dive).toBeCloseTo(1.25 * DIVE_PHASE_MS.out.dive, 9)
})

it('zbliżenie przed Obserwatorium ogranicza zmianę skali w jednej klatce', () => {
  const frameMs = 1000 / 60
  const { dive } = DIVE_PHASE_MS.in
  let fastest = 0
  for (let ms = frameMs; ms < dive; ms += frameMs) {
    fastest = Math.max(fastest, diveFrame(ms, 'in').e - diveFrame(ms - frameMs, 'in').e)
  }
  expect(fastest).toBeLessThan(0.0065)
})

it('kamera w połowie obrotu leży na krótszym łuku wokół Ziemi', () => {
  const start: Pose = { position: [-20, 6, 5], target: [-24, 0, 1], up: [0, 1, 0] }
  const u1 = 0.001
  const u0 = startScale(start, bridge, seam, u1)
  let low = 0, high = ALIGN_K
  for (let i = 0; i < 40; i++) {
    const mid = (low + high) / 2
    if (turnWeight(mid) < 0.5) low = mid
    else high = mid
  }
  const k = (low + high) / 2
  const end = bridgePose(bridge, seam, u0)
  const radius = Math.hypot(...start.position.map((v, i) => v - bridge.origin[i]))
  const midpoint = start.position.map((v, i) => v + end.position[i] - 2 * bridge.origin[i])
  const length = Math.hypot(...midpoint)
  const expected = midpoint.map((v, i) => bridge.origin[i] + radius * v / length) as Vec3
  close(divePose(start, bridge, seam, { e: 0, k }, u0, u1).position, expected)
})

it('ruch wstecz jest lustrem ruchu naprzód w tej samej fazie (każdy kierunek w swoim czasie)', () => {
  // Sam szew sprawdza test osi czasu; tutaj porównujemy wnętrze fazy bez błędów zaokrąglenia na granicy.
  for (let f = 0.02; f <= 1.0001; f += 0.02) {
    const back = diveFrame(DIVE_PHASE_MS.out.enter + f * DIVE_PHASE_MS.out.dive, 'out')
    const forward = diveFrame((1 - f) * DIVE_PHASE_MS.in.dive, 'in')
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
  for (const key of ['layers', 'labels', 'guide', 'spaceAxis', 'cone', 'coneFaces', 'spaceEarth'] as const) {
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
  for (const key of ['earth', 'pyramid', 'axis', 'photo'] as const) expect(before[key]).toBe(0)
  // Odpowiedniki z Drogi Mlecznej (linia widzenia, stożek, Ziemia) są jeszcze w pełni widoczne.
  for (const key of ['guide', 'spaceAxis', 'cone', 'spaceEarth'] as const) expect(before[key]).toBe(1)
})

it('siatka pojawia się i zmienia rozstaw od pierwszej zmiany stożka', () => {
  expect(diveGridScale(0.43)).toBeGreaterThan(6)
  expect(diveFades(0.43).grid).toBeGreaterThan(0.35)
  let previous = diveGridScale(0)
  for (let i = 1; i <= 100; i++) {
    const k = i / 100
    const scale = diveGridScale(k)
    expect(diveFades(k).grid > 0).toBe(guideAlignment(k) > 0)
    expect(scale).toBeLessThanOrEqual(previous)
    if (k >= ALIGN_K) expect(scale).toBe(1)
    previous = scale
  }
})

it('przy Ziemi kamera zachowuje orientację Drogi Mlecznej przed rozpoczęciem obrotu', () => {
  const start: Pose = { position: [-20, 6, 5], target: [-24, 0, 1], up: [0, 1, 0] }
  const u0 = startScale(start, bridge, seam, 0.001)
  const k = 0.12
  const pose = divePose(start, bridge, seam, { e: ease(k), k }, u0, 0.001)
  close(pose.up, start.up)
  const scale = diveScale(ease(k), u0, 0.001) / u0
  close(pose.target.map((v, i) => v - pose.position[i]) as Vec3, start.target.map((v, i) => (v - start.position[i]) * scale) as Vec3)
})

it('linia środkowa obu scen jest przekazywana w tym samym tempie', () => {
  for (const k of [ALIGN_K, 0.72, 0.8, 0.9, 1]) {
    const fade = diveFades(k)
    expect(fade.spaceAxis + fade.axis).toBeCloseTo(1, 12)
  }
})

it('wycinki IC 434 zachowują kolejność odległości i trafiają do rozłożonej pozycji Obserwatorium', () => {
  const distances = [1300, 1500, 1600]
  const domain = distanceDomain(distances)
  const image = { width: 1200, height: 800 }
  const pixel = { x: 630, y: 410 }
  const u0 = 0.03
  for (const k of [0, 0.2, 0.45, ALIGN_K, 0.9]) {
    const u = diveScale(ease(k), u0, 0.001)
    const depths = distances.map((distance) => {
      const galaxy = bridgePoint(bridge, [0, 0, EARTH_Z - distance / 1000], 1)
      const observatory = observatoryPosition(pixel, image, distance, domain, 1)
      const p = diveMarkerPosition(bridge, galaxy, observatory, k, u0, u)
      if (k === 0) close(p, galaxy)
      if (k >= ALIGN_K) close(p, bridgePoint(bridge, observatory, u))
      return unbridgePoint(bridge, p, u)[2]
    })
    expect(depths[0]).toBeGreaterThan(depths[1])
    expect(depths[1]).toBeGreaterThan(depths[2])
  }
})

it('stożek oddaje ostrosłupowi krawędzie o tych samych końcach i zsynchronizowanym kryciu', () => {
  const real: [number, number] = [0.0087, 0.0088]
  const halfWidth = PLANE_WIDTH / 2, halfHeight = PLANE_WIDTH * 0.75 / 2
  const pyramid: [number, number] = [halfWidth / EARTH_Z, halfHeight / EARTH_Z]
  const guideLength = 50
  expect(coneLength(0, guideLength, 0.33)).toBe(guideLength)
  for (const k of [ALIGN_K, 0.72, 0.8, 0.9, 1]) {
    const scale = diveScale(ease(k), 0.33, 0.001)
    const length = coneLength(k, guideLength, scale)
    const [tx, ty] = coneTan(k, real, pyramid)
    for (const [x, y] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) {
      const corner = bridgePoint(bridge, [x * halfWidth, y * halfHeight, 0], scale)
      close(bridgePoint(bridge, [x * tx * length / scale, y * ty * length / scale, EARTH_Z - length / scale], scale), corner)
    }
    const fade = diveFades(k)
    expect(fade.cone + fade.pyramid).toBeCloseTo(1, 12)
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
  close(unbridgeVector(bridge, pose.up), seam.up)
})

it('odwrócony kadr zachowuje linię widzenia, a górę dopasowuje do widoku Drogi Mlecznej', () => {
  const basis: { x: Vec3; y: Vec3; center: Vec3 } = { x: [-1, 0, 0], y: [0, -1, 0], center: [0, 0, -1] }
  const upright = makeBridge(bridge.origin, basis, bridge.earth, uprightRoll(basis, [0, 1, 0]))
  close(bridgeVector(upright, [0, 0, -1]), basis.center)
  close(bridgeVector(upright, [0, 1, 0]), [0, 1, 0])
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
  // Far jak w scenie: kamera oddalona kółkiem do granicy zoomu (6000 j.) nie obcina sceny na starcie nurkowania.
  expect(nearFar(10)).toEqual({ near: 0.1, far: SPACE_FAR })
  expect(nearFar(6000).far).toBe(SPACE_FAR)
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

it('przelot zakładek: promień kamery zmienia się geometrycznie, kierunek i cel jak w lerpPose', () => {
  const a: Pose = { position: [0, 10, 0], target: [0, 0, 0], up: [0, 1, 0] }
  const b: Pose = { position: [600, 800, 40], target: [0, 0, 40], up: [0, 1, 0] }
  close(zoomPose(a, b, 0).position, a.position)
  close(zoomPose(a, b, 1).position, b.position)
  close(zoomPose(a, b, 1).target, b.target)
  const half = zoomPose(a, b, 0.5), linear = lerpPose(a, b, 0.5)
  const offset = half.position.map((v, i) => v - half.target[i]) as Vec3
  const linearOffset = linear.position.map((v, i) => v - linear.target[i]) as Vec3
  expect(Math.hypot(...offset)).toBeCloseTo(100, 9)
  close(half.target, linear.target)
  close(offset.map((v) => v / 100) as Vec3, linearOffset.map((v) => v / Math.hypot(...linearOffset)) as Vec3)
})

it('reverseElapsedMs zachowuje bieżącą fazę, postęp k i photoProgress przy zawróceniu w trakcie wejścia', () => {
  const { dive, enter } = DIVE_PHASE_MS.in
  for (const ms of [0, dive * 0.25, dive * 0.85, dive, dive + enter * 0.5, dive + enter]) {
    const forward = diveFrame(ms, 'in')
    const backMs = reverseElapsedMs(ms, 'in', 'out')
    const reversed = diveFrame(backMs, 'out')
    expect(reversed.e).toBeCloseTo(forward.e, 9)
    expect(reversed.photoProgress).toBeCloseTo(forward.photoProgress, 9)
    if (ms > 0 && ms !== dive) {
      expect(reversed.phase).toBe(forward.phase)
      expect(reversed.k).toBeCloseTo(forward.k, 9)
    }
  }
})
