// Tło mapy w widoku kadru (tlo-mapy): gwiazdy Tycho-2 jako kropki i siatka RA/Dec z opisami. Czysty model, bez sieci.
//
// Nazwy, których spec nie podaje (wybrane przez test-author):
// - `mapBackground(stars, cutout)` – wejście: gwiazdy (`Star` z `services/stars.ts`: `raDeg`, `decDeg`, `mag` = V)
//   i wycinek widoku (`viewCutout`, 1000 × 1000 jednostek); wyjście `{ stars, grid }` w jednostkach widoku.
//   - `stars`: kropki `{ x, y, radius }` w kolejności rysowania (od najsłabszej do najjaśniejszej), najwyżej
//     `MAX_BACKGROUND_STARS` najjaśniejszych gwiazd w widoku (brzegi wliczone); punkt ≥ 90° od środka nie ma położenia.
//   - `grid`: linie `{ kind, valueDeg, label, points, labelAnchor }`; `kind` 'ra' = południk (`valueDeg` = RA w [0, 360)),
//     'dec' = równoleżnik (`valueDeg` = Dec); `points` = kolejne punkty linii w jednostkach widoku (mogą wychodzić poza
//     widok, bez NaN i nieskończoności); `labelAnchor` = punkt wejścia linii w widok (południk z południa na północ,
//     równoleżnik ze wschodu na zachód); null tylko dla linii, która nigdzie nie wchodzi w widok przez brzeg
//     (np. okrąg wokół bieguna leżący cały w widoku) – takich punktów testy nie sprawdzają.
// - `starRadius(mag)` – promień kropki `1 + 0,6·(10 − V)`, przycięty do [1, 8].
// - `MAX_BACKGROUND_STARS` = 3000.
import type { CutoutPoint, SkyCutout } from '../../services/framing'
import type { Star } from '../../services/stars'

/** Najwięcej kropek gwiazd w widoku. */
export const MAX_BACKGROUND_STARS = 3000

/** Kropka gwiazdy w jednostkach widoku. */
export interface StarDot {
  x: number
  y: number
  radius: number
}

/** 'ra' = południk (stałe RA), 'dec' = równoleżnik (stała Dec). */
export type GridLineKind = 'ra' | 'dec'

export interface GridLine {
  kind: GridLineKind
  /** RA w [0, 360) albo Dec [°]. */
  valueDeg: number
  /** „0h 00m”, „5h 35m 10s”, „+5°”, „−0°30′” itd. */
  label: string
  points: CutoutPoint[]
  labelAnchor: CutoutPoint | null
}

export interface MapBackground {
  stars: StarDot[]
  grid: GridLine[]
}

export function starRadius(mag: number): number {
  void mag
  throw new Error('NotImplementedError: starRadius')
}

export function mapBackground(stars: readonly Star[], cutout: SkyCutout): MapBackground {
  void stars
  void cutout
  throw new Error('NotImplementedError: mapBackground')
}
