// Formatowanie liczb, współrzędnych i czasu po polsku.

const pad = (n: number) => String(n).padStart(2, '0')

const timeFormatterCache = new Map<string, Intl.DateTimeFormat>()
const dateFormatterCache = new Map<string, Intl.DateTimeFormat>()

export function fmtTime(t: number | null, timeZone: string): string {
  if (t === null || !Number.isFinite(t)) return '-'
  let fmt = timeFormatterCache.get(timeZone)
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('pl-PL', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    timeFormatterCache.set(timeZone, fmt)
  }
  return fmt.format(t)
}

export function fmtDate(t: number, timeZone: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }): string {
  const key = `${timeZone}|${opts.year ?? ''}|${opts.month ?? ''}|${opts.day ?? ''}|${opts.weekday ?? ''}`
  let fmt = dateFormatterCache.get(key)
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('pl-PL', { timeZone, ...opts })
    dateFormatterCache.set(key, fmt)
  }
  return fmt.format(t)
}

export function fmtDuration(hours: number): string {
  const total = Math.round(hours * 60)
  const h = Math.floor(total / 60)
  const m = total % 60
  return h ? `${h} h ${pad(m)} min` : `${m} min`
}

export function fmtRa(raDeg: number): string {
  const totalS = Math.round((((raDeg % 360) + 360) % 360) / 15 * 3600)
  const h = Math.floor(totalS / 3600) % 24
  const m = Math.floor((totalS % 3600) / 60)
  const s = totalS % 60
  return `${h}h ${pad(m)}m ${pad(s)}s`
}

export function fmtDec(decDeg: number): string {
  const sign = decDeg < 0 ? '−' : '+'
  const totalS = Math.round(Math.abs(decDeg) * 3600)
  const d = Math.floor(totalS / 3600)
  const m = Math.floor((totalS % 3600) / 60)
  const s = totalS % 60
  return `${sign}${d}° ${pad(m)}′ ${pad(s)}″`
}

export function fmtNum(v: number, digits = 1): string {
  if (v == null || !Number.isFinite(v)) return '-'
  return v.toLocaleString('pl-PL', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

export function fmtSize(majArcmin: number, minArcmin: number): string {
  if (!majArcmin) return '-'
  const f = (a: number) => (a >= 60 ? `${fmtNum(a / 60, 1)}°` : `${a >= 10 ? Math.round(a) : fmtNum(a, 1)}′`)
  return minArcmin && minArcmin !== majArcmin ? `${f(majArcmin)} × ${f(minArcmin)}` : f(majArcmin)
}

export function fmtDistance(ly: number | null): string {
  if (!ly) return '-'
  if (ly >= 1e9) return `${fmtNum(ly / 1e9, 1)} mld lś`
  if (ly >= 1e6) return `${fmtNum(ly / 1e6, ly >= 1e7 ? 0 : 1)} mln lś`
  if (ly >= 1e4) return `${Math.round(ly / 1000).toLocaleString('pl-PL')} tys. lś`
  return `${Math.round(ly).toLocaleString('pl-PL')} lś`
}

export function fmtDeg(v: number, digits = 0): string {
  return `${v < 0 ? '−' : ''}${fmtNum(Math.abs(v), digits)}°`
}
