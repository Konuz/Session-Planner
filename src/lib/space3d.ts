// Układ sceny „Pozycja 3D” bez three.js: współrzędne galaktyczne → scena (y w górę) i położenia obiektów w obu skalach.
import { galacticVector, type Vec3 } from './astro'

export type SpaceScale = 'galaxy' | 'universe'

/** Słońce od centrum Galaktyki w tys. lś (skala Drogi Mlecznej: 1 j. = 1000 lś). */
export const SUN_TO_GC_KLY = 26.7
/** Granica skali Drogi Mlecznej; dalsze obiekty należą do Wszechświata lokalnego. */
export const GALACTIC_LIMIT_LY = 150_000

/** Galaktyczne (x ku centrum, y ku l = 90°, z ku biegunowi N) → scena three.js (y w górę). */
export function toScene(g: Vec3): Vec3 {
  return [g[0], g[2], -g[1]]
}

/** Położenie Słońca (Ziemi) w scenie danej skali. */
export function sunPosition(scale: SpaceScale): Vec3 {
  return scale === 'galaxy' ? toScene([-SUN_TO_GC_KLY, 0, 0]) : [0, 0, 0]
}

/** Położenie w scenie: Droga Mleczna: tys. lś od centrum Galaktyki; Wszechświat: skala log. od Słońca. */
export function scenePosition(o: { raDeg: number; decDeg: number }, distLy: number, scale: SpaceScale): Vec3 {
  const v = galacticVector(o)
  if (scale === 'galaxy') {
    const d = distLy / 1000
    return toScene([v[0] * d - SUN_TO_GC_KLY, v[1] * d, v[2] * d])
  }
  const r = Math.max(0, Math.log10(distLy / 1e4)) * 22
  return toScene([v[0] * r, v[1] * r, v[2] * r])
}
