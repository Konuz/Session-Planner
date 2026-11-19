// Podpisy gęstych grup w Obserwatorium: nakładające się ramki łączą się w grupę (jedna plakietka zamiast stosu),
// a plakietka otwiera wachlarz nazw wokół grupy. Czysta geometria ekranu, bez DOM i three.js.

export interface LabelBox { left: number; top: number; right: number; bottom: number }

/** Grupy ramek połączonych nakładaniem (także pośrednio, łańcuchem); indeksy rosnąco, grupy wg pierwszego indeksu. */
export function overlapGroups(boxes: LabelBox[]): number[][] {
  const parent = boxes.map((_, i) => i)
  const find = (i: number): number => parent[i] === i ? i : (parent[i] = find(parent[i]))
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j]
      if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) parent[find(j)] = find(i)
    }
  }
  const groups = new Map<number, number[]>()
  boxes.forEach((_, i) => {
    const root = find(i)
    groups.set(root, [...(groups.get(root) ?? []), i])
  })
  return [...groups.values()]
}

/** Połowa rozwarcia jednej strony wachlarza: przy większym obrocie tekst przestaje być czytelny. */
export const FAN_HALF = 70 * Math.PI / 180
/** Do tylu ramion wachlarz zajmuje tylko lewą stronę; powyżej rozkłada się na obie strony. */
const ONE_SIDE_MAX = 10
/** Najmniejszy odstęp osi ramion przy środku (11,76 px wysokości wewnętrznego końca + ~2 px przerwy). */
const INNER_PITCH = 14
/** Domyślna odległość wewnętrznego końca środkowego ramienia od środka ramki. */
const BASE_RADIUS = 40
/** Połowa wewnętrznej wysokości paska (28 px × 42 % / 2) oraz minimalny odstęp między stronami przy wachlarzu dwustronnym. */
const INNER_HALF = 5.88
const MIN_SIDE_GAP = 4

export interface FanLayoutOptions {
  /** Połowa szerokości ramki z przerwą: wewnętrzny koniec środkowego ramienia staje przy tej bocznej ścianie. */
  wallOffset?: number
  /** Strona dla jednostronnego wachlarza (domyślnie lewa). */
  side?: 'left' | 'right'
}

export interface FanSpoke {
  /** Kąt ramienia na ekranie w radianach: 0 w prawo, dodatni w dół (oś y ekranu). */
  angle: number
  /** Ramię po lewej stronie: tekst kończy się przy środku i nie jest odwrócony. */
  left: boolean
}

export interface FanLayout {
  /** Odległość wewnętrznego końca ramienia od pozornego środka zbiegu ramion. */
  radius: number
  /** Przesunięcie pozornego środka za punkt (cx, cy), tak żeby kliny szły jeden tuż pod drugim. */
  pivotShift: number
  /** Połowa kąta rozwarcia liczniejszej strony wachlarza. */
  maxHalfArc: number
  spokes: FanSpoke[]
}

/**
 * Wachlarz `count` ramion zgodnie z ruchem wskazówek zegara: prawa strona z góry na dół, potem lewa z dołu do góry.
 * Kąt między sąsiednimi ramionami dopasowany jest do zwężającego się kształtu paska o szerokości `spokeWidth`,
 * dzięki czemu paski układają się jeden tuż pod drugim przy odstępie `pitch` na zewnętrznym końcu i bez nakładania przy środku.
 */
export function fanLayout(count: number, pitch: number, spokeWidth = 200, { wallOffset = BASE_RADIUS, side = 'left' }: FanLayoutOptions = {}): FanLayout {
  const twoSides = count > ONE_SIDE_MAX
  const left = twoSides ? Math.ceil(count / 2) : side === 'left' ? count : 0
  const right = count - left
  const maxCount = Math.max(left, right)
  const w = Math.max(80, spokeWidth)
  const innerPitch = Math.min(INNER_PITCH, pitch * 0.5)
  const idealStep = (pitch - innerPitch) / w
  const step = maxCount > 0 ? Math.min(idealStep, (2 * FAN_HALF) / maxCount) : idealStep
  const radius = pitch / step - w
  const maxHalfArc = maxCount > 1 ? ((maxCount - 1) / 2) * step : 0
  const minPivot = radius - wallOffset
  const pivotShift = twoSides
    ? Math.min(minPivot, radius * Math.cos(maxHalfArc) - INNER_HALF * Math.sin(maxHalfArc) - MIN_SIDE_GAP)
    : minPivot
  const sideSpokes = (n: number, middle: number, isLeft: boolean): FanSpoke[] =>
    Array.from({ length: n }, (_, i) => ({ angle: middle + (i - (n - 1) / 2) * step, left: isLeft }))
  return { radius, pivotShift, maxHalfArc, spokes: [...sideSpokes(right, 0, false), ...sideSpokes(left, Math.PI, true)] }
}

/** „2 obiekty”, „5 obiektów”, „22 obiekty”. */
export function objectCount(n: number): string {
  const few = n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)
  return `${n} ${n === 1 ? 'obiekt' : few ? 'obiekty' : 'obiektów'}`
}
