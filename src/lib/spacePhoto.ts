// Zdjęcie w scenach „Pozycja 3D” bez three.js: długość stożka pola w Drodze Mlecznej i we Wszechświecie lokalnym.
import { GALACTIC_LIMIT_LY } from './space3d'

/** Zapas stożka za najdalszym obiektem zdjęcia. */
const CONE_MARGIN = 1.12
/** Długość stożka (j. sceny), gdy żaden obiekt zdjęcia nie leży w zasięgu skali. */
const CONE_DEFAULT = 4

/**
 * Stożek pola zdjęcia w skali Drogi Mlecznej (tys. lś): kończy się tuż za najdalszym obiektem zdjęcia leżącym
 * w Galaktyce. Obiekty spoza skali (`outside`) nie wydłużają go: dostają jeden znacznik za końcem stożka.
 */
export function milkyWayCone(distancesLy: readonly number[]): { length: number; farthest: number; outside: number } {
  let farthest = 0, outside = 0
  for (const d of distancesLy) {
    if (!(d > 0)) continue
    if (d >= GALACTIC_LIMIT_LY) outside++
    else farthest = Math.max(farthest, d / 1000)
  }
  return { length: farthest > 0 ? farthest * CONE_MARGIN : CONE_DEFAULT, farthest, outside }
}

/** Stożek pola we Wszechświecie lokalnym (j. sceny): tuż za najdalszym znacznikiem; `reaches`: odległości znaczników od Ziemi w scenie. */
export function universeCone(reaches: readonly number[]): number {
  const farthest = Math.max(0, ...reaches.filter((r) => r > 0))
  return farthest > 0 ? farthest * CONE_MARGIN : CONE_DEFAULT
}
