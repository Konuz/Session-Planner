// Nurkowanie z Drogi Mlecznej do rozłożonego zdjęcia (i z powrotem), bez three.js: oś czasu faz, logarytmiczna
// skala mostu między układami, pozy kamer, kąt stożka pola i krycia warstw. Jeden wirtualny kamerzysta prowadzi
// obie sceny; szwem jest widok Obserwatorium „Struktura”. Nurkowanie zaczyna się
// od bieżącej kamery Drogi Mlecznej (bez oddalania): zbliża ją logarytmicznie do Ziemi i obraca do pozy mostu.
import type { Vec3 } from './astro'
import { EARTH_Z, orbitOffset } from './observatory'

export type DiveDirection = 'in' | 'out'
export type DivePhase = 'dive' | 'enter'

/** Czasy faz w ms dla kierunku: nurkowanie (z obrotem kamery do pozy mostu) i wejście do Obserwatorium (panele).
 *  Droga do Obserwatorium trwa 1,25 raza dłużej niż powrót (te same proporcje faz). */
export const DIVE_PHASE_MS: Record<DiveDirection, Record<DivePhase, number>> = {
  in: { dive: 4250, enter: 1125 },
  out: { dive: 3400, enter: 900 },
}
export const diveTotalMs = (direction: DiveDirection) => DIVE_PHASE_MS[direction].dive + DIVE_PHASE_MS[direction].enter

export interface DiveFrame {
  /** Położenie na drodze naprzód (0: Droga Mleczna, 1: Obserwatorium); wstecz s = 1 − t. */
  s: number
  phase: DivePhase
  /** Postęp w fazie (0–1, w kierunku drogi naprzód). */
  k: number
  /** Wygładzony postęp nurkowania: 0 na jego początku, 1 w fazie wejścia. */
  e: number
  done: boolean
}

const clamp01 = (t: number) => Math.max(0, Math.min(1, t))
/** Wygładzenie z zerową prędkością na końcach (sześcienne „ease in-out”). */
export const ease = (t: number) => { const x = clamp01(t); return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2 }
/** Płynne przejście 0 → 1 między a i b. */
export const ramp = (t: number, a: number, b: number) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x) }

export function diveFrame(elapsedMs: number, direction: DiveDirection): DiveFrame {
  const { dive, enter } = DIVE_PHASE_MS[direction]
  const t = clamp01(elapsedMs / (dive + enter))
  const s = direction === 'in' ? t : 1 - t
  const ms = s * (dive + enter)
  if (ms < dive) {
    const k = ms / dive
    return { s, phase: 'dive', k, e: ramp(k, 0, 1), done: t >= 1 }
  }
  return { s, phase: 'enter', k: Math.min(1, (ms - dive) / enter), e: 1, done: t >= 1 }
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

/** Obrót prezentacji wokół linii widzenia, który kieruje górę kadru ku górze widoku Drogi Mlecznej. */
export function uprightRoll(basis: { x: Vec3; y: Vec3 }, up: Vec3): number {
  const x = basis.x.reduce((dot, v, i) => dot + v * up[i], 0)
  const y = basis.y.reduce((dot, v, i) => dot + v * up[i], 0)
  return Math.hypot(x, y) < 1e-6 ? 0 : Math.atan2(-x, y)
}

export function makeBridge(origin: Vec3, basis: { center: Vec3; x: Vec3; y: Vec3 }, earth: Vec3, roll = 0): Bridge {
  const c = Math.cos(roll), s = Math.sin(roll)
  const x = basis.x.map((v, i) => v * c + basis.y[i] * s) as Vec3
  const y = basis.y.map((v, i) => v * c - basis.x[i] * s) as Vec3
  return { origin, x, y, z: [-basis.center[0], -basis.center[1], -basis.center[2]], earth }
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
  const offset = unbridgeVector(b, d)
  return [b.earth[0] + offset[0], b.earth[1] + offset[1], b.earth[2] + offset[2]]
}

export function unbridgeVector(b: Bridge, v: Vec3): Vec3 {
  const dot = (axis: Vec3) => axis[0] * v[0] + axis[1] * v[1] + axis[2] * v[2]
  return [dot(b.x), dot(b.y), dot(b.z)]
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

/** Skala mostu na początku nurkowania: kamera mostu w tej samej odległości od Ziemi co bieżąca kamera
 *  (nie mniej niż u1, żeby nurkowanie nigdy nie oddalało). */
export function startScale(start: Pose, b: Bridge, seam: Pose, u1: number): number {
  const d = Math.hypot(start.position[0] - b.origin[0], start.position[1] - b.origin[1], start.position[2] - b.origin[2])
  const D = Math.hypot(seam.position[0] - b.earth[0], seam.position[1] - b.earth[1], seam.position[2] - b.earth[2])
  return Math.max(u1, d / D)
}

/** Chwila nurkowania (k, liniowy czas), w której kamera kończy obrót do pozy mostu, a stożek pola zrównuje się
 *  z ostrosłupem: od niej Ziemia, linia widzenia i stożek obu scen pokrywają się na ekranie w każdej skali mostu. */
export const ALIGN_K = 0.6
const CONE_OPEN_K = 0.34

/**
 * Obrót do pozy mostu w liniowym czasie k. Przy krańcu Drogi Mlecznej kamera najpierw zbliża się
 * w bieżącej orientacji (a w drodze powrotnej kończy w niej przelot).
 */
export const turnWeight = (k: number) => ramp(k, 0.15, 0.53)

/**
 * Kamera Drogi Mlecznej w nurkowaniu (skala mostu z e, obrót z k): bieżąca poza zbliżana do Ziemi w skali u/u0 i poza
 * mostu w skali u leżą zwykle w tej samej odległości od Ziemi. Kierunek położenia kamery zmienia się po krótszym
 * łuku sfery, bez osobnych zmian azymutu i wysokości.
 */
export function divePose(start: Pose, b: Bridge, seam: Pose, { e, k }: Pick<DiveFrame, 'e' | 'k'>, u0: number, u1: number): Pose {
  const u = diveScale(e, u0, u1)
  const scale = u / u0
  const o = b.origin
  const rel = (p: Vec3, f: number): Vec3 => [(p[0] - o[0]) * f, (p[1] - o[1]) * f, (p[2] - o[2]) * f]
  const bridged = bridgePose(b, seam, u)
  const w = turnWeight(k)
  const startOffset = rel(start.position, scale), endOffset = rel(bridged.position, 1)
  const startRadius = Math.hypot(...startOffset), endRadius = Math.hypot(...endOffset)
  const radius = startRadius + (endRadius - startRadius) * w
  const offset = slerpDirection(startOffset, endOffset, w).map((v) => v * radius)
  const from = rel(start.target, scale), to = rel(bridged.target, 1)
  return {
    position: [o[0] + offset[0], o[1] + offset[1], o[2] + offset[2]],
    target: [0, 1, 2].map((i) => o[i] + from[i] + (to[i] - from[i]) * w) as Vec3,
    up: slerpDirection(start.up, bridged.up, w),
  }
}

/** Przelot kamery: cel liniowo, położenie względem celu po sferze (orbitOffset), kierunek „w górę” po łuku. */
export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const target: Vec3 = [0, 1, 2].map((i) => a.target[i] + (b.target[i] - a.target[i]) * t) as Vec3
  const offset = orbitOffset(
    [a.position[0] - a.target[0], a.position[1] - a.target[1], a.position[2] - a.target[2]],
    [b.position[0] - b.target[0], b.position[1] - b.target[1], b.position[2] - b.target[2]], t)
  return { target, position: [target[0] + offset[0], target[1] + offset[1], target[2] + offset[2]], up: slerpDirection(a.up, b.up, t) }
}

export const guideAlignment = (k: number) => ramp(k, CONE_OPEN_K, ALIGN_K)
/** Względny rozstaw linii siatki, dopasowany w tej samej fazie co stożek. */
export const diveGridScale = (k: number) => 1 + 8 * (1 - guideAlignment(k))

export const guideRollWeight = (k: number) => ramp(k, 0.15, CONE_OPEN_K)

/** Przelicza znacznik ze skali liniowej na logarytmiczną razem ze zbliżeniem kamery. */
export function diveMarkerPosition(b: Bridge, galaxy: Vec3, observatory: Vec3, k: number, u0: number, u: number): Vec3 {
  const mix = guideAlignment(k)
  const target = bridgePoint(b, observatory, u)
  return target.map((v, i) => {
    const from = b.origin[i] + (galaxy[i] - b.origin[i]) * (u / u0)
    return from + (v - from) * mix
  }) as Vec3
}

/**
 * Tangensy połowy kąta stożka pola: od prawdziwego pola zdjęcia do kąta ostrosłupa Obserwatorium (zabieg poglądowy:
 * ostrosłup jest umowny, ok. 71° wobec zwykle 0,5–5° pola). Interpolacja logarytmiczna w k ∈ [0,34; ALIGN_K]: stożek
 * rozchyla się dopiero przy Ziemi, nie na całą galaktykę.
 */
export function coneTan(k: number, real: [number, number], pyramid: [number, number]): [number, number] {
  const c = guideAlignment(k)
  return [Math.exp(Math.log(real[0]) * (1 - c) + Math.log(pyramid[0]) * c), Math.exp(Math.log(real[1]) * (1 - c) + Math.log(pyramid[1]) * c)]
}

/** Głębokość stożka w skali Drogi Mlecznej. Na szwie jego końce leżą w narożnikach zdjęcia. */
export function coneLength(k: number, guideLength: number, bridgeScale: number): number {
  return diveScale(guideAlignment(k), guideLength, EARTH_Z * bridgeScale)
}

/**
 * Krycia warstw obu scen w funkcji k, liniowego czasu nurkowania (nie wygładzonego e): w e przenikanie wypadało
 * w najszybszej części ruchu i trwało ok. 0,2 s, a koniec nurkowania stał bez zmian. Elementy Obserwatorium
 * poza siatką pojawiają się dopiero od ALIGN_K, gdy obie sceny pokrywają się na ekranie. Każde przenikanie trwa ≥ 0,23 czasu
 * nurkowania (≥ 0,5 s także w szybszym powrocie).
 */
export interface DiveFades {
  /** Droga Mleczna: tło (punkty galaktyki, obiekty, gwiazdozbiory, podpisy obiektów tła). */
  layers: number
  /** Droga Mleczna: napisy w scenie („Ziemia”, „Centrum Galaktyki”, nazwy gwiazd) mają stałe przesunięcie w przestrzeni,
   *  więc przy zbliżaniu odpływają od swoich punktów: gasną na początku nurkowania. */
  labels: number
  /** Droga Mleczna: znaczniki wycinków oraz osobno linia widzenia. */
  guide: number
  spaceAxis: number
  /** Droga Mleczna: stożek pola (gaśnie, gdy jego kąt zrówna się z ostrosłupem). */
  cone: number
  /** Ścianki stożka: gasną wcześniej i łagodniej, bo rozchylony stożek wypełnia prawie cały kadr. */
  coneFaces: number
  /** Droga Mleczna: znacznik Ziemi (przenikanie z Ziemią Obserwatorium). */
  spaceEarth: number
  /** Obserwatorium: Ziemia, ostrosłup, oś, płaskie zdjęcie (z gwiazdami i kartami) i siatka. */
  earth: number
  pyramid: number
  axis: number
  photo: number
  grid: number
}

export function diveFades(k: number): DiveFades {
  const a = ALIGN_K
  const pyramid = ramp(k, a, a + 0.25)
  const axis = ramp(k, a, a + 0.23)
  const photo = ramp(k, a + 0.04, 0.94)
  return {
    layers: 1 - ramp(k, 0.3, 0.68),
    labels: 1 - ramp(k, 0, 0.33),
    guide: 1 - photo,
    spaceAxis: 1 - axis,
    cone: 1 - pyramid,
    coneFaces: 1 - ramp(k, CONE_OPEN_K, a),
    spaceEarth: 1 - ramp(k, a + 0.1, a + 0.33),
    earth: ramp(k, a, a + 0.23),
    pyramid,
    axis,
    photo,
    grid: ramp(k, CONE_OPEN_K, 0.54),
  }
}

/** Płaszczyzny near i far kamery Drogi Mlecznej zależne od odległości od Ziemi (w nurkowaniu ułamki jednostki). */
export function nearFar(distance: number): { near: number; far: number } {
  const near = Math.min(0.1, Math.max(1e-5, distance * 0.01))
  return { near, far: Math.min(5000, Math.max(300, near * 1e6)) }
}
