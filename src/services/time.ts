import { formatInTimeZone, fromZonedTime, getTimezoneOffset } from 'date-fns-tz'

const HOUR_MS = 3_600_000
const QUARTER_HOUR_MS = 900_000

/** Data kalendarzowa 'RRRR-MM-DD' przesunięta o podaną liczbę dni. */
export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

/** Lokalne południe dnia `date` w strefie IANA jako chwila UTC [ms]. */
export function localNoonMs(date: string, timeZone: string): number {
  return fromZonedTime(`${date}T12:00:00`, timeZone).getTime()
}

/** Lokalna północ w nocy D, czyli 00:00 dnia D+1. */
export function localMidnightMs(nightDate: string, timeZone: string): number {
  return fromZonedTime(`${addDays(nightDate, 1)}T00:00:00`, timeZone).getTime()
}

/** Bieżąca noc D (7.0): przed lokalnym południem trwa jeszcze noc z poprzedniej daty. */
export function currentNightDate(nowMs: number, timeZone: string): string {
  const date = formatInTimeZone(nowMs, timeZone, 'yyyy-MM-dd')
  return nowMs < localNoonMs(date, timeZone) ? addDays(date, -1) : date
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

const partsFormatters = new Map<string, Intl.DateTimeFormat>()

/** Godzina i skrót strefy osobno, np. { time: '02:00', zone: 'CEST' } – do dwuliniowych etykiet osi. */
export function localTimeParts(timeMs: number, timeZone: string): { time: string; zone: string } {
  let formatter = partsFormatters.get(timeZone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('pl-PL', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZoneName: 'short',
    })
    partsFormatters.set(timeZone, formatter)
  }
  const parts = formatter.formatToParts(timeMs)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? ''
  return { time: `${part('hour')}:${part('minute')}`, zone: part('timeZoneName') }
}

/** Chwile pełnych godzin lokalnych w przedziale; przy zmianie czasu powtórzona godzina występuje dwa razy [T5]. */
export function fullLocalHoursMs(range: { startMs: number; endMs: number }, timeZone: string): number[] {
  const hours: number[] = []
  // Krok kwadransa obejmuje też strefy przesunięte o 30 i 45 min względem UTC.
  for (let t = Math.ceil(range.startMs / QUARTER_HOUR_MS) * QUARTER_HOUR_MS; t <= range.endMs; t += QUARTER_HOUR_MS) {
    if ((t + getTimezoneOffset(timeZone, new Date(t))) % HOUR_MS === 0) hours.push(t)
  }
  return hours
}

/** Czas trwania w minutach w formacie hh:mm, np. 579 → „09:39”. */
export function formatDuration(minutes: number): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`
}
