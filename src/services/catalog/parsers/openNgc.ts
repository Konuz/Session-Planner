// Parser CSV OpenNGC (database_files/NGC.csv i addendum.csv): separator ';', pola w cudzysłowach (6.1).
import type { CatalogId, Designation, DsoType } from '../../../types'
import { EMPTY_DATA, optionalNumber, stripLeadingZeros, type ParseResult } from '../records.ts'

const TYPES = new Map<string, DsoType>([
  ['G', 'galaxy'],
  ['GPair', 'galaxy_group'],
  ['GTrpl', 'galaxy_group'],
  ['GGroup', 'galaxy_group'],
  ['HII', 'emission_nebula'],
  ['EmN', 'emission_nebula'],
  ['Neb', 'emission_nebula'],
  ['RfN', 'reflection_nebula'],
  ['DrkN', 'dark_nebula'],
  ['PN', 'planetary_nebula'],
  ['SNR', 'supernova_remnant'],
  ['OCl', 'open_cluster'],
  ['*Ass', 'open_cluster'],
  ['GCl', 'globular_cluster'],
  ['Cl+N', 'cluster_nebula'],
  ['Other', 'other'],
])

const SKIPPED_TYPES = new Set(['*', '**', 'Nova', 'NonEx'])

const COLUMNS = ['Name', 'Type', 'RA', 'Dec', 'MajAx', 'MinAx', 'PosAng', 'V-Mag', 'SurfBr', 'M', 'NGC', 'IC', 'Identifiers', 'Common names'] as const

const NAME_CATALOGS = new Map<string, CatalogId>([
  ['NGC', 'NGC'],
  ['IC', 'IC'],
  ['M', 'M'],
  ['B', 'B'],
])

function splitCsvLine(line: string): string[] {
  const cells: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (quoted) {
      if (char !== '"') cell += char
      else if (line[i + 1] === '"') cell += line[++i]
      else quoted = false
    } else if (char === '"') quoted = true
    else if (char === ';') {
      cells.push(cell)
      cell = ''
    } else cell += char
  }
  cells.push(cell)
  return cells
}

function list(text: string): string[] {
  return text
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item !== '')
}

/** Oznaczenie z nazwy wiersza: 'NGC0224' → NGC 224, 'IC0080 NED01' → IC 80 NED01, 'B033' → B 33, 'Mel022' → Mel 22. */
function nameDesignation(name: string): Designation {
  const known = /^(NGC|IC|M|B)(\d+.*)$/.exec(name)
  const catalog = known ? NAME_CATALOGS.get(known[1]) : undefined
  if (known && catalog) {
    const id = stripLeadingZeros(known[2])
    return { catalog, id: catalog === 'B' ? id.toLowerCase() : id }
  }
  const other = /^([A-Za-z]+)(\d+.*)$/.exec(name)
  return { catalog: 'Other', id: other ? `${other[1]} ${stripLeadingZeros(other[2])}` : name }
}

function numbered(catalog: CatalogId, values: string): Designation[] {
  return list(values).map((value) => ({ catalog, id: stripLeadingZeros(value) }))
}

/** Krzyżowe ID z kolumny Identifiers w katalogach aplikacji: „LBN 373”, „SH 2-155”. */
function identifierDesignations(text: string): Designation[] {
  return list(text).flatMap((identifier): Designation[] => {
    const lbn = /^LBN\s+(\d+)$/.exec(identifier)
    if (lbn) return [{ catalog: 'LBN', id: stripLeadingZeros(lbn[1]) }]
    const sh2 = /^SH\s*2-(\d+)$/i.exec(identifier)
    if (sh2) return [{ catalog: 'Sh2', id: stripLeadingZeros(sh2[1]) }]
    return []
  })
}

function hoursToDeg(text: string): number | null {
  const match = /^(\d{1,2}):(\d{1,2}):(\d{1,2}(?:\.\d+)?)$/.exec(text)
  return match ? (Number(match[1]) + Number(match[2]) / 60 + Number(match[3]) / 3600) * 15 : null
}

function degreesToDeg(text: string): number | null {
  const match = /^([+-])(\d{1,2}):(\d{1,2}):(\d{1,2}(?:\.\d+)?)$/.exec(text)
  if (!match) return null
  return (match[1] === '-' ? -1 : 1) * (Number(match[2]) + Number(match[3]) / 60 + Number(match[4]) / 3600)
}

export function parseOpenNgc(text: string): ParseResult {
  const result: ParseResult = { records: [], rejected: [], skipped: 0 }
  const lines = text.split(/\r?\n/)
  const header = splitCsvLine(lines[0])
  const missing = COLUMNS.filter((column) => !header.includes(column))
  if (missing.length > 0) {
    result.rejected.push({ line: 1, reason: `brak kolumn OpenNGC: ${missing.join(', ')}` })
    return result
  }

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '') continue
    const cells = splitCsvLine(lines[i])
    const field = (column: (typeof COLUMNS)[number]) => (cells[header.indexOf(column)] ?? '').trim()
    const type = field('Type')
    if (SKIPPED_TYPES.has(type)) {
      result.skipped++
      continue
    }

    const own = nameDesignation(field('Name'))
    const messier = numbered('M', field('M'))
    const crossColumns = [...numbered('NGC', field('NGC')), ...numbered('IC', field('IC'))]
    if (type === 'Dup') {
      result.records.push({ kind: 'duplicate', source: 'OpenNGC', designations: [own], crossIds: [...messier, ...crossColumns] })
      continue
    }

    const dsoType = TYPES.get(type)
    const raDeg = hoursToDeg(field('RA'))
    const decDeg = degreesToDeg(field('Dec'))
    if (dsoType === undefined) result.rejected.push({ line: i + 1, reason: `nieznany typ „${type}”` })
    else if (raDeg === null || decDeg === null) result.rejected.push({ line: i + 1, reason: 'brak lub błędne współrzędne' })
    else {
      result.records.push({
        kind: 'object',
        source: 'OpenNGC',
        designations: [own, ...messier],
        crossIds: [...crossColumns, ...identifierDesignations(field('Identifiers'))],
        commonNames: list(field('Common names')),
        data: {
          ...EMPTY_DATA,
          type: dsoType,
          raDeg,
          decDeg,
          sizeMajorArcmin: optionalNumber(field('MajAx')),
          sizeMinorArcmin: optionalNumber(field('MinAx')),
          positionAngleDeg: optionalNumber(field('PosAng')),
          magV: optionalNumber(field('V-Mag')),
          surfaceBrightness: optionalNumber(field('SurfBr')),
        },
      })
    }
  }
  return result
}
