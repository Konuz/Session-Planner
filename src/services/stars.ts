// Katalog gwiazd Tycho-2 do V ≤ 10 (katalog-gwiazd): jasność V, odczyt odpowiedzi CSV z TAP VizieR, zapis i odczyt
// pliku binarnego `stars.v1.bin`, indeks i wybór gwiazd w polu. Czyste funkcje, bez sieci.
//
// Plik binarny: nagłówek 64 B (bajty 0–3 `STAR`, 4–5 wersja uint16 LE, 8–11 liczba gwiazd uint32 LE, reszta zero),
// potem 10 B na gwiazdę (LE): RA uint32 (pełny obrót = 2³²), Dec int32 (90° = 2³¹ − 1), V int16 w milimagnitudo.
import { angularSeparationDeg, type EquatorialDeg } from './astroMath.ts'

/** Gwiazda katalogu: pozycja J2000 [°] i jasność V [mag]. */
export interface Star extends EquatorialDeg {
  mag: number
}

/** Do pliku trafiają gwiazdy z V ≤ 10 (brzeg się liczy). */
export const STAR_MAG_LIMIT = 10
/** Długość nagłówka pliku gwiazd [B]. */
export const STAR_FILE_HEADER_BYTES = 64
/** Wersja zapisywanego pliku. */
export const STAR_FILE_VERSION = 1

const MAGIC = 'STAR'
const RECORD_BYTES = 10
const RA_SCALE = 2 ** 32 / 360
const DEC_SCALE = (2 ** 31 - 1) / 90
const MAG_SCALE = 1000
/** Zapas na błąd zaokrąglenia przy porównaniu z granicą V ≤ 10. */
const MAG_EPSILON = 1e-9
/** Tolerancja brzegu pola [°]. */
const FIELD_TOLERANCE_DEG = 1e-6

/** Jasność V z jasności Tycho: `V = VT − 0,090·(BT − VT)`; brak BT → VT, brak VT → BT, brak obu → null. */
export function visualMagnitude({ bt, vt }: { bt: number | null; vt: number | null }): number | null {
  if (bt === null) return vt
  if (vt === null) return bt
  return vt - 0.09 * (bt - vt)
}

export interface StarsCsv {
  /** Gwiazdy z V ≤ 10 w kolejności odpowiedzi. */
  stars: Star[]
  /** Liczba wierszy danych (bez nagłówka i pustych linii). */
  rows: number
  /** Wiersze pominięte: brak obu jasności albo zła liczba. */
  skipped: number
}

function splitCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"'
        i++
      } else if (ch === '"') quoted = false
      else current += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') {
      fields.push(current)
      current = ''
    } else current += ch
  }
  fields.push(current)
  return fields
}

const NUMBER = /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/

/** Pole liczbowe: puste → null, zła liczba → NaN. */
function numberField(raw: string | undefined): number | null {
  const text = (raw ?? '').trim()
  if (text === '') return null
  return NUMBER.test(text) ? Number(text) : NaN
}

/**
 * Odczyt odpowiedzi CSV z TAP (kolumny `ra`, `dec`, `bt`, `vt` po nazwach; puste pole = brak wartości).
 * Opcjonalne kolumny `ra_obs` / `dec_obs` dają pozycję zastępczą, gdy `ra` / `dec` są puste (tyc2 bez średniej pozycji).
 */
export function parseStarsCsv(text: string): StarsCsv {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '')
  const header = splitCsvLine(lines[0] ?? '').map((name) => name.trim().toLowerCase())
  const [ra, dec, bt, vt, raObs, decObs] = ['ra', 'dec', 'bt', 'vt', 'ra_obs', 'dec_obs'].map((name) => header.indexOf(name))
  if (ra < 0 || dec < 0 || bt < 0 || vt < 0) throw new Error(`Odpowiedź CSV bez kolumn ra, dec, bt, vt: ${lines[0] ?? ''}`)
  const stars: Star[] = []
  let skipped = 0
  for (const line of lines.slice(1)) {
    const fields = splitCsvLine(line)
    const field = (index: number) => (index < 0 ? null : numberField(fields[index]))
    const raDeg = field(ra) ?? field(raObs)
    const decDeg = field(dec) ?? field(decObs)
    const magnitudes = { bt: field(bt), vt: field(vt) }
    const mag = visualMagnitude(magnitudes)
    if (raDeg === null || decDeg === null || mag === null || [raDeg, decDeg, magnitudes.bt, magnitudes.vt].some(Number.isNaN)) {
      skipped++
      continue
    }
    if (mag <= STAR_MAG_LIMIT + MAG_EPSILON) stars.push({ raDeg, decDeg, mag })
  }
  return { stars, rows: Math.max(0, lines.length - 1), skipped }
}

const normalizeRa = (raDeg: number) => ((raDeg % 360) + 360) % 360

/** Zapis pliku `stars.v1.bin`: nagłówek 64 B + 10 B na gwiazdę. */
export function encodeStarFile(stars: readonly Star[]): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(STAR_FILE_HEADER_BYTES + RECORD_BYTES * stars.length)
  const view = new DataView(bytes.buffer)
  for (let i = 0; i < MAGIC.length; i++) bytes[i] = MAGIC.charCodeAt(i)
  view.setUint16(4, STAR_FILE_VERSION, true)
  view.setUint32(8, stars.length, true)
  stars.forEach(({ raDeg, decDeg, mag }, i) => {
    const offset = STAR_FILE_HEADER_BYTES + RECORD_BYTES * i
    view.setUint32(offset, Math.round(normalizeRa(raDeg) * RA_SCALE) % 2 ** 32, true)
    view.setInt32(offset + 4, Math.round(Math.max(-90, Math.min(90, decDeg)) * DEC_SCALE), true)
    view.setInt16(offset + 8, Math.max(-32768, Math.min(32767, Math.round(mag * MAG_SCALE))), true)
  })
  return bytes
}

/** Odczyt pliku `stars.v1.bin`; zły plik → `Error` z komunikatem ze spec (P9). */
export function decodeStarFile(data: ArrayBuffer | Uint8Array): Star[] {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const prefix = String.fromCharCode(...bytes.subarray(0, MAGIC.length))
  if (!MAGIC.startsWith(prefix)) throw new Error('To nie jest plik katalogu gwiazd')
  if (bytes.length < STAR_FILE_HEADER_BYTES) throw new Error('Plik katalogu gwiazd jest niepełny')
  const version = view.getUint16(4, true)
  if (version !== STAR_FILE_VERSION) throw new Error(`Nieobsługiwana wersja pliku gwiazd: ${version}`)
  const count = view.getUint32(8, true)
  if (bytes.length < STAR_FILE_HEADER_BYTES + RECORD_BYTES * count) throw new Error('Plik katalogu gwiazd jest niepełny')
  const stars = new Array<Star>(count)
  for (let i = 0; i < count; i++) {
    const offset = STAR_FILE_HEADER_BYTES + RECORD_BYTES * i
    stars[i] = {
      raDeg: view.getUint32(offset, true) / RA_SCALE,
      decDeg: view.getInt32(offset + 4, true) / DEC_SCALE,
      mag: view.getInt16(offset + 8, true) / MAG_SCALE,
    }
  }
  return stars
}

/** Pas deklinacji indeksu: numery gwiazd posortowane po RA. */
interface Zone {
  ra: Float64Array
  ids: Uint32Array
}

/** Indeks gwiazd do szybkiego wyboru w polu (przygotowywany raz): pasy Dec po 1°, w pasie gwiazdy po RA. */
export interface StarIndex {
  /** Gwiazdy w kolejności podanej do `buildStarIndex`. */
  readonly stars: readonly Star[]
  readonly zones: readonly Zone[]
}

const ZONE_COUNT = 180
const zoneOf = (decDeg: number) => Math.min(ZONE_COUNT - 1, Math.max(0, Math.floor(decDeg + 90)))

export function buildStarIndex(stars: readonly Star[]): StarIndex {
  const members: number[][] = Array.from({ length: ZONE_COUNT }, () => [])
  stars.forEach((star, i) => members[zoneOf(star.decDeg)].push(i))
  const zones = members.map((ids) => {
    const ra = ids.map((i) => normalizeRa(stars[i].raDeg))
    const order = ids.map((_, k) => k).sort((a, b) => ra[a] - ra[b])
    return { ra: Float64Array.from(order, (k) => ra[k]), ids: Uint32Array.from(order, (k) => ids[k]) }
  })
  return { stars, zones }
}

/** Pierwsza pozycja w posortowanej tablicy z wartością ≥ value. */
function lowerBound(values: Float64Array, value: number): number {
  let lo = 0
  let hi = values.length
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    if (values[mid] < value) lo = mid + 1
    else hi = mid
  }
  return lo
}

/** Przedziały RA [od, do] do przejrzenia; okno przez RA 0° dzieli się na dwa. */
function raRanges(centerRa: number, halfWidth: number): [number, number][] {
  if (halfWidth >= 180) return [[0, 360]]
  const from = normalizeRa(centerRa - halfWidth)
  const to = from + 2 * halfWidth
  return to <= 360 ? [[from, to]] : [[from, 360], [0, to - 360]]
}

/** Gwiazdy odległe od środka o najwyżej `radiusDeg` (tolerancja 1e-6°), od najjaśniejszej; remis → kolejność listy. */
export function starsInField(index: StarIndex, center: EquatorialDeg, radiusDeg: number): Star[] {
  const { stars, zones } = index
  const limit = radiusDeg + FIELD_TOLERANCE_DEG
  const reach = limit + 1e-6 // zapas na zaokrąglenia przy wyborze pasów i okna RA
  // Gwiazda w polu ma |Dec| ≤ |Dec środka| + r, a z haversine sin(ΔRA/2) ≤ sin(r/2) / cos(Dec_max).
  const maxAbsDec = Math.abs(center.decDeg) + reach
  const sinHalf = Math.sin((Math.min(reach, 180) * Math.PI) / 360)
  const cosMax = maxAbsDec >= 90 ? 0 : Math.cos((maxAbsDec * Math.PI) / 180)
  const halfWidth = sinHalf < cosMax ? (2 * Math.asin(sinHalf / cosMax) * 180) / Math.PI + 1e-6 : 180
  const ranges = raRanges(center.raDeg, halfWidth)
  const picked: number[] = []
  for (let z = zoneOf(center.decDeg - reach); z <= zoneOf(center.decDeg + reach); z++) {
    const zone = zones[z]
    for (const [from, to] of ranges) {
      for (let k = lowerBound(zone.ra, from); k < zone.ra.length && zone.ra[k] <= to; k++) {
        const id = zone.ids[k]
        if (angularSeparationDeg(center, stars[id]) <= limit) picked.push(id)
      }
    }
  }
  picked.sort((a, b) => stars[a].mag - stars[b].mag || a - b)
  return picked.map((id) => stars[id])
}
