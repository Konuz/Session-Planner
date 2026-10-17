// Formaty prezentacji pl-PL [Z4]: przecinek dziesiętny, typograficzny znak minus.
import { addDays } from './time'

/** Kąt w stopniach, np. 79,4° albo −14,6°. */
export function formatDeg(value: number, digits = 1): string {
  const text = new Intl.NumberFormat('pl-PL', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    useGrouping: false,
    signDisplay: 'negative',
  }).format(value)
  return `${text.replace('-', '−')}°`
}

/** Część 0–1 jako procent, np. 0,338 → „34%”. */
export function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`
}

/** Noc D jako „16/17.10.2026”, „31.10/1.11.2026” albo „31.12.2026/1.01.2027”. */
export function formatNightLabel(nightDate: string): string {
  const [year, month, day] = nightDate.split('-').map(Number)
  const [nextYear, nextMonth, nextDay] = addDays(nightDate, 1).split('-').map(Number)
  const pad = (value: number) => String(value).padStart(2, '0')
  if (year !== nextYear) return `${day}.${pad(month)}.${year}/${nextDay}.${pad(nextMonth)}.${nextYear}`
  if (month !== nextMonth) return `${day}.${pad(month)}/${nextDay}.${pad(nextMonth)}.${year}`
  return `${day}/${nextDay}.${pad(month)}.${year}`
}

/** Liczba z odmianą rzeczownika, np. 1 punkt, 2 punkty, 5 punktów (formy: [1, 2–4, 5+]). */
export function formatCount(count: number, [one, few, many]: readonly [string, string, string]): string {
  const lastDigit = count % 10
  const lastTwo = count % 100
  const form = count === 1 ? one : lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14) ? few : many
  return `${count} ${form}`
}
