// Zarysy obiektów ze Stellarium (zarysy-stellarium): parser pliku outlines.dat i przypisanie do katalogu.
// Czyste funkcje, bez Reacta.
//
// - `parseOutlines(text)` – tekst pliku (LF albo CRLF) → zarysy w kolejności z pliku: `label` (tekst po `start`
//   po trim) i `points` (RA i Dec w stopniach: start, vertex…, end; bez usuwania powtórzonego punktu).
// - `outlineDesignation(label)` – oznaczenie z pliku → `Designation` albo null (RCW, Ced, C, PGC, same liczby).
// - `assignOutlines(outlines, catalog)` – te same zarysy z `uid` (null = brak obiektu) oraz `polygonsByUid`
//   (uid → wielokąty; tylko obiekty, które mają co najmniej jeden zarys).
// - `objectPolygons(assignment, uid)` – wielokąty obiektu; [] gdy obiekt nie ma zarysu.
import type { EquatorialDeg } from './astroMath'
import { designationKey } from './catalog/records'
import type { CatalogId, Designation, DsoObject } from '../types'

export interface Outline {
  /** Oznaczenie z pliku, bez spacji na początku i na końcu, np. 'LBN 933', 'SH 2-275', '44'. */
  label: string
  /** Punkty wielokąta w stopniach (J2000): start, vertex…, end. */
  points: EquatorialDeg[]
}

export interface AssignedOutline extends Outline {
  /** uid obiektu katalogu albo null, gdy oznaczenia nie ma w katalogu. */
  uid: string | null
}

export interface OutlineAssignment {
  /** Wszystkie zarysy z wejścia, w tej samej kolejności. */
  outlines: AssignedOutline[]
  /** uid → wielokąty obiektu. */
  polygonsByUid: ReadonlyMap<string, EquatorialDeg[][]>
}

const LINE = /^\s*(\S+)\s+(\S+)\s+(start|vertex|end)\b(.*)$/i

export function parseOutlines(text: string): Outline[] {
  const outlines: Outline[] = []
  let current: Outline | null = null
  for (const line of text.split(/\r?\n/)) {
    const match = LINE.exec(line)
    if (!match) continue
    const raHours = Number(match[1])
    const decDeg = Number(match[2])
    if (!Number.isFinite(raHours) || !Number.isFinite(decDeg)) continue
    const point = { raDeg: raHours * 15, decDeg }
    const command = match[3].toLowerCase()
    if (command === 'start') {
      current = { label: match[4].trim(), points: [point] }
    } else if (current) {
      current.points.push(point)
      if (command === 'end') {
        if (current.points.length >= 3) outlines.push(current)
        current = null
      }
    }
  }
  return outlines
}

const PREFIXES: [RegExp, CatalogId][] = [
  [/^M\s*(\d+)$/i, 'M'],
  [/^NGC\s*(\d+)$/i, 'NGC'],
  [/^IC\s*(\d+)$/i, 'IC'],
  [/^SH\s*2\s*-\s*(\d+)$/i, 'Sh2'],
  [/^VDB\s*(\d+)$/i, 'VdB'],
  [/^LDN\s*(\d+)$/i, 'LDN'],
  [/^LBN\s*(\d+)$/i, 'LBN'],
  [/^B\s*(\d+)$/i, 'B'],
]

export function outlineDesignation(label: string): Designation | null {
  const text = label.trim()
  for (const [pattern, catalog] of PREFIXES) {
    const match = pattern.exec(text)
    if (match) return { catalog, id: match[1].replace(/^0+(?=\d)/, '') }
  }
  return null
}

export function assignOutlines(outlines: readonly Outline[], catalog: readonly DsoObject[]): OutlineAssignment {
  const uidByKey = new Map<string, string>()
  for (const object of catalog) {
    for (const designation of object.designations) {
      const key = designationKey(designation)
      if (!uidByKey.has(key)) uidByKey.set(key, object.uid)
    }
  }
  const polygonsByUid = new Map<string, EquatorialDeg[][]>()
  const assigned = outlines.map((outline): AssignedOutline => {
    const designation = outlineDesignation(outline.label)
    const uid = (designation && uidByKey.get(designationKey(designation))) ?? null
    if (uid !== null) {
      const list = polygonsByUid.get(uid)
      if (list) list.push(outline.points)
      else polygonsByUid.set(uid, [outline.points])
    }
    return { label: outline.label, points: outline.points, uid }
  })
  return { outlines: assigned, polygonsByUid }
}

export function objectPolygons(assignment: OutlineAssignment, uid: string): EquatorialDeg[][] {
  return assignment.polygonsByUid.get(uid) ?? []
}
