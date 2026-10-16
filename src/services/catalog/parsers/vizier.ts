// Parser odpowiedzi TSV z VizieR (asu-tsv, współrzędne _RAJ2000/_DEJ2000 w stopniach) dla katalogów z 6.1.
import type { Designation, DsoType } from '../../../types'
import {
  EMPTY_DATA,
  optionalNumber,
  stripLeadingZeros,
  type CatalogSource,
  type ParseResult,
  type RecordData,
} from '../records.ts'

export interface VizierTable {
  name: string // np. 'VII/20/catalog', z linii „#Name:”
  headerLine: number
  columns: string[]
  rows: { line: number; values: string[] }[]
}

/**
 * Tabele z odpowiedzi: komentarze „#”, nagłówek, wiersz jednostek (bywa z samych spacji), wiersz kresek, dane;
 * tabelę kończy pusta linia.
 */
export function parseVizierTables(text: string): VizierTable[] {
  const tables: VizierTable[] = []
  let name = ''
  let current: VizierTable | null = null
  let headerRowsLeft = 0
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (line.startsWith('#')) {
      name = /^#Name:\s*(\S+)/.exec(line)?.[1] ?? name
      current = null
    } else if (line === '') {
      current = null
    } else if (current === null) {
      current = { name, headerLine: index + 1, columns: line.split('\t').map((column) => column.trim()), rows: [] }
      tables.push(current)
      headerRowsLeft = 2
    } else if (headerRowsLeft > 0) {
      headerRowsLeft--
    } else {
      current.rows.push({ line: index + 1, values: line.split('\t') })
    }
  }
  return tables
}

type Field = (column: string) => string

interface RowSpec {
  designation: Designation
  data: Partial<RecordData> & { type: DsoType }
  commonNames?: string[]
}

interface CatalogMapper {
  source: CatalogSource
  columns: readonly string[]
  map: (field: Field) => RowSpec
}

const nonNull = (value: number | null): value is number => value !== null

const MAPPERS = new Map<string, CatalogMapper>([
  [
    'VII/20/catalog',
    {
      source: 'VizieR VII/20',
      columns: ['Sh2', 'Diam', 'Bright'],
      map: (field) => ({
        designation: { catalog: 'Sh2', id: stripLeadingZeros(field('Sh2')) },
        data: {
          type: 'emission_nebula',
          sizeMajorArcmin: optionalNumber(field('Diam')),
          sh2Brightness: optionalNumber(field('Bright')),
        },
      }),
    },
  ],
  [
    'VII/7A/ldn',
    {
      source: 'VizieR VII/7A',
      columns: ['LDN', 'Area', 'Opacity'],
      map: (field) => {
        const areaDeg2 = optionalNumber(field('Area'))
        return {
          designation: { catalog: 'LDN', id: field('LDN') },
          data: {
            type: 'dark_nebula',
            // Średnica równoważna pola powierzchni w stopniach kwadratowych.
            sizeMajorArcmin: areaDeg2 !== null && areaDeg2 > 0 ? 60 * 2 * Math.sqrt(areaDeg2 / Math.PI) : null,
            ldnOpacity: optionalNumber(field('Opacity')),
          },
        }
      },
    },
  ],
  [
    'VII/9/catalog',
    {
      source: 'VizieR VII/9',
      columns: ['Seq', 'Diam1', 'Diam2', 'Bright'],
      map: (field) => {
        const sizes = [optionalNumber(field('Diam1')), optionalNumber(field('Diam2'))].filter(nonNull)
        return {
          designation: { catalog: 'LBN', id: field('Seq') },
          data: {
            type: 'emission_nebula',
            sizeMajorArcmin: sizes.length > 0 ? Math.max(...sizes) : null,
            sizeMinorArcmin: sizes.length === 2 ? Math.min(...sizes) : null,
            lbnBrightness: optionalNumber(field('Bright')),
          },
        }
      },
    },
  ],
  [
    'VII/21/catalog',
    {
      source: 'VizieR VII/21',
      columns: ['VdB', 'Vmag', 'BRadMax', 'RRadMax'],
      map: (field) => {
        const radii = [optionalNumber(field('BRadMax')), optionalNumber(field('RRadMax'))].filter(nonNull)
        return {
          designation: { catalog: 'VdB', id: field('VdB') },
          data: {
            type: 'reflection_nebula',
            sizeMajorArcmin: radii.length > 0 ? 2 * Math.max(...radii) : null,
            vdbStarMagV: optionalNumber(field('Vmag')),
          },
        }
      },
    },
  ],
  [
    'VII/220A/barnard',
    {
      source: 'VizieR VII/220A',
      columns: ['Barn', 'Diam'],
      map: (field) => ({
        designation: { catalog: 'B', id: field('Barn').toLowerCase() },
        data: { type: 'dark_nebula', sizeMajorArcmin: optionalNumber(field('Diam')) },
      }),
    },
  ],
  [
    'VII/297/snrs',
    {
      source: 'VizieR VII/297',
      columns: ['SNR', 'MajDiam', 'MinDiam', 'Names'],
      map: (field) => ({
        designation: { catalog: 'SNR-G', id: field('SNR') },
        data: {
          type: 'supernova_remnant',
          sizeMajorArcmin: optionalNumber(field('MajDiam')),
          sizeMinorArcmin: optionalNumber(field('MinDiam')),
        },
        commonNames: field('Names')
          .split(',')
          .map((name) => name.trim())
          .filter((name) => name !== ''),
      }),
    },
  ],
])

const COORDINATE_COLUMNS = ['_RAJ2000', '_DEJ2000']

export function parseVizier(text: string): ParseResult {
  const result: ParseResult = { records: [], rejected: [], skipped: 0 }
  const tables = parseVizierTables(text)
  let supported = 0
  for (const table of tables) {
    const mapper = MAPPERS.get(table.name)
    if (!mapper) continue
    supported++
    const missing = [...COORDINATE_COLUMNS, ...mapper.columns].filter((column) => !table.columns.includes(column))
    if (missing.length > 0) {
      result.rejected.push({ line: table.headerLine, reason: `${table.name}: brak kolumn ${missing.join(', ')}` })
      continue
    }
    for (const row of table.rows) {
      const field: Field = (column) => (row.values[table.columns.indexOf(column)] ?? '').trim()
      const spec = mapper.map(field)
      const raDeg = optionalNumber(field('_RAJ2000'))
      const decDeg = optionalNumber(field('_DEJ2000'))
      if (spec.designation.id === '') result.rejected.push({ line: row.line, reason: `brak numeru ${spec.designation.catalog}` })
      else if (raDeg === null || decDeg === null) result.rejected.push({ line: row.line, reason: 'brak współrzędnych J2000' })
      else {
        result.records.push({
          kind: 'object',
          source: mapper.source,
          designations: [spec.designation],
          crossIds: [],
          commonNames: spec.commonNames ?? [],
          data: { ...EMPTY_DATA, raDeg, decDeg, ...spec.data },
        })
      }
    }
  }
  if (supported === 0) {
    const names = tables.map((table) => table.name).join(', ') || 'brak tabel'
    result.rejected.push({ line: 1, reason: `nieobsługiwana tabela VizieR: ${names}` })
  }
  return result
}
