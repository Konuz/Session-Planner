// Planer nocy: automatyczny podział ciemnego okna między cele (każdy wokół swojej najlepszej chwili).
import { DAY_MS } from './astro'
import { tzOffsetMs } from './night'

export interface PlanTarget {
  key: string
  /** Chwila największej wysokości w ciemnym oknie. */
  bestMs: number
  /** Przedział, w którym cel jest powyżej limitu i horyzontu (null = nigdy). */
  usableStart: number | null
  usableEnd: number | null
}

export interface Slot {
  key: string
  startMs: number
  endMs: number
}

/** Poniżej tego udziału granica w połowie drogi między najlepszymi chwilami ustępuje podziałowi wspólnego czasu. */
const MIN_SHARE_MS = 30 * 60_000

/**
 * Cele sortowane po chwili najlepszej wysokości (przy remisie najpierw ten, który wcześniej znika, potem ten,
 * który wcześniej się pojawia). Granica między kolejnymi to połowa drogi między ich najlepszymi chwilami. Gdy
 * któryś z dwóch celów dostałby wtedy mniej niż 30 min (np. oba zachodzą o zmierzchu i mają tę samą najlepszą
 * chwilę), granica wypada w połowie czasu, w którym widać oba. Sloty są przycinane do okna użyteczności celu
 * i do ciemnego okna. Cele bez okna pomijane.
 */
export function autoSchedule(targets: readonly PlanTarget[], darkStart: number, darkEnd: number): Slot[] {
  const usable = targets
    .filter((t) => t.usableStart !== null && t.usableEnd !== null)
    .sort((a, b) => a.bestMs - b.bestMs || a.usableEnd! - b.usableEnd! || a.usableStart! - b.usableStart!)
  const bounds: number[] = []
  for (let i = 0; i + 1 < usable.length; i++) {
    const a = usable[i]
    const b = usable[i + 1]
    const mid = (a.bestMs + b.bestMs) / 2
    const aStart = Math.max(bounds[i - 1] ?? darkStart, a.usableStart!, darkStart)
    const aShare = Math.min(mid, a.usableEnd!, darkEnd) - aStart
    const bShare = Math.min(b.usableEnd!, darkEnd) - Math.max(mid, b.usableStart!, darkStart)
    const sharedStart = Math.max(a.usableStart!, b.usableStart!, darkStart)
    const sharedEnd = Math.min(a.usableEnd!, b.usableEnd!, darkEnd)
    bounds.push((aShare < MIN_SHARE_MS || bShare < MIN_SHARE_MS) && sharedEnd > sharedStart ? (sharedStart + sharedEnd) / 2 : mid)
  }
  const slots: Slot[] = []
  for (let i = 0; i < usable.length; i++) {
    const t = usable[i]
    let start = bounds[i - 1] ?? darkStart
    let end = bounds[i] ?? darkEnd
    start = Math.max(start, t.usableStart!, darkStart)
    end = Math.min(end, t.usableEnd!, darkEnd)
    start = Math.ceil(start / 60_000) * 60_000
    end = Math.floor(end / 60_000) * 60_000
    if (end - start >= 10 * 60_000) slots.push({ key: t.key, startMs: start, endMs: end })
  }
  return slots
}

/** Godzina „HH:MM” w strefie lokalizacji jako chwila tej nocy (godziny przed 12:00 należą do poranka). */
export function localTimeToMs(nightDate: string, hhmm: string, timeZone: string, referenceMs?: number): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  const [year, month, day] = nightDate.split('-').map(Number)
  const local = Date.UTC(year, month - 1, day + (h < 12 ? 1 : 0), h, min)
  // Zmiana czasu może dać dwie chwile dla tej samej godziny albo żadną.
  const offsets = new Set([-DAY_MS, 0, DAY_MS].map((delta) => tzOffsetMs(local + delta, timeZone)))
  const candidates = [...offsets].map((offset) => local - offset)
    .filter((t) => t + tzOffsetMs(t, timeZone) === local)
    .sort((a, b) => referenceMs === undefined ? a - b : Math.abs(a - referenceMs) - Math.abs(b - referenceMs))
  return candidates[0] ?? null
}

export function overlaps(slots: readonly Slot[]): Set<string> {
  const bad = new Set<string>()
  for (let i = 0; i < slots.length; i++)
    for (let j = i + 1; j < slots.length; j++)
      if (slots[i].startMs < slots[j].endMs && slots[j].startMs < slots[i].endMs) {
        bad.add(slots[i].key)
        bad.add(slots[j].key)
      }
  return bad
}
