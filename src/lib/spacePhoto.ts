// Zdjęcie w scenach „Pozycja 3D” bez three.js: długość stożka pola w Drodze Mlecznej oraz „okno zdjęcia”
// we Wszechświecie lokalnym (plany odległości, wysunięcie obiektów spoza głównego planu, rozmiar i powiększenie
// okna, wiersze listy). Okno to fotografia ustawiona w prawdziwym kierunku na odległości głównego planu.
import { GALACTIC_LIMIT_LY } from './space3d'

/** Zapas stożka za najdalszym obiektem zdjęcia w Drodze Mlecznej. */
const CONE_MARGIN = 1.12
/** Długość stożka (tys. lś), gdy żaden obiekt zdjęcia nie leży w Drodze Mlecznej. */
const CONE_DEFAULT_KLY = 4

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
  return { length: farthest > 0 ? farthest * CONE_MARGIN : CONE_DEFAULT_KLY, farthest, outside }
}

export type DepthLayer = 'near' | 'main' | 'far'
export const LAYER_ORDER: readonly DepthLayer[] = ['near', 'main', 'far']
export const LAYER_LABELS: Record<DepthLayer, string> = { near: 'Pierwszy plan', main: 'Główny plan', far: 'Tło' }

export interface LayerCut { id: string; distLy: number; radius: number }

export interface DepthLayers {
  /** Granice głównego planu (lś): najbliższy i najdalszy obiekt w jego oknie. */
  lo: number
  hi: number
  /** Odległość, na której stoi okno zdjęcia: mediana głównego planu ważona powierzchnią wycinków. */
  center: number
  layer: Map<string, DepthLayer>
  counts: Record<DepthLayer, number>
}

/**
 * Szerokość głównego planu w dex (log10 odległości): 0,25 dex to czynnik 1,78 między granicami. Rozrzut prędkości
 * w bogatej gromadzie (rzędu 1000 km/s) rozmywa odległości z przesunięcia ku czerwieni o ok. ±15% (1σ), choć
 * prawdziwa głębia gromady to kilka procent, więc członkowie gromady mają trafić do jednego planu.
 */
export const MAIN_WINDOW_DEX = 0.25

/**
 * Plany odległości zdjęcia. Główny plan to okno odległości o szerokości MAIN_WINDOW_DEX, które zajmuje największą
 * część kadru (suma powierzchni wycinków): dla M 51 z towarzyszką wygrywa para na pierwszym planie, a dla gromady
 * setka jej galaktyk. Bliższe obiekty to pierwszy plan, dalsze to tło.
 */
export function depthLayers(cuts: readonly LayerCut[]): DepthLayers | null {
  const sorted = cuts.filter((c) => c.distLy > 0).sort((a, b) => a.distLy - b.distLy || a.id.localeCompare(b.id))
  if (!sorted.length) return null
  const logs = sorted.map((c) => Math.log10(c.distLy))
  const weights = sorted.map((c) => Math.max(1, c.radius) ** 2)
  let best = { from: 0, to: 0, weight: -1 }
  let weight = 0
  for (let from = 0, to = 0; from < sorted.length; from++) {
    while (to < sorted.length && logs[to] - logs[from] <= MAIN_WINDOW_DEX) weight += weights[to++]
    // Remis: więcej obiektów, potem bliższe okno (pierwsze w kolejności).
    if (weight > best.weight || (weight === best.weight && to - from > best.to - best.from)) best = { from, to, weight }
    weight -= weights[from]
  }
  const layer = new Map<string, DepthLayer>()
  const counts: Record<DepthLayer, number> = { near: 0, main: 0, far: 0 }
  sorted.forEach((c, i) => {
    const kind = i < best.from ? 'near' : i < best.to ? 'main' : 'far'
    layer.set(c.id, kind)
    counts[kind]++
  })
  let half = best.weight / 2, center = sorted[best.from].distLy
  for (let i = best.from; i < best.to; i++) {
    center = sorted[i].distLy
    half -= weights[i]
    if (half <= 0) break
  }
  return { lo: sorted[best.from].distLy, hi: sorted[best.to - 1].distLy, center, layer, counts }
}

/** Najmniejszy zakres (dex) rozciągany na pełne wysunięcie: pojedynczy obiekt tuż za głównym planem zostaje blisko okna. */
const MIN_SIDE_DEX = 0.3
/** Odstęp najbliższego wysuniętego obiektu od płaszczyzny okna (ułamek pełnego wysunięcia). */
const LIFT_GAP = 0.2

/**
 * Wysunięcie obiektów z płaszczyzny okna: 0 w głównym planie, od −1 do −LIFT_GAP przed oknem (bliżej Ziemi), od LIFT_GAP
 * do 1 za nim. Monotoniczne w odległości, liniowe w log10 po każdej stronie z osobna (pogląd, nie skala sceny).
 */
export function layerLifts(cuts: readonly LayerCut[], layers: DepthLayers): Map<string, number> {
  const lo = Math.log10(layers.lo), hi = Math.log10(layers.hi)
  let near = MIN_SIDE_DEX, far = MIN_SIDE_DEX
  for (const c of cuts) {
    const kind = layers.layer.get(c.id)
    if (kind === 'near') near = Math.max(near, lo - Math.log10(c.distLy))
    if (kind === 'far') far = Math.max(far, Math.log10(c.distLy) - hi)
  }
  const lifts = new Map<string, number>()
  for (const c of cuts) {
    const kind = layers.layer.get(c.id)
    if (!kind) continue
    const log = Math.log10(c.distLy)
    const side = kind === 'near' ? (lo - log) / near : (log - hi) / far
    lifts.set(c.id, kind === 'main' ? 0 : (kind === 'near' ? -1 : 1) * (LIFT_GAP + (1 - LIFT_GAP) * Math.min(1, side)))
  }
  return lifts
}

/** Dłuższy bok okna jako część odległości Ziemia–okno w scenie, z granicami czytelności. */
const WINDOW_SHARE = 0.36
const WINDOW_MIN = 3
const WINDOW_MAX = 40
/** Wirtualne oko widoku „Z Ziemi”: odległość od okna w wysokościach kadru o proporcjach 3:2 (pole widzenia 50°,
 *  okno mieści się w scenie z panelem i paskiem zdjęcia). Stała, niezależna od rozmiaru sceny: układ się nie zmienia. */
const EYE_DISTANCE = 1.5
/** Pełne wysunięcie przed i za oknem w odległościach oka. */
const LIFT_DEPTH = 0.4

export interface WindowSize {
  width: number
  height: number
  /** Odległość wirtualnego oka od płaszczyzny okna: z tego punktu wysunięte obiekty pokrywają swoje miejsca na zdjęciu. */
  eye: number
  /** Ile razy okno jest większe od prawdziwego pola zdjęcia w tym miejscu sceny. */
  magnification: number
}

/**
 * Rozmiar okna zdjęcia w jednostkach sceny. `distance`: odległość Ziemia–okno w scenie, `fieldTanX`: tangens połowy
 * prawdziwego pola w poziomie (prawdziwy kadr ma tam szerokość 2 · fieldTanX · distance, zwykle ułamek jednostki).
 */
export function windowSize(distance: number, image: { width: number; height: number }, fieldTanX: number): WindowSize {
  const side = Math.min(WINDOW_MAX, Math.max(WINDOW_MIN, distance * WINDOW_SHARE))
  const k = side / Math.max(image.width, image.height)
  const width = image.width * k, height = image.height * k
  return { width, height, eye: EYE_DISTANCE * Math.max(width / 1.5, height), magnification: width / Math.max(1e-9, 2 * fieldTanX * distance) }
}

/**
 * Położenie piksela zdjęcia w układzie okna: x w prawo, y w górę, z ku Ziemi (wysunięcie −1…1 z layerLifts,
 * ujemne przed oknem). Wysunięty punkt leży na promieniu z wirtualnego oka przez swój piksel, a `scale` powiększa
 * jego wycinek tak samo, więc z oka („Z Ziemi”) scena wygląda jak płaska fotografia.
 */
export function windowPoint(px: number, py: number, lift: number, image: { width: number; height: number }, size: WindowSize): { x: number; y: number; z: number; scale: number } {
  const k = size.width / image.width
  const scale = 1 + lift * LIFT_DEPTH
  return { x: (px - image.width / 2) * k * scale, y: (image.height / 2 - py) * k * scale, z: 0 - lift * LIFT_DEPTH * size.eye, scale }
}

export type WindowRow =
  | { kind: 'header'; layer: DepthLayer; count: number }
  | { kind: 'cut'; layer: DepthLayer; id: string; distLy: number }

/** Wiersze listy okna: plany od najbliższego, w planie rosnąco po odległości; nagłówek tylko dla niepustego planu. */
export function windowRows(cuts: readonly LayerCut[], layers: DepthLayers | null, query = '', only: DepthLayer | null = null): WindowRow[] {
  if (!layers) return []
  const needle = query.trim().toLocaleLowerCase()
  const rows: WindowRow[] = []
  for (const layer of LAYER_ORDER) {
    if (only && only !== layer) continue
    const members = cuts.filter((c) => layers.layer.get(c.id) === layer && c.id.toLocaleLowerCase().includes(needle))
      .sort((a, b) => a.distLy - b.distLy || a.id.localeCompare(b.id))
    if (!members.length) continue
    rows.push({ kind: 'header', layer, count: members.length })
    for (const c of members) rows.push({ kind: 'cut', layer, id: c.id, distLy: c.distLy })
  }
  return rows
}
