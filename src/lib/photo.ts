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
/** Gwiazda Gaia DR3 w kadrze. Pozycja na epokę 2025,0 (jak katalog solvera), piksel z WCS zdjęcia. */
export interface PhotoStar {
  id: string
  x: number
  y: number
  raDeg: number
  decDeg: number
  gMag: number
  bpRp: number | null
  parallaxMas: number | null
  parallaxOverError: number | null
  /** Bailer-Jones et al. 2021, mediana odległości geometrycznej; null przy ϖ/σ < 5 lub braku rozwiązania. */
  distLy: number | null
  /** 16. i 84. percentyl rozkładu a posteriori. */
  distLoLy: number | null
  distHiLy: number | null
}
export interface PhotoStars { stars: PhotoStar[]; magLimit: number; fetchedAt: number }
export interface PhotoProject {
  version: 2
  id: string
  name: string
  image: string
  width: number
  height: number
  createdAt: number
  cuts: PhotoCut[]
  astrometry: { raDeg: number; decDeg: number; rmsPx: number; matches: number; edgeMatches: number; edgeRmsPx: number | null; totalMs: number; wcs: unknown }
  /** null: gwiazd jeszcze nie pobrano (także po migracji z wersji 1). */
  stars: PhotoStars | null
}
export interface PhotoProjection { id: string; x: number; y: number; visible: boolean; kind: ReturnType<typeof photoAnchorKind>; originX: number; originY: number }
export interface PhotoSceneFrame { width: number; height: number; anchors: PhotoProjection[] }
export interface PhotoDistance extends Pick<PhotoCut, 'distLy' | 'uncertaintyLy' | 'distanceSource'> {
  source: 'Wikidata' | 'SIMBAD' | 'NED'
  url: string
}
export interface PhotoDistances { measurements: PhotoDistance[]; warnings: string[] }

/** Zapis z IndexedDB → bieżąca wersja projektu; nieznane wersje odrzuca. */
export function migratePhotoProject(stored: unknown): PhotoProject | null {
  if (!stored || typeof stored !== 'object') return null
  const project = stored as Omit<PhotoProject, 'version' | 'stars'> & { version: unknown; stars?: unknown }
  if (project.version === 1) return { ...project, version: 2, stars: null }
  if (project.version === 2) return { ...project, version: 2, stars: project.stars && Array.isArray((project.stars as PhotoStars).stars) ? project.stars as PhotoStars : null }
  return null
}

export function circleIntersectsImage(x: number, y: number, radius: number, width: number, height: number): boolean {
  return Math.hypot(x - Math.max(0, Math.min(width, x)), y - Math.max(0, Math.min(height, y))) <= radius
}

export function photoAnchorKind(distLy: number | null, scale: PhotoScale): 'position' | 'direction' | 'outside' | 'local' {
  if (distLy === null || !Number.isFinite(distLy) || distLy <= 0) return 'direction'
  if (scale === 'galaxy' && distLy >= 150_000) return 'outside'
  if (scale === 'universe' && distLy < 150_000) return 'local'
  return 'position'
}

export function photoColumns(cuts: PhotoCut[], imageWidth: number, capacity = Infinity): [PhotoCut[], PhotoCut[]] {
  const byX = [...cuts].sort((a, b) => a.x - b.x)
  // Strona wynika z połowy zdjęcia; nadmiar ponad pojemność kolumny przechodzi na drugą stronę (obiekty najbliżej środka).
  const left = Math.max(cuts.length - capacity, Math.min(capacity, byX.filter((c) => c.x < imageWidth / 2).length))
  const columns: [PhotoCut[], PhotoCut[]] = [byX.slice(0, left), byX.slice(left)]
  for (const column of columns) column.sort((a, b) => a.y - b.y)
  return columns
}

/** Liczba kart w kolumnie. Zależy tylko od liczby wycinków (także wyłączonych), więc przesuwanie okręgów ani zaznaczanie nie zmienia wysokości sceny. */
export function photoColumnCapacity(cuts: PhotoCut[]): number {
  return Math.max(1, Math.ceil(cuts.length / 2))
}

export function photoStageHeight(cuts: PhotoCut[]): number {
  // Co najmniej 26 px średnicy oraz 32 px na podpis i odstęp.
  return Math.max(520, 305 + (photoColumnCapacity(cuts) - 1) * 58)
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

/** Położenie płaskiego zdjęcia na scenie (marginesy: domyślnie jak stara nakładka, nad paskiem zdjęcia u dołu):
 *  lewy górny róg i skala piksela. */
export function photoFrame(width: number, height: number, image: { width: number; height: number }, inset = { top: 65, bottom: 105, side: 18 }): { x: number; y: number; scale: number } {
  const free = height - inset.top - inset.bottom
  const scale = Math.min((width - 2 * inset.side) / image.width, Math.max(80, free) / image.height)
  return { x: (width - image.width * scale) / 2, y: inset.top + (free - image.height * scale) / 2, scale }
}
