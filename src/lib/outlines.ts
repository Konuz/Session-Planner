// Kontury mgławic dla kopuły: public/data/outlines.json (OpenNGC outlines, CC BY-SA 4.0) z wektorami policzonymi raz.
import { DEG, unitVector, type Vec3 } from './astro'

export interface OutlineRing {
  /** Wierzchołki jako wektory jednostkowe J2000. */
  points: Vec3[]
  centre: Vec3
  /** Największa odległość kątowa wierzchołka od środka. */
  radiusDeg: number
}

export interface Outline {
  /** Oznaczenie obiektu („NGC 7000”, „M 45”) albo nazwa regionu z OpenNGC („Cygnus”). */
  id: string
  /** Poziom jasności OpenNGC: 1: słaby zasięg, 2: standardowy, 3: jasne jądro. */
  level: 1 | 2 | 3
  /** Polska nazwa regionu, gdy obrys obejmuje obszar nieba, a nie obiekt katalogu („Łabędź”). */
  region: string | null
  /** Mgławica ciemna z konturem dopasowanym do zdjęcia (scripts/data/dark-outlines.json). */
  dark: boolean
  /** Nazwa zwyczajowa z tytułów zdjęć („Rotten Fish”), gdy jest. */
  name: string | null
  /** Inne oznaczenia tego samego konturu („B 150” dla LDN 1082). */
  also: string[]
  rings: OutlineRing[]
}

/** Pierścień [ra, dec, ra, dec, …] w stopniach → wektory, środek i promień kątowy. */
export function prepareRing(flat: number[]): OutlineRing {
  const points: Vec3[] = []
  let x = 0, y = 0, z = 0
  for (let i = 0; i + 1 < flat.length; i += 2) {
    const v = unitVector(flat[i], flat[i + 1])
    points.push(v)
    x += v[0]
    y += v[1]
    z += v[2]
  }
  const n = Math.hypot(x, y, z) || 1
  const centre: Vec3 = [x / n, y / n, z / n]
  let minDot = 1
  for (const v of points) minDot = Math.min(minDot, v[0] * centre[0] + v[1] * centre[1] + v[2] * centre[2])
  return { points, centre, radiusDeg: Math.acos(Math.max(-1, Math.min(1, minDot))) / DEG }
}

let pending: Promise<Outline[]> | null = null

export function loadOutlines(): Promise<Outline[]> {
  pending ??= fetch('/data/outlines.json')
    .then((res) => {
      if (!res.ok) throw new Error(`Nie udało się wczytać konturów mgławic (HTTP ${res.status})`)
      return res.json() as Promise<{
        objects: { id: string; level: 1 | 2 | 3; region?: string; dark?: number; name?: string; also?: string[]; rings: number[][] }[]
      }>
    })
    .then((data) =>
      data.objects.map((o) => ({
        id: o.id,
        level: o.level,
        region: o.region ?? null,
        dark: o.dark === 1,
        name: o.name ?? null,
        also: o.also ?? [],
        rings: o.rings.map(prepareRing),
      })),
    )
  return pending
}

/** Punkt w wielokącie na ekranie (reguła parzystości). */
export function pointInPolygon(pts: readonly [number, number][], x: number, y: number): boolean {
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]
    const [xj, yj] = pts[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/** Pole wielokąta na ekranie (wzór sznurowadłowy, bez znaku). */
export function polygonArea(pts: readonly [number, number][]): number {
  let sum = 0
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) sum += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1]
  return Math.abs(sum) / 2
}
