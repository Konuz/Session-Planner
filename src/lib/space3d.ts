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
/** Najmniejszy kadr zakładki Wszechświat lokalny (j. sceny): Droga Mleczna z sąsiadami z Grupy Lokalnej (70 j. dawnej skali). */
export const UNIVERSE_MIN_SPAN = 70 / UNIVERSE_GALAXY_SCALE
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

/** Promień części logarytmicznej (od Ziemi) dla odległości distLy. */
const logRadius = (distLy: number) => Math.max(0, Math.log10(distLy / 1e4)) * LOG_UNIT

/** Położenie w scenie punktu w kierunku `dir` (wektor jednostkowy sceny) i odległości distLy od Ziemi; reguły jak scenePosition. */
export function scenePoint(dir: Vec3, distLy: number): Vec3 {
  const r = distLy < GALACTIC_LIMIT_LY ? distLy / 1000 : logRadius(distLy)
  const sun = sunPosition()
  return [sun[0] + dir[0] * r, sun[1] + dir[1] * r, sun[2] + dir[2] * r]
}

/** Położenie w scenie od Ziemi: obiekty Drogi Mlecznej liniowo (1 j. = 1000 lś), dalsze w skali log. */
export function scenePosition(o: { raDeg: number; decDeg: number }, distLy: number): Vec3 {
  const v = galacticVector(o)
  const r = distLy < GALACTIC_LIMIT_LY ? distLy / 1000 : logRadius(distLy)
  return toScene([v[0] * r - SUN_TO_GC_KLY, v[1] * r, v[2] * r])
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

/** Skala pinezki wybranego obiektu względem odległości kamery: większa z bliska, mniejsza z daleka. */
export function pinScale(distance: number, scale: SpaceScale): number {
  if (!Number.isFinite(distance)) return 1
  const ref = scale === 'galaxy' ? 20 : 750
  const s = Math.sqrt(ref / Math.max(distance, 0.01))
  return Math.min(1.6, Math.max(0.45, s))
}

/**
 * Przenikanie kryć po zmianie zakładki: od kryć zakładki wyjściowej (liczonych z odległości kamery w każdej klatce,
 * jak bez przerwań) przesuniętych o `offset` do kryć ostatniej klatki przed zmianą, przez `ms` od pierwszej klatki.
 */
export interface FadeBlend { fromScale: SpaceScale; offset: LayerFades; start: number; ms: number }

/** Przenikanie od kryć `current` bieżącej klatki (kamera w odległości `distance`) przy wyjściu z zakładki `fromScale`. */
export function startFadeBlend(current: LayerFades, distance: number, fromScale: SpaceScale, start: number, ms: number): FadeBlend {
  const from = layerFades(distance, fromScale)
  return { fromScale, offset: { galactic: current.galactic - from.galactic, extragalactic: current.extragalactic - from.extragalactic }, start, ms }
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/**
 * Krycia w chwili `now` przenikania do zakładki `scale`. Bez przerwań przesunięcie jest zerowe i wynik to dawne
 * mixFades obu zakładek. Przenikanie ma własny zegar, więc przerwany przelot kamery (przeciągnięcie, inny obiekt)
 * go nie urywa, a kolejna zmiana zakładki zaczyna dokładnie od kryć bieżącej klatki.
 */
export function blendFades(blend: FadeBlend, distance: number, scale: SpaceScale, now: number, easing: (t: number) => number): { fades: LayerFades; done: boolean } {
  const t = Math.min(1, Math.max(0, (now - blend.start) / blend.ms))
  const base = layerFades(distance, blend.fromScale)
  const from = { galactic: clamp01(base.galactic + blend.offset.galactic), extragalactic: clamp01(base.extragalactic + blend.offset.extragalactic) }
  return { fades: mixFades(from, layerFades(distance, scale), easing(t)), done: t >= 1 }
}
