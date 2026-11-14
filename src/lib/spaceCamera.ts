// Kamera widoków „Pozycja 3D” bez three.js: kierunek patrzenia z boku linii widzenia i odległość, z której wszystkie
// punkty kadru mieszczą się w polu widzenia. Stałe przesunięcie kamery dla części kierunków na niebie patrzyło
// wzdłuż linii Ziemia–cel, więc odcinek odległości i stożek zdjęcia zlewały się w skrócie perspektywicznym.
import type { Vec3 } from './astro'

const DEG = Math.PI / 180
/** Wzniesienie kamery w płaszczyźnie prostopadłej do linii widzenia. */
const SIDE_ELEVATION = 32 * DEG
/** Najmniejsze wzniesienie nad płaszczyzną Galaktyki: dysk i pierścienie odległości pozostają czytelne jako płaszczyzna. */
const MIN_ELEVATION = 20 * DEG

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const unit = (a: Vec3): Vec3 => { const n = Math.hypot(...a) || 1; return [a[0] / n, a[1] / n, a[2] / n] }
const mix = (a: Vec3, ka: number, b: Vec3, kb: number): Vec3 => [a[0] * ka + b[0] * kb, a[1] * ka + b[1] * kb, a[2] * ka + b[2] * kb]

export interface CameraPose { position: Vec3; target: Vec3 }
export const SPACE_FOV = 50
/** Płaszczyzna far sceny „Pozycja 3D”: obejmuje najdalsze galaktyki z kamery oddalonej do granicy zoomu. */
export const SPACE_FAR = 20_000

/** Rzut kierunków z Ziemi na płaszczyznę i kamera odsunięta prostopadle do tej płaszczyzny. */
export function constellationView(stars: readonly Vec3[], observer: Vec3, aspect: number) {
  if (!stars.length) return null
  const directions = stars.map((star) => unit(mix(star, 1, observer, -1)))
  const forward = unit(directions.reduce((sum, direction) => mix(sum, 1, direction, 1), [0, 0, 0]))
  const flat = cross(forward, [0, 1, 0])
  const right: Vec3 = Math.hypot(...flat) > 1e-6 ? unit(flat) : [1, 0, 0]
  const up = cross(right, forward)
  let tanHalfFov = 0
  for (const direction of directions) {
    const depth = dot(direction, forward)
    if (depth <= 0) return null
    tanHalfFov = Math.max(tanHalfFov, Math.abs(dot(direction, up)) / depth, Math.abs(dot(direction, right)) / (depth * aspect))
  }
  const distance = stars.reduce((sum, star) => sum + Math.hypot(...mix(star, 1, observer, -1)), 0) / stars.length
  const backoff = Math.max(0.02, distance * 0.5)
  return {
    position: mix(observer, 1, forward, -backoff),
    target: mix(observer, 1, forward, distance),
    forward,
    fov: Math.max(5, 2 * Math.atan(tanHalfFov * distance / ((distance + backoff) * 0.8)) / DEG),
    project(star: Vec3): Vec3 {
      const ray = mix(star, 1, observer, -1)
      const depth = dot(ray, forward)
      return depth > 0 ? mix(observer, 1, ray, distance / depth) : star
    },
  }
}

/**
 * Kierunek od celu do kamery: prostopadle do linii widzenia i znad płaszczyzny Galaktyki (y w górę), więc linia
 * leży w kadrze całą długością. `prefer` wybiera stronę linii, np. zewnętrzną stronę Galaktyki, żeby jej dysk był tłem.
 */
export function sideView(sight: Vec3, prefer: Vec3 = [0.55, 0, 0.75]): Vec3 {
  const s = unit(sight)
  const h = Math.hypot(s[0], s[2])
  const hint = Math.hypot(prefer[0], prefer[2]) > 1e-6 ? unit([prefer[0], 0, prefer[2]]) : [0.59, 0, 0.81] as Vec3
  // Poziomy wektor prostopadły do linii widzenia; dla linii pionowej każdy poziomy jest prostopadły.
  let side: Vec3 = h > 1e-6 ? [-s[2] / h, 0, s[0] / h] : hint
  if (dot(side, hint) < 0) side = [-side[0], 0, -side[2]]
  // Drugi wektor prostopadły do linii, zwrócony ku górze.
  let lift = cross(s, side)
  if (lift[1] < 0) lift = [-lift[0], -lift[1], -lift[2]]
  const view = unit(mix(side, Math.cos(SIDE_ELEVATION), lift, Math.sin(SIDE_ELEVATION)))
  if (view[1] >= Math.sin(MIN_ELEVATION)) return view
  // Stroma linia widzenia: prostopadły widok leży prawie w płaszczyźnie Galaktyki, więc kamerę unosimy do minimum.
  const flat = unit([view[0], 0, view[2]])
  return [flat[0] * Math.cos(MIN_ELEVATION), Math.sin(MIN_ELEVATION), flat[2] * Math.cos(MIN_ELEVATION)]
}

export interface FrameOptions {
  fovDeg: number
  aspect: number
  /** Część szerokości i wysokości kadru (0–1), w której mają się zmieścić punkty. */
  room?: [number, number]
  minDistance?: number
}

/** Najmniejsza odległość kamery od celu wzdłuż `view` (kamera patrzy na cel, y w górę), przy której punkty mieszczą się w kadrze. */
export function frameDistance(points: readonly Vec3[], target: Vec3, view: Vec3, { fovDeg, aspect, room = [0.8, 0.8], minDistance = 0 }: FrameOptions): number {
  const v = unit(view)
  const flat = cross([0, 1, 0], v)
  const right = Math.hypot(...flat) > 1e-6 ? unit(flat) : [1, 0, 0] as Vec3
  const up = cross(v, right)
  const tanY = Math.tan(fovDeg * DEG / 2)
  let distance = minDistance
  for (const p of points) {
    const delta: Vec3 = [p[0] - target[0], p[1] - target[1], p[2] - target[2]]
    const depth = dot(delta, v)
    distance = Math.max(distance, depth + Math.abs(dot(delta, up)) / (tanY * room[1]), depth + Math.abs(dot(delta, right)) / (tanY * aspect * room[0]))
  }
  return distance
}

/** Kadr na punkty: cel w środku ich prostopadłościanu, kamera w kierunku `view` w odległości z frameDistance. */
export function framePose(points: readonly Vec3[], view: Vec3, options: FrameOptions): CameraPose {
  const target = [0, 1, 2].map((i) => {
    const values = points.map((p) => p[i])
    return (Math.min(...values) + Math.max(...values)) / 2
  }) as Vec3
  const v = unit(view)
  const distance = frameDistance(points, target, v, options)
  return { target, position: [target[0] + v[0] * distance, target[1] + v[1] * distance, target[2] + v[2] * distance] }
}
