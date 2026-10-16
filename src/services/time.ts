import { fromZonedTime } from 'date-fns-tz'

/** Data kalendarzowa 'RRRR-MM-DD' przesunięta o podaną liczbę dni. */
export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

/** Lokalne południe dnia `date` w strefie IANA jako chwila UTC [ms]. */
export function localNoonMs(date: string, timeZone: string): number {
  return fromZonedTime(`${date}T12:00:00`, timeZone).getTime()
}

/** Godzina w strefie lokalizacji ze skrótem strefy, np. „02:30 CEST” (pl-PL, zegar 24 h). */
export function formatLocalTime(timeMs: number, timeZone: string): string {
  return new Intl.DateTimeFormat('pl-PL', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZoneName: 'short',
  }).format(timeMs)
}
