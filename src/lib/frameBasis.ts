// Baza kadru zdjęcia w układzie sceny „Pozycja 3D”: kierunek środka i osie obrazu na niebie z WCS
// (środek i macierz CD, przybliżenie styczne bez dystorsji SIP). Łączy płaszczyznę Obserwatorium z Drogą Mleczną.
import { galacticVector, type Vec3 } from './astro'
import { toScene } from './space3d'

export interface FrameBasis {
  /** Kierunek środka kadru (wektor jednostkowy w układzie sceny). */
  center: Vec3
  /** Oś x Obserwatorium (piksele w prawo) na niebie; przy kadrze lustrzanym przeciwnie, by baza pozostała obrotem. */
  x: Vec3
  /** Oś y Obserwatorium (piksele w górę) na niebie. Zawsze x × y = −center: wyznacznik [x, y, −center] wynosi +1. */
  y: Vec3
  /** Kadr lustrzany względem nieba widzianego z Ziemi (znak wyznacznika CD przy osi y pikseli w dół). */
  mirrored: boolean
  /** Skala zdjęcia w radianach na piksel. */
  radPerPx: number
  /** Piksel środka (CRPIX), w którym kierunek równa się center. */
  refPx: [number, number]
}

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const add = (a: Vec3, b: Vec3, k = 1): Vec3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k]
const unit = (a: Vec3): Vec3 => { const n = Math.hypot(...a); return [a[0] / n, a[1] / n, a[2] / n] }
const sky = (raDeg: number, decDeg: number) => toScene(galacticVector({ raDeg, decDeg }))

interface Astrometry { raDeg: number; decDeg: number; wcs: unknown }

/** Baza z zapisanego WCS (piksele od 0, oś y w dół, jak wycinki i gwiazdy projektu); null bez poprawnej macierzy CD. */
export function frameBasis(astrometry: Astrometry, width: number, height: number): FrameBasis | null {
  const wcs = astrometry.wcs as { cd?: number[][]; crpix?: number[] } | null
  const cd = wcs?.cd
  if (!Array.isArray(cd) || cd.length !== 2 || cd.some((row) => !Array.isArray(row) || row.length !== 2 || row.some((v) => !Number.isFinite(v)))) return null
  const det = cd[0][0] * cd[1][1] - cd[0][1] * cd[1][0]
  if (!(Math.abs(det) > 0)) return null
  const { raDeg, decDeg } = astrometry
  const center = sky(raDeg, decDeg)
  // Wschód i północ w punkcie środka: pochodne wektora jednostkowego po RA i Dec (to też kierunki na sferze).
  const east = sky(raDeg + 90, 0)
  const north = sky(raDeg, decDeg + 90)
  // ξ (ku wschodowi) i η (ku północy) dla piksela w prawo i w dół; góra obrazu to −(w dół).
  const rightSky: Vec3 = [east[0] * cd[0][0] + north[0] * cd[1][0], east[1] * cd[0][0] + north[1] * cd[1][0], east[2] * cd[0][0] + north[2] * cd[1][0]]
  const upSky: Vec3 = [-(east[0] * cd[0][1] + north[0] * cd[1][1]), -(east[1] * cd[0][1] + north[1] * cd[1][1]), -(east[2] * cd[0][1] + north[2] * cd[1][1])]
  const back: Vec3 = [-center[0], -center[1], -center[2]]
  let x = unit(add(rightSky, center, -dot(rightSky, center)))
  let y = cross(back, x)
  const mirrored = dot(upSky, y) < 0
  if (mirrored) {
    x = [-x[0], -x[1], -x[2]]
    y = cross(back, x)
  }
  const crpix = Array.isArray(wcs?.crpix) && wcs.crpix.length === 2 && wcs.crpix.every(Number.isFinite) ? wcs.crpix : [(width - 1) / 2, (height - 1) / 2]
  return { center, x, y, mirrored, radPerPx: Math.sqrt(Math.abs(det)) * Math.PI / 180, refPx: [crpix[0], crpix[1]] }
}

/** Kierunek piksela zdjęcia przez bazę kadru (rzut gnomoniczny ze skalą z CD). */
export function pixelDirection(basis: FrameBasis, px: number, py: number): Vec3 {
  const a = (basis.mirrored ? -1 : 1) * (px - basis.refPx[0]) * basis.radPerPx
  const b = (basis.refPx[1] - py) * basis.radPerPx
  return unit(add(add(basis.center, basis.x, a), basis.y, b))
}

/** Tangensy połowy pola w poziomie i pionie (prawdziwy kąt kadru; współrzędne płaszczyzny stycznej to tangensy). */
export function halfFieldTan(basis: FrameBasis, width: number, height: number): [number, number] {
  return [width / 2 * basis.radPerPx, height / 2 * basis.radPerPx]
}
