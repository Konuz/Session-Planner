// Nurkowanie z Drogi Mlecznej do rozłożonego zdjęcia (i z powrotem), bez three.js: oś czasu faz, logarytmiczna
// skala mostu między układami, pozy kamer, kąt stożka pola i krycia warstw. Jeden wirtualny kamerzysta prowadzi
// obie sceny; szwem jest widok Obserwatorium „Z Ziemi” (zdjęcie płasko, progress = 0).
import type { Vec3 } from './astro'
import { orbitOffset } from './observatory'

export type DiveDirection = 'in' | 'out'
export type DivePhase = 'setup' | 'dive' | 'enter'

/** Czasy faz w ms: ustawienie kamery Drogi Mlecznej, nurkowanie, wejście do Obserwatorium. */
export const DIVE_PHASE_MS: Record<DivePhase, number> = { setup: 1000, dive: 1600, enter: 900 }
export const DIVE_TOTAL_MS = DIVE_PHASE_MS.setup + DIVE_PHASE_MS.dive + DIVE_PHASE_MS.enter

export interface DiveFrame {
  /** Położenie na drodze naprzód (0: Droga Mleczna, 1: Obserwatorium); wstecz s = 1 − t. */
  s: number
  phase: DivePhase
  /** Postęp w fazie (0–1, w kierunku drogi naprzód). */
  k: number
  /** Wygładzony postęp nurkowania: 0 w fazie ustawienia, 1 w fazie wejścia. */
  e: number
  done: boolean
}

const clamp01 = (t: number) => Math.max(0, Math.min(1, t))
/** Wygładzenie z zerową prędkością na końcach (sześcienne „ease in-out”). */
export const ease = (t: number) => { const x = clamp01(t); return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2 }
/** Płynne przejście 0 → 1 między a i b. */
export const ramp = (t: number, a: number, b: number) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x) }

export function diveFrame(elapsedMs: number, direction: DiveDirection): DiveFrame {
  const t = clamp01(elapsedMs / DIVE_TOTAL_MS)
  const s = direction === 'in' ? t : 1 - t
  const ms = s * DIVE_TOTAL_MS
  const { setup, dive, enter } = DIVE_PHASE_MS
  if (ms < setup) return { s, phase: 'setup', k: ms / setup, e: 0, done: t >= 1 }
  if (ms < setup + dive) {
    const k = (ms - setup) / dive
    return { s, phase: 'dive', k, e: ease(k), done: t >= 1 }
  }
  return { s, phase: 'enter', k: Math.min(1, (ms - setup - dive) / enter), e: 1, done: t >= 1 }
}

/** Tysiące lś na jednostkę Obserwatorium: logarytmicznie od u0 (e = 0) do u1 (e = 1), jak w „potęgach dziesięciu”. */
export function diveScale(e: number, u0: number, u1: number): number {
  return u0 ** (1 - e) * u1 ** e
}

/**
 * Most układów: p_DM = Ziemia_DM + R · (p_obs − Ziemia_obs) · u. R przenosi osie Obserwatorium (x: piksele w prawo,
 * y: w górę, z: przeciwnie do linii widzenia) na osie bazy kadru w scenie Drogi Mlecznej; jest obrotem.
 */
export interface Bridge {
  /** Ziemia (Słońce) w scenie Drogi Mlecznej. */
  origin: Vec3
  x: Vec3
  y: Vec3
  z: Vec3
  /** Ziemia w scenie Obserwatorium. */
  earth: Vec3
}

export function makeBridge(origin: Vec3, basis: { center: Vec3; x: Vec3; y: Vec3 }, earth: Vec3): Bridge {
  return { origin, x: basis.x, y: basis.y, z: [-basis.center[0], -basis.center[1], -basis.center[2]], earth }
}

export function bridgeVector(b: Bridge, v: Vec3): Vec3 {
  return [0, 1, 2].map((i) => b.x[i] * v[0] + b.y[i] * v[1] + b.z[i] * v[2]) as Vec3
}

export function bridgePoint(b: Bridge, p: Vec3, u: number): Vec3 {
  const d = bridgeVector(b, [p[0] - b.earth[0], p[1] - b.earth[1], p[2] - b.earth[2]])
  return [b.origin[0] + d[0] * u, b.origin[1] + d[1] * u, b.origin[2] + d[2] * u]
}

/** Odwrotność mostu (punkt Drogi Mlecznej w układzie Obserwatorium). */
export function unbridgePoint(b: Bridge, q: Vec3, u: number): Vec3 {
  const d: Vec3 = [(q[0] - b.origin[0]) / u, (q[1] - b.origin[1]) / u, (q[2] - b.origin[2]) / u]
  const dot = (a: Vec3) => a[0] * d[0] + a[1] * d[1] + a[2] * d[2]
  return [b.earth[0] + dot(b.x), b.earth[1] + dot(b.y), b.earth[2] + dot(b.z)]
}

export interface Pose { position: Vec3; target: Vec3; up: Vec3 }

export function bridgePose(b: Bridge, pose: Pose, u: number): Pose {
  return { position: bridgePoint(b, pose.position, u), target: bridgePoint(b, pose.target, u), up: bridgeVector(b, pose.up) }
}

const unit = (v: Vec3): Vec3 => { const n = Math.hypot(...v) || 1; return [v[0] / n, v[1] / n, v[2] / n] }

/** Kierunek pośredni po łuku wielkiego koła (slerp wektorów jednostkowych). */
export function slerpDirection(a: Vec3, b: Vec3, t: number): Vec3 {
  const ua = unit(a), ub = unit(b)
  const cos = Math.max(-1, Math.min(1, ua[0] * ub[0] + ua[1] * ub[1] + ua[2] * ub[2]))
  const angle = Math.acos(cos)
  if (angle < 1e-6) return ub
  if (Math.PI - angle < 1e-6) {
    // Przeciwne kierunki: obrót wokół dowolnej osi prostopadłej.
    const axis = unit(Math.abs(ua[0]) < 0.9 ? [0, -ua[2], ua[1]] : [-ua[2], 0, ua[0]])
    const c = Math.cos(Math.PI * t), s = Math.sin(Math.PI * t)
    return unit([ua[0] * c + axis[0] * s, ua[1] * c + axis[1] * s, ua[2] * c + axis[2] * s])
  }
  const s = Math.sin(angle)
  const wa = Math.sin((1 - t) * angle) / s, wb = Math.sin(t * angle) / s
  return unit([ua[0] * wa + ub[0] * wb, ua[1] * wa + ub[1] * wb, ua[2] * wa + ub[2] * wb])
}

/** Przelot kamery: cel liniowo, położenie względem celu po sferze (orbitOffset), kierunek „w górę” po łuku. */
export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const target: Vec3 = [0, 1, 2].map((i) => a.target[i] + (b.target[i] - a.target[i]) * t) as Vec3
  const offset = orbitOffset(
    [a.position[0] - a.target[0], a.position[1] - a.target[1], a.position[2] - a.target[2]],
    [b.position[0] - b.target[0], b.position[1] - b.target[1], b.position[2] - b.target[2]], t)
  return { target, position: [target[0] + offset[0], target[1] + offset[1], target[2] + offset[2]], up: slerpDirection(a.up, b.up, t) }
}

/**
 * Tangensy połowy kąta stożka pola: od prawdziwego pola zdjęcia do kąta ostrosłupa Obserwatorium (zabieg poglądowy:
 * ostrosłup jest umowny, ok. 71° wobec zwykle 0,5–5° pola). Interpolacja logarytmiczna w e ∈ [0,15; 0,6].
 */
export function coneTan(e: number, real: [number, number], pyramid: [number, number]): [number, number] {
  const c = ramp(e, 0.15, 0.6)
  return [Math.exp(Math.log(real[0]) * (1 - c) + Math.log(pyramid[0]) * c), Math.exp(Math.log(real[1]) * (1 - c) + Math.log(pyramid[1]) * c)]
}

/** Krycia warstw obu scen w funkcji e (Droga Mleczna gaśnie, elementy Obserwatorium pojawiają się kolejno). */
export interface DiveFades {
  /** Droga Mleczna: tło (punkty galaktyki, obiekty, gwiazdozbiory, podpisy). */
  layers: number
  /** Droga Mleczna: linia widzenia i znaczniki wycinków (oś Obserwatorium przejmuje linię). */
  guide: number
  /** Droga Mleczna: stożek pola (gaśnie, gdy jego kąt zrówna się z ostrosłupem). */
  cone: number
  /** Droga Mleczna: znacznik Ziemi (przenikanie z Ziemią Obserwatorium). */
  spaceEarth: number
  /** Obserwatorium: Ziemia, ostrosłup, oś, płaskie zdjęcie (z gwiazdami i kartami) i siatka. */
  earth: number
  pyramid: number
  axis: number
  photo: number
  grid: number
}

export function diveFades(e: number): DiveFades {
  return {
    layers: 1 - ramp(e, 0.5, 0.85),
    guide: 1 - ramp(e, 0.5, 0.75),
    cone: 1 - ramp(e, 0.6, 0.75),
    spaceEarth: 1 - ramp(e, 0.45, 0.6),
    earth: ramp(e, 0.4, 0.55),
    pyramid: ramp(e, 0.45, 0.6),
    axis: ramp(e, 0.4, 0.6),
    photo: ramp(e, 0.6, 0.8),
    grid: ramp(e, 0.8, 0.95),
  }
}

/** Płaszczyzny near i far kamery Drogi Mlecznej zależne od odległości od Ziemi (w nurkowaniu ułamki jednostki). */
export function nearFar(distance: number): { near: number; far: number } {
  const near = Math.min(0.1, Math.max(1e-5, distance * 0.01))
  return { near, far: Math.min(5000, Math.max(300, near * 1e6)) }
}
