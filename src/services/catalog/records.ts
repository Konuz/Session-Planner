// Rekordy źródłowe katalogów i zapis oznaczeń; wspólne dla scripts/build-catalog.ts i importu w aplikacji (6.3).
import type { CatalogId, Designation, DsoObject } from '../../types'

export type CatalogSource =
  | 'OpenNGC'
  | 'VizieR VII/20'
  | 'VizieR VII/7A'
  | 'VizieR VII/9'
  | 'VizieR VII/21'
  | 'VizieR VII/220A'
  | 'VizieR VII/297'

/** Pierwszeństwo źródeł dla współrzędnych i rozmiaru: OpenNGC, Sh2, VdB, LBN, LDN, B, Green (6.2). */
export const SOURCE_PRIORITY: readonly CatalogSource[] = [
  'OpenNGC',
  'VizieR VII/20',
  'VizieR VII/21',
  'VizieR VII/9',
  'VizieR VII/7A',
  'VizieR VII/220A',
  'VizieR VII/297',
]

export type RecordData = Pick<
  DsoObject,
  | 'type'
  | 'raDeg'
  | 'decDeg'
  | 'sizeMajorArcmin'
  | 'sizeMinorArcmin'
  | 'positionAngleDeg'
  | 'magV'
  | 'surfaceBrightness'
  | 'ldnOpacity'
  | 'sh2Brightness'
  | 'lbnBrightness'
  | 'vdbStarMagV'
>

/** Pola, których dane źródło nie podaje. */
export const EMPTY_DATA: Omit<RecordData, 'type' | 'raDeg' | 'decDeg'> = {
  sizeMajorArcmin: null,
  sizeMinorArcmin: null,
  positionAngleDeg: null,
  magV: null,
  surfaceBrightness: null,
  ldnOpacity: null,
  sh2Brightness: null,
  lbnBrightness: null,
  vdbStarMagV: null,
}

export interface ObjectRecord {
  kind: 'object'
  source: CatalogSource
  designations: Designation[] // własne oznaczenia rekordu; [0] = nazwa wiersza w źródle
  crossIds: Designation[] // krzyżowe identyfikatory innych rekordów
  commonNames: string[]
  data: RecordData
}

/** Wiersz OpenNGC typu Dup: tylko oznaczenia, które trafiają do obiektu głównego. */
export interface DuplicateRecord {
  kind: 'duplicate'
  source: CatalogSource
  designations: Designation[]
  crossIds: Designation[]
}

export type SourceRecord = ObjectRecord | DuplicateRecord

export interface RejectedRow {
  line: number
  reason: string
}

export interface ParseResult {
  records: SourceRecord[]
  rejected: RejectedRow[]
  skipped: number // wiersze pomijane zgodnie z zasadami źródła (np. gwiazdy w OpenNGC)
}

const PREFIXES: Record<CatalogId, string> = {
  M: 'M ',
  NGC: 'NGC ',
  IC: 'IC ',
  Sh2: 'Sh2-',
  VdB: 'vdB ',
  LDN: 'LDN ',
  LBN: 'LBN ',
  B: 'B ',
  Simeis: 'Simeis ',
  'SNR-G': '',
  Other: '',
}

/** Zapis oznaczenia, np. „M 42”, „Sh2-240”, „vdB 141”, „G180.0-01.7”. */
export function formatDesignation({ catalog, id }: Designation): string {
  return PREFIXES[catalog] + id
}

export function designationKey({ catalog, id }: Designation): string {
  return `${catalog}:${id}`
}

/** Oznaczenie bez spacji do pola uid, np. 'NGC1976', 'Sh2-240', 'vdB141'. */
export function compactDesignation(designation: Designation): string {
  return formatDesignation(designation).replace(/\s+/g, '')
}

/** Numer bez zer wiodących, z zachowaniem przyrostka: '0224' → '224', '0080 NED01' → '80 NED01'. */
export function stripLeadingZeros(text: string): string {
  return text.replace(/^0+(?=\d)/, '')
}

/** Liczba z pola źródła; puste pole albo tekst, który nie jest liczbą, daje null. */
export function optionalNumber(text: string): number | null {
  const trimmed = text.trim()
  if (trimmed === '') return null
  const value = Number(trimmed)
  return Number.isFinite(value) ? value : null
}
