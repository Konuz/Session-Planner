// Układ sceny „Pozycja 3D” bez three.js: współrzędne galaktyczne → scena (y w górę), położenia obiektów i krycia warstw
// wspólnej sceny Drogi Mlecznej i Wszechświata lokalnego.
import { galacticVector, type Vec3 } from './astro'

/** Zakładka okna „Pozycja 3D”: kadr i warstwy z przełącznikami (scena jest jedna). */
export type SpaceScale = 'galaxy' | 'universe'

/** Słońce od centrum Galaktyki w tys. lś (1 j. sceny = 1000 lś). */
export const SUN_TO_GC_KLY = 26.7
/** Granica części liniowej sceny; dalsze obiekty leżą w skali logarytmicznej Wszechświata lokalnego. */
export const GALACTIC_LIMIT_LY = 150_000
/** Rozmiar Drogi Mlecznej w dawnej scenie Wszechświata lokalnego; jego odwrotność rozciąga część logarytmiczną. */
export const UNIVERSE_GALAXY_SCALE = 0.12
/** Jednostki sceny na dekadę odległości w części logarytmicznej (22 j. dawnego Wszechświata lokalnego). */
export const LOG_UNIT = 22 / UNIVERSE_GALAXY_SCALE
/** Wszechświat lokalny: obiekty Galaktyki i Ziemia widoczne do FADE_NEAR j. od początku układu, zgaszone od FADE_FAR. */
export const FADE_NEAR = 250
export const FADE_FAR = 500
/** Droga Mleczna: galaktyki pojawiają się dopiero dalej niż kadry zakładki (najdalszy ok. 425 j.), po oddaleniu kółkiem. */
export const GALAXY_FADE_NEAR = 600
export const GALAXY_FADE_FAR = 1200

/** Galaktyczne (x ku centrum, y ku l = 90°, z ku biegunowi N) → scena three.js (y w górę). */
export function toScene(g: Vec3): Vec3 {
  return [g[0], g[2], -g[1]]
}

/** Położenie Słońca (Ziemi) w scenie. */
export function sunPosition(): Vec3 {
  return toScene([-SUN_TO_GC_KLY, 0, 0])
}

/** Promień części logarytmicznej (od centrum Galaktyki) dla odległości distLy. */
const logRadius = (distLy: number) => Math.max(0, Math.log10(distLy / 1e4)) * LOG_UNIT

/** Położenie w scenie punktu w kierunku `dir` (wektor jednostkowy sceny) i odległości distLy; reguły jak scenePosition. */
export function scenePoint(dir: Vec3, distLy: number): Vec3 {
  if (distLy < GALACTIC_LIMIT_LY) {
    const d = distLy / 1000
    const sun = sunPosition()
    return [sun[0] + dir[0] * d, sun[1] + dir[1] * d, sun[2] + dir[2] * d]
  }
  const r = logRadius(distLy)
  return [dir[0] * r, dir[1] * r, dir[2] * r]
}

/** Położenie w scenie: obiekty Drogi Mlecznej liniowo od Słońca (1 j. = 1000 lś); dalsze w skali log. od centrum Galaktyki. */
export function scenePosition(o: { raDeg: number; decDeg: number }, distLy: number): Vec3 {
  const v = galacticVector(o)
  if (distLy < GALACTIC_LIMIT_LY) {
    const d = distLy / 1000
    return toScene([v[0] * d - SUN_TO_GC_KLY, v[1] * d, v[2] * d])
  }
  const r = logRadius(distLy)
  return toScene([v[0] * r, v[1] * r, v[2] * r])
}

export type LayerFades = { galactic: number; extragalactic: number }

const smoothstep = (x: number, a: number, b: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** Krycia warstw: zakładka ma swoje warstwy w pełni (jak dawna osobna scena), druga skala zależy od odległości
 *  kamery od początku układu (Droga Mleczna: galaktyki po oddaleniu; Wszechświat: obiekty Galaktyki z bliska). */
export function layerFades(cameraDistance: number, scale: SpaceScale): LayerFades {
  return scale === 'galaxy'
    ? { galactic: 1, extragalactic: smoothstep(cameraDistance, GALAXY_FADE_NEAR, GALAXY_FADE_FAR) }
    : { galactic: 1 - smoothstep(cameraDistance, FADE_NEAR, FADE_FAR), extragalactic: 1 }
}

/** Krycia w przelocie zakładek: od krycia zakładki wyjściowej (t = 0) do docelowej (t = 1). */
export function mixFades(a: LayerFades, b: LayerFades, t: number): LayerFades {
  // Postać a·(1 − t) + b·t daje dokładnie b na końcu przelotu.
  return { galactic: a.galactic * (1 - t) + b.galactic * t, extragalactic: a.extragalactic * (1 - t) + b.extragalactic * t }
}
