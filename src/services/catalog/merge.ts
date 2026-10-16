// Łączenie rekordów źródłowych w obiekty katalogu (6.2, Z23): wspólne oznaczenia, wiersze Dup, tabela aliasów
// i pojedyncze krzyżowe ID. Bez łączenia po pozycji; obiekt nigdy nie łączy dwóch rekordów z jednego źródła.
import type { CatalogId, Designation, DsoObject } from '../../types'
import { constellationOf } from '../astroMath.ts'
import {
  compactDesignation,
  designationKey,
  formatDesignation,
  SOURCE_PRIORITY,
  type CatalogSource,
  type ObjectRecord,
  type RecordData,
  type SourceRecord,
} from './records.ts'

export type AliasPair = [Designation, Designation]

export interface MergeResult {
  objects: DsoObject[]
  /** Powiązania pominięte przy łączeniu, do raportu skryptu budującego katalog. */
  conflicts: string[]
}

/** Kolejność wyboru oznaczenia głównego; Simeis i vdB przed Sh2, bo pod tymi nazwami znane są obiekty z aliasów. */
const PRIMARY_ORDER: readonly CatalogId[] = ['M', 'NGC', 'IC', 'Simeis', 'VdB', 'Sh2', 'LBN', 'LDN', 'B', 'SNR-G', 'Other']

/** Typ: OpenNGC, potem katalogi o konkretnej klasyfikacji (VdB, Green) przed ogólnym typem z Sh2 i LBN. */
const TYPE_PRIORITY: readonly CatalogSource[] = [
  'OpenNGC',
  'VizieR VII/21',
  'VizieR VII/297',
  'VizieR VII/20',
  'VizieR VII/9',
  'VizieR VII/7A',
  'VizieR VII/220A',
]

function compareDesignations(a: Designation, b: Designation): number {
  return PRIMARY_ORDER.indexOf(a.catalog) - PRIMARY_ORDER.indexOf(b.catalog) || a.id.localeCompare(b.id, 'en', { numeric: true })
}

function compareRecords(a: SourceRecord, b: SourceRecord): number {
  return (
    SOURCE_PRIORITY.indexOf(a.source) - SOURCE_PRIORITY.indexOf(b.source) ||
    Number(a.kind === 'duplicate') - Number(b.kind === 'duplicate') ||
    compareDesignations(a.designations[0], b.designations[0])
  )
}

function bySourceOrder(records: ObjectRecord[], order: readonly CatalogSource[]): ObjectRecord[] {
  return [...records].sort((a, b) => order.indexOf(a.source) - order.indexOf(b.source))
}

function buildObject(records: ObjectRecord[], designations: Designation[], sources: Set<CatalogSource>): DsoObject {
  const ordered = bySourceOrder(records, SOURCE_PRIORITY)
  const anchor = ordered[0]
  const first = <K extends keyof RecordData>(key: K): RecordData[K] | null =>
    ordered.find((record) => record.data[key] !== null)?.data[key] ?? null
  const sizeSource = ordered.find((record) => record.data.sizeMajorArcmin !== null)
  const unique = [...new Map(designations.map((designation) => [designationKey(designation), designation])).values()].sort(
    compareDesignations,
  )
  return {
    uid: compactDesignation(anchor.designations[0]),
    primary: unique[0],
    designations: unique,
    commonNames: [...new Set(ordered.flatMap((record) => record.commonNames))],
    type: bySourceOrder(records, TYPE_PRIORITY)[0].data.type,
    raDeg: anchor.data.raDeg,
    decDeg: anchor.data.decDeg,
    sizeMajorArcmin: sizeSource?.data.sizeMajorArcmin ?? null,
    sizeMinorArcmin: sizeSource?.data.sizeMinorArcmin ?? null,
    positionAngleDeg: sizeSource?.data.positionAngleDeg ?? null,
    magV: first('magV'),
    surfaceBrightness: first('surfaceBrightness'),
    ldnOpacity: first('ldnOpacity'),
    sh2Brightness: first('sh2Brightness'),
    lbnBrightness: first('lbnBrightness'),
    vdbStarMagV: first('vdbStarMagV'),
    constellation: constellationOf(anchor.data.raDeg, anchor.data.decDeg),
    sources: SOURCE_PRIORITY.filter((source) => sources.has(source)),
  }
}

export function mergeRecords(input: readonly SourceRecord[], aliases: readonly AliasPair[]): MergeResult {
  const conflicts: string[] = []
  const records = [...input].sort(compareRecords)
  const parent = records.map((_, i) => i)
  const objectSources = records.map((record) => new Set<CatalogSource>(record.kind === 'object' ? [record.source] : []))
  const designations = records.map((record) => [...record.designations])
  const owner = new Map<string, number>()

  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]]
      i = parent[i]
    }
    return i
  }
  const union = (a: number, b: number, reason: string): boolean => {
    const rootA = find(a)
    const rootB = find(b)
    if (rootA === rootB) return true
    const clash = [...objectSources[rootB]].find((source) => objectSources[rootA].has(source))
    if (clash) {
      conflicts.push(`${reason}: dwa obiekty z ${clash}`)
      return false
    }
    parent[rootB] = rootA
    for (const source of objectSources[rootB]) objectSources[rootA].add(source)
    return true
  }

  // Identyczne oznaczenia z różnych źródeł to ten sam obiekt (np. B 33 w OpenNGC i VII/220A).
  records.forEach((record, i) => {
    designations[i] = record.designations.filter((designation) => {
      const first = owner.get(designationKey(designation))
      if (first === undefined) owner.set(designationKey(designation), i)
      return first === undefined || union(first, i, `wspólne oznaczenie ${formatDesignation(designation)}`)
    })
  })

  for (const [a, b] of aliases) {
    const ownerA = owner.get(designationKey(a))
    const ownerB = owner.get(designationKey(b))
    const label = `alias ${formatDesignation(a)} = ${formatDesignation(b)}`
    const adopt = (i: number, designation: Designation) => {
      designations[i].push(designation)
      owner.set(designationKey(designation), i)
    }
    if (ownerA !== undefined && ownerB !== undefined) union(ownerA, ownerB, label)
    else if (ownerA !== undefined) adopt(ownerA, b)
    else if (ownerB !== undefined) adopt(ownerB, a)
    else conflicts.push(`${label}: brak obu obiektów`)
  }

  // Wiersz Dup łączy się zawsze; obiekt tylko przez jedno oznaczenie danego katalogu (kilka to części, nie ten sam obiekt).
  const claimed = new Set<string>()
  records.forEach((record, i) => {
    const perCatalog = new Map<CatalogId, number>()
    for (const { catalog } of record.crossIds) perCatalog.set(catalog, (perCatalog.get(catalog) ?? 0) + 1)
    for (const crossId of record.crossIds) {
      if (record.kind === 'object' && (perCatalog.get(crossId.catalog) ?? 0) > 1) continue
      const key = designationKey(crossId)
      const target = owner.get(key)
      const label = `${formatDesignation(record.designations[0])} → ${formatDesignation(crossId)}`
      if (target !== undefined) union(target, i, label)
      else if (record.kind === 'object' && claimed.has(key)) conflicts.push(`${label}: oznaczenie podane już przy innym obiekcie`)
      else if (record.kind === 'object') {
        claimed.add(key)
        designations[i].push(crossId)
      }
    }
  })

  const groups = new Map<number, number[]>()
  records.forEach((_, i) => groups.set(find(i), [...(groups.get(find(i)) ?? []), i]))
  const objects: DsoObject[] = []
  for (const members of groups.values()) {
    const objectRecords = members.map((i) => records[i]).filter((record): record is ObjectRecord => record.kind === 'object')
    if (objectRecords.length === 0) {
      const names = members.map((i) => formatDesignation(records[i].designations[0])).join(', ')
      conflicts.push(`${names}: wiersz Dup bez obiektu głównego`)
      continue
    }
    const sources = new Set(members.map((i) => records[i].source))
    objects.push(buildObject(objectRecords, members.flatMap((i) => designations[i]), sources))
  }
  return { objects: objects.sort((a, b) => (a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0)), conflicts }
}
