import { describe, expect, it } from 'vitest'
import type { Vec3 } from './astro'
import { constellationView, frameDistance, framePose, sideView } from './spaceCamera'

const DEG = Math.PI / 180
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const unit = (a: Vec3): Vec3 => { const n = Math.hypot(...a); return [a[0] / n, a[1] / n, a[2] / n] }

/** Kierunki na całej sferze, razem z biegunami i płaszczyzną Galaktyki. */
function directions(): Vec3[] {
  const out: Vec3[] = [[0, 1, 0], [0, -1, 0]]
  for (let b = -80; b <= 80; b += 20) for (let l = 0; l < 360; l += 30) out.push([Math.cos(b * DEG) * Math.cos(l * DEG), Math.sin(b * DEG), Math.cos(b * DEG) * Math.sin(l * DEG)])
  return out
}

/** Rzut punktu na ekran kamery patrzącej z position na target (y w górę): współrzędne −1…1 i głębia. */
function project(p: Vec3, position: Vec3, target: Vec3, fovDeg: number, aspect: number) {
  const forward = unit([target[0] - position[0], target[1] - position[1], target[2] - position[2]])
  const right = unit(cross(forward, [0, 1, 0]))
  const up = cross(right, forward)
  const d: Vec3 = [p[0] - position[0], p[1] - position[1], p[2] - position[2]]
  const depth = dot(d, forward)
  const tanY = Math.tan(fovDeg * DEG / 2)
  return { x: dot(d, right) / (depth * tanY * aspect), y: dot(d, up) / (depth * tanY), depth }
}

it('pokazuje Ziemię i zachowuje proporcje gwiazdozbioru przy oddalaniu kamery', () => {
  const observer: Vec3 = [-26.7, 0, 0]
  const stars: Vec3[] = [[-23.7, 0.1, 0.2], [-25.7, 0.2, -0.6], [-12.7, -5, 7]]
  for (const aspect of [0.6, 1.7]) {
    const view = constellationView(stars, observer, aspect)!
    expect(project(observer, view.position, view.target, view.fov, aspect).depth).toBeGreaterThan(0)
    const fartherCamera = view.position.map((v, i) => v - view.forward[i] * 2) as Vec3
    const scale = project(view.target, view.position, view.target, view.fov, aspect).depth
      / project(view.target, fartherCamera, view.target, view.fov, aspect).depth
    for (const star of stars) {
      const screen = project(view.project(star), view.position, view.target, view.fov, aspect)
      expect(screen.depth).toBeGreaterThan(0)
      expect(Math.max(Math.abs(screen.x), Math.abs(screen.y))).toBeLessThanOrEqual(0.800001)
      const farther: Vec3 = [observer[0] + (star[0] - observer[0]) * 3, star[1] * 3, star[2] * 3]
      const sameDirection = project(view.project(farther), view.position, view.target, view.fov, aspect)
      expect(sameDirection.x).toBeCloseTo(screen.x)
      expect(sameDirection.y).toBeCloseTo(screen.y)
      const zoomedOut = project(view.project(star), fartherCamera, view.target, view.fov, aspect)
      expect(zoomedOut.x).toBeCloseTo(screen.x * scale)
      expect(zoomedOut.y).toBeCloseTo(screen.y * scale)
    }
  }
})

describe('sideView', () => {
  it('dla każdego kierunku na niebie patrzy z boku linii widzenia i znad płaszczyzny Galaktyki', () => {
    for (const sight of directions()) {
      const view = sideView(sight)
      expect(Math.hypot(...view)).toBeCloseTo(1, 9)
      const angle = Math.acos(Math.abs(dot(view, sight))) / DEG
      expect(angle).toBeGreaterThanOrEqual(60)
      expect(Math.asin(view[1]) / DEG).toBeGreaterThanOrEqual(19.99)
    }
  })

  it('linia w płaszczyźnie Galaktyki jest prostopadła do kierunku patrzenia', () => {
    const view = sideView([1, 0, 0])
    expect(dot(view, [1, 0, 0])).toBeCloseTo(0, 9)
    expect(Math.asin(view[1]) / DEG).toBeCloseTo(32, 6)
  })

  it('wybiera wskazaną stronę linii widzenia', () => {
    const sight: Vec3 = [0.6, 0.2, 0.77]
    const a = sideView(sight, [1, 0, 0]), b = sideView(sight, [-1, 0, 0])
    expect(a[0]).toBeGreaterThan(0)
    expect(b[0]).toBeLessThan(0)
  })

  it('linia widzenia równoległa do dawnego stałego przesunięcia kamery (0,55; 0,55; 0,75) też jest widziana z boku', () => {
    const sight = unit([0.55, 0.55, 0.75])
    expect(Math.acos(Math.abs(dot(sideView(sight), sight))) / DEG).toBeGreaterThanOrEqual(60)
  })
})

describe('framePose', () => {
  const options = { fovDeg: 50, aspect: 1.6, room: [0.7, 0.6] as [number, number] }

  it('mieści wszystkie punkty w wyznaczonej części kadru dla każdego kierunku', () => {
    const sun: Vec3 = [-26.7, 0, 0]
    for (const sight of directions()) {
      const s = unit(sight)
      const points: Vec3[] = [sun, [sun[0] + s[0] * 1.3, sun[1] + s[1] * 1.3, sun[2] + s[2] * 1.3], [sun[0] + s[0] * 9, sun[1] + s[1] * 9, sun[2] + s[2] * 9]]
      const pose = framePose(points, sideView(s), options)
      for (const p of points) {
        const screen = project(p, pose.position, pose.target, options.fovDeg, options.aspect)
        expect(screen.depth).toBeGreaterThan(0)
        expect(Math.abs(screen.x)).toBeLessThanOrEqual(0.7 + 1e-9)
        expect(Math.abs(screen.y)).toBeLessThanOrEqual(0.6 + 1e-9)
      }
    }
  })

  it('kadr jest ciasny: najdalszy punkt dotyka granicy dostępnej części', () => {
    const points: Vec3[] = [[0, 0, 0], [40, 0, 0]]
    const pose = framePose(points, sideView([1, 0, 0]), options)
    const edge = Math.max(...points.map((p) => { const s = project(p, pose.position, pose.target, 50, 1.6); return Math.max(Math.abs(s.x) / 0.7, Math.abs(s.y) / 0.6) }))
    expect(edge).toBeCloseTo(1, 6)
  })

  it('nie zbliża się bardziej niż najmniejsza odległość', () => {
    const target: Vec3 = [0, 0, 0]
    expect(frameDistance([[0, 0, 0], [0.01, 0, 0]], target, [0, 0.5, 1], { ...options, minDistance: 8 })).toBe(8)
  })
})
