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
/** Do tylu ramion mały wachlarz o nieparzystej liczbie obiektów zajmuje tylko prawą stronę. */
const ONE_SIDE_MAX = 10

export interface FanSpoke {
  /** Kąt ramienia na ekranie w radianach: 0 w prawo, dodatni w dół (oś y ekranu). */
  angle: number
  /** Ramię po lewej stronie: tekst kończy się przy środku i nie jest odwrócony. */
  left: boolean
}

/**
 * Wachlarz `count` ramion zgodnie z ruchem wskazówek zegara: prawa strona z góry na dół, potem lewa z dołu do góry.
 * `radius` to odległość początku tekstu od środka, przy której sąsiednie wiersze o wysokości `pitch` się nie nakładają.
 */
export function fanLayout(count: number, pitch: number): { radius: number; spokes: FanSpoke[] } {
  const right = count > ONE_SIDE_MAX || count % 2 === 0 ? Math.ceil(count / 2) : count
  const left = count - right
  const radius = Math.max(40, right * pitch / (2 * FAN_HALF))
  // Kilka ramion stoi ciasno wokół poziomu (odstęp jednego wiersza), zamiast rozjeżdżać się na całe rozwarcie.
  const side = (n: number, middle: number, isLeft: boolean): FanSpoke[] => {
    const arc = Math.min(2 * FAN_HALF, n * pitch / radius)
    return Array.from({ length: n }, (_, i) => ({ angle: middle - arc / 2 + (i + 0.5) / n * arc, left: isLeft }))
  }
  return { radius, spokes: [...side(right, 0, false), ...side(left, Math.PI, true)] }
}

/** „2 obiekty”, „5 obiektów”, „22 obiekty”. */
export function objectCount(n: number): string {
  const few = n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)
  return `${n} ${n === 1 ? 'obiekt' : few ? 'obiekty' : 'obiektów'}`
}
