// Eksport planu sesji:
// - CSV wykazu ekspozycji (jeden wiersz na filtr) do arkusza lub ręcznego przeniesienia ustawień;
// - formaty RA/Dec/PA wykazu;
// - pobieranie pliku z przeglądarki.
import { validExposure, type Exposure } from './exposures'

export interface ExposureTarget {
  name: string
  raDeg: number
  decDeg: number
  /** Kąt pozycyjny kadru od N przez E [°]. */
  paDeg: number
  exposures: Exposure[]
  startMs: number | null
  endMs: number | null
  note: string
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

export const EXPOSURE_HEADER = 'Order,Target,RA J2000,DEC J2000,PA East deg,Filter,Frames,Exposure seconds,Integration seconds,Start UTC,End UTC,Time zone,Note'

const csvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`
const safeCsvText = (value: string) => (/^[ \t\r]*[=+\-@]/.test(value) ? `'${value}` : value)

/** Pełny wykaz ekspozycji dla operatora / arkusza. */
export function exposureCsv(targets: readonly ExposureTarget[], timeZone: string): string {
  const rows = targets.flatMap((t, i) => t.exposures.map((e) => {
    if (!validExposure(e)) throw new Error('Uzupełnij poprawnie filtry, liczbę klatek i czas ekspozycji.')
    return [i + 1, safeCsvText(t.name), formatRa(t.raDeg), formatDec(t.decDeg), formatPa(t.paDeg), safeCsvText(e.filter),
      e.count, e.seconds, e.count * e.seconds, t.startMs === null ? '' : new Date(t.startMs).toISOString(),
      t.endMs === null ? '' : new Date(t.endMs).toISOString(), timeZone, safeCsvText(t.note)].map(csvCell).join(',')
  }))
  return '\uFEFF' + [EXPOSURE_HEADER, ...rows].join('\r\n') + '\r\n'
}

export function download(filename: string, content: string, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
