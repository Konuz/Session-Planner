import type { ObjectType } from './catalog'

export type PhotoScale = 'galaxy' | 'universe'
export interface PhotoCut {
  id: string
  type: ObjectType
  raDeg: number
  decDeg: number
  x: number
  y: number
  radius: number
  enabled: boolean
  distLy: number | null
  distanceSource: string
  uncertaintyLy: number | null
  distanceScope: 'object' | 'complex'
}
export interface PhotoProject {
  version: 1
  id: string
  name: string
  image: string
  width: number
  height: number
  createdAt: number
  cuts: PhotoCut[]
  astrometry: { raDeg: number; decDeg: number; rmsPx: number; matches: number; edgeMatches: number; edgeRmsPx: number | null; totalMs: number; wcs: unknown }
}
export interface PhotoProjection { id: string; x: number; y: number; visible: boolean; kind: ReturnType<typeof photoAnchorKind>; originX: number; originY: number }
export interface PhotoSceneFrame { width: number; height: number; anchors: PhotoProjection[] }
export interface PhotoDistance extends Pick<PhotoCut, 'distLy' | 'uncertaintyLy' | 'distanceSource'> {
  source: 'Wikidata' | 'SIMBAD' | 'NED'
  url: string
}
export interface PhotoDistances { measurements: PhotoDistance[]; warnings: string[] }

export function circleIntersectsImage(x: number, y: number, radius: number, width: number, height: number): boolean {
  return Math.hypot(x - Math.max(0, Math.min(width, x)), y - Math.max(0, Math.min(height, y))) <= radius
}

export function photoAnchorKind(distLy: number | null, scale: PhotoScale): 'position' | 'direction' | 'outside' | 'local' {
  if (distLy === null || !Number.isFinite(distLy) || distLy <= 0) return 'direction'
  if (scale === 'galaxy' && distLy >= 150_000) return 'outside'
  if (scale === 'universe' && distLy < 150_000) return 'local'
  return 'position'
}

export function photoColumns(cuts: PhotoCut[], imageWidth: number): [PhotoCut[], PhotoCut[]] {
  const columns: [PhotoCut[], PhotoCut[]] = [[], []]
  for (const cut of cuts) columns[cut.x < imageWidth / 2 ? 0 : 1].push(cut)
  for (const column of columns) column.sort((a, b) => a.y - b.y)
  return columns
}

export function photoStageHeight(cuts: PhotoCut[], imageWidth: number): number {
  const counts = [0, 0]
  for (const cut of cuts) counts[cut.x < imageWidth / 2 ? 0 : 1]++
  // Rezerwuj miejsce także na wyłączone wycinki, aby zaznaczanie nie zmieniało wysokości sceny.
  // Co najmniej 26 px średnicy oraz 32 px na podpis i odstęp.
  return Math.max(520, 305 + (Math.max(...counts) - 1) * 58)
}

export function coveredPhotoCircles(circles: { x: number; y: number; radius: number }[]): boolean[] {
  return circles.map((circle, i) => circles.some((other, j) => j > i
    && (circle.x - other.x) ** 2 + (circle.y - other.y) ** 2 < (circle.radius + other.radius) ** 2))
}

export function photoPose(cut: Pick<PhotoCut, 'x' | 'y' | 'radius'>, frame: { x: number; y: number; scale: number }, destination: { x: number; y: number; radius: number }, progress: number) {
  const t = Math.max(0, Math.min(1, progress))
  const e = t * t * (3 - 2 * t)
  const source = { x: frame.x + cut.x * frame.scale, y: frame.y + cut.y * frame.scale, radius: cut.radius * frame.scale }
  return { x: source.x + (destination.x - source.x) * e, y: source.y + (destination.y - source.y) * e, radius: source.radius + (destination.radius - source.radius) * e }
}
