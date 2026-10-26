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

/**
 * Cele sortowane po chwili najlepszej wysokości; granica między kolejnymi to połowa drogi między ich najlepszymi
 * chwilami, przycięta do okna użyteczności każdego celu i do ciemnego okna. Cele bez okna pomijane.
 */
export function autoSchedule(targets: readonly PlanTarget[], darkStart: number, darkEnd: number): Slot[] {
  const usable = targets.filter((t) => t.usableStart !== null && t.usableEnd !== null).sort((a, b) => a.bestMs - b.bestMs)
  const slots: Slot[] = []
  for (let i = 0; i < usable.length; i++) {
    const t = usable[i]
    const prev = usable[i - 1]
    const next = usable[i + 1]
    let start = prev ? (prev.bestMs + t.bestMs) / 2 : darkStart
    let end = next ? (t.bestMs + next.bestMs) / 2 : darkEnd
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
