// Układ sceny „Pozycja 3D” bez three.js: współrzędne galaktyczne → scena (y w górę) i położenia obiektów w obu skalach.
import { galacticVector, type Vec3 } from './astro'

export type SpaceScale = 'galaxy' | 'universe'

/** Słońce od centrum Galaktyki w tys. lś (skala Drogi Mlecznej: 1 j. = 1000 lś). */
export const SUN_TO_GC_KLY = 26.7
/** Granica skali Drogi Mlecznej; dalsze obiekty należą do Wszechświata lokalnego. */
export const GALACTIC_LIMIT_LY = 150_000
/** Skala modelu Drogi Mlecznej we Wszechświecie lokalnym (1 tys. lś = 0,12 j. sceny). */
export const UNIVERSE_GALAXY_SCALE = 0.12

/** Galaktyczne (x ku centrum, y ku l = 90°, z ku biegunowi N) → scena three.js (y w górę). */
export function toScene(g: Vec3): Vec3 {
  return [g[0], g[2], -g[1]]
}

/** Położenie Słońca (Ziemi) w scenie danej skali. */
export function sunPosition(scale: SpaceScale): Vec3 {
  const s = scale === 'galaxy' ? 1 : UNIVERSE_GALAXY_SCALE
  return toScene([-SUN_TO_GC_KLY * s, 0, 0])
}

/** Położenie w scenie punktu w kierunku `dir` (wektor jednostkowy sceny) i odległości distLy; reguły jak scenePosition. */
export function scenePoint(dir: Vec3, distLy: number, scale: SpaceScale): Vec3 {
  if (scale === 'galaxy' || distLy < GALACTIC_LIMIT_LY) {
    const d = distLy / 1000 * (scale === 'galaxy' ? 1 : UNIVERSE_GALAXY_SCALE)
    const sun = sunPosition(scale)
    return [sun[0] + dir[0] * d, sun[1] + dir[1] * d, sun[2] + dir[2] * d]
  }
  const r = Math.max(0, Math.log10(distLy / 1e4)) * 22
  return [dir[0] * r, dir[1] * r, dir[2] * r]
}

/** Położenie w scenie: obiekty Drogi Mlecznej: liniowo od centrum Galaktyki; dalsze obiekty: skala log. od Słońca. */
export function scenePosition(o: { raDeg: number; decDeg: number }, distLy: number, scale: SpaceScale): Vec3 {
  const v = galacticVector(o)
  if (scale === 'galaxy' || distLy < GALACTIC_LIMIT_LY) {
    const d = distLy / 1000
    const s = scale === 'galaxy' ? 1 : UNIVERSE_GALAXY_SCALE
    return toScene([(v[0] * d - SUN_TO_GC_KLY) * s, v[1] * d * s, v[2] * d * s])
  }
  const r = Math.max(0, Math.log10(distLy / 1e4)) * 22
  return toScene([v[0] * r, v[1] * r, v[2] * r])
}
