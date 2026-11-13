// Punkty pomiarowe User Timing (audyt C25): widoczne w DevTools → Performance → Timings i przez
// performance.getEntriesByName(). Bez importów i bez wypisów: koszt to jedno performance.measure.

const counts = new Map<string, number>()
/** Bufor User Timing nie ma limitu: wpisy rysowania co klatkę są czyszczone po tylu powtórzeniach. */
const KEEP = 200

/** Czas od `startMs` (performance.now()) do teraz jako wpis `name`. */
export function measureSince(name: string, startMs: number): void {
  if (typeof performance === 'undefined' || typeof performance.measure !== 'function') return
  try {
    performance.measure(name, { start: startMs, end: performance.now() })
  } catch {
    return
  }
  const n = (counts.get(name) ?? 0) + 1
  if (n >= KEEP) {
    performance.clearMeasures(name)
    counts.set(name, 0)
  } else counts.set(name, n)
}

export const perfNow = (): number => (typeof performance === 'undefined' ? Date.now() : performance.now())
