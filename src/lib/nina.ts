// Eksport do N.I.N.A.:
// - CSV w formacie planu mozaiki Telescopius, który N.I.N.A. importuje w sekwencerze (Import targets):
//   kolumny Pane, RA, DEC, Position Angle (East); separator „,”, kropka dziesiętna, końce linii CRLF.
// - Plik tekstowy planu nocy dla operatora (kolejność, okna czasowe, filtry).

export interface NinaTarget {
  name: string
  raDeg: number
  decDeg: number
  /** Kąt pozycyjny kadru od N przez E [°]. */
  paDeg: number
}

const pad = (n: number, w = 2) => String(n).padStart(w, '0')

/** RA jako HH:MM:SS.ss. */
export function formatRa(raDeg: number): string {
  let cs = Math.round((((raDeg % 360) + 360) % 360) / 15 * 360000)
  cs %= 24 * 360000
  const h = Math.floor(cs / 360000)
  const m = Math.floor((cs % 360000) / 6000)
  const s = (cs % 6000) / 100
  return `${pad(h)}:${pad(m)}:${s.toFixed(2).padStart(5, '0')}`
}

/** DEC jako ±DD:MM:SS.s (znak zawsze). */
export function formatDec(decDeg: number): string {
  const sign = decDeg < 0 ? '-' : '+'
  const ds = Math.round(Math.abs(decDeg) * 36000)
  const d = Math.floor(ds / 36000)
  const m = Math.floor((ds % 36000) / 600)
  const s = (ds % 600) / 10
  return `${sign}${pad(d)}:${pad(m)}:${s.toFixed(1).padStart(4, '0')}`
}

export function formatPa(paDeg: number): string {
  const hundredths = ((Math.round(paDeg * 100) % 36000) + 36000) % 36000
  const text = String(hundredths / 100)
  return text.includes('.') ? text : `${text}.0`
}

const cleanName = (name: string) => name.replace(/[,"\r\n]/g, ' ').replace(/\s+/g, ' ').trim() || 'Cel'

export const NINA_HEADER = 'Pane,RA,DEC,Position Angle (East)'

export function ninaCsv(targets: readonly NinaTarget[]): string {
  const rows = targets.map((t) => `${cleanName(t.name)},${formatRa(t.raDeg)},${formatDec(t.decDeg)},${formatPa(t.paDeg)}`)
  return [NINA_HEADER, ...rows].join('\r\n') + '\r\n'
}

export function download(filename: string, content: string, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
